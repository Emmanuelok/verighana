import {context,readJson,respond} from '../../../../../lib/operations/http';
import {updateInquiry} from '../../../../../lib/operations/inquiries';
export async function PATCH(request:Request,{params}:{params:Promise<{inquiryId:string}>}){return respond(async()=>{const input=await readJson(request);const {db,actor}=await context();return updateInquiry(db,actor,(await params).inquiryId,input);});}
