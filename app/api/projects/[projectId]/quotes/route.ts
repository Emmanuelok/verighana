import {context,readJson,respond} from '../../../../../lib/operations/http';
import {createQuote,listQuotes} from '../../../../../lib/operations/quotes';
type Params={params:Promise<{projectId:string}>};
export async function GET(_request:Request,{params}:Params){return respond(async()=>{const {db,actor}=await context();return {quotes:await listQuotes(db,actor,(await params).projectId)};});}
export async function POST(request:Request,{params}:Params){return respond(async()=>{const input=await readJson(request);const {db,actor}=await context();return createQuote(db,actor,(await params).projectId,input);},201);}
