import {context,readJson,respond} from '../../../../../../lib/operations/http';
import {changeInvoice} from '../../../../../../lib/operations/invoices';
export async function POST(request:Request,{params}:{params:Promise<{projectId:string;invoiceId:string}>}){return respond(async()=>{const input=await readJson(request);const {db,actor}=await context();const {projectId,invoiceId}=await params;return changeInvoice(db,actor,projectId,invoiceId,input);});}
