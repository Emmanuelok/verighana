import {context,readJson,respond} from '../../../lib/operations/http';
import {listProjects,submitProject} from '../../../lib/operations/projects';
import {dispatchNotification} from '../../../lib/operations/email';
import {retentionDays,consentVersion} from '../../../lib/operations/validation';
export const dynamic='force-dynamic';
export async function GET(){return respond(async()=>{const {db,actor}=await context();return {actor:{id:actor.id,email:actor.email,role:actor.role},projects:await listProjects(db,actor),retentionDays:retentionDays(),consentVersion,uploadsAvailable:false,checkoutEnabled:false};});}
export async function POST(request:Request){return respond(async()=>{const input=await readJson(request);const {db,actor}=await context();const result=await submitProject(db,actor,input,retentionDays());const notification=await dispatchNotification(db,result.id);return {...result,notification,message:'Project submitted to Fullview. This is not a confirmed booking or payment.'};},201);}
