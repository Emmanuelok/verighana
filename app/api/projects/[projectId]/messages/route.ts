import {context,readJson,respond} from '../../../../../lib/operations/http';
import {addMessage,listProjectMessages} from '../../../../../lib/operations/projects';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{projectId:string}>}){return respond(async()=>{const search=new URL(request.url).searchParams;const {db,actor}=await context();return listProjectMessages(db,actor,(await params).projectId,{...(search.has('before')?{before:search.get('before')}:{}),...(search.has('limit')?{limit:Number(search.get('limit'))}:{})});});}
export async function POST(request:Request,{params}:{params:Promise<{projectId:string}>}){return respond(async()=>{const input=await readJson(request);const {db,actor}=await context();return addMessage(db,actor,(await params).projectId,input);},201);}
