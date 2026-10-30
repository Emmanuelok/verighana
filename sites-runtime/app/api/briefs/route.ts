import { getChatGPTUser } from '../../chatgpt-auth';
import { getDb } from '../../../db';
import { briefs } from '../../../db/schema';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { audienceIds, services, estimateTotal, type Audience } from '../../../lib/catalog';

export const dynamic = 'force-dynamic';
const noCache = {'Cache-Control':'private, no-store'};
const schema = z.object({
  name:z.string().trim().min(2).max(120), email:z.string().trim().email().max(254),
  organisation:z.string().trim().max(200).default(''),
  audience:z.enum(audienceIds),
  title:z.string().trim().min(8).max(200), description:z.string().trim().min(40).max(6000),
  deadline:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const date=new Date(v+'T00:00:00Z');return !Number.isNaN(date.valueOf())&&date.toISOString().slice(0,10)===v&&v>=new Date().toISOString().slice(0,10)},'Choose a valid future date.'),
  budget:z.enum(['Under GHS 2,000','GHS 2,000–5,000','GHS 5,000–15,000','GHS 15,000–50,000','GHS 50,000+','Please advise']),
  selections:z.array(z.object({id:z.string().max(80),quantity:z.number().int().min(1).max(500)})).max(12),
  consent:z.literal(true),
});
function validOrigin(request:Request){const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin;}
export async function GET(){
  const user=await getChatGPTUser();
  if(!user)return Response.json({error:'Sign in to open your research desk.'},{status:401,headers:noCache});
  try{
    const rows=await getDb().select().from(briefs).where(eq(briefs.ownerId,user.userId)).orderBy(desc(briefs.createdAt)).limit(100);
    return Response.json({briefs:rows.map(({ownerId,...brief})=>({...brief,selections:JSON.parse(brief.selections)}))},{headers:noCache});
  }catch{return Response.json({error:'Your research desk is temporarily unavailable. Please try again.'},{status:503,headers:noCache});}
}
export async function POST(request:Request){
  if(!validOrigin(request))return Response.json({error:'Please submit from this website.'},{status:403});
  const user=await getChatGPTUser();
  if(!user)return Response.json({error:'Sign in before submitting your brief.'},{status:401,headers:noCache});
  if(Number(request.headers.get('content-length')||0)>22000)return Response.json({error:'The brief is too long.'},{status:413});
  let input:unknown;
  try{const body=await request.text();if(body.length>22000)return Response.json({error:'The brief is too long.'},{status:413});input=JSON.parse(body);}catch{return Response.json({error:'Please check the form and try again.'},{status:400});}
  const parsed=schema.safeParse(input);
  if(!parsed.success)return Response.json({error:parsed.error.issues[0]?.message||'Please check your brief.'},{status:400});
  const {consent,...data}=parsed.data;
  if(new Set(data.selections.map(s=>s.id)).size!==data.selections.length||data.selections.some(item=>!services.some(s=>s.id===item.id&&s.audiences.includes(data.audience))))return Response.json({error:'Please review the services selected for your research pathway.'},{status:400});
  try{
    const db=getDb();
    const [recent]=await db.select({count:sql<number>`count(*)`}).from(briefs).where(and(eq(briefs.ownerId,user.userId),gte(briefs.createdAt,new Date(Date.now()-3600000).toISOString())));
    if(recent.count>=10)return Response.json({error:'You have submitted several briefs recently. Please return in an hour.'},{status:429});
    const brief={...data,id:'VRG-'+crypto.randomUUID().slice(0,8).toUpperCase(),ownerId:user.userId,selections:JSON.stringify(data.selections),estimate:estimateTotal(data.selections,data.audience as Audience),status:'Submitted',createdAt:new Date().toISOString()};
    await db.insert(briefs).values(brief);
    const {ownerId,...receipt}=brief;
    return Response.json({brief:{...receipt,selections:data.selections}},{status:201,headers:noCache});
  }catch{return Response.json({error:'We could not save your brief. Your form is still here; please try again.'},{status:503,headers:noCache});}
}
export async function DELETE(request:Request){
  if(!validOrigin(request))return Response.json({error:'Request not allowed.'},{status:403});
  const user=await getChatGPTUser();
  if(!user)return Response.json({error:'Please sign in.'},{status:401});
  const id=new URL(request.url).searchParams.get('id');
  if(!id||!/^VRG-[A-F0-9]{8}$/.test(id))return Response.json({error:'Invalid brief reference.'},{status:400});
  try{await getDb().delete(briefs).where(and(eq(briefs.id,id),eq(briefs.ownerId,user.userId)));return Response.json({deleted:true},{headers:noCache});}
  catch{return Response.json({error:'Could not delete this brief. Please try again.'},{status:503});}
}
