import {context,respond,requireSameOrigin} from '../../../../../../lib/operations/http';
import {createDocumentService} from '../../../../../../lib/operations/documents';
import {requireProjectAccess,OperationError} from '../../../../../../lib/operations/core';
export async function GET(_request:Request,{params}:{params:Promise<{projectId:string;documentId:string}>}){return respond(async()=>{const {db,actor}=await context();await requireProjectAccess(db,actor,(await params).projectId);throw new OperationError(503,'documents_unavailable','Private document access is not connected yet.');});}
export async function DELETE(request:Request,{params}:{params:Promise<{projectId:string;documentId:string}>}){return respond(async()=>{requireSameOrigin(request);const {db,actor}=await context();const {projectId,documentId}=await params;return createDocumentService({db}).delete(actor,projectId,documentId);});}
