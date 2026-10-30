import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {build} from 'esbuild';
import {PGlite} from '@electric-sql/pglite';
async function load(path){const {outputFiles}=await build({entryPoints:[path],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});return import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));}
const pg=new PGlite();
try{
 for(const file of readdirSync('migrations/operations').filter(f=>f.endsWith('.sql')).sort())await pg.exec(readFileSync('migrations/operations/'+file,'utf8'));
 const adapt=client=>({query:async(sql,params=[])=>{const result=await client.query(sql,params);return {rows:result.rows,rowCount:result.affectedRows??result.rows.length};},transaction:work=>client.transaction(tx=>work(adapt(tx)))});
 const db=adapt(pg),[email,projects]=await Promise.all([load('lib/operations/email.ts'),load('lib/operations/projects.ts')]);
 const payload={reference:'LOCAL-ONLY',name:'Synthetic test',email:'synthetic@example.org',subject:'Fixture',message:'Never sent'};
 async function outbox({state='pending',attempts=0,createdMinutes=0,lastMinutes=0}={}){
  const id=crypto.randomUUID(),resource=crypto.randomUUID();
  await db.query(`INSERT INTO fv_email_outbox(id,resource_id,kind,payload,state,attempts,created_at,last_attempt_at)
    VALUES($1,$2,'inquiry',$3::jsonb,$4,$5,now()-($6::text||' minutes')::interval,now()-($7::text||' minutes')::interval)`,[id,resource,JSON.stringify(payload),state,attempts,createdMinutes,lastMinutes]);return {id,resource};
 }
 const retry=await outbox();const keys=[];
 assert.equal(await email.dispatchNotification(db,retry.resource,async(_payload,key)=>{keys.push(key);throw Error('synthetic timeout');}),'unknown');
 assert.equal(await email.dispatchNotification(db,retry.resource,async(_payload,key)=>{keys.push(key);return {id:'fixture-accepted'};}),'accepted');
 assert.equal(keys.length,2);assert.equal(keys[0],keys[1]);
 assert.equal(await email.dispatchNotification(db,retry.resource,()=>assert.fail('Accepted notification must not resend')),'accepted');
 const crashed=await outbox({state:'sending',attempts:1,lastMinutes:3});
 let crashKey;
 assert.equal(await email.dispatchNotification(db,crashed.resource,async(_payload,key)=>{crashKey=key;return{id:'recovered'};}),'accepted');
 assert.equal(crashKey,`fullview-inquiry-${crashed.id}`);
 for(const fixture of [
  {state:'sending',attempts:1,lastMinutes:0},
  {state:'unknown',attempts:1,createdMinutes:1381,lastMinutes:30},
  {state:'sending',attempts:3,lastMinutes:10,expected:'unknown'},
  {state:'sending',attempts:1,createdMinutes:1381,lastMinutes:30,expected:'unknown'},
 ]){
  const item=await outbox(fixture);
  assert.equal(await email.dispatchNotification(db,item.resource,()=>assert.fail('Must not send outside lease/retry/idempotency bounds')),fixture.expected??fixture.state);
 }
 // A late worker must not overwrite a newer worker's accepted result.
 const raced=await outbox();let enter,failOld;
 const entered=new Promise(resolve=>enter=resolve);
 const old=email.dispatchNotification(db,raced.resource,()=>{enter();return new Promise((_resolve,reject)=>failOld=reject);});
 await entered;await db.query("UPDATE fv_email_outbox SET last_attempt_at=now()-interval '3 minutes' WHERE id=$1",[raced.id]);
 assert.equal(await email.dispatchNotification(db,raced.resource,async()=>({id:'newer-worker-accepted'})),'accepted');
 failOld(Error('late old worker timeout'));assert.equal(await old,'accepted');
 const final=(await db.query('SELECT state,provider_id,attempts FROM fv_email_outbox WHERE id=$1',[raced.id])).rows[0];
 assert.deepEqual(final,{state:'accepted',provider_id:'newer-worker-accepted',attempts:2});
 const owner={id:'owner',email:'synthetic@example.org',emailVerified:true,role:'client'};
 const other={...owner,id:'other'};
 const staff={...owner,id:'staff',role:'staff'};
 const admin={...owner,id:'admin',role:'admin'};
 const projectId=crypto.randomUUID();
 await db.query(`INSERT INTO fv_projects(id,reference,owner_id,idempotency_key,payload_hash,title,description,brief,expires_at)
 VALUES($1,'PROJECT-LOCAL-ONLY',$2,$3,'fixture','Synthetic project','Synthetic description','{}',now()+interval '7 days')`,[projectId,owner.id,crypto.randomUUID()]);
 await assert.rejects(projects.requestProjectDeletion(db,other,projectId),error=>error.status===404);
 await assert.rejects(projects.requestProjectDeletion(db,staff,projectId),error=>error.status===403);
 const first=await projects.requestProjectDeletion(db,owner,projectId);
 const duplicate=await projects.requestProjectDeletion(db,owner,projectId);
 assert.equal(first.requestId,duplicate.requestId);assert.equal(first.status,'pending');
 assert.match(first.message,/does not confirm removal/);
 assert.equal((await db.query('SELECT count(*)::int AS count FROM fv_deletion_requests')).rows[0].count,1);
 assert.equal((await db.query("SELECT count(*)::int AS count FROM fv_audit WHERE action='project.deletion_requested'")).rows[0].count,1);
 await assert.rejects(projects.listDeletionRequests(db,owner),error=>error.status===403);
 const queue=await projects.listDeletionRequests(db,staff);assert.equal(queue[0].project_id,projectId);assert.equal(queue[0].reference,'PROJECT-LOCAL-ONLY');
 await assert.rejects(projects.reviewDeletionRequest(db,staff,first.requestId,{version:1,status:'in_review'}),error=>error.status===403);
 await assert.rejects(projects.reviewDeletionRequest(db,admin,first.requestId,{version:1,status:'completed'}));
 const reviewed=await projects.reviewDeletionRequest(db,admin,first.requestId,{version:1,status:'in_review'});
 assert.equal(reviewed.status,'in_review');assert.equal(reviewed.version,2);
 await assert.rejects(projects.reviewDeletionRequest(db,admin,first.requestId,{version:1,status:'pending'}),error=>error.status===409);
 assert.equal((await projects.requestProjectDeletion(db,owner,projectId)).status,'in_review');
 assert.equal((await db.query('SELECT deleted_at FROM fv_projects WHERE id=$1',[projectId])).rows[0].deleted_at,null);
 console.log('PASS: sending-lease recovery, bounded same-key retries, no send after23h/three attempts, stale-worker protection; durable idempotent deletion queue, owner/admin authorization, staff visibility and no false removal completion. Local Postgres fixtures only; no email or real deletion.');
}finally{await pg.close();}
