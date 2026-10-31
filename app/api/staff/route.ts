import {context,respond} from '../../../lib/operations/http';
import {listRetentionReviews} from '../../../lib/operations/retention';
import {requireStaff} from '../../../lib/operations/core';
import {listInquiries} from '../../../lib/operations/inquiries';
import {listProjects,listDeletionRequests} from '../../../lib/operations/projects';
import {listStaffNotifications} from '../../../lib/operations/email';
export const dynamic='force-dynamic';
export async function GET(){return respond(async()=>{const {db,actor}=await context();requireStaff(actor);const [inquiries,projects,staff,notifications,deletionRequests,retentionReviews]=await Promise.all([listInquiries(db,actor),listProjects(db,actor),db.query('SELECT user_id,role FROM fv_staff WHERE active=true ORDER BY user_id'),listStaffNotifications(db),listDeletionRequests(db,actor),actor.role==='admin'?listRetentionReviews(db,actor):Promise.resolve([])]);return {actor:{id:actor.id,email:actor.email,role:actor.role},inquiries,projects,staff:staff.rows,notifications,deletionRequests,retentionReviews};});}
