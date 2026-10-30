import {context,readJson,respond} from '../../../../../lib/operations/http';
import {addMessage} from '../../../../../lib/operations/projects';
export async function POST(request:Request,{params}:{params:Promise<{projectId:string}>}){return respond(async()=>{const input=await readJson(request);const {db,actor}=await context();return addMessage(db,actor,(await params).projectId,input);},201);}
