import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {PGlite} from '@electric-sql/pglite';

const {outputFiles} = await build({entryPoints:['lib/operations/documents.ts'],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const {createDocumentService,documentExchangeReady} = await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
const envKeys=['FULLVIEW_RETENTION_DAYS','FULLVIEW_RETENTION_TRIGGER','FULLVIEW_RETENTION_CLEANUP_ENABLED'];
const priorEnv=Object.fromEntries(envKeys.map(key=>[key,process.env[key]]));
process.env.FULLVIEW_RETENTION_DAYS='30';process.env.FULLVIEW_RETENTION_TRIGGER='submission';process.env.FULLVIEW_RETENTION_CLEANUP_ENABLED='true';
const pg = new PGlite();
function database(connection) {
  return {
    async query(sql, values=[]) {const result=await connection.query(sql,values);return {rows:result.rows,rowCount:result.affectedRows??result.rows.length};},
    transaction(work) {return connection.transaction(tx=>work(database(tx)));},
  };
}
const db = database(pg);
await pg.exec(readFileSync('migrations/operations/001-core.sql','utf8'));
await pg.exec(readFileSync('migrations/operations/003-documents.sql','utf8'));
const alice={id:'client-a',email:'alice@example.invalid',emailVerified:true,role:'client'};
const bob={id:'client-b',email:'bob@example.invalid',emailVerified:true,role:'client'};
const staff={id:'staff-a',email:'staff@example.invalid',emailVerified:true,role:'staff'};
const p1=crypto.randomUUID(),p2=crypto.randomUUID(),p3=crypto.randomUUID();
for (const [id,owner] of [[p1,alice.id],[p2,bob.id],[p3,alice.id]]) {
  await db.query(`INSERT INTO fv_projects(id,reference,owner_id,idempotency_key,payload_hash,title,description,brief,created_at,expires_at)
    VALUES($1,$2,$3,$4,'synthetic','Synthetic test project','No real research data','{}','2030-01-01','2099-01-01')`,[id,`TEST-${id}`,owner,crypto.randomUUID()]);
}
let current=new Date('2030-01-01T00:00:00Z');
const now=()=>current;
const policy={enabled:true,ownerApproved:true,version:'synthetic-v1',retentionDays:30,retentionTrigger:'submission',maxBytes:1024,allowedMimeTypes:['application/pdf','text/plain','text/csv']};
const objects=new Map();
const storage={configured:true,privateOnly:true,
  async putPrivate(key,bytes) {objects.set(key,new Uint8Array(bytes));},
  async readPrivate(key,{maxBytes}) {const bytes=objects.get(key);if(!bytes||bytes.length>maxBytes)throw Error('Missing or too large');return new Uint8Array(bytes);},
  async deletePrivate(key) {objects.delete(key);},
};
const scanner={configured:true,verified:true,async scan(){return 'clean';}};
const make=(overrides={})=>createDocumentService({db,storage,scanner,policy,now,...overrides});
const service=make();
const input={filename:'Synthetic report.txt',contentType:'text/plain',bytes:new TextEncoder().encode('Only synthetic test content.')};
const fails=(fn,code)=>assert.rejects(fn,error=>error.code===code);
try {
  assert.equal(documentExchangeReady({}),false);
  for (const override of [{policy:undefined},{policy:{...policy,ownerApproved:false}},
    {policy:{...policy,retentionDays:0}},{policy:{...policy,retentionDays:31}},{policy:{...policy,retentionTrigger:undefined}},{policy:{...policy,retentionTrigger:'completion'}},{storage:undefined},{storage:{...storage,privateOnly:false}},
    {scanner:undefined},{scanner:{...scanner,verified:false}}]) {
    await fails(()=>make(override).upload(alice,p1,input),'documents_unavailable');
  }
  delete process.env.FULLVIEW_RETENTION_TRIGGER;
  await fails(()=>service.upload(alice,p1,input),'documents_unavailable');
  process.env.FULLVIEW_RETENTION_TRIGGER='submission';
  assert.equal(objects.size,0);
  await fails(()=>service.upload({...alice,emailVerified:false},p1,input),'email_verification_required');
  await fails(()=>service.upload(bob,p1,input),'project_not_found');
  await fails(()=>service.list(bob,p1),'project_not_found');
  for (const [override,code] of [
    [{filename:'../secrets.txt'},'invalid_filename'],[{filename:'bad\r\nheader.txt'},'invalid_filename'],
    [{filename:'\ud800.txt'},'invalid_filename'],[{filename:'bad.exe',contentType:'application/octet-stream'},'unsupported_document_type'],
    [{filename:'bad.docx',contentType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'},'unsupported_document_type'],
    [{filename:'wrong.pdf'},'document_type_mismatch'],[{bytes:new Uint8Array(0)},'document_size_limit'],
    [{bytes:new Uint8Array(1025)},'document_size_limit'],[{bytes:new Uint8Array([0,1,2])},'document_type_mismatch'],
    [{filename:'false.pdf',contentType:'application/pdf'},'document_type_mismatch'],
  ]) await fails(()=>service.upload(alice,p1,{...input,...override}),code);
  assert.equal(objects.size,0);

  // Real asynchronous boundaries: a stored, not-yet-scanned file is never downloadable.
  let finishPut,enteredPut;
  const putStarted=new Promise(resolve=>{enteredPut=resolve;});
  const pendingPut=new Promise(resolve=>{finishPut=resolve;});
  const quarantineService=make({storage:{...storage,async putPrivate(key,bytes){await storage.putPrivate(key,bytes);enteredPut();await pendingPut;}}});
  const quarantining=quarantineService.upload(alice,p1,input);
  await putStarted;
  const quarantined=(await service.list(alice,p1))[0];
  assert.equal(quarantined.state,'quarantined');assert.equal(quarantined.canDownload,false);
  await fails(()=>service.download(alice,p1,quarantined.id),'document_unavailable');
  finishPut();await quarantining;

  let finishScan,enteredScan;
  const scanStarted=new Promise(resolve=>{enteredScan=resolve;});
  const pendingScan=new Promise(resolve=>{finishScan=resolve;});
  const scanningService=make({scanner:{...scanner,async scan(){enteredScan();await pendingScan;return 'clean';}}});
  const scanning=scanningService.upload(alice,p1,{...input,filename:'Scanning.txt'});
  await scanStarted;
  const pending=(await service.list(alice,p1)).find(row=>row.filename==='Scanning.txt');
  assert.equal(pending.state,'scanning');assert.equal(pending.canDownload,false);
  await fails(()=>service.download(alice,p1,pending.id),'document_unavailable');
  finishScan();const available=await scanning;
  assert.equal(available.state,'available');assert.equal(available.expiresAt,'2030-01-31T00:00:00.000Z');
  assert.equal('storage_key' in available,false);assert.equal('url' in available,false);
  const downloaded=await service.download(alice,p1,available.id);
  assert.deepEqual(downloaded.bytes,input.bytes);
  assert.match(downloaded.headers['Cache-Control'],/private, no-store/);
  assert.equal(downloaded.headers['X-Content-Type-Options'],'nosniff');
  assert.match(downloaded.headers['Content-Disposition'],/^attachment;/);
  assert.match(downloaded.headers['Content-Disposition'],/Scanning.txt/);
  await fails(()=>service.download(bob,p1,available.id),'project_not_found');
  await fails(()=>service.download(alice,p3,available.id),'document_not_found');
  await fails(()=>service.delete(bob,p1,available.id),'project_not_found');
  await fails(()=>service.delete(alice,p3,available.id),'document_not_found');

  await fails(()=>make({scanner:{...scanner,async scan(){throw Error('Scanner offline');}}}).upload(alice,p1,{...input,filename:'Scan error.txt'}),'document_processing_failed');
  await fails(()=>make({scanner:{...scanner,async scan(){return 'infected';}}}).upload(alice,p1,{...input,filename:'Rejected.txt'}),'document_rejected');
  for (const item of (await service.list(alice,p1)).filter(item=>['Scan error.txt','Rejected.txt'].includes(item.filename))) {
    assert.equal(item.state,'rejected');
    await fails(()=>service.download(alice,p1,item.id),'document_unavailable');
  }
  await fails(()=>service.revoke(alice,p1,available.id),'staff_required');
  await service.revoke(staff,p1,available.id);
  await fails(()=>service.download(alice,p1,available.id),'document_unavailable');

  const corrupt=await service.upload(alice,p1,{...input,filename:'Corrupt.txt'});
  const corruptKey=(await db.query('SELECT storage_key FROM fv_documents WHERE id=$1',[corrupt.id])).rows[0].storage_key;
  objects.set(corruptKey,new Uint8Array(input.bytes.length));
  await fails(()=>service.download(alice,p1,corrupt.id),'document_integrity_failed');
  assert.equal(objects.has(corruptKey),false);

  const deleted=await service.upload(alice,p1,{...input,filename:'Delete.txt'});
  delete process.env.FULLVIEW_RETENTION_CLEANUP_ENABLED;
  await fails(()=>service.delete(alice,p1,deleted.id),'retention_cleanup_unconfigured');
  await fails(()=>service.purgeExpired(staff,p1),'retention_cleanup_unconfigured');
  assert.equal((await service.list(alice,p1)).find(row=>row.id===deleted.id).state,'available');
  process.env.FULLVIEW_RETENTION_CLEANUP_ENABLED='true';
  const result=await make({storage:{...storage,async deletePrivate(){throw Error('Storage unavailable');}}}).delete(alice,p1,deleted.id);
  assert.equal(result.storageDeleted,false);
  await fails(()=>service.download(alice,p1,deleted.id),'document_not_found');
  assert.equal((await service.list(alice,p1)).some(item=>item.id===deleted.id),false);
  const cleanup=await service.purgeExpired(staff,p1);
  assert.equal(cleanup.retryPending,0);

  const shorter=await make({policy:{...policy,retentionDays:7}}).upload(alice,p1,{...input,filename:'Short policy.txt'});
  assert.equal(shorter.expiresAt,'2030-01-08T00:00:00.000Z');
  current=new Date('2030-01-15T00:00:00Z');
  await fails(()=>make({policy:{...policy,retentionDays:7}}).upload(alice,p1,input),'document_retention_expired');
  const expires=await service.upload(alice,p1,{...input,filename:'Expires.txt'});
  assert.equal(expires.expiresAt,'2030-01-31T00:00:00.000Z');
  current=new Date('2030-01-31T00:00:00Z');
  const beforeLate=objects.size;
  await fails(()=>service.upload(alice,p1,input),'document_retention_expired');
  assert.equal(objects.size,beforeLate);
  current=new Date('2030-02-01T00:00:00Z');
  await fails(()=>service.download(alice,p1,expires.id),'document_unavailable');
  assert.equal((await service.list(alice,p1)).find(item=>item.id===expires.id).state,'expired');
  await fails(()=>service.purgeExpired(alice,p1),'staff_required');
  assert.ok((await service.purgeExpired(staff,p1)).processed>0);
  await fails(()=>service.download(alice,p1,expires.id),'document_not_found');

  // A project expiring sooner bounds document retention; deleted projects deny all file access.
  await db.query("UPDATE fv_projects SET created_at='2030-02-01',expires_at='2030-02-03' WHERE id=$1",[p3]);
  const bounded=await service.upload(alice,p3,input);
  assert.equal(bounded.expiresAt,'2030-02-03T00:00:00.000Z');
  await db.query('UPDATE fv_projects SET deleted_at=now() WHERE id=$1',[p3]);
  await fails(()=>service.download(alice,p3,bounded.id),'project_not_found');
  current=new Date('2030-02-04T00:00:00Z');
  assert.equal((await service.purgeExpired(staff,p3)).processed,1);

  // Unicode/quotes are encoded for attachment headers, never interpolated raw.
  await db.query("UPDATE fv_projects SET created_at='2030-02-04' WHERE id=$1",[p2]);
  const named=await service.upload(bob,p2,{...input,filename:'Synthetic "résumé".txt'});
  const safeHeader=(await service.download(bob,p2,named.id)).headers['Content-Disposition'];
  assert.ok(safeHeader.includes('%22'));assert.ok(safeHeader.includes('%C3%A9'));assert.ok(!safeHeader.includes('\r'));
  const auditRows=await db.query('SELECT action,metadata FROM fv_audit');
  assert.ok(auditRows.rows.some(row=>row.action==='document.available'));
  assert.ok(auditRows.rows.some(row=>row.action==='document.retention_cleanup'));
  assert.ok(!JSON.stringify(auditRows.rows).includes('Only synthetic test content'));
  console.log('PASS: private documents fail closed by default; project authorization, quarantine/scan gating, validation, integrity, retention, revocation, deletion and private download headers verified with synthetic local data.');
} finally {await pg.close();for(const key of envKeys){if(priorEnv[key]===undefined)delete process.env[key];else process.env[key]=priorEnv[key];}}
