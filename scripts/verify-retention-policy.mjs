import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {build} from 'esbuild';
import {PGlite} from '@electric-sql/pglite';

const envKeys=['FULLVIEW_RETENTION_DAYS','FULLVIEW_RETENTION_TRIGGER','FULLVIEW_RETENTION_CLEANUP_ENABLED'];
const priorEnv=Object.fromEntries(envKeys.map(key=>[key,process.env[key]]));
const priorFetch=globalThis.fetch;
let networkCalls=0;
globalThis.fetch=async()=>{networkCalls++;throw Error('No network in the retention policy regression');};
const pg=new PGlite();
try{
 const {outputFiles}=await build({stdin:{contents:"export * as validation from './lib/operations/validation';export * as inquiries from './lib/operations/inquiries';export * as projects from './lib/operations/projects';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
 const {validation,inquiries,projects}=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
 const unavailable=error=>error.code==='retention_unconfigured';
 const now=new Date(),actor={id:'synthetic-retention-owner',email:'policy@example.invalid',emailVerified:true,role:'client'};
 const inquiry={idempotencyKey:crypto.randomUUID(),name:'Synthetic Person',email:actor.email,subject:'Synthetic policy check',message:'Only synthetic fixture content, with no network or provider actions.',consent:true,consentVersion:'fullview-inquiry-v1',website:'',startedAt:now.valueOf()-5000};
 const brief={name:'Synthetic Person',email:actor.email,organisation:'',audience:'masters',title:'Synthetic policy project',description:'Only synthetic fixture content for retention boundary verification.',deadline:'2099-01-01',budget:'Please advise',selections:[{id:'quantitative',quantity:1}],packageRequest:null};
 const submission={idempotencyKey:crypto.randomUUID(),consent:true,consentVersion:'fullview-inquiry-v1',brief};
 let databaseCalls=0;
 const unreachable={query:async()=>{databaseCalls++;throw Error('Unconfigured policy must not query storage');},transaction:async()=>{databaseCalls++;throw Error('Unconfigured policy must not open a transaction');}};
 process.env.FULLVIEW_RETENTION_CLEANUP_ENABLED='true';
 for(const days of [undefined,'','0','-1','1.5','31','3650','NaN','Infinity']){
  if(days===undefined)delete process.env.FULLVIEW_RETENTION_DAYS;else process.env.FULLVIEW_RETENTION_DAYS=days;
  process.env.FULLVIEW_RETENTION_TRIGGER='submission';
  assert.throws(()=>validation.retentionDays(),unavailable);assert.equal(validation.retentionCleanupConfigured(),false);
  await assert.rejects(inquiries.submitInquiry(unreachable,inquiry,{retentionDays:30,ip:'127.0.0.1',now}),unavailable);
  await assert.rejects(projects.submitProject(unreachable,actor,submission,30),unavailable);
 }
 process.env.FULLVIEW_RETENTION_DAYS='30';
 for(const trigger of [undefined,'','completion','Submission']){
  if(trigger===undefined)delete process.env.FULLVIEW_RETENTION_TRIGGER;else process.env.FULLVIEW_RETENTION_TRIGGER=trigger;
  assert.throws(()=>validation.retentionDays(),unavailable);assert.equal(validation.retentionCleanupConfigured(),false);
  await assert.rejects(inquiries.submitInquiry(unreachable,inquiry,{retentionDays:30,ip:'127.0.0.1',now}),unavailable);
  await assert.rejects(projects.submitProject(unreachable,actor,submission,30),unavailable);
 }
 process.env.FULLVIEW_RETENTION_TRIGGER='submission';
 assert.equal(validation.retentionDays(),30);assert.equal(validation.retentionCleanupConfigured(),true);
 for(const flag of [undefined,'false','TRUE','1']){
  if(flag===undefined)delete process.env.FULLVIEW_RETENTION_CLEANUP_ENABLED;else process.env.FULLVIEW_RETENTION_CLEANUP_ENABLED=flag;
  assert.equal(validation.retentionCleanupConfigured(),false);
  assert.throws(()=>validation.requireRetentionCleanup(),error=>error.code==='retention_cleanup_unconfigured');
 }
 for(const days of [0,-1,0.5,31,3650,NaN,Infinity])assert.throws(()=>validation.expiry(days,now),unavailable);
 assert.throws(()=>validation.expiry(30,new Date('invalid')),unavailable);
 assert.equal(validation.expiry(30,new Date('2030-01-01Z')),'2030-01-31T00:00:00.000Z');
 // A caller cannot invent a shorter or longer service duration than the configured policy.
 for(const days of [1,14,31,3650]){
  await assert.rejects(inquiries.submitInquiry(unreachable,inquiry,{retentionDays:days,ip:'127.0.0.1',now}),unavailable);
  await assert.rejects(projects.submitProject(unreachable,actor,submission,days),unavailable);
 }
 assert.equal(databaseCalls,0);

 for(const file of readdirSync('migrations/operations').filter(file=>file.endsWith('.sql')).sort())await pg.exec(readFileSync('migrations/operations/'+file,'utf8'));
 const adapt=client=>({query:async(sql,params=[])=>{const result=await client.query(sql,params);return {rows:result.rows,rowCount:result.affectedRows??result.rows.length};},transaction:work=>client.transaction(tx=>work(adapt(tx)))});
 const db=adapt(pg);
 // Explicitly configured shorter policy works, with one DB timestamp anchor for the exact deadline.
 for(const days of [1,14,30]){
  process.env.FULLVIEW_RETENTION_DAYS=String(days);
  assert.equal(validation.retentionDays(),days);
  const item=await inquiries.submitInquiry(db,{...inquiry,idempotencyKey:crypto.randomUUID()},{retentionDays:days,ip:'127.0.0.1',now});
  const project=await projects.submitProject(db,actor,{...submission,idempotencyKey:crypto.randomUUID()},days);
  for(const [table,id] of [['fv_inquiries',item.id],['fv_projects',project.id]]){
   const row=(await db.query(`SELECT extract(epoch FROM expires_at-created_at)::double precision AS seconds FROM ${table} WHERE id=$1`,[id])).rows[0];
   assert.equal(row.seconds,days*86400);
  }
 }
 assert.equal(networkCalls,0);
 console.log('PASS: max30 and explicit-trigger boundaries; cleanup default-off; direct submission guards before database I/O; no invented per-service durations; exact DB submission deadlines with configured 1/14/30-day synthetic policies. No provider or customer actions.');
}finally{
 await pg.close();globalThis.fetch=priorFetch;
 for(const key of envKeys){if(priorEnv[key]===undefined)delete process.env[key];else process.env[key]=priorEnv[key];}
}
