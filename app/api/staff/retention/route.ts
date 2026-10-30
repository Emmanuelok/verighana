import {context,readJson,respond} from '../../../../lib/operations/http';
import {listRetentionReviews,purgeReviewedRecord} from '../../../../lib/operations/retention';
export async function GET(){return respond(async()=>{const {db,actor}=await context();return {retentionReviews:await listRetentionReviews(db,actor)};});}
export async function POST(request:Request){return respond(async()=>{const input=await readJson(request);const {db,actor}=await context();const result=await purgeReviewedRecord(db,actor,input);return {...result,message:'Record removed after retention review.'};});}
