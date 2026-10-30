import { z } from 'zod';
import { audienceIds, estimateTotal, services, type Audience } from './catalog';

export const BRIEFS_KEY = 'fullview-local-briefs-v1';
export const DRAFT_KEY = 'fullview-research-draft-v1';
export const budgets = ['Under GHS 2,000', 'GHS 2,000–5,000', 'GHS 5,000–15,000', 'GHS 15,000–50,000', 'GHS 50,000+', 'Please advise'] as const;
export const emptyForm = { name: '', email: '', organisation: '', title: '', description: '', deadline: '', budget: 'Please advise' };
export type BriefForm = typeof emptyForm;

const selectionSchema = z.object({ id: z.string().max(80), quantity: z.number().int().min(1).max(500) });
const detailsSchema = z.object({
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
}).superRefine((input, ctx) => {
  if (new Set(input.selections.map(item => item.id)).size !== input.selections.length ||
      input.selections.some(item => !services.some(service => service.id === item.id && service.audiences.includes(input.audience)))) {
    ctx.addIssue({ code: 'custom', message: 'Review the services selected for your research pathway.', path: ['selections'] });
  }
});

const storedSchema = z.object({
  details: detailsSchema,
  id: z.string().regex(/^FVS-[A-F0-9]{16}$/),
  createdAt: z.string().datetime(),
});
export type BriefDetails = z.infer<typeof detailsSchema>;
export type Brief = BriefDetails & { id: string; createdAt: string; estimate: number; status: string };
type BriefStorage = Pick<Storage, 'getItem' | 'setItem'>;

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
    estimate: estimateTotal(record.details.selections, record.details.audience as Audience), status: 'Saved on this device' };
}

export function readLocalBriefs(storage: BriefStorage): Brief[] {
  const raw = storage.getItem(BRIEFS_KEY);
  if (!raw) return [];
  const records: unknown = JSON.parse(raw);
  if (!Array.isArray(records) || records.length > 100) throw new Error('Saved briefs could not be read. Your existing data has been left unchanged.');
  return records.map(record => toBrief(storedSchema.parse(record)));
}

function writeLocalBriefs(storage: BriefStorage, briefs: Brief[]): void {
  storage.setItem(BRIEFS_KEY, JSON.stringify(briefs.map(({ id, createdAt, estimate: _estimate, status: _status, ...details }) => ({ id, createdAt, details }))));
}

export function saveLocalBrief(storage: BriefStorage, input: unknown): Brief {
  const details = validateBrief(input);
  const current = readLocalBriefs(storage);
  if (current.length >= 100) throw new Error('This browser holds 100 briefs. Download and remove an older brief before saving another.');
  const brief = toBrief({ id: 'FVS-' + crypto.randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase(), createdAt: new Date().toISOString(), details });
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
    title: z.string().max(200), description: z.string().max(6000), deadline: z.string().max(10), budget: z.enum(budgets) }).safeParse(JSON.parse(raw));
  return draft.success ? draft.data : null;
}
