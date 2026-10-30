import {fullviewContact} from '../contact';
import {type Database,OperationError} from './core';
export type NotificationState='pending'|'sending'|'accepted'|'failed'|'unknown';
export type EmailPayload={reference:string;name:string;email:string;subject:string;message:string};
export function emailConfigured(){return !!process.env.FULLVIEW_RESEND_API_KEY && process.env.FULLVIEW_EMAIL_FROM === fullviewContact.email;}
export async function enqueueNotification(db:Database,resourceId:string,kind:string,payload:EmailPayload){
 await db.query('INSERT INTO fv_email_outbox(id,resource_id,kind,payload) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(resource_id,kind) DO NOTHING',[crypto.randomUUID(),resourceId,kind,JSON.stringify(payload)]);
}
/** Only office notifications. Never auto-send to the visitor or accept a recipient from request data. */
export async function sendOfficeNotification(payload:EmailPayload,idempotencyKey:string,fetcher:typeof fetch=fetch):Promise<{id:string}>{
 if(!emailConfigured())throw new OperationError(503,'email_unconfigured','Inquiry email delivery is not configured.');
 const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.FULLVIEW_RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body:JSON.stringify({from:`Fullview Signature <${fullviewContact.email}>`,to:[fullviewContact.email],reply_to:payload.email,subject:`Fullview inquiry ${payload.reference}: ${payload.subject.replace(/[\r\n]/g,' ')}`,text:`Inquiry ${payload.reference}\n\nFrom: ${payload.name}\nEmail: ${payload.email}\n\n${payload.message}\n\nThis is an inquiry, not a confirmed booking or payment. Review it in the staff workspace. A provider acceptance does not confirm mailbox delivery.`}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new OperationError(response.status>=500||response.status===429?503:502,`email_provider_${response.status}`,'The inquiry was recorded, but the email provider has not accepted the notification.');
 const result=await response.json() as {id?:unknown};if(typeof result.id!=='string')throw new Error('Email provider returned no receipt');return {id:result.id};
}
/** A short sending lease can be recovered after a crashed worker, without changing the provider idempotency key. */
export async function dispatchNotification(db:Database,resourceId:string,sender=sendOfficeNotification):Promise<NotificationState>{
 await db.query(`UPDATE fv_email_outbox SET state='unknown',error_code='email_manual_review_required',updated_at=now()
   WHERE resource_id=$1 AND state='sending' AND COALESCE(last_attempt_at,created_at)<now()-interval '2 minutes'
     AND (attempts>=3 OR created_at<=now()-interval '23 hours')`,[resourceId]);
 const row=(await db.query<{id:string;payload:EmailPayload;attempts:number}>(`UPDATE fv_email_outbox
   SET state='sending',attempts=attempts+1,last_attempt_at=now(),updated_at=now()
   WHERE resource_id=$1
     AND (state IN ('pending','failed','unknown') OR (state='sending' AND COALESCE(last_attempt_at,created_at)<now()-interval '2 minutes'))
     AND created_at>now()-interval '23 hours' AND attempts<3
   RETURNING id,payload,attempts`,[resourceId])).rows[0];
 const current=async()=> (await db.query<{state:NotificationState}>('SELECT state FROM fv_email_outbox WHERE resource_id=$1',[resourceId])).rows[0]?.state??'pending';
 if(!row)return current();
 try{
   const result=await sender(row.payload,`fullview-inquiry-${row.id}`);
   const updated=await db.query(`UPDATE fv_email_outbox SET state='accepted',provider_id=$2,error_code=NULL,updated_at=now()
     WHERE id=$1 AND state IN ('sending','unknown') AND attempts=$3`,[row.id,result.id,row.attempts]);
   return updated.rowCount ? 'accepted' : current();
 }catch(error){
   const state=error instanceof OperationError?'failed':'unknown';
   const updated=await db.query(`UPDATE fv_email_outbox SET state=$2,error_code=$3,updated_at=now()
     WHERE id=$1 AND state='sending' AND attempts=$4`,[row.id,state,error instanceof OperationError?error.code:'email_result_unknown',row.attempts]);
   return updated.rowCount ? state : current();
 }
}
