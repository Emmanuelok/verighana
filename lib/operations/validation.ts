import {z} from 'zod';
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
export function retentionDays(){const value=Number(process.env.FULLVIEW_RETENTION_DAYS);if(!Number.isInteger(value)||value<1||value>3650)throw new OperationError(503,'retention_unconfigured','Online project services are being connected. Please email Fullview.');return value;}
export function expiry(days:number,now=new Date()){if(!Number.isInteger(days)||days<1||days>3650)throw new OperationError(503,'retention_unconfigured','A retention policy is required.');return new Date(now.valueOf()+days*86400000).toISOString();}
