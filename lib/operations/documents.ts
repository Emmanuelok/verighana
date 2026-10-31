import {createHash} from 'node:crypto';
import {audit, OperationError, requireProjectAccess, requireStaff, type Actor, type Database} from './core';
import {maxPersonalDataRetentionDays, retentionDays, requireRetentionCleanup} from './validation';

export const supportedDocumentTypes = ['application/pdf', 'text/plain', 'text/csv'] as const;
export type DocumentMimeType = typeof supportedDocumentTypes[number];
export type DocumentState = 'quarantined' | 'scanning' | 'available' | 'rejected' | 'revoked' | 'deleted';

/** No policy is enabled by default. The owner must approve the actual operating policy. */
export type DocumentPolicy = {
  enabled: boolean;
  ownerApproved: boolean;
  version: string;
  retentionDays: number;
  /** Documents share their parent project's submission anchor; uploads never restart retention. */
  retentionTrigger: 'submission';
  maxBytes: number;
  allowedMimeTypes: DocumentMimeType[];
};

/** Implement only for verified private storage. Do not substitute public or signed download URLs. */
export interface StorageAdapter {
  configured: boolean;
  privateOnly: boolean;
  putPrivate(key: string, bytes: Uint8Array, metadata: {contentType: string; sha256: string}): Promise<void>;
  /** Reject oversized responses before buffering beyond maxBytes. */
  readPrivate(key: string, options: {maxBytes: number}): Promise<Uint8Array>;
  /** Must be idempotent: an already absent object is a successful deletion. */
  deletePrivate(key: string): Promise<void>;
}
export interface Scanner {
  configured: boolean;
  /** Set only after the real scanner integration is verified, not from a UI checkbox. */
  verified: boolean;
  scan(bytes: Uint8Array, metadata: {filename: string; contentType: string; sha256: string}): Promise<'clean' | 'infected'>;
}
export type DocumentUpload = {filename: string; contentType: string; bytes: Uint8Array};
type Row = {
  id: string; project_id: string; filename: string; content_type: DocumentMimeType;
  byte_count: number; sha256: string; storage_key: string; state: DocumentState;
  created_at: string | Date; expires_at: string | Date; revoked_at: string | Date | null;
  storage_cleanup_pending: boolean;
};
export type DocumentSummary = {
  id: string; projectId: string; filename: string; contentType: DocumentMimeType; byteCount: number;
  state: DocumentState | 'expired'; createdAt: string; expiresAt: string; canDownload: boolean;
};
type Dependencies = {db: Database; storage?: StorageAdapter; scanner?: Scanner; policy?: DocumentPolicy; now?: () => Date};
const dayMs = 86_400_000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const notFound = () => new OperationError(404, 'document_not_found', 'Document not found.');
const unavailable = () => new OperationError(503, 'documents_unavailable', 'Secure document exchange is not available yet. Please contact Fullview to agree a suitable transfer process.');
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
function instant(value: string | Date) {return new Date(value).getTime();}

export function documentExchangeReady(dependencies: Pick<Dependencies, 'storage' | 'scanner' | 'policy'>): boolean {
  const {policy, storage, scanner} = dependencies;
  let configuredDays: number;
  try {configuredDays = retentionDays();} catch {return false;}
  return !!(policy?.enabled && policy.ownerApproved && /^[a-zA-Z0-9._-]{1,80}$/.test(policy.version)
    && policy.retentionTrigger === 'submission'
    && Number.isInteger(policy.retentionDays) && policy.retentionDays >= 1
    && policy.retentionDays <= Math.min(maxPersonalDataRetentionDays, configuredDays)
    && Number.isInteger(policy.maxBytes) && policy.maxBytes >= 1 && policy.maxBytes <= 25 * 1024 * 1024
    && Array.isArray(policy.allowedMimeTypes) && policy.allowedMimeTypes.length > 0
    && policy.allowedMimeTypes.every(type => supportedDocumentTypes.includes(type))
    && storage?.configured && storage.privateOnly && scanner?.configured && scanner.verified);
}

function validateUpload(input: DocumentUpload, policy: DocumentPolicy) {
  if (typeof input.filename !== 'string' || input.filename !== input.filename.trim()
    || input.filename.length < 1 || input.filename.length > 180
    || /[\\/\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(input.filename)
    || input.filename.startsWith('.')) {
    throw new OperationError(400, 'invalid_filename', 'Use a filename without paths or control characters, up to 180 characters.');
  }
  try {encodeURIComponent(input.filename);} catch {throw new OperationError(400, 'invalid_filename', 'Use a valid Unicode filename.');}
  if (!supportedDocumentTypes.includes(input.contentType as DocumentMimeType)
    || !policy.allowedMimeTypes.includes(input.contentType as DocumentMimeType)) {
    throw new OperationError(415, 'unsupported_document_type', 'This document type is not permitted by the current transfer policy.');
  }
  if (!(input.bytes instanceof Uint8Array) || !input.bytes.length || input.bytes.length > policy.maxBytes) {
    throw new OperationError(413, 'document_size_limit', 'The document is empty or exceeds the current transfer limit.');
  }
  const extensions: Record<DocumentMimeType, RegExp> = {
    'application/pdf': /\.pdf$/i, 'text/plain': /\.txt$/i, 'text/csv': /\.csv$/i,
  };
  if (!extensions[input.contentType as DocumentMimeType].test(input.filename)) {
    throw new OperationError(415, 'document_type_mismatch', 'The filename must match the selected document type.');
  }
  if (input.contentType === 'application/pdf') {
    if (Buffer.from(input.bytes.subarray(0, 5)).toString('ascii') !== '%PDF-') {
      throw new OperationError(415, 'document_type_mismatch', 'The document does not have the expected PDF format.');
    }
  } else {
    try {
      const text = new TextDecoder('utf-8', {fatal: true}).decode(input.bytes);
      if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(text)) throw Error('Binary content');
    } catch {throw new OperationError(415, 'document_type_mismatch', 'Text documents must contain valid UTF-8 text.');}
  }
}

function summary(row: Row, now: Date): DocumentSummary {
  const expired = instant(row.expires_at) <= now.getTime();
  const state = row.revoked_at && row.state !== 'deleted' ? 'revoked' : expired && row.state !== 'deleted' ? 'expired' : row.state;
  return {id: row.id, projectId: row.project_id, filename: row.filename, contentType: row.content_type,
    byteCount: Number(row.byte_count), state, createdAt: new Date(row.created_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(), canDownload: state === 'available'};
}

/** Server-side service only. Every operation authorizes the project, including metadata reads. */
export function createDocumentService(dependencies: Dependencies) {
  const {db} = dependencies;
  const now = dependencies.now ?? (() => new Date());
  function ready() {
    if (!documentExchangeReady(dependencies)) throw unavailable();
    return {storage: dependencies.storage!, scanner: dependencies.scanner!, policy: dependencies.policy!};
  }
  async function access(connection: Database, actor: Actor, projectId: string) {
    if (!uuid.test(projectId)) throw notFound();
    await requireProjectAccess(connection, actor, projectId);
    const project = await connection.query<{created_at: string | Date; expires_at: string | Date}>('SELECT created_at,expires_at FROM fv_projects WHERE id=$1 AND deleted_at IS NULL', [projectId]);
    if (!project.rows[0] || instant(project.rows[0].expires_at) <= now().getTime()) throw notFound();
    return {createdAt: instant(project.rows[0].created_at), expiresAt: instant(project.rows[0].expires_at)};
  }
  async function record(connection: Database, actor: Actor, projectId: string, documentId: string) {
    await access(connection, actor, projectId);
    if (!uuid.test(documentId)) throw notFound();
    const result = await connection.query<Row>('SELECT * FROM fv_documents WHERE id=$1 AND project_id=$2 AND state<>\'deleted\'', [documentId, projectId]);
    if (!result.rows[0]) throw notFound();
    return result.rows[0];
  }
  async function cleanObject(storage: StorageAdapter, row: Pick<Row, 'id' | 'storage_key'>) {
    let deleted = false;
    try {await storage.deletePrivate(row.storage_key); deleted = true;} catch { /* Access is already denied; keep an explicit retry flag. */ }
    await db.query('UPDATE fv_documents SET storage_cleanup_pending=$2 WHERE id=$1', [row.id, !deleted]);
    return deleted;
  }
  async function reject(actor: Actor, row: Pick<Row, 'id' | 'storage_key'>, code: string, storage: StorageAdapter) {
    await db.transaction(async connection => {
      await connection.query('UPDATE fv_documents SET state=\'rejected\', rejection_code=$2, storage_cleanup_pending=true WHERE id=$1 AND state IN (\'quarantined\',\'scanning\',\'available\')', [row.id, code]);
      await audit(connection, actor.id, 'document.rejected', row.id, {code});
    });
    await cleanObject(storage, row);
  }
  return {
    async upload(actor: Actor, projectId: string, input: DocumentUpload): Promise<DocumentSummary> {
      await access(db, actor, projectId);
      const {storage, scanner, policy} = ready();
      validateUpload(input, policy);
      // Own immutable bytes throughout validation, storage and scanning.
      const bytes = new Uint8Array(input.bytes);
      const id = crypto.randomUUID(), sha256 = digest(bytes), createdAt = now();
      const key = `projects/${projectId}/documents/${id}`;
      let row: Row;
      await db.transaction(async connection => {
        const project = await access(connection, actor, projectId);
        const expiresAt = new Date(Math.min(project.createdAt + policy.retentionDays * dayMs, project.expiresAt));
        if (expiresAt.getTime() <= createdAt.getTime()) throw new OperationError(409, 'document_retention_expired', 'The document retention period for this project has ended.');
        const inserted = await connection.query<Row>(`INSERT INTO fv_documents
          (id,project_id,uploaded_by,filename,content_type,byte_count,sha256,storage_key,state,policy_version,created_at,expires_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'quarantined',$9,$10,$11) RETURNING *`,
        [id, projectId, actor.id, input.filename, input.contentType, bytes.length, sha256, key, policy.version, createdAt.toISOString(), expiresAt.toISOString()]);
        row = inserted.rows[0];
        await audit(connection, actor.id, 'document.quarantined', id, {projectId, byteCount: bytes.length, policyVersion: policy.version});
      });
      try {
        await storage.putPrivate(key, bytes, {contentType: input.contentType, sha256});
        const changed = await db.query('UPDATE fv_documents SET state=\'scanning\' WHERE id=$1 AND state=\'quarantined\' AND revoked_at IS NULL', [id]);
        if (changed.rowCount !== 1) throw new OperationError(409, 'document_changed', 'The document is no longer available.');
        const verdict = await scanner.scan(new Uint8Array(bytes), {filename: input.filename, contentType: input.contentType, sha256});
        if (verdict !== 'clean') {
          await reject(actor, row!, verdict === 'infected' ? 'scan_rejected' : 'invalid_scan_result', storage);
          throw new OperationError(422, 'document_rejected', 'The document did not pass the required safety check.');
        }
        return await db.transaction(async connection => {
          await access(connection, actor, projectId);
          const available = await connection.query<Row>(`UPDATE fv_documents SET state='available', scanned_at=$2
            WHERE id=$1 AND state='scanning' AND revoked_at IS NULL AND expires_at>$2 RETURNING *`, [id, now().toISOString()]);
          if (!available.rows[0]) throw new OperationError(409, 'document_changed', 'The document is no longer available.');
          await audit(connection, actor.id, 'document.available', id, {projectId});
          return summary(available.rows[0], now());
        });
      } catch (error) {
        if (error instanceof OperationError && error.code === 'document_rejected') throw error;
        await reject(actor, row!, 'processing_failed', storage);
        throw new OperationError(503, 'document_processing_failed', 'The document could not be checked and is not available for download.');
      }
    },
    async list(actor: Actor, projectId: string): Promise<DocumentSummary[]> {
      await access(db, actor, projectId); ready();
      const result = await db.query<Row>('SELECT * FROM fv_documents WHERE project_id=$1 AND state<>\'deleted\' ORDER BY created_at DESC,id LIMIT 200', [projectId]);
      return result.rows.map(row => summary(row, now()));
    },
    async download(actor: Actor, projectId: string, documentId: string) {
      const row = await record(db, actor, projectId, documentId);
      const {storage, policy} = ready();
      if (!summary(row, now()).canDownload || !policy.allowedMimeTypes.includes(row.content_type) || Number(row.byte_count) > policy.maxBytes) {
        throw new OperationError(409, 'document_unavailable', 'This document is not available for download.');
      }
      let bytes: Uint8Array;
      try {bytes = await storage.readPrivate(row.storage_key, {maxBytes: Number(row.byte_count)});} catch {throw new OperationError(503, 'document_read_failed', 'The document could not be retrieved. Please try again later.');}
      if (bytes.length !== Number(row.byte_count) || digest(bytes) !== row.sha256) {
        await reject(actor, row, 'integrity_failure', storage);
        throw new OperationError(409, 'document_integrity_failed', 'The stored document could not be verified and is unavailable.');
      }
      // Recheck after I/O: a concurrent deletion, revocation or project change must take effect.
      const latest = await record(db, actor, projectId, documentId);
      if (!summary(latest, now()).canDownload) throw new OperationError(409, 'document_unavailable', 'This document is not available for download.');
      await audit(db, actor.id, 'document.downloaded', documentId, {projectId});
      const extension = row.content_type === 'application/pdf' ? 'pdf' : row.content_type === 'text/csv' ? 'csv' : 'txt';
      const encoded = encodeURIComponent(row.filename).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
      return {bytes: new Uint8Array(bytes), headers: {
        'Content-Type': row.content_type,
        'Content-Length': String(bytes.length),
        'Content-Disposition': `attachment; filename="document.${extension}"; filename*=UTF-8''${encoded}`,
        'Cache-Control': 'private, no-store, max-age=0',
        'Pragma': 'no-cache', 'Vary': 'Cookie, Authorization',
        'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox",
      }};
    },
    async delete(actor: Actor, projectId: string, documentId: string) {
      const row = await record(db, actor, projectId, documentId);
      const {storage} = ready();
      requireRetentionCleanup();
      await db.transaction(async connection => {
        await access(connection, actor, projectId);
        await connection.query('UPDATE fv_documents SET state=\'deleted\', revoked_at=$2, deleted_at=$2, storage_cleanup_pending=true WHERE id=$1 AND project_id=$3', [documentId, now().toISOString(), projectId]);
        await audit(connection, actor.id, 'document.deleted', documentId, {projectId});
      });
      return {id: documentId, state: 'deleted' as const, storageDeleted: await cleanObject(storage, row)};
    },
    async revoke(actor: Actor, projectId: string, documentId: string) {
      requireStaff(actor);
      await record(db, actor, projectId, documentId); ready();
      await db.transaction(async connection => {
        await access(connection, actor, projectId);
        await connection.query('UPDATE fv_documents SET state=\'revoked\', revoked_at=$2 WHERE id=$1 AND project_id=$3 AND state<>\'deleted\'', [documentId, now().toISOString(), projectId]);
        await audit(connection, actor.id, 'document.revoked', documentId, {projectId});
      });
      return {id: documentId, state: 'revoked' as const};
    },
    /** Wire to an approved, authenticated maintenance job; no scheduler is enabled by this module. */
    async purgeExpired(actor: Actor, projectId: string, limit = 50) {
      requireStaff(actor);
      // Authorize even after project expiry so staff can enforce retention.
      if (!uuid.test(projectId)) throw notFound();
      const project = await db.query('SELECT id FROM fv_projects WHERE id=$1', [projectId]);
      if (!project.rows.length) throw notFound();
      const {storage} = ready();
      requireRetentionCleanup();
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new OperationError(400, 'invalid_limit', 'Use a batch size from 1 to 100.');
      const result = await db.transaction(async connection => {
        // Verified staff may purge expired/deleted projects without reopening their contents.
        const project = await connection.query('SELECT id FROM fv_projects WHERE id=$1 FOR UPDATE', [projectId]);
        if (!project.rows.length) throw notFound();
        const rows = await connection.query<Row>(`SELECT * FROM fv_documents WHERE project_id=$1 AND
          ((expires_at<=$2 AND state<>'deleted') OR storage_cleanup_pending=true) ORDER BY created_at LIMIT $3 FOR UPDATE`, [projectId, now().toISOString(), limit]);
        for (const row of rows.rows) {
          await connection.query('UPDATE fv_documents SET state=\'deleted\', revoked_at=COALESCE(revoked_at,$2), deleted_at=COALESCE(deleted_at,$2), storage_cleanup_pending=true WHERE id=$1', [row.id, now().toISOString()]);
          await audit(connection, actor.id, 'document.retention_cleanup', row.id, {projectId});
        }
        return rows.rows;
      });
      let deleted = 0;
      for (const row of result) if (await cleanObject(storage, row)) deleted++;
      return {processed: result.length, storageDeleted: deleted, retryPending: result.length - deleted};
    },
  };
}
