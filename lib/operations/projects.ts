import {z} from 'zod';
import {services,rate} from '../catalog';
import {validateBrief} from '../local-briefs';
import {audit,requireProjectAccess,requireStaff,requireVerified,OperationError,type Actor,type Database} from './core';
import {projectSubmitSchema,payloadHash,expiry,uuid} from './validation';
import {enqueueNotification} from './email';
import {rateLimit} from './inquiries';
export async function submitProject(db:Database,actor:Actor,input:unknown,retention:number){requireVerified(actor);const data=projectSubmitSchema.parse(input),brief=validateBrief(data.brief);if(brief.email.toLowerCase()!==actor.email.toLowerCase())throw new OperationError(400,'email_mismatch','Use the verified account email for this project.');
 const hash=payloadHash(brief);return db.transaction(async tx=>{await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`${actor.id}:${data.idempotencyKey}`]);const previous=(await tx.query<{id:string;reference:string;payload_hash:string}>('SELECT id,reference,payload_hash FROM fv_projects WHERE owner_id=$1 AND idempotency_key=$2',[actor.id,data.idempotencyKey])).rows[0];if(previous){if(previous.payload_hash!==hash)throw new OperationError(409,'idempotency_conflict','This submission changed. Review before submitting again.');return {id:previous.id,reference:previous.reference};}
 await rateLimit(tx,`project:${actor.id}`,5);const id=crypto.randomUUID(),reference=`FVP-${id.replaceAll('-','').slice(0,16).toUpperCase()}`;
 const lines=brief.selections.map(item=>{const service=services.find(s=>s.id===item.id)!;return {id:item.id,title:service.title,quantity:item.quantity,unit:service.unit,unitPrice:rate(service,brief.audience),deliverables:service.deliverables};});
 const stored={...brief,consentVersion:data.consentVersion,consentedAt:new Date().toISOString(),priceSnapshot:{version:1,currency:'GHS',capturedAt:new Date().toISOString(),lines},estimate:lines.reduce((a,l)=>a+l.quantity*l.unitPrice,0)};
 await tx.query('INSERT INTO fv_projects(id,reference,owner_id,idempotency_key,payload_hash,title,description,brief,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)',[id,reference,actor.id,data.idempotencyKey,hash,brief.title,brief.description,JSON.stringify(stored),expiry(retention)]);
 await enqueueNotification(tx,id,'project',{reference,name:brief.name,email:actor.email,subject:brief.title,message:`A verified client explicitly submitted a project. Review the complete brief in the staff workspace.\nRequested completion: ${brief.deadline}\nPlanning estimate: GHS ${stored.estimate}\nNo booking or payment has been confirmed.`});await audit(tx,actor.id,'project.submitted',id,{consentVersion:data.consentVersion});return {id,reference};});
}
export async function listProjects(db:Database,actor:Actor){requireVerified(actor);return (await db.query("SELECT id,reference,CASE WHEN expires_at>now() THEN title ELSE 'Expired project' END AS title,status,assigned_to,version,created_at,expires_at<=now() AS expired FROM fv_projects WHERE deleted_at IS NULL AND (owner_id=$1 OR $2=true) ORDER BY created_at DESC LIMIT 100",[actor.id,actor.role!=='client'])).rows;}
export type ProjectMessage={id:string;author_id:string;body:string;created_at:string};
export type ProjectMessagePage={messages:ProjectMessage[];hasMore:boolean;nextCursor:string|null};
const messagePageSchema=z.object({before:z.string().min(1).max(512).optional(),limit:z.number().int().min(1).max(200).default(200)}).strict();
const messageCursorSchema=z.object({v:z.literal(1),p:uuid,t:z.string().datetime({precision:6}),i:uuid}).strict();
function messageCursor(value:string,projectId:string){
 try{
  if(!/^[A-Za-z0-9_-]+$/.test(value))throw new Error('Invalid encoding');
  const decoded=Buffer.from(value,'base64url');
  if(decoded.toString('base64url')!==value)throw new Error('Noncanonical encoding');
  const cursor=messageCursorSchema.parse(JSON.parse(decoded.toString('utf8')));
  if(cursor.p!==projectId)throw new Error('Wrong project');
  return cursor;
 }catch{throw new OperationError(400,'invalid_message_cursor','The message history position is invalid. Refresh the project and try again.');}
}
/** Cursors locate messages only; every page requires current verified project access. */
export async function listProjectMessages(db:Database,actor:Actor,id:string,input:unknown={}):Promise<ProjectMessagePage>{
 uuid.parse(id);const options=messagePageSchema.parse(input);await requireProjectAccess(db,actor,id);
 const before=options.before?messageCursor(options.before,id):null;
 // Preserve PostgreSQL microseconds in the cursor and response to prevent timestamp-tie gaps.
 const rows=(await db.query<ProjectMessage>(`SELECT m.id,m.author_id,m.body,
   to_char(m.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at
   FROM fv_messages m WHERE m.project_id=$1
   ${before?'AND (m.created_at,m.id)<($3::timestamptz,$4::uuid)':''}
   ORDER BY m.created_at DESC,m.id DESC LIMIT $2`,before?[id,options.limit+1,before.t,before.i]:[id,options.limit+1])).rows;
 const hasMore=rows.length>options.limit,messages=rows.slice(0,options.limit).reverse(),oldest=messages[0];
 const nextCursor=hasMore&&oldest?Buffer.from(JSON.stringify({v:1,p:id,t:oldest.created_at,i:oldest.id})).toString('base64url'):null;
 return {messages,hasMore,nextCursor};
}
export async function projectDetail(db:Database,actor:Actor,id:string){uuid.parse(id);await requireProjectAccess(db,actor,id);const result=(await db.query('SELECT id,reference,title,description,brief,status,assigned_to,version,created_at,expires_at FROM fv_projects WHERE id=$1 AND expires_at>now()',[id])).rows[0];if(!result)throw new OperationError(404,'project_not_found','Project not found.');const {messages,hasMore,nextCursor}=await listProjectMessages(db,actor,id);return {...result,messages,messageHistory:{hasMore,nextCursor}};}
const transitions:Record<string,string[]>={new:['scoped','closed'],scoped:['new','closed'],quoted:['closed'],accepted:['in_progress','closed'],in_progress:['delivered','closed'],delivered:['closed'],closed:[]};
export async function updateProject(db:Database,actor:Actor,id:string,input:unknown){requireStaff(actor);uuid.parse(id);const data=z.object({version:z.number().int().positive(),status:z.string(),assignedTo:z.string().min(1).nullable()}).strict().parse(input);return db.transaction(async tx=>{
 await requireProjectAccess(tx,actor,id);const current=(await tx.query<{status:string}>('SELECT status FROM fv_projects WHERE id=$1 FOR UPDATE',[id])).rows[0];if(data.status!==current.status&&!transitions[current.status]?.includes(data.status))throw new OperationError(409,'invalid_transition','This status requires the quote or client acceptance workflow.');
 if(data.assignedTo&&!(await tx.query('SELECT user_id FROM fv_staff WHERE user_id=$1 AND active=true',[data.assignedTo])).rows.length)throw new OperationError(400,'invalid_assignee','Choose an active staff member.');
 const result=(await tx.query('UPDATE fv_projects SET status=$2,assigned_to=$3,version=version+1,updated_at=now() WHERE id=$1 AND version=$4 RETURNING id,status,assigned_to,version',[id,data.status,data.assignedTo,data.version])).rows[0];if(!result)throw new OperationError(409,'record_changed','The project changed. Refresh before updating.');await audit(tx,actor.id,'project.updated',id,{status:data.status,assignedTo:data.assignedTo});return result;});}
export async function addMessage(db:Database,actor:Actor,id:string,input:unknown){uuid.parse(id);const {body}=z.object({body:z.string().trim().min(1).max(4000)}).strict().parse(input);return db.transaction(async tx=>{await requireProjectAccess(tx,actor,id);await rateLimit(tx,`message:${actor.id}`,20);const messageId=crypto.randomUUID();await tx.query('INSERT INTO fv_messages(id,project_id,author_id,body) VALUES($1,$2,$3,$4)',[messageId,id,actor.id,body]);await audit(tx,actor.id,'project.message_added',id,{messageId});return {id:messageId};});}
export async function requestProjectDeletion(db:Database,actor:Actor,id:string){
 requireVerified(actor);uuid.parse(id);return db.transaction(async tx=>{
  // Retention expiry closes content access, but must not prevent its owner from requesting removal.
  const project=(await tx.query<{id:string;owner_id:string}>('SELECT id,owner_id FROM fv_projects WHERE id=$1 AND (owner_id=$2 OR $3=true) FOR UPDATE',[id,actor.id,actor.role!=='client'])).rows[0];
  if(!project)throw new OperationError(404,'project_not_found','Project not found.');
  if(project.owner_id!==actor.id&&actor.role!=='admin')throw new OperationError(403,'owner_required','Only the client or an administrator may request deletion.');
  const created=(await tx.query<{id:string;status:'pending'|'in_review'}>(`INSERT INTO fv_deletion_requests(id,project_id,requested_by)
    VALUES($1,$2,$3) ON CONFLICT(project_id) DO NOTHING RETURNING id,status`,[crypto.randomUUID(),id,actor.id])).rows[0];
  const request=created??(await tx.query<{id:string;status:'pending'|'in_review'}>('SELECT id,status FROM fv_deletion_requests WHERE project_id=$1',[id])).rows[0];
  if(created)await audit(tx,actor.id,'project.deletion_requested',id,{requestId:created.id});
  return {requested:true,requestId:request.id,status:request.status,message:'Deletion requested. Staff must review retention obligations and complete deletion; this request does not confirm removal.'};
 });
}
export async function listDeletionRequests(db:Database,actor:Actor){
 requireStaff(actor);
 return (await db.query(`SELECT d.id,d.project_id,p.reference,d.requested_by,d.status,d.version,d.created_at,d.updated_at,d.reviewed_by
   FROM fv_deletion_requests d JOIN fv_projects p ON p.id=d.project_id ORDER BY d.created_at ASC LIMIT 100`)).rows;
}
/** Review status only: never mark completed until a separate, storage-aware purge has actually succeeded. */
export async function reviewDeletionRequest(db:Database,actor:Actor,id:string,input:unknown){
 requireStaff(actor);if(actor.role!=='admin')throw new OperationError(403,'admin_required','An administrator must review deletion requests.');
 uuid.parse(id);const data=z.object({version:z.number().int().positive(),status:z.enum(['pending','in_review'])}).strict().parse(input);
 return db.transaction(async tx=>{
  const result=(await tx.query(`UPDATE fv_deletion_requests SET status=$2,reviewed_by=$3,version=version+1,updated_at=now()
    WHERE id=$1 AND version=$4 RETURNING id,project_id,status,version,reviewed_by,updated_at`,[id,data.status,actor.id,data.version])).rows[0];
  if(!result)throw new OperationError(409,'record_changed','The deletion request changed. Refresh before reviewing.');
  await audit(tx,actor.id,'project.deletion_reviewed',id,{status:data.status});return result;
 });
}
