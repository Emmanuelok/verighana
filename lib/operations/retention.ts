import {z} from 'zod';
import {audit,OperationError,requireStaff,type Actor,type Database} from './core';
import {uuid} from './validation';
import {reconcileExpiredNotificationLease} from './email';

export type RetentionReview={
 kind:'project'|'inquiry';id:string;reference:string;status:string;createdAt:string;expiresAt:string;
 reason:'expired'|'deletion_requested';deletionRequestStatus:null|'pending'|'in_review';documentCleanupRequired:boolean;
};
type ReviewRow={id:string;reference:string;status:string;created_at:Date|string;expires_at:Date|string;expired:boolean;deletion_status:null|'pending'|'in_review';document_cleanup_required:boolean};
function requireAdmin(actor:Actor){requireStaff(actor);if(actor.role!=='admin')throw new OperationError(403,'admin_required','An administrator must review retention obligations before removing records.');}
function iso(value:Date|string){return value instanceof Date?value.toISOString():new Date(value).toISOString();}
function review(kind:RetentionReview['kind'],row:ReviewRow):RetentionReview{return {kind,id:row.id,reference:row.reference,status:row.status,createdAt:iso(row.created_at),expiresAt:iso(row.expires_at),reason:row.expired?'expired':'deletion_requested',deletionRequestStatus:row.deletion_status,documentCleanupRequired:row.document_cleanup_required};}

/** Metadata only. Expiry makes a record eligible for human review, never automatic deletion. */
export async function listRetentionReviews(db:Database,actor:Actor):Promise<RetentionReview[]>{
 requireAdmin(actor);
 const inquiries=await db.query<ReviewRow>(`SELECT id,reference,status,created_at,expires_at,true AS expired,
   NULL::text AS deletion_status,false AS document_cleanup_required
   FROM fv_inquiries WHERE expires_at<=now() ORDER BY expires_at ASC,id ASC LIMIT 200`);
 const projects=await db.query<ReviewRow>(`SELECT p.id,p.reference,p.status,p.created_at,p.expires_at,p.expires_at<=now() AS expired,
   d.status AS deletion_status,EXISTS(SELECT 1 FROM fv_documents f WHERE f.project_id=p.id
     AND (f.state<>'deleted' OR f.storage_cleanup_pending=true)) AS document_cleanup_required
   FROM fv_projects p LEFT JOIN fv_deletion_requests d ON d.project_id=p.id
   WHERE p.expires_at<=now() OR d.status='in_review' ORDER BY p.expires_at ASC,p.id ASC LIMIT 200`);
 return [...inquiries.rows.map(row=>review('inquiry',row)),...projects.rows.map(row=>review('project',row))]
  .sort((a,b)=>a.expiresAt.localeCompare(b.expiresAt)||a.id.localeCompare(b.id));
}

const purgeSchema=z.object({kind:z.enum(['project','inquiry']),id:uuid,confirmReference:z.string().min(1).max(100),retentionCleared:z.literal(true)}).strict();
type RecordRow={id:string;reference:string;expired:boolean};

/** An administrator must explicitly clear business retention obligations. Storage deletion is handled separately. */
export async function purgeReviewedRecord(db:Database,actor:Actor,input:unknown){
 requireAdmin(actor);const data=purgeSchema.parse(input);
 return db.transaction(async tx=>{
  // Lock the parent first: foreign-key inserts must finish before this lock, or fail after deletion.
  const record=(await tx.query<RecordRow>(data.kind==='project'
   ?'SELECT id,reference,expires_at<=now() AS expired FROM fv_projects WHERE id=$1 FOR UPDATE'
   :'SELECT id,reference,expires_at<=now() AS expired FROM fv_inquiries WHERE id=$1 FOR UPDATE',[data.id])).rows[0];
  if(!record)throw new OperationError(404,'record_not_found','Record not found.');
  if(data.confirmReference!==record.reference)throw new OperationError(409,'reference_mismatch','Enter the exact reference of the record being removed.');
  if(data.kind==='project'){
   const request=(await tx.query<{status:string}>('SELECT status FROM fv_deletion_requests WHERE project_id=$1 FOR UPDATE',[data.id])).rows[0];
   if(!record.expired&&request?.status!=='in_review')throw new OperationError(409,'retention_review_required','Only an expired project or a deletion request under review can be removed.');
   const documents=await tx.query<{state:string;storage_cleanup_pending:boolean}>('SELECT state,storage_cleanup_pending FROM fv_documents WHERE project_id=$1 FOR UPDATE',[data.id]);
   if(documents.rows.some(file=>file.state!=='deleted'||file.storage_cleanup_pending))throw new OperationError(409,'document_cleanup_required','Delete all project files and confirm private storage cleanup before removing the project record.');
  }else if(!record.expired)throw new OperationError(409,'retention_review_required','Only an expired inquiry can be removed.');
  // This no-send reconciliation holds its updated-row locks until this transaction ends.
  // A sender holding the row lock finishes first; a later guarded sender sees the deleted row.
  await reconcileExpiredNotificationLease(tx,data.id);
  const notifications=await tx.query<{state:string}>('SELECT state FROM fv_email_outbox WHERE resource_id=$1 FOR UPDATE',[data.id]);
  if(notifications.rows.some(notification=>notification.state==='sending'))throw new OperationError(409,'notification_in_flight','Resolve the notification delivery state before removing this record.');
  await tx.query('DELETE FROM fv_email_outbox WHERE resource_id=$1',[data.id]);
  if(data.kind==='project'){
   await tx.query('DELETE FROM fv_messages WHERE project_id=$1',[data.id]);
   await tx.query('DELETE FROM fv_invoices WHERE project_id=$1',[data.id]);
   await tx.query('DELETE FROM fv_quotes WHERE project_id=$1',[data.id]);
   await tx.query('DELETE FROM fv_documents WHERE project_id=$1',[data.id]);
   await tx.query('DELETE FROM fv_deletion_requests WHERE project_id=$1',[data.id]);
   await tx.query('DELETE FROM fv_projects WHERE id=$1',[data.id]);
  }else await tx.query('DELETE FROM fv_inquiries WHERE id=$1',[data.id]);
  await audit(tx,actor.id,'retention.record_purged',data.id,{kind:data.kind,reference:record.reference});
  return {purged:true as const,kind:data.kind,id:data.id,reference:record.reference};
 });
}
