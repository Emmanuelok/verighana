import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {build} from 'esbuild';
import {PGlite} from '@electric-sql/pglite';

async function load(path){const {outputFiles}=await build({entryPoints:[path],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});return import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));}
const envKeys=['FULLVIEW_RETENTION_DAYS','FULLVIEW_RETENTION_TRIGGER','FULLVIEW_RETENTION_CLEANUP_ENABLED'];
const priorEnv=Object.fromEntries(envKeys.map(key=>[key,process.env[key]]));
process.env.FULLVIEW_RETENTION_DAYS='30';process.env.FULLVIEW_RETENTION_TRIGGER='submission';process.env.FULLVIEW_RETENTION_CLEANUP_ENABLED='true';
const pg=new PGlite();
try{
 for(const file of readdirSync('migrations/operations').filter(file=>file.endsWith('.sql')).sort())await pg.exec(readFileSync('migrations/operations/'+file,'utf8'));
 const adapt=client=>({query:async(sql,params=[])=>{const result=await client.query(sql,params);return {rows:result.rows,rowCount:result.affectedRows??result.rows.length};},transaction:work=>client.transaction(tx=>work(adapt(tx)))});
 const db=adapt(pg),[retention,projects]=await Promise.all([load('lib/operations/retention.ts'),load('lib/operations/projects.ts')]);
 const owner={id:'owner',email:'synthetic@example.org',emailVerified:true,role:'client'};
 const other={...owner,id:'other'},staff={...owner,id:'staff',role:'staff'},admin={...owner,id:'admin',role:'admin'};
 const marker='SYNTHETIC-PRIVATE-CONTENT';
 async function project({expired=false,deleted=false}={}){
  const id=crypto.randomUUID(),reference='FVP-TEST-'+id;
  await db.query(`INSERT INTO fv_projects(id,reference,owner_id,idempotency_key,payload_hash,title,description,brief,expires_at,deleted_at)
    VALUES($1,$2,$3,$4,'fixture',$5,$5,$6::jsonb,now()+($7::text||' days')::interval,CASE WHEN $8=true THEN now() ELSE NULL END)`,[id,reference,owner.id,crypto.randomUUID(),marker,JSON.stringify({private:marker}),expired?-1:7,deleted]);
  return {id,reference};
 }
 async function inquiry(expired=true){
  const id=crypto.randomUUID(),reference='FVI-TEST-'+id;
  await db.query(`INSERT INTO fv_inquiries(id,reference,idempotency_key,payload_hash,data,expires_at)
    VALUES($1,$2,$3,'fixture',$4::jsonb,now()+($5::text||' days')::interval)`,[id,reference,crypto.randomUUID(),JSON.stringify({private:marker}),expired?-1:7]);
  return {id,reference};
 }
 async function notification(resource,state='pending'){
  await db.query('INSERT INTO fv_email_outbox(id,resource_id,kind,payload,state) VALUES($1,$2,\'fixture\',$3::jsonb,$4)',[crypto.randomUUID(),resource.id,JSON.stringify({private:marker}),state]);
 }
 async function document(resource,{state='deleted',cleanup=false}={}){
  const id=crypto.randomUUID();
  await db.query(`INSERT INTO fv_documents(id,project_id,uploaded_by,filename,content_type,byte_count,sha256,storage_key,state,policy_version,expires_at,scanned_at,deleted_at,storage_cleanup_pending)
    VALUES($1,$2,$3,$4,'text/plain',1,$5,$6,$7,'local-fixture',now()+interval '7 days',CASE WHEN $7='available' THEN now() ELSE NULL END,CASE WHEN $7='deleted' THEN now() ELSE NULL END,$8)`,[id,resource.id,owner.id,marker+'.txt','0'.repeat(64),'local-fixture/'+id,state,cleanup]);
  return id;
 }
 const args=(kind,record)=>({kind,id:record.id,confirmReference:record.reference,retentionCleared:true});
 const rejects=(promise,code)=>assert.rejects(promise,error=>error.code===code);

 const expired=await project({expired:true}),active=await project(),expiredInquiry=await inquiry(),activeInquiry=await inquiry(false);
 for(const actor of [owner,staff,{...admin,emailVerified:false}]){
  await assert.rejects(retention.listRetentionReviews(db,actor),error=>error.status===403);
  await assert.rejects(retention.purgeReviewedRecord(db,actor,args('project',expired)),error=>error.status===403);
 }
 await rejects(retention.purgeReviewedRecord(db,admin,{...args('project',expired),confirmReference:'WRONG'}),'reference_mismatch');
 await assert.rejects(retention.purgeReviewedRecord(db,admin,{...args('project',expired),retentionCleared:false}));
 await assert.rejects(retention.purgeReviewedRecord(db,admin,{kind:'project',id:expired.id,confirmReference:expired.reference}));
 await rejects(retention.purgeReviewedRecord(db,admin,args('project',active)),'retention_review_required');
 await rejects(retention.purgeReviewedRecord(db,admin,args('inquiry',activeInquiry)),'retention_review_required');
 await rejects(projects.requestProjectDeletion(db,other,expired.id),'project_not_found');
 await rejects(projects.requestProjectDeletion(db,staff,expired.id),'owner_required');
 await rejects(projects.requestProjectDeletion(db,{...owner,emailVerified:false},expired.id),'email_verification_required');
 const expiredRequest=await projects.requestProjectDeletion(db,owner,expired.id);
 assert.equal(expiredRequest.status,'pending');
 await rejects(projects.projectDetail(db,owner,expired.id),'project_not_found');
 const expiredListRow=(await projects.listProjects(db,owner)).find(row=>row.id===expired.id);
 assert.equal(expiredListRow.expired,true);assert.equal(expiredListRow.title,'Expired project');assert.ok(!JSON.stringify(expiredListRow).includes(marker));
 assert.ok(!(await projects.listProjects(db,other)).some(row=>row.id===expired.id));
 const hidden=await project({expired:true,deleted:true});await projects.requestProjectDeletion(db,owner,hidden.id);
 assert.ok(!(await projects.listProjects(db,owner)).some(row=>row.id===hidden.id));

 // Return the latest 200 messages in chronological order, including deterministic ties.
 await db.query(`INSERT INTO fv_messages(id,project_id,author_id,body,created_at)
   SELECT ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,$1,$2,'Message '||n::text,
     timestamptz '2026-01-01 00:00:00+00'+((n/2)::text||' seconds')::interval FROM generate_series(1,205) AS n`,[active.id,owner.id]);
 const messages=(await projects.projectDetail(db,owner,active.id)).messages;
 assert.equal(messages.length,200);assert.equal(messages[0].body,'Message 6');assert.equal(messages.at(-1).body,'Message 205');
 assert.equal(new Set(messages.map(message=>message.id)).size,200);

 const requested=await project(),pending=await projects.requestProjectDeletion(db,owner,requested.id);
 await rejects(retention.purgeReviewedRecord(db,admin,args('project',requested)),'retention_review_required');
 assert.ok(!(await retention.listRetentionReviews(db,admin)).some(row=>row.id===requested.id));
 await projects.reviewDeletionRequest(db,admin,pending.requestId,{version:1,status:'in_review'});
 const reviews=await retention.listRetentionReviews(db,admin);
 assert.ok(reviews.some(row=>row.id===expiredInquiry.id&&row.kind==='inquiry'&&row.reason==='expired'));
 assert.ok(reviews.some(row=>row.id===requested.id&&row.kind==='project'&&row.reason==='deletion_requested'));
 assert.ok(!reviews.some(row=>row.id===active.id||row.id===activeInquiry.id));
 assert.ok(!JSON.stringify(reviews).includes(marker));
 assert.deepEqual(Object.keys(reviews[0]).sort(),['kind','id','reference','status','createdAt','expiresAt','reason','deletionRequestStatus','documentCleanupRequired','financialRetentionRequired'].sort());
 const requestedResult=await retention.purgeReviewedRecord(db,admin,args('project',requested));
 assert.deepEqual(requestedResult,{purged:true,kind:'project',id:requested.id,reference:requested.reference});

 for(const state of ['quarantined','scanning','available','rejected','revoked']){
  const blocked=await project({expired:true});await document(blocked,{state});
  await rejects(retention.purgeReviewedRecord(db,admin,args('project',blocked)),'document_cleanup_required');
  assert.equal((await retention.listRetentionReviews(db,admin)).find(row=>row.id===blocked.id).documentCleanupRequired,true);
 }
 const cleanupPending=await project({expired:true});await document(cleanupPending,{cleanup:true});
 await rejects(retention.purgeReviewedRecord(db,admin,args('project',cleanupPending)),'document_cleanup_required');
 const sending=await inquiry();await notification(sending,'sending');
 await rejects(retention.purgeReviewedRecord(db,admin,args('inquiry',sending)),'notification_in_flight');

 // Financial records have a separate policy: even a cleared personal-data review cannot remove them.
 await document(expired);await notification(expired);
 await db.query('INSERT INTO fv_messages(id,project_id,author_id,body) VALUES($1,$2,$3,$4)',[crypto.randomUUID(),expired.id,owner.id,marker]);
 const quoteId=crypto.randomUUID();
 await db.query(`INSERT INTO fv_quotes(id,project_id,version,lines,terms,total_minor,expires_at,created_by)
    VALUES($1,$2,1,$3::jsonb,$4::jsonb,0,now()+interval '7 days',$5)`,[quoteId,expired.id,JSON.stringify([{private:marker}]),JSON.stringify({private:marker}),staff.id]);
 await db.query(`INSERT INTO fv_invoices(id,project_id,quote_id,reference,total_minor,currency,due_date,snapshot,created_by)
    VALUES($1,$2,$3,$4,0,'GHS',current_date,$5::jsonb,$6)`,[crypto.randomUUID(),expired.id,quoteId,'INV-TEST-'+expired.id,JSON.stringify({private:marker}),staff.id]);
 await rejects(retention.purgeReviewedRecord(db,admin,args('project',expired)),'financial_retention_unconfigured');
 assert.equal((await retention.listRetentionReviews(db,admin)).find(row=>row.id===expired.id).financialRetentionRequired,true);
 for(const table of ['fv_quotes','fv_invoices','fv_documents','fv_messages'])assert.equal((await db.query(`SELECT count(*)::int AS count FROM ${table} WHERE project_id=$1`,[expired.id])).rows[0].count,1);
 assert.equal((await db.query('SELECT id FROM fv_projects WHERE id=$1',[expired.id])).rows.length,1);
 assert.equal((await db.query('SELECT id FROM fv_email_outbox WHERE resource_id=$1',[expired.id])).rows.length,1);
 // A quote by itself also protects the parent, irrespective of quote state or expiry.
 const quoted=await project({expired:true});
 await db.query(`INSERT INTO fv_quotes(id,project_id,version,lines,terms,total_minor,expires_at,created_by)
   VALUES($1,$2,1,'[]','{}',0,now()-interval '1 day',$3)`,[crypto.randomUUID(),quoted.id,staff.id]);
 await rejects(retention.purgeReviewedRecord(db,admin,args('project',quoted)),'financial_retention_unconfigured');
 assert.equal((await retention.listRetentionReviews(db,admin)).find(row=>row.id===quoted.id).financialRetentionRequired,true);

 // Ordinary personal records purge atomically, only while explicit cleanup is enabled.
 const removable=await project({expired:true});await document(removable);await notification(removable);
 await db.query('INSERT INTO fv_messages(id,project_id,author_id,body) VALUES($1,$2,$3,$4)',[crypto.randomUUID(),removable.id,owner.id,marker]);
 for(const [key,value] of [['FULLVIEW_RETENTION_CLEANUP_ENABLED',undefined],['FULLVIEW_RETENTION_CLEANUP_ENABLED','false'],['FULLVIEW_RETENTION_TRIGGER',undefined],['FULLVIEW_RETENTION_TRIGGER','completion'],['FULLVIEW_RETENTION_DAYS','31']]){
  const previous=process.env[key];if(value===undefined)delete process.env[key];else process.env[key]=value;
  await rejects(retention.purgeReviewedRecord(db,admin,args('project',removable)),'retention_cleanup_unconfigured');
  if(previous===undefined)delete process.env[key];else process.env[key]=previous;
  assert.equal((await db.query('SELECT id FROM fv_projects WHERE id=$1',[removable.id])).rows.length,1);
  assert.equal((await db.query('SELECT id FROM fv_email_outbox WHERE resource_id=$1',[removable.id])).rows.length,1);
 }
 assert.equal((await retention.listRetentionReviews(db,admin)).find(row=>row.id===removable.id).financialRetentionRequired,false);
 assert.equal((await retention.listRetentionReviews(db,admin)).find(row=>row.id===expiredInquiry.id).financialRetentionRequired,false);
 // Failure at the final audit must roll the entire removal back.
 const failAudit={...db,transaction:work=>db.transaction(tx=>work({...tx,query:(sql,values)=>sql.startsWith('INSERT INTO fv_audit')?Promise.reject(Error('synthetic audit failure')):tx.query(sql,values)}))};
 await assert.rejects(retention.purgeReviewedRecord(failAudit,admin,args('project',removable)),/synthetic audit failure/);
 assert.equal((await db.query('SELECT id FROM fv_projects WHERE id=$1',[removable.id])).rows.length,1);
 assert.equal((await db.query('SELECT id FROM fv_documents WHERE project_id=$1',[removable.id])).rows.length,1);
 assert.equal((await db.query('SELECT id FROM fv_email_outbox WHERE resource_id=$1',[removable.id])).rows.length,1);
 await retention.purgeReviewedRecord(db,admin,args('project',removable));
 for(const table of ['fv_messages','fv_documents','fv_deletion_requests'])assert.equal((await db.query(`SELECT count(*)::int AS count FROM ${table} WHERE project_id=$1`,[removable.id])).rows[0].count,0);
 assert.equal((await db.query('SELECT id FROM fv_projects WHERE id=$1',[removable.id])).rows.length,0);
 assert.equal((await db.query('SELECT id FROM fv_email_outbox WHERE resource_id=$1',[removable.id])).rows.length,0);
 const audit=(await db.query("SELECT actor_id,resource_id,metadata FROM fv_audit WHERE action='retention.record_purged' AND resource_id=$1",[removable.id])).rows;
 assert.deepEqual(audit,[{actor_id:admin.id,resource_id:removable.id,metadata:{kind:'project',reference:removable.reference}}]);
 assert.ok(!JSON.stringify(audit).includes(marker));
 await notification(expiredInquiry);await retention.purgeReviewedRecord(db,admin,args('inquiry',expiredInquiry));
 assert.equal((await db.query('SELECT id FROM fv_inquiries WHERE id=$1',[expiredInquiry.id])).rows.length,0);
 assert.equal((await db.query('SELECT id FROM fv_email_outbox WHERE resource_id=$1',[expiredInquiry.id])).rows.length,0);
 assert.equal((await db.query('SELECT id FROM fv_projects WHERE id=$1',[active.id])).rows.length,1);
 assert.equal((await db.query('SELECT id FROM fv_messages WHERE project_id=$1',[active.id])).rows.length,205);
 console.log('PASS: newest 200 messages; expired owner deletion request without content access; admin-only metadata review; exact reference and explicit clearance; active/unreviewed/files/in-flight refusals; cleanup-off/unknown-trigger/max30 refusals; financial quote/invoice holds; atomic local purge of eligible personal records with minimal audit. Synthetic local Postgres only, no remote deletion or automatic retention removal.');
}finally{await pg.close();for(const key of envKeys){if(priorEnv[key]===undefined)delete process.env[key];else process.env[key]=priorEnv[key];}}
