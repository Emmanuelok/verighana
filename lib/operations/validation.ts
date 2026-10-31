import {z} from 'zod';
import {fullviewContact} from '../contact';
import {createHash} from 'node:crypto';
import {OperationError} from './core';
export const consentVersion='fullview-inquiry-v1';
export const inquirySchema=z.object({
 idempotencyKey:z.string().uuid(),name:z.string().trim().min(2).max(120),email:z.string().trim().email().max(254).transform(v=>v.toLowerCase()),
 subject:z.string().trim().min(5).max(200),message:z.string().trim().min(20).max(6000),
 consent:z.literal(true),consentVersion:z.literal(consentVersion),website:z.string().max(0),startedAt:z.number().int().positive(),
}).strict();
export const projectSubmitSchema=z.object({idempotencyKey:z.string().uuid(),consent:z.literal(true),consentVersion:z.literal(consentVersion),brief:z.unknown()}).strict();
export const uuid=z.string().uuid();
export function payloadHash(value: unknown){return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
export const maxPersonalDataRetentionDays=30;
function validRetentionDays(value:number){return Number.isInteger(value)&&value>=1&&value<=maxPersonalDataRetentionDays;}
const retentionUnavailable=()=>new OperationError(503,'retention_unconfigured',`Online project services are being connected. Please call Fullview on ${fullviewContact.phoneDisplay}.`);
/** No trigger is assumed. Completion-based retention needs an explicit lifecycle implementation first. */
export function retentionDays(){const value=Number(process.env.FULLVIEW_RETENTION_DAYS);if(process.env.FULLVIEW_RETENTION_TRIGGER!=='submission'||!validRetentionDays(value))throw retentionUnavailable();return value;}
/** Service arguments cannot silently replace the configured, owner-approved duration. */
export function requireRetentionDays(days:number){const configured=retentionDays();if(days!==configured)throw retentionUnavailable();return configured;}
export function retentionCleanupConfigured(){try{return process.env.FULLVIEW_RETENTION_CLEANUP_ENABLED==='true'&&retentionDays()>0;}catch{return false;}}
export function requireRetentionCleanup(){if(!retentionCleanupConfigured())throw new OperationError(503,'retention_cleanup_unconfigured','Record removal is unavailable until the retention policy is confirmed.');}
/** Pure duration helper. Quote validity and invoice due dates do not use this personal-data policy. */
export function expiry(days:number,now=new Date()){if(!validRetentionDays(days)||!Number.isFinite(now.valueOf()))throw retentionUnavailable();return new Date(now.valueOf()+days*86400000).toISOString();}
