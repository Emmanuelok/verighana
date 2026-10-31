import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {PGlite} from '@electric-sql/pglite';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const require=createRequire(import.meta.url);
async function load(path,plugins=[]){
 const {outputFiles}=await build({entryPoints:[path],bundle:true,write:false,format:'cjs',platform:'node',packages:'external',jsx:'automatic',plugins,logLevel:'silent'});
 const compiledModule={exports:{}};new Function('require','module','exports',outputFiles[0].text)(require,compiledModule,compiledModule.exports);return compiledModule.exports;
}
const pg=new PGlite();
let forbiddenSenderCalls=0,networkCalls=0;
const priorFetch=globalThis.fetch,envKeys=['FULLVIEW_RESEND_API_KEY','FULLVIEW_EMAIL_FROM','FULLVIEW_APP_ORIGIN'];
const priorEnv=Object.fromEntries(envKeys.map(key=>[key,process.env[key]]));
globalThis.fetch=async()=>{networkCalls++;assert.fail('No provider or network request is permitted in this regression');};
delete process.env.FULLVIEW_RESEND_API_KEY;delete process.env.FULLVIEW_EMAIL_FROM;
process.env.FULLVIEW_APP_ORIGIN='https://fvsignature.com';
try{
 for(const file of readdirSync('migrations/operations').filter(file=>file.endsWith('.sql')).sort())await pg.exec(readFileSync('migrations/operations/'+file,'utf8'));
 const adapt=client=>({query:async(sql,params=[])=>{const result=await client.query(sql,params);return {rows:result.rows,rowCount:result.affectedRows??result.rows.length};},transaction:work=>client.transaction(tx=>work(adapt(tx)))});
 const db=adapt(pg),email=await load('lib/operations/email.ts'),retention=await load('lib/operations/retention.ts');
 const admin={id:'recovery-admin',email:'synthetic@example.org',emailVerified:true,role:'admin'};
 await db.query('INSERT INTO fv_staff(user_id,role) VALUES($1,\'admin\')',[admin.id]);
 const payload={reference:'SYNTHETIC-RECOVERY',name:'Synthetic test',email:'synthetic@example.org',subject:'Fixture',message:'Local data only, never transmitted'};
 async function fixture({state='sending',attempts=1,ageMinutes=0,leaseMinutes=3,kind='inquiry'}={},connection=db){
  const id=crypto.randomUUID(),resource=crypto.randomUUID(),reference='RECOVERY-'+resource;
  if(kind==='project')await connection.query(`INSERT INTO fv_projects(id,reference,owner_id,idempotency_key,payload_hash,title,description,brief,expires_at)
   VALUES($1,$2,'fixture-owner',$3,'fixture','Synthetic','Synthetic','{}',now()-interval '1 day')`,[resource,reference,crypto.randomUUID()]);
  else await connection.query(`INSERT INTO fv_inquiries(id,reference,idempotency_key,payload_hash,data,expires_at)
   VALUES($1,$2,$3,'fixture','{}',now()-interval '1 day')`,[resource,reference,crypto.randomUUID()]);
  await connection.query(`INSERT INTO fv_email_outbox(id,resource_id,kind,payload,state,attempts,created_at,last_attempt_at)
   VALUES($1,$2,$3,$4::jsonb,$5,$6,now()-($7::text||' minutes')::interval,now()-($8::text||' minutes')::interval)`,[id,resource,kind,JSON.stringify(payload),state,attempts,ageMinutes,leaseMinutes]);
  return {id,resource,reference,kind};
 }
 const state=async item=>(await db.query('SELECT state,attempts,error_code,provider_id FROM fv_email_outbox WHERE id=$1',[item.id])).rows[0];
 const summary=async item=>(await email.listStaffNotifications(db)).find(row=>row.id===item.id);
 const purge=item=>retention.purgeReviewedRecord(db,admin,{kind:item.kind,id:item.resource,confirmReference:item.reference,retentionCleared:true});
 const mustNotSend=()=>{forbiddenSenderCalls++;assert.fail('This notification cannot be sent');};
 function pausedWorker(){
  let enter,resume;const entered=new Promise(resolve=>enter=resolve),released=new Promise(resolve=>resume=resolve);
  return {entered,resume,db:{...db,transaction:async work=>{enter();await released;return db.transaction(work);}}};
 }

 // Active sending stays protected even when retry limits are exhausted.
 for(const options of [{leaseMinutes:0},{leaseMinutes:0,attempts:3},{leaseMinutes:0,ageMinutes:1381}]){
  const item=await fixture(options),before=await state(item),view=await summary(item);
  assert.equal(view.leaseExpired,false);assert.equal(view.retryAllowed,false);
  assert.equal(await email.dispatchNotification(db,item.resource,mustNotSend),'sending');
  await assert.rejects(purge(item),error=>error.code==='notification_in_flight');
  assert.deepEqual(await state(item),before);
 }
 // Exactly two minutes is expired, using transaction-stable now() for an exact boundary.
 let boundary;
 await db.transaction(async tx=>{
  boundary=await fixture({leaseMinutes:2},tx);
  const view=(await email.listStaffNotifications(tx)).find(row=>row.id===boundary.id);
  assert.equal(view.leaseExpired,true);assert.equal(view.retryAllowed,true);
  await email.reconcileExpiredNotificationLease(tx,boundary.resource);
  const row=(await tx.query('SELECT state,attempts,error_code FROM fv_email_outbox WHERE id=$1',[boundary.id])).rows[0];
  assert.deepEqual(row,{state:'unknown',attempts:1,error_code:'email_sending_lease_expired'});
 });
 const keys=[];
 assert.equal(await email.dispatchNotification(db,boundary.resource,async(data,key)=>{assert.deepEqual(data,payload);keys.push(key);return{id:'boundary-accepted'};}),'accepted');
 assert.deepEqual(keys,[`fullview-inquiry-${boundary.id}`]);assert.equal((await state(boundary)).attempts,2);

 // Terminal stale leases reconcile without email credentials or provider calls.
 for(const options of [{attempts:3},{ageMinutes:1380},{ageMinutes:1381}]){
  const item=await fixture(options),view=await summary(item);
  assert.equal(view.leaseExpired,true);assert.equal(view.retryAllowed,false);assert.equal(view.manualReviewRequired,true);
  assert.equal(await email.dispatchNotification(db,item.resource,mustNotSend),'unknown');
  assert.equal((await state(item)).error_code,'email_manual_review_required');
  await purge(item);assert.equal(await state(item),undefined);
 }
 // Retention itself reconciles stale leases without dispatching, including retryable attempts.
 for(const kind of ['inquiry','project'])for(const attempts of [1,3]){
  const item=await fixture({kind,attempts});await purge(item);assert.equal(await state(item),undefined);
  await assert.rejects(email.dispatchNotification(db,item.resource,mustNotSend),error=>error.code==='notification_not_found');
 }
 // Two recovery requests race for one claim and reuse the original payload/key.
 const concurrent=await fixture();let sendCount=0;
 const sender=async(data,key)=>{sendCount++;assert.deepEqual(data,payload);assert.equal(key,`fullview-inquiry-${concurrent.id}`);return{id:'one-claim'};};
 assert.deepEqual(await Promise.all([email.dispatchNotification(db,concurrent.resource,sender),email.dispatchNotification(db,concurrent.resource,sender)]),['accepted','accepted']);
 assert.equal(sendCount,1);assert.equal((await state(concurrent)).attempts,2);

 // A paused claimed worker cannot send after another attempt accepts, fails, or the parent is purged.
 for(const outcome of ['accepted','unknown','purged']){
  const item=await fixture({state:'pending',attempts:0}),pause=pausedWorker();
  const old=email.dispatchNotification(pause.db,item.resource,mustNotSend);await pause.entered;
  await db.query("UPDATE fv_email_outbox SET last_attempt_at=now()-interval '3 minutes' WHERE id=$1",[item.id]);
  if(outcome==='purged'){
   await purge(item);pause.resume();await assert.rejects(old,error=>error.code==='notification_not_found');
  }else{
   assert.equal(await email.dispatchNotification(db,item.resource,async()=>{if(outcome==='unknown')throw Error('Synthetic uncertain outcome');return{id:'newer-receipt'};}),outcome);
   const newer=await state(item);pause.resume();assert.equal(await old,outcome);assert.deepEqual(await state(item),newer);
  }
 }
 // Claim freshness and idempotency age are rechecked before the sender, after a paused claim.
 for(const field of ['last_attempt_at','created_at']){
  const item=await fixture({state:'pending',attempts:0}),pause=pausedWorker();
  const waiting=email.dispatchNotification(pause.db,item.resource,mustNotSend);await pause.entered;
  await db.query(`UPDATE fv_email_outbox SET ${field}=now()-interval '${field==='last_attempt_at'?'3 minutes':'23 hours'}' WHERE id=$1`,[item.id]);
  pause.resume();assert.equal(await waiting,'sending');
  await db.query("UPDATE fv_email_outbox SET last_attempt_at=now()-interval '3 minutes' WHERE id=$1",[item.id]);
  await purge(item);
 }
 // The guard must use fresh clock time, even if BEGIN occurred before the boundary.
 for(const field of ['last_attempt_at','created_at']){
  const item=await fixture({state:'pending',attempts:0});
  const pausedTransactionDb={...db,transaction:work=>db.transaction(async tx=>{
   await tx.query(`UPDATE fv_email_outbox SET ${field}=now()-interval '${field==='last_attempt_at'?'2 minutes':'23 hours'}'+interval '25 milliseconds' WHERE id=$1`,[item.id]);
   await new Promise(resolve=>setTimeout(resolve,50));return work(tx);
  })};
  assert.equal(await email.dispatchNotification(pausedTransactionDb,item.resource,mustNotSend),'sending');
  await db.query("UPDATE fv_email_outbox SET last_attempt_at=now()-interval '3 minutes' WHERE id=$1",[item.id]);
  await purge(item);
 }
 // The sender transaction holds the row lock through outcome persistence.
 const locked=await fixture({state:'pending',attempts:0});let started,finish;
 const sendingStarted=new Promise(resolve=>started=resolve),senderMayFinish=new Promise(resolve=>finish=resolve);
 const inFlight=email.dispatchNotification(db,locked.resource,async()=>{started();await senderMayFinish;return{id:'lock-protected'};});
 await sendingStarted;
 let purgeSettled=false;const removal=purge(locked).then(()=>{purgeSettled=true;});
 await new Promise(resolve=>setTimeout(resolve,20));assert.equal(purgeSettled,false);
 finish();assert.equal(await inFlight,'accepted');await removal;assert.equal(await state(locked),undefined);

 // Real staff route wiring, with only managed identity/database dependencies replaced locally.
 globalThis.__notificationRouteFixture={db,principal:{id:admin.id,email:admin.email,emailVerified:true}};
 const plugin={name:'local-notification-boundary',setup(builder){
  builder.onResolve({filter:/fullview-auth$/},()=>({path:'auth',namespace:'fixture'}));
  builder.onResolve({filter:/(?:operations\/database|^\.\/database)$/},()=>({path:'database',namespace:'fixture'}));
  builder.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'js',contents:args.path==='auth'?'export async function getPrincipal(){return globalThis.__notificationRouteFixture.principal;}':'export function getDatabase(){return globalThis.__notificationRouteFixture.db;} export function databaseConfigured(){return true;}'}));
 }};
 const overviewRoute=await load('app/api/staff/route.ts',[plugin]);
 const recoveryRoute=await load('app/api/staff/notifications/[resourceId]/route.ts',[plugin]);
 const apiItem=await fixture();
 const overview=await (await overviewRoute.GET()).json();
 const apiSummary=overview.notifications.find(row=>row.id===apiItem.id);assert.equal(apiSummary.leaseExpired,true);assert.equal(apiSummary.retryAllowed,true);
 const invoke=id=>recoveryRoute.POST(new Request(`https://fvsignature.com/api/staff/notifications/${id}`,{method:'POST',headers:{origin:'https://fvsignature.com'}}),{params:Promise.resolve({resourceId:id})});
 const checked=await invoke(apiItem.resource);assert.equal(checked.status,200);assert.equal((await checked.json()).notification,'failed');
 assert.equal((await state(apiItem)).error_code,'email_unconfigured');
 const gone=await invoke(crypto.randomUUID());assert.equal(gone.status,404);
 globalThis.__notificationRouteFixture.principal={id:'unprivileged',email:'synthetic@example.org',emailVerified:true};
 assert.equal((await invoke(apiItem.resource)).status,403);

 // Render the actual staff control: sending attempts remain reachable; terminal retry is disabled.
 const {NotificationFollowUp}=await load('components/notification-follow-up.tsx');
 const render=(notification,busy=false)=>renderToStaticMarkup(React.createElement(NotificationFollowUp,{notifications:[notification],busy,onCheck:()=>{}}));
 const button=html=>html.match(/<button\b[^>]*>[\s\S]*?<\/button>/)?.[0];
 assert.match(button(render(apiSummary)),/>Check \/ retry team email<\/button>/);assert.doesNotMatch(button(render(apiSummary)),/disabled/);
 assert.doesNotMatch(button(render({...apiSummary,leaseExpired:false,retryAllowed:false})),/disabled/);
 assert.match(button(render(apiSummary,true)),/disabled/);
 const terminal={...apiSummary,state:'unknown',retryAllowed:false,manualReviewRequired:true};
 assert.match(button(render(terminal)),/disabled/);assert.match(render(terminal),/No further automated send is permitted/);
 assert.match(render(apiSummary),/Sending attempt expired; delivery result is uncertain/);
 assert.equal(forbiddenSenderCalls,0,'Forbidden sender calls must not be hidden by dispatch error handling');
 assert.equal(networkCalls,0,'No network attempts may be hidden by dispatch error handling');
 console.log('PASS: reachable staff recovery; exact lease boundary; active lease retention protection; same-key single concurrent claim; 3-attempt/23-hour bounds; fenced paused workers; sender transaction ordering; no-send stale retention reconciliation; truthful terminal states and missing-notification404. Synthetic local Postgres only, no email/provider/customer deletion.');
}finally{
 await pg.close();globalThis.fetch=priorFetch;
 for(const key of envKeys){if(priorEnv[key]===undefined)delete process.env[key];else process.env[key]=priorEnv[key];}
 delete globalThis.__notificationRouteFixture;
}
