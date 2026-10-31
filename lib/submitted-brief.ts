import {z} from 'zod';
import {audiences} from './catalog';

const selectionSchema = z.object({id: z.string().min(1).max(80), quantity: z.number().int().min(1).max(500)});
const selectionsSchema = z.array(selectionSchema).max(12).refine(items => new Set(items.map(item => item.id)).size === items.length);
const snapshotSchema = z.object({
  version: z.literal(1), currency: z.literal('GHS'), capturedAt: z.string().datetime(),
  lines: z.array(z.object({
    id: z.string().min(1).max(80), title: z.string().min(1).max(300), unit: z.string().min(1).max(200),
    unitPrice: z.number().finite().nonnegative().max(1_000_000_000), quantity: z.number().int().min(1).max(500),
    deliverables: z.array(z.string().max(2000)).max(30),
  })).max(12),
});
const packageSchema = z.object({bundleId: z.string().min(1).max(80), audience: z.string().min(1).max(80), addOns: selectionsSchema});
type Selection = z.infer<typeof selectionSchema>;
type Snapshot = z.infer<typeof snapshotSchema>;
type Pricing = {status: 'saved'; snapshot: Snapshot; total: number; warning: string | null} |
  {status: 'missing' | 'invalid'; notice: string; recordedTotal: number | null};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function savedText(value: unknown): string | null {return typeof value === 'string' && value.trim() ? value : null;}
export function savedPathway(value: unknown): string {
  const id = savedText(value);
  return id ? audiences.find(audience => audience.id === id)?.label ?? id : 'Not recorded';
}
export function savedDate(value: unknown): string {
  if (typeof value !== 'string' || !Number.isFinite(new Date(value).valueOf())) return 'Date unavailable';
  return new Date(value).toLocaleString('en-GB', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC'}) + ' UTC';
}
export function savedMoney(value: number): string {
  return 'GHS ' + new Intl.NumberFormat('en-GH', {minimumFractionDigits: 0, maximumFractionDigits: 2}).format(value);
}

/** Read submitted records only. Never reconstruct historical prices or scope from today's catalogue. */
export function submittedBriefSummary(input: unknown) {
  const brief = object(input);
  const selected = selectionsSchema.safeParse(brief.selections);
  const selections: Selection[] | null = selected.success ? selected.data : null;
  const snapshot = snapshotSchema.safeParse(brief.priceSnapshot);
  let pricing: Pricing;
  if (brief.priceSnapshot === undefined || brief.priceSnapshot === null) {
    pricing = {status: 'missing', notice: 'This brief has no saved item-price snapshot. Original item prices and service labels are unavailable; current catalogue prices have not been applied.',
      recordedTotal: typeof brief.estimate === 'number' && Number.isFinite(brief.estimate) && brief.estimate >= 0 ? brief.estimate : null};
  } else if (!snapshot.success || !selections || snapshot.data.lines.length !== selections.length ||
    new Set(snapshot.data.lines.map(line => line.id)).size !== snapshot.data.lines.length ||
    snapshot.data.lines.some(line => !selections.some(item => item.id === line.id && item.quantity === line.quantity))) {
    pricing = {status: 'invalid', notice: 'The saved pricing details could not be verified against the submitted service quantities. Please ask Fullview to review this record.', recordedTotal: null};
  } else {
    const total = snapshot.data.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    const mismatch = typeof brief.estimate === 'number' && Number.isFinite(brief.estimate) && Math.abs(total - brief.estimate) > .005;
    pricing = {status: 'saved', snapshot: snapshot.data, total, warning: mismatch ? 'The recorded summary total differs from its saved item prices. The table uses the saved item prices; ask Fullview to review this record before relying on the estimate.' : null};
  }
  const requestedPackage = brief.packageRequest == null ? null : packageSchema.safeParse(brief.packageRequest);
  const packageValid = requestedPackage?.success && requestedPackage.data.audience === brief.audience && selections !== null &&
    requestedPackage.data.addOns.every(extra => selections.some(item => item.id === extra.id && item.quantity >= extra.quantity));
  const packageSelection = packageValid && requestedPackage?.success ? {
    id: requestedPackage.data.bundleId,
    title: savedText(brief.title),
    pathway: savedPathway(requestedPackage.data.audience),
    addOns: requestedPackage.data.addOns.map(extra => ({...extra,
      title: pricing.status === 'saved' ? pricing.snapshot.lines.find(line => line.id === extra.id)?.title ?? extra.id : extra.id,
    })),
  } : null;
  return {brief, pathway: savedPathway(brief.audience), selections, pricing, packageSelection,
    packageNotice: requestedPackage && !packageValid ? 'The saved package selection could not be verified. Refer to the submitted description and ask Fullview to confirm the scope.' : null};
}
