import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {PGlite} from '@electric-sql/pglite';

const {outputFiles}=await build({entryPoints:['lib/operations/quotes.ts'],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const quotes=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
const database=new PGlite();
await database.exec(readFileSync('migrations/operations/001-core.sql','utf8'));
await database.exec(readFileSync('migrations/operations/002-quotes.sql','utf8'));
function adapter(connection){return {
  async query(sql,values=[]){const result=await connection.query(sql,values);return {rows:result.rows,rowCount:result.affectedRows??result.rows.length};},
  async transaction(work){return connection.transaction(tx=>work(adapter(tx)));},
};}
const db=adapter(database);
const owner={id:'client-owner',email:'owner@example.org',emailVerified:true,role:'client'};
const other={id:'client-other',email:'other@example.org',emailVerified:true,role:'client'};
const staff={id:'staff-1',email:'staff@example.org',emailVerified:true,role:'staff'};
const admin={id:'admin-1',email:'admin@example.org',emailVerified:true,role:'admin'};
const future=new Date(Date.now()+86400000*10).toISOString();
const past=new Date(Date.now()-86400000).toISOString();
const terms={scope:'Review the supplied 5,000-word draft and deliver annotated feedback.',revisions:'One consolidated correction round within 14 calendar days.',timeline:'Delivery date agreed with the client and recorded before work begins.',taxTreatment:'Synthetic test tax instruction; no tax is charged in this test.',deposit:'Synthetic test deposit instruction; no payment is collected.',cancellation:'Synthetic test cancellation instruction; no legal terms are inferred.'};
const value={lines:[{description:'Synthetic scoped review',quantity:3,unitAmountMinor:12550},{description:'Synthetic consultation',quantity:1,unitAmountMinor:5000}],terms,expiresAt:future};
async function project(user=owner,status='scoped'){
  const id=crypto.randomUUID();
  await db.query('INSERT INTO fv_projects (id,reference,owner_id,idempotency_key,payload_hash,title,description,brief,status,expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)',[id,'TEST-'+id,user.id,crypto.randomUUID(),'synthetic','Synthetic quote test','Synthetic non-sensitive test project','{}',status,future]);
  return id;
}
async function rejects(work,status,code){await assert.rejects(work,error=>error.status===status&&(!code||error.code===code));}
try{
  const id=await project();
  await rejects(()=>quotes.createQuote(db,owner,id,value),403,'staff_required');
  await rejects(()=>quotes.createQuote(db,{...staff,emailVerified:false},id,value),403,'email_verification_required');
  for(const invalid of [
    {...value,totalMinor:1},{...value,currency:'USD'},
    {...value,lines:[{...value.lines[0],quantity:0.5}]},
    {...value,lines:[{...value.lines[0],unitAmountMinor:0.1}]},
    {...value,lines:[{...value.lines[0],unitAmountMinor:-1}]},
    {...value,terms:{...terms,unknown:'injected'}},
    {...value,terms:{scope:terms.scope}},
  ]) await rejects(()=>quotes.createQuote(db,staff,id,invalid),400,'invalid_quote');
  await rejects(()=>quotes.createQuote(db,staff,id,{...value,expiresAt:past}),409,'quote_expired');
  await rejects(()=>quotes.createQuote(db,staff,id,{...value,lines:[{description:'Excessive',quantity:10000,unitAmountMinor:1000000000}]}),400,'quote_total_too_large');
  assert.equal((await quotes.listQuotes(db,staff,id)).length,0,'Invalid input must leave no draft');

  const incomplete=await quotes.createQuote(db,staff,id,{...value,terms:{...terms,deposit:''}});
  assert.equal(incomplete.status,'draft');
  assert.equal(incomplete.checkoutEnabled,false);
  assert.equal((await quotes.listQuotes(db,owner,id)).length,0,'Unissued terms are not client-visible');
  await rejects(()=>quotes.issueQuote(db,staff,id,incomplete.id,incomplete.version),409,'quote_terms_incomplete');
  const first=await quotes.createQuote(db,admin,id,value);
  assert.equal(first.version,2);
  assert.equal(first.totalMinor,42650,'Money is calculated in integer minor units');
  assert.equal((await quotes.listQuotes(db,staff,id))[1].status,'superseded');
  await rejects(()=>quotes.issueQuote(db,staff,id,incomplete.id,incomplete.version),409,'quote_version_changed');
  await rejects(()=>quotes.issueQuote(db,staff,id,first.id,1),409,'quote_version_changed');
  await rejects(()=>quotes.acceptQuote(db,owner,id,first.id,{version:first.version,termsAccepted:true}),409,'quote_not_available');
  await rejects(()=>quotes.listQuotes(db,other,id),404,'project_not_found');
  await rejects(()=>quotes.listQuotes(db,{...owner,emailVerified:false},id),403,'email_verification_required');

  const issued=await quotes.issueQuote(db,staff,id,first.id,first.version);
  assert.equal(issued.status,'issued');
  assert.ok(issued.issuedAt);
  assert.equal((await db.query('SELECT status FROM fv_projects WHERE id=$1',[id])).rows[0].status,'quoted');
  assert.deepEqual((await quotes.listQuotes(db,owner,id)).map(q=>q.id),[first.id]);
  const otherProject=await project(other);
  await rejects(()=>quotes.acceptQuote(db,owner,otherProject,first.id,{version:first.version,termsAccepted:true}),404,'project_not_found');
  await rejects(()=>quotes.acceptQuote(db,other,id,first.id,{version:first.version,termsAccepted:true}),404,'project_not_found');
  await rejects(()=>quotes.acceptQuote(db,staff,id,first.id,{version:first.version,termsAccepted:true}),403,'client_acceptance_required');
  await rejects(()=>quotes.acceptQuote(db,owner,id,first.id,{version:first.version,termsAccepted:false}),400,'invalid_quote');
  await rejects(()=>quotes.acceptQuote(db,owner,id,first.id,{version:first.version,termsAccepted:true,acceptedBy:'other'}),400,'invalid_quote');
  await rejects(()=>quotes.acceptQuote(db,owner,id,first.id,{version:999,termsAccepted:true}),409,'quote_version_changed');

  const replacement=await quotes.createQuote(db,staff,id,{...value,lines:[{description:'Revised scope',quantity:2,unitAmountMinor:25000}]});
  assert.equal((await quotes.listQuotes(db,owner,id)).length,1,'A replacement draft is not exposed');
  await quotes.issueQuote(db,staff,id,replacement.id,replacement.version);
  await rejects(()=>quotes.acceptQuote(db,owner,id,first.id,{version:first.version,termsAccepted:true}),409,'quote_not_available');
  const visible=await quotes.listQuotes(db,owner,id);
  assert.deepEqual(visible.map(q=>q.status),['issued','superseded'],'Previously issued history remains visible; unpublished drafts do not');

  await assert.rejects(()=>db.query("UPDATE fv_quotes SET terms='{}'::jsonb WHERE id=$1",[replacement.id]),/immutable/);
  await assert.rejects(()=>db.query('UPDATE fv_quotes SET total_minor=1 WHERE id=$1',[replacement.id]),/immutable/);
  await assert.rejects(()=>db.query("UPDATE fv_quotes SET status='draft' WHERE id=$1",[replacement.id]),/Invalid quote status/);
  const accepted=await quotes.acceptQuote(db,owner,id,replacement.id,{version:replacement.version,termsAccepted:true});
  assert.equal(accepted.status,'accepted');
  assert.equal(accepted.totalMinor,50000);
  assert.equal(accepted.checkoutEnabled,false);
  assert.ok(accepted.acceptedAt);
  const acceptedProject=(await db.query('SELECT status,version FROM fv_projects WHERE id=$1',[id])).rows[0];
  assert.equal(acceptedProject.status,'accepted');
  assert.equal(acceptedProject.version,4);
  const acceptedAgain=await quotes.acceptQuote(db,owner,id,replacement.id,{version:replacement.version,termsAccepted:true});
  assert.equal(acceptedAgain.acceptedAt,accepted.acceptedAt,'Exact retry must preserve original evidence');
  assert.equal((await db.query("SELECT count(*)::int AS count FROM fv_audit WHERE action='quote.accepted' AND resource_id=$1",[replacement.id])).rows[0].count,1);
  assert.equal((await db.query('SELECT version FROM fv_projects WHERE id=$1',[id])).rows[0].version,acceptedProject.version);
  await rejects(()=>quotes.createQuote(db,staff,id,value),409,'engagement_locked');
  await rejects(()=>quotes.issueQuote(db,staff,id,first.id,first.version),409,'engagement_locked');
  await assert.rejects(()=>db.query("UPDATE fv_quotes SET status='superseded',accepted_at=NULL,accepted_by=NULL WHERE id=$1",[replacement.id]),/Invalid quote status/);

  const expiredProject=await project();
  const expiredId=crypto.randomUUID();
  await db.query("INSERT INTO fv_quotes (id,project_id,version,status,lines,terms,total_minor,expires_at,created_by,issued_at) VALUES ($1,$2,1,'issued',$3::jsonb,$4::jsonb,42650,$5,$6,$5)",[expiredId,expiredProject,JSON.stringify(value.lines),JSON.stringify(terms),past,staff.id]);
  await rejects(()=>quotes.acceptQuote(db,owner,expiredProject,expiredId,{version:1,termsAccepted:true}),409,'quote_expired');
  assert.equal((await db.query('SELECT status FROM fv_projects WHERE id=$1',[expiredProject])).rows[0].status,'scoped');
  for(const status of ['accepted','in_progress','delivered','closed']){
    const lockedProject=await project(owner,status);
    await rejects(()=>quotes.createQuote(db,staff,lockedProject,value),409,'engagement_locked');
  }
  const deletedProject=await project();
  await db.query('UPDATE fv_projects SET deleted_at=now() WHERE id=$1',[deletedProject]);
  await rejects(()=>quotes.createQuote(db,staff,deletedProject,value),404,'project_not_found');

  const rollbackProject=await project();
  const rollbackQuote=await quotes.createQuote(db,staff,rollbackProject,value);
  const failAudit={...db,transaction:work=>db.transaction(tx=>work({...tx,async query(sql,values=[]){
    if(sql.startsWith('INSERT INTO fv_audit'))throw new Error('Synthetic audit failure');
    return tx.query(sql,values);
  }}))};
  await assert.rejects(()=>quotes.issueQuote(failAudit,staff,rollbackProject,rollbackQuote.id,rollbackQuote.version),/Synthetic audit failure/);
  assert.equal((await quotes.listQuotes(db,staff,rollbackProject))[0].status,'draft','Audit failure rolls back issuance');
  assert.equal((await db.query('SELECT status FROM fv_projects WHERE id=$1',[rollbackProject])).rows[0].status,'scoped');
  await quotes.issueQuote(db,staff,rollbackProject,rollbackQuote.id,rollbackQuote.version);
  await assert.rejects(()=>quotes.acceptQuote(failAudit,owner,rollbackProject,rollbackQuote.id,{version:rollbackQuote.version,termsAccepted:true}),/Synthetic audit failure/);
  assert.equal((await quotes.listQuotes(db,owner,rollbackProject))[0].status,'issued','Audit failure rolls back acceptance');
  assert.equal((await db.query('SELECT status FROM fv_projects WHERE id=$1',[rollbackProject])).rows[0].status,'quoted');
  console.log('PASS: quote migration, immutable versions, required owner terms, integer GHS arithmetic, project/role isolation, issue/supersede/expiry, explicit client acceptance, idempotent retry and disabled checkout.');
}finally{await database.close();}
