import {context,respond,requireSameOrigin} from '../../../../../lib/operations/http';
import {requireStaff} from '../../../../../lib/operations/core';
import {dispatchNotification} from '../../../../../lib/operations/email';
import {uuid} from '../../../../../lib/operations/validation';
export async function POST(request:Request,{params}:{params:Promise<{resourceId:string}>}){return respond(async()=>{requireSameOrigin(request);const {db,actor}=await context();requireStaff(actor);const id=uuid.parse((await params).resourceId);return {notification:await dispatchNotification(db,id)};});}
