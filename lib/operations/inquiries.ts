import {z} from 'zod';
import {audit,OperationError,requireStaff,type Actor,type Database} from './core';
import {inquirySchema,payloadHash,expiry,uuid} from './validation';
import {enqueueNotification,type NotificationState} from './email';
export async function rateLimit(db:Database,key:string,limit:number,now=new Date()){
 const window=Math.floor(now.valueOf()/600000);const bucket=`${window}:${key}`;
 const result=await db.query<{count:number}>('INSERT INTO fv_rate_limits(bucket,count,expires_at) VALUES($1,1,$2) ON CONFLICT(bucket) DO UPDATE SET count=fv_rate_limits.count+1 RETURNING count',[bucket,new Date((window+1)*600000).toISOString()]);
 if(result.rows[0].count>limit)throw new OperationError(429,'rate_limited','Too many requests. Please wait before trying again.');
}
export async function submitInquiry(db:Database,input:unknown,options:{retentionDays:number;ip:string;now?:Date}){
 const data=inquirySchema.parse(input), now=options.now??new Date();
 if(now.valueOf()-data.startedAt<3000||now.valueOf()-data.startedAt>86400000)throw new OperationError(400,'form_expired','Please review the form and try again.');
 const payload={name:data.name,email:data.email,subject:data.subject,message:data.message,consentVersion:data.consentVersion};const hash=payloadHash(payload);
 return db.transaction(async tx=>{
  await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))',[data.idempotencyKey]);
  const prior=(await tx.query<{id:string;reference:string;payload_hash:string}>('SELECT id,reference,payload_hash FROM fv_inquiries WHERE idempotency_key=$1',[data.idempotencyKey])).rows[0];
  if(prior){if(prior.payload_hash!==hash)throw new OperationError(409,'idempotency_conflict','This request changed. Review it before submitting as a new inquiry.');return {...prior,replayed:true};}
  await rateLimit(tx,`ip:${payloadHash(options.ip)}`,10,now);await rateLimit(tx,`email:${payloadHash(data.email)}`,5,now);
  const id=crypto.randomUUID(),reference=`FVS-${id.replaceAll('-','').slice(0,16).toUpperCase()}`;
  await tx.query('INSERT INTO fv_inquiries(id,reference,idempotency_key,payload_hash,data,expires_at) VALUES($1,$2,$3,$4,$5::jsonb,$6)',[id,reference,data.idempotencyKey,hash,JSON.stringify({...payload,consentedAt:now.toISOString()}),expiry(options.retentionDays,now)]);
  await enqueueNotification(tx,id,'inquiry',{...payload,reference});await audit(tx,null,'inquiry.submitted',id,{consentVersion:data.consentVersion});return {id,reference,replayed:false};
 });
}
export async function listInquiries(db:Database,actor:Actor){requireStaff(actor);return (await db.query('SELECT i.id,i.reference,i.data,i.status,i.assigned_to,i.version,i.created_at,o.state AS notification FROM fv_inquiries i LEFT JOIN fv_email_outbox o ON o.resource_id=i.id WHERE i.expires_at>now() ORDER BY i.created_at DESC LIMIT 100')).rows;}
export async function updateInquiry(db:Database,actor:Actor,id:string,input:unknown){requireStaff(actor);uuid.parse(id);const data=z.object({version:z.number().int().positive(),status:z.enum(['new','scoped','closed']),assignedTo:z.string().min(1).nullable()}).strict().parse(input);
 return db.transaction(async tx=>{if(data.assignedTo&&!(await tx.query('SELECT user_id FROM fv_staff WHERE user_id=$1 AND active=true',[data.assignedTo])).rows.length)throw new OperationError(400,'invalid_assignee','Choose an active staff member.');
 const row=(await tx.query('UPDATE fv_inquiries SET status=$2,assigned_to=$3,version=version+1,updated_at=now() WHERE id=$1 AND version=$4 AND expires_at>now() RETURNING id,status,assigned_to,version',[id,data.status,data.assignedTo,data.version])).rows[0];
 if(!row)throw new OperationError(409,'record_changed','The inquiry changed. Refresh before updating.');await audit(tx,actor.id,'inquiry.updated',id,{status:data.status,assignedTo:data.assignedTo});return row;});
}
export async function notificationState(db:Database,id:string):Promise<NotificationState>{return (await db.query<{state:NotificationState}>('SELECT state FROM fv_email_outbox WHERE resource_id=$1',[id])).rows[0]?.state??'pending';}
