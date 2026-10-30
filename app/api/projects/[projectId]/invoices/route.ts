import {context,readJson,respond} from '../../../../../lib/operations/http';
import {createInvoice,listInvoices} from '../../../../../lib/operations/invoices';
type Params={params:Promise<{projectId:string}>};
export async function GET(_request:Request,{params}:Params){return respond(async()=>{const {db,actor}=await context();return {invoices:await listInvoices(db,actor,(await params).projectId)};});}
export async function POST(request:Request,{params}:Params){return respond(async()=>{const input=await readJson(request);const {db,actor}=await context();return createInvoice(db,actor,(await params).projectId,input);},201);}
