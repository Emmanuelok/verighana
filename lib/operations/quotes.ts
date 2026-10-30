import {z} from 'zod';
import {audit, OperationError, requireProjectAccess, requireStaff, requireVerified, type Actor, type Database} from './core';

const MAX_TOTAL_MINOR = 1_000_000_000_000;
const idSchema = z.string().uuid();
const versionSchema = z.number().int().min(1).max(2_147_483_647);
const lineSchema = z.object({
  description: z.string().trim().min(1).max(1000),
  quantity: z.number().int().min(1).max(10_000),
  unitAmountMinor: z.number().int().min(0).max(1_000_000_000),
}).strict();
const termsSchema = z.object({
  scope: z.string().trim().max(12_000),
  revisions: z.string().trim().max(4000),
  timeline: z.string().trim().max(4000),
  taxTreatment: z.string().trim().max(4000),
  deposit: z.string().trim().max(4000),
  cancellation: z.string().trim().max(4000),
}).strict();
const createSchema = z.object({
  lines: z.array(lineSchema).min(1).max(25),
  terms: termsSchema,
  expiresAt: z.string().datetime({offset: true}),
}).strict();
const acceptanceSchema = z.object({version: versionSchema, termsAccepted: z.literal(true)}).strict();

export type QuoteLine = z.infer<typeof lineSchema>;
export type QuoteTerms = z.infer<typeof termsSchema>;
export type QuoteInput = z.infer<typeof createSchema>;
export type Quote = {
  id: string; projectId: string; version: number; status: 'draft'|'issued'|'accepted'|'superseded';
  currency: 'GHS'; lines: QuoteLine[]; terms: QuoteTerms; totalMinor: number;
  expiresAt: string; createdAt: string; issuedAt: string|null; acceptedAt: string|null;
  checkoutEnabled: false;
};
type QuoteRow = {
  id: string; project_id: string; version: number; status: Quote['status']; currency: 'GHS';
  lines: QuoteLine[]; terms: QuoteTerms; total_minor: string|number; expires_at: Date|string;
  created_at: Date|string; issued_at: Date|string|null; accepted_at: Date|string|null;
  accepted_by: string|null;
};
const columns = 'id,project_id,version,status,currency,lines,terms,total_minor,expires_at,created_at,issued_at,accepted_at,accepted_by';
function input<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new OperationError(400, 'invalid_quote', 'Review the quote fields, whole-number amounts and required acceptance.');
  return parsed.data;
}
function iso(value: Date|string) {return new Date(value).toISOString();}
function quote(row: QuoteRow): Quote {
  const totalMinor = Number(row.total_minor);
  if (!Number.isSafeInteger(totalMinor) || totalMinor < 0 || totalMinor > MAX_TOTAL_MINOR) throw new OperationError(500, 'invalid_quote_record', 'This quote cannot be displayed. Contact Fullview.');
  return {id: row.id, projectId: row.project_id, version: row.version, status: row.status, currency: row.currency,
    lines: row.lines, terms: row.terms, totalMinor, expiresAt: iso(row.expires_at), createdAt: iso(row.created_at),
    issuedAt: row.issued_at ? iso(row.issued_at) : null, acceptedAt: row.accepted_at ? iso(row.accepted_at) : null,
    checkoutEnabled: false};
}
function totalFor(lines: QuoteLine[]) {
  const total = lines.reduce((sum, line) => sum + line.quantity * line.unitAmountMinor, 0);
  if (!Number.isSafeInteger(total) || total > MAX_TOTAL_MINOR) throw new OperationError(400, 'quote_total_too_large', 'The quote total exceeds the supported limit.');
  return total;
}
function requireFuture(expiresAt: Date|string) {
  if (new Date(expiresAt).valueOf() <= Date.now()) throw new OperationError(409, 'quote_expired', 'This quote has expired. Request a new version.');
}
function requireComplete(terms: QuoteTerms) {
  if (Object.values(termsSchema.parse(terms)).some(value => !value.trim())) {
    throw new OperationError(409, 'quote_terms_incomplete', 'Complete scope, revisions, timing, tax treatment, deposit and cancellation terms before issuing.');
  }
}
async function lockProject(db: Database, actor: Actor, projectId: string) {
  input(idSchema, projectId);
  await requireProjectAccess(db, actor, projectId);
  const result = await db.query<{id:string;owner_id:string;status:string}>(
    'SELECT id,owner_id,status FROM fv_projects WHERE id=$1 AND deleted_at IS NULL AND (owner_id=$2 OR $3=true) FOR UPDATE',
    [projectId, actor.id, actor.role === 'staff' || actor.role === 'admin']);
  if (!result.rows[0]) throw new OperationError(404, 'project_not_found', 'Project not found.');
  return result.rows[0];
}
async function findQuote(db: Database, projectId: string, quoteId: string) {
  input(idSchema, quoteId);
  const result = await db.query<QuoteRow>(`SELECT ${columns} FROM fv_quotes WHERE id=$1 AND project_id=$2 FOR UPDATE`, [quoteId, projectId]);
  if (!result.rows[0]) throw new OperationError(404, 'quote_not_found', 'Quote not found.');
  return result.rows[0];
}
async function ensureUnaccepted(db: Database, projectId: string, status: string) {
  const result = await db.query('SELECT id FROM fv_quotes WHERE project_id=$1 AND status=\'accepted\' LIMIT 1', [projectId]);
  if (result.rows.length || ['accepted', 'in_progress', 'delivered', 'closed'].includes(status)) {
    throw new OperationError(409, 'engagement_locked', 'This project cannot receive a new quote. An accepted engagement needs a separate scope-change process.');
  }
}

/** Every edit is a new immutable draft version. Existing issued terms remain valid until a replacement is issued. */
export async function createQuote(db: Database, actor: Actor, projectId: string, value: unknown): Promise<Quote> {
  requireStaff(actor);
  const data = input(createSchema, value);
  const total = totalFor(data.lines);
  requireFuture(data.expiresAt);
  return db.transaction(async tx => {
    const project = await lockProject(tx, actor, projectId);
    await ensureUnaccepted(tx, projectId, project.status);
    const versions = await tx.query<{next_version:number}>('SELECT COALESCE(MAX(version),0)+1 AS next_version FROM fv_quotes WHERE project_id=$1', [projectId]);
    const version = versions.rows[0].next_version;
    input(versionSchema, version);
    await tx.query("UPDATE fv_quotes SET status='superseded' WHERE project_id=$1 AND status='draft'", [projectId]);
    const result = await tx.query<QuoteRow>(`INSERT INTO fv_quotes (id,project_id,version,lines,terms,total_minor,expires_at,created_by)
      VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8) RETURNING ${columns}`,
    [crypto.randomUUID(), projectId, version, JSON.stringify(data.lines), JSON.stringify(data.terms), total, data.expiresAt, actor.id]);
    await audit(tx, actor.id, 'quote.created', result.rows[0].id, {projectId, version, totalMinor: total});
    return quote(result.rows[0]);
  });
}

export async function issueQuote(db: Database, actor: Actor, projectId: string, quoteId: string, versionValue: unknown): Promise<Quote> {
  requireStaff(actor);
  const version = input(versionSchema, versionValue);
  return db.transaction(async tx => {
    const project = await lockProject(tx, actor, projectId);
    await ensureUnaccepted(tx, projectId, project.status);
    const current = await findQuote(tx, projectId, quoteId);
    if (current.version !== version || current.status !== 'draft') throw new OperationError(409, 'quote_version_changed', 'This draft is no longer current. Review the latest version.');
    const latest = await tx.query<{version:number}>('SELECT MAX(version) AS version FROM fv_quotes WHERE project_id=$1', [projectId]);
    if (latest.rows[0].version !== version) throw new OperationError(409, 'quote_version_changed', 'Issue only the latest draft version.');
    requireComplete(current.terms);
    requireFuture(current.expires_at);
    await tx.query("UPDATE fv_quotes SET status='superseded' WHERE project_id=$1 AND status='issued'", [projectId]);
    const result = await tx.query<QuoteRow>(`UPDATE fv_quotes SET status='issued',issued_at=now() WHERE id=$1 RETURNING ${columns}`, [quoteId]);
    await tx.query("UPDATE fv_projects SET status='quoted',version=version+1,updated_at=now() WHERE id=$1", [projectId]);
    await audit(tx, actor.id, 'quote.issued', quoteId, {projectId, version});
    return quote(result.rows[0]);
  });
}

export async function acceptQuote(db: Database, actor: Actor, projectId: string, quoteId: string, value: unknown): Promise<Quote> {
  requireVerified(actor);
  if (actor.role !== 'client') throw new OperationError(403, 'client_acceptance_required', 'Only the client who owns this project can accept its quote.');
  const data = input(acceptanceSchema, value);
  return db.transaction(async tx => {
    const project = await lockProject(tx, actor, projectId);
    if (project.owner_id !== actor.id) throw new OperationError(404, 'project_not_found', 'Project not found.');
    const current = await findQuote(tx, projectId, quoteId);
    if (current.version !== data.version) throw new OperationError(409, 'quote_version_changed', 'Review the exact current quote version before accepting.');
    // An exact retry returns the same acceptance without duplicating audit or changing evidence.
    if (current.status === 'accepted' && current.accepted_by === actor.id) return quote(current);
    if (current.status !== 'issued') throw new OperationError(409, 'quote_not_available', 'This quote is not available for acceptance. Review the current issued version.');
    await ensureUnaccepted(tx, projectId, project.status);
    requireComplete(current.terms);
    requireFuture(current.expires_at);
    const result = await tx.query<QuoteRow>(`UPDATE fv_quotes SET status='accepted',accepted_at=now(),accepted_by=$2 WHERE id=$1 RETURNING ${columns}`, [quoteId, actor.id]);
    await tx.query("UPDATE fv_projects SET status='accepted',version=version+1,updated_at=now() WHERE id=$1", [projectId]);
    await audit(tx, actor.id, 'quote.accepted', quoteId, {projectId, version: current.version, totalMinor: Number(current.total_minor), termsAccepted: true});
    return quote(result.rows[0]);
  });
}

export async function listQuotes(db: Database, actor: Actor, projectId: string): Promise<Quote[]> {
  input(idSchema, projectId);
  await requireProjectAccess(db, actor, projectId);
  const result = await db.query<QuoteRow>(`SELECT ${columns} FROM fv_quotes WHERE project_id=$1 AND
    ($2=true OR status IN ('issued','accepted') OR (status='superseded' AND issued_at IS NOT NULL)) ORDER BY version DESC`,
  [projectId, actor.role === 'staff' || actor.role === 'admin']);
  return result.rows.map(quote);
}
