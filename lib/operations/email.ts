import {fullviewContact} from '../contact';
import {type Database,OperationError} from './core';
export type NotificationState='pending'|'sending'|'accepted'|'failed'|'unknown';
export type EmailPayload={reference:string;name:string;email:string;subject:string;message:string};
const expiredLeaseSql="COALESCE(last_attempt_at,created_at)<=now()-interval '2 minutes'";
const retryWindowSql="attempts<3 AND created_at>now()-interval '23 hours'";
export type StaffNotification={id:string;resource_id:string;state:NotificationState;attempts:number;error_code:string|null;created_at:string;leaseExpired:boolean;retryAllowed:boolean;manualReviewRequired:boolean};
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
/** Database time decides eligibility; reading the staff queue never sends or changes a lease. */
export async function listStaffNotifications(db:Database):Promise<StaffNotification[]>{
 return (await db.query<StaffNotification>(`SELECT id,resource_id,state,attempts,error_code,created_at,
   (state='sending' AND ${expiredLeaseSql}) AS "leaseExpired",
   ((state<>'sending' OR ${expiredLeaseSql}) AND ${retryWindowSql}) AS "retryAllowed",
   ((state<>'sending' OR ${expiredLeaseSql}) AND NOT (${retryWindowSql})) AS "manualReviewRequired"
   FROM fv_email_outbox WHERE state<>'accepted' ORDER BY created_at DESC LIMIT 100`)).rows;
}
/** Reconcile only an expired lease. Never calls a sender, changes attempts or assumes delivery failed. */
export async function reconcileExpiredNotificationLease(db:Database,resourceId:string){
 await db.query(`UPDATE fv_email_outbox SET state='unknown',
   error_code=CASE WHEN ${retryWindowSql} THEN 'email_sending_lease_expired' ELSE 'email_manual_review_required' END,updated_at=now()
   WHERE resource_id=$1 AND state='sending' AND ${expiredLeaseSql}`,[resourceId]);
}
/** A short sending lease can be recovered after a crashed worker, without changing the provider idempotency key. */
export async function dispatchNotification(db:Database,resourceId:string,sender=sendOfficeNotification):Promise<NotificationState>{
 await reconcileExpiredNotificationLease(db,resourceId);
 const row=(await db.query<{id:string;payload:EmailPayload;attempts:number}>(`UPDATE fv_email_outbox
   SET state='sending',attempts=attempts+1,last_attempt_at=now(),updated_at=now()
   WHERE resource_id=$1
     AND state IN ('pending','failed','unknown')
     AND ${retryWindowSql}
   RETURNING id,payload,attempts`,[resourceId])).rows[0];
 const current=async(connection=db)=>{const notification=(await connection.query<{state:NotificationState}>('SELECT state FROM fv_email_outbox WHERE resource_id=$1',[resourceId])).rows[0];if(!notification)throw new OperationError(404,'notification_not_found','This notification is no longer available.');return notification.state;};
 if(!row)return current();
 return db.transaction(async tx=>{
  // Fence a worker paused after claiming. Keep the row locked across the bounded sender:
  // reconciliation/purge cannot overtake a worker paused immediately before its HTTP call.
  const guarded=await tx.query(`SELECT id FROM fv_email_outbox WHERE id=$1 AND state='sending' AND attempts=$2
    AND COALESCE(last_attempt_at,created_at)>clock_timestamp()-interval '2 minutes'
    AND created_at>clock_timestamp()-interval '23 hours' FOR UPDATE`,[row.id,row.attempts]);
  if(!guarded.rows.length)return current(tx);
  try{
    const result=await sender(row.payload,`fullview-inquiry-${row.id}`);
    const updated=await tx.query(`UPDATE fv_email_outbox SET state='accepted',provider_id=$2,error_code=NULL,updated_at=now()
      WHERE id=$1 AND state='sending' AND attempts=$3`,[row.id,result.id,row.attempts]);
    return updated.rowCount ? 'accepted' : current(tx);
  }catch(error){
    const state=error instanceof OperationError?'failed':'unknown';
    const updated=await tx.query(`UPDATE fv_email_outbox SET state=$2,error_code=$3,updated_at=now()
      WHERE id=$1 AND state='sending' AND attempts=$4`,[row.id,state,error instanceof OperationError?error.code:'email_result_unknown',row.attempts]);
    return updated.rowCount ? state : current(tx);
  }
 });
}
