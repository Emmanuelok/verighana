import { z } from 'zod';
import { audienceIds, rate, services } from './catalog';
import {matchesBundleScope, type BundleRequest} from './bundle-handoff';

export const BRIEFS_KEY = 'fullview-local-briefs-v1';
export const DRAFT_KEY = 'fullview-research-draft-v1';
export const budgets = ['Under GHS 2,000', 'GHS 2,000–5,000', 'GHS 5,000–15,000', 'GHS 15,000–50,000', 'GHS 50,000+', 'Please advise'] as const;
export type BriefForm = {name: string; email: string; organisation: string; title: string; description: string; deadline: string; budget: string; packageRequest: BundleRequest | null};
export const emptyForm: BriefForm = { name: '', email: '', organisation: '', title: '', description: '', deadline: '', budget: 'Please advise', packageRequest: null };

const selectionSchema = z.object({ id: z.string().max(80), quantity: z.number().int().min(1).max(500) });
const packageSchema = z.object({bundleId: z.string().max(80), audience: z.enum(audienceIds), addOns: z.array(selectionSchema).max(12)}).nullable().optional();
const briefFieldsSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(120),
  email: z.string().trim().email('Enter a valid email address.').max(254),
  organisation: z.string().trim().max(200),
  audience: z.enum(audienceIds),
  title: z.string().trim().min(8, 'Use at least 8 characters for your project title.').max(200),
  description: z.string().trim().min(40, 'Describe your project in at least 40 characters.').max(6000),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a completion date.').refine(value => {
    const date = new Date(value + 'T00:00:00Z');
    return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }, 'Choose a valid completion date.'),
  budget: z.enum(budgets),
  selections: z.array(selectionSchema).max(12),
  packageRequest: packageSchema,
}).superRefine((input, ctx) => {
  if (new Set(input.selections.map(item => item.id)).size !== input.selections.length) {
    ctx.addIssue({ code: 'custom', message: 'A service may only appear once in a brief.', path: ['selections'] });
  }
});
const detailsSchema = briefFieldsSchema.superRefine((input, ctx) => {
  if (input.packageRequest && !matchesBundleScope(input.packageRequest, input.audience, input.selections)) {
    ctx.addIssue({code: 'custom', message: 'Your estimate differs from the package scope. Reapply the package or convert it to a custom brief.', path: ['selections']});
  }
  if (input.selections.some(item => !services.some(service => service.id === item.id && service.audiences.includes(input.audience)))) {
    ctx.addIssue({ code: 'custom', message: 'Review the services selected for your research pathway.', path: ['selections'] });
  }
});

const priceSnapshotSchema = z.object({
  version: z.literal(1),
  currency: z.literal('GHS'),
  capturedAt: z.string().datetime(),
  lines: z.array(z.object({
    id: z.string().min(1).max(80),
    title: z.string().min(1).max(300),
    unit: z.string().min(1).max(200),
    unitPrice: z.number().finite().nonnegative().max(1_000_000_000),
    quantity: z.number().int().min(1).max(500),
    deliverables: z.array(z.string().max(2000)).max(30),
  })).max(12),
});
export type PriceSnapshot = z.infer<typeof priceSnapshotSchema>;

const storedSchema = z.object({
  // A dated snapshot remains readable when a service is later retired or its scope changes.
  details: briefFieldsSchema,
  id: z.string().regex(/^FVS-[A-F0-9]{16}$/),
  createdAt: z.string().datetime(),
  priceSnapshot: priceSnapshotSchema.optional(),
}).superRefine((record, ctx) => {
  if (record.priceSnapshot && !snapshotMatches(record.priceSnapshot, record.details.selections)) {
    ctx.addIssue({ code: 'custom', message: 'Saved prices do not match this brief’s selected quantities.', path: ['priceSnapshot'] });
  }
});
export type BriefDetails = z.infer<typeof detailsSchema>;
export type Brief = BriefDetails & { id: string; createdAt: string; estimate: number; status: string; priceSnapshot?: PriceSnapshot };
type BriefStorage = Pick<Storage, 'getItem' | 'setItem'>;

function snapshotMatches(snapshot: PriceSnapshot, selections: BriefDetails['selections']): boolean {
  return snapshot.lines.length === selections.length && snapshot.lines.every((line, index) =>
    line.id === selections[index].id && line.quantity === selections[index].quantity);
}

function currentPriceLines(details: Pick<BriefDetails, 'audience' | 'selections'>): PriceSnapshot['lines'] {
  return details.selections.map(item => {
    const service = services.find(service => service.id === item.id);
    if (!service) throw new Error('A service in this older brief is no longer listed. Its current estimate cannot be calculated.');
    return { id: item.id, title: service.title, unit: service.unit, unitPrice: rate(service, details.audience),
      quantity: item.quantity, deliverables: [...service.deliverables] };
  });
}

/** The display and PDF use the same saved rates; old briefs explicitly use current catalogue rates. */
export function getBriefPricing(brief: Pick<Brief, 'audience' | 'selections' | 'priceSnapshot' | 'id'>) {
  const snapshot = brief.priceSnapshot ? priceSnapshotSchema.parse(brief.priceSnapshot) : undefined;
  if (snapshot && !snapshotMatches(snapshot, brief.selections)) throw new Error('Saved prices do not match this brief’s selected quantities.');
  const lines = snapshot?.lines ?? currentPriceLines(brief);
  return {
    lines,
    total: lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    source: snapshot ? 'snapshot' as const : 'current' as const,
    notice: snapshot
      ? `Planning rates saved on ${snapshot.capturedAt.slice(0, 10)} in GHS. This dated estimate is not a confirmed quote.`
      : brief.id === 'UNSAVED DRAFT'
        ? 'Draft estimate uses current catalogue planning rates in GHS. Rates are captured when the brief is saved.'
        : 'This older brief has no saved price snapshot. The estimate has been refreshed using current catalogue planning rates in GHS; it may differ from the original.',
  };
}

export function localDate(date = new Date()): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function validateBrief(input: unknown, today = localDate()): BriefDetails {
  const details = detailsSchema.parse(input);
  if (details.deadline < today) throw new Error('Choose today or a future completion date.');
  return details;
}

function toBrief(record: z.infer<typeof storedSchema>): Brief {
  return { ...record.details, id: record.id, createdAt: record.createdAt,
    ...(record.priceSnapshot ? { priceSnapshot: record.priceSnapshot } : {}),
    estimate: getBriefPricing({ ...record.details, id: record.id, priceSnapshot: record.priceSnapshot }).total, status: 'Saved on this device' };
}

export function readLocalBriefs(storage: BriefStorage): Brief[] {
  const raw = storage.getItem(BRIEFS_KEY);
  if (!raw) return [];
  const records: unknown = JSON.parse(raw);
  if (!Array.isArray(records) || records.length > 100) throw new Error('Saved briefs could not be read. Your existing data has been left unchanged.');
  return records.map(record => toBrief(storedSchema.parse(record)));
}

function writeLocalBriefs(storage: BriefStorage, briefs: Brief[]): void {
  storage.setItem(BRIEFS_KEY, JSON.stringify(briefs.map(({ id, createdAt, priceSnapshot, estimate: _estimate, status: _status, ...details }) =>
    ({ id, createdAt, details, ...(priceSnapshot ? { priceSnapshot } : {}) }))));
}

export function saveLocalBrief(storage: BriefStorage, input: unknown): Brief {
  const details = validateBrief(input);
  const current = readLocalBriefs(storage);
  if (current.length >= 100) throw new Error('This browser holds 100 briefs. Download and remove an older brief before saving another.');
  const createdAt = new Date().toISOString();
  const priceSnapshot = priceSnapshotSchema.parse({ version: 1, currency: 'GHS', capturedAt: createdAt, lines: currentPriceLines(details) });
  const brief = toBrief({ id: 'FVS-' + crypto.randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase(), createdAt, details, priceSnapshot });
  writeLocalBriefs(storage, [brief, ...current]);
  return brief;
}

export function removeLocalBrief(storage: BriefStorage, id: string): Brief[] {
  const remaining = readLocalBriefs(storage).filter(brief => brief.id !== id);
  writeLocalBriefs(storage, remaining);
  return remaining;
}

export function readLocalDraft(storage: BriefStorage): BriefForm | null {
  const raw = storage.getItem(DRAFT_KEY);
  if (!raw) return null;
  const draft = z.object({ name: z.string().max(120), email: z.string().max(254), organisation: z.string().max(200),
    title: z.string().max(200), description: z.string().max(6000), deadline: z.string().max(10), budget: z.enum(budgets), packageRequest: packageSchema }).safeParse(JSON.parse(raw));
  if (!draft.success) throw new Error('The saved draft could not be read. Existing browser data has been left unchanged.');
  return {...draft.data, packageRequest: draft.data.packageRequest || null};
}
