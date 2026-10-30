import {fullviewContact} from '../../../lib/contact';
import {databaseConfigured,getDatabase} from '../../../lib/operations/database';
import {emailConfigured,dispatchNotification} from '../../../lib/operations/email';
import {submitInquiry} from '../../../lib/operations/inquiries';
import {clientAddress,privateHeaders,readJson,respond} from '../../../lib/operations/http';
import {consentVersion,retentionDays} from '../../../lib/operations/validation';
import {OperationError} from '../../../lib/operations/core';
export const dynamic='force-dynamic';
export async function GET(){let retention:number|null=null;try{retention=retentionDays();}catch{}return Response.json({available:databaseConfigured()&&emailConfigured()&&!!process.env.FULLVIEW_APP_ORIGIN&&retention!==null,recipient:fullviewContact.email,consentVersion,retentionDays:retention},{headers:privateHeaders});}
export async function POST(request:Request){return respond(async()=>{const input=await readJson(request);if(!emailConfigured())throw new OperationError(503,'email_unavailable','Online inquiry delivery is being connected. Please email fvsignature@veridanth.com.');const db=getDatabase();const result=await submitInquiry(db,input,{retentionDays:retentionDays(),ip:clientAddress(request)});const notification=await dispatchNotification(db,result.id);return {reference:result.reference,notification:notification==='sending'?'unknown':notification,message:notification==='accepted'?'Your inquiry is recorded. The email provider accepted the office notification; mailbox delivery is not yet confirmed.':'Your inquiry is recorded. The office email notification is not confirmed. Keep your reference and contact Fullview if needed.'};},201);}
