import {context,readJson,respond} from '../../../../../lib/operations/http';
import {reviewDeletionRequest} from '../../../../../lib/operations/projects';
export async function POST(request:Request,{params}:{params:Promise<{requestId:string}>}){return respond(async()=>{const input=await readJson(request);const {db,actor}=await context();return reviewDeletionRequest(db,actor,(await params).requestId,input);});}
