export type Principal = {id: string; email: string; emailVerified: boolean};
export type Actor = Principal & {role: 'client' | 'staff' | 'admin'};
export type QueryResult<T> = {rows: T[]; rowCount: number | null};
export interface Database {
  query<T = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<QueryResult<T>>;
  transaction<T>(work: (db: Database) => Promise<T>): Promise<T>;
}
export class OperationError extends Error {
  constructor(public status: number, public code: string, message: string) {super(message);}
}
export function requireVerified(actor: Principal) {
  if (!actor.emailVerified) throw new OperationError(403, 'email_verification_required', 'Verify your email before accessing shared project records.');
}
export function requireStaff(actor: Actor) {
  requireVerified(actor);
  if (actor.role !== 'staff' && actor.role !== 'admin') throw new OperationError(403, 'staff_required', 'Staff access is required.');
}
export async function actorFor(db: Database, principal: Principal): Promise<Actor> {
  requireVerified(principal);
  const result = await db.query<{role: 'staff'|'admin'}>('SELECT role FROM fv_staff WHERE user_id=$1 AND active=true', [principal.id]);
  return {...principal, role: result.rows[0]?.role ?? 'client'};
}
export async function requireProjectAccess(db: Database, actor: Actor, projectId: string) {
  requireVerified(actor);
  const result = await db.query<{id: string; owner_id: string; status: string; assigned_to: string|null}>(
    'SELECT id, owner_id, status, assigned_to FROM fv_projects WHERE id=$1 AND deleted_at IS NULL AND expires_at>now() AND (owner_id=$2 OR $3=true)',
    [projectId, actor.id, actor.role === 'staff' || actor.role === 'admin']);
  const project = result.rows[0];
  if (!project) throw new OperationError(404, 'project_not_found', 'Project not found.');
  return project;
}
export async function audit(db: Database, actorId: string|null, action: string, resourceId: string, metadata: Record<string, unknown> = {}) {
  await db.query('INSERT INTO fv_audit (id, actor_id, action, resource_id, metadata) VALUES ($1,$2,$3,$4,$5::jsonb)',
    [crypto.randomUUID(), actorId, action, resourceId, JSON.stringify(metadata)]);
}
