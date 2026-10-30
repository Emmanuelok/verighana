import {context,readJson,respond,requireSameOrigin} from '../../../../lib/operations/http';
import {projectDetail,updateProject,requestProjectDeletion} from '../../../../lib/operations/projects';
type Params={params:Promise<{projectId:string}>};
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:Params){return respond(async()=>{const {db,actor}=await context();return projectDetail(db,actor,(await params).projectId);});}
export async function PATCH(request:Request,{params}:Params){return respond(async()=>{const input=await readJson(request);const {db,actor}=await context();return updateProject(db,actor,(await params).projectId,input);});}
export async function DELETE(request:Request,{params}:Params){return respond(async()=>{requireSameOrigin(request);const {db,actor}=await context();return requestProjectDeletion(db,actor,(await params).projectId);});}
