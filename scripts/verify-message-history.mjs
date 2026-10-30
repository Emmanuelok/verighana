import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {build} from 'esbuild';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';

async function load(options){const {outputFiles}=await build({...options,bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});return import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));}
const pg=new PGlite();
try{
 for(const file of readdirSync('migrations/operations').filter(file=>file.endsWith('.sql')).sort())await pg.exec(readFileSync('migrations/operations/'+file,'utf8'));
 const adapt=client=>({query:async(sql,params=[])=>{const result=await client.query(sql,params);return {rows:result.rows,rowCount:result.affectedRows??result.rows.length};},transaction:work=>client.transaction(tx=>work(adapt(tx)))});
 const db=adapt(pg),projects=await load({entryPoints:['lib/operations/projects.ts']});
 const owner={id:'owner',email:'synthetic@example.org',emailVerified:true,role:'client'};
 const other={...owner,id:'other'},staff={...owner,id:'staff',role:'staff'};
 const projectId=crypto.randomUUID(),otherProjectId=crypto.randomUUID();
 for(const id of [projectId,otherProjectId])await db.query(`INSERT INTO fv_projects(id,reference,owner_id,idempotency_key,payload_hash,title,description,brief,expires_at)
   VALUES($1,$2,$3,$4,'fixture','Synthetic history','Only local test content','{}',now()+interval '7 days')`,[id,'TEST-'+id,owner.id,crypto.randomUUID()]);
 await db.query(`INSERT INTO fv_messages(id,project_id,author_id,body,created_at)
   SELECT ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,$1,$2,'Message '||n::text,
     timestamptz '2026-01-01 00:00:00+00'+((n/2)::text||' microseconds')::interval FROM generate_series(1,605) AS n`,[projectId,owner.id]);
 const first=await projects.listProjectMessages(db,owner,projectId);
 assert.equal(first.messages.length,200);assert.equal(first.messages[0].body,'Message 406');assert.equal(first.messages.at(-1).body,'Message 605');
 assert.equal(first.hasMore,true);assert.match(first.nextCursor,/^[A-Za-z0-9_-]+$/);
 assert.equal(first.messages[0].created_at,'2026-01-01T00:00:00.000203Z');
 const detail=await projects.projectDetail(db,owner,projectId);
 assert.deepEqual(detail.messageHistory,{hasMore:first.hasMore,nextCursor:first.nextCursor});assert.deepEqual(detail.messages,first.messages);
 assert.deepEqual(await projects.listProjectMessages(db,staff,projectId),first);
 assert.deepEqual(await projects.listProjectMessages(db,owner,otherProjectId),{messages:[],hasMore:false,nextCursor:null});

 // A new post cannot shift the older-page cursor or cause missing/duplicate messages.
 await projects.addMessage(db,owner,projectId,{body:'A new message while history is loading'});
 let cursor=first.nextCursor;const pages=[first];
 while(cursor){const page=await projects.listProjectMessages(db,owner,projectId,{before:cursor,limit:73});pages.unshift(page);cursor=page.nextCursor;}
 const all=pages.flatMap(page=>page.messages);
 assert.equal(all.length,605);assert.equal(new Set(all.map(message=>message.id)).size,605);
 assert.deepEqual(all.map(message=>message.body),Array.from({length:605},(_,index)=>`Message ${index+1}`));
 assert.equal(pages[0].hasMore,false);assert.equal(pages[0].nextCursor,null);
 for(const actor of [other,{...owner,emailVerified:false}])await assert.rejects(projects.listProjectMessages(db,actor,projectId,{before:first.nextCursor}),error=>error.status===403||error.status===404);
 await assert.rejects(projects.listProjectMessages(db,owner,otherProjectId,{before:first.nextCursor}),error=>error.code==='invalid_message_cursor');
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const valid=JSON.parse(Buffer.from(first.nextCursor,'base64url').toString('utf8'));
 for(const before of ['bad!',first.nextCursor+'=',encode({...valid,v:2}),encode({...valid,t:'2026-02-30T00:00:00.000000Z'}),encode({...valid,t:'2026-01-01T00:00:00Z'}),encode({...valid,i:'not-a-uuid'}),encode({...valid,extra:true}),encode({v:1})])await assert.rejects(projects.listProjectMessages(db,owner,projectId,{before}),error=>error.code==='invalid_message_cursor');
 for(const input of [{limit:0},{limit:201},{limit:1.5},{limit:'20'},{before:''},{before:'a'.repeat(513)},{unexpected:true}])await assert.rejects(projects.listProjectMessages(db,owner,projectId,input));

 // Exercise the actual UI merge functions without mounting accounts or using a network.
 const uiPath='components/operations-dashboard.tsx',uiText=readFileSync(uiPath,'utf8');
 const source=ts.createSourceFile(uiPath,uiText,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const names=['mergeMessages','refreshedConversation'];
 const functions=source.statements.filter(statement=>ts.isFunctionDeclaration(statement)&&names.includes(statement.name?.text)).map(statement=>statement.getText(source));
 assert.equal(functions.length,2);
 const ui=await load({stdin:{contents:functions.join('\n')+'\nexport {mergeMessages,refreshedConversation};',loader:'ts'}});
 const loaded={...detail,messages:all,messageHistory:{hasMore:false,nextCursor:null}};
 const refreshed=await projects.projectDetail(db,owner,projectId);
 const continuous=ui.refreshedConversation(loaded,refreshed);
 assert.equal(continuous.messages.length,606);assert.equal(new Set(continuous.messages.map(message=>message.id)).size,606);
 assert.equal(continuous.messages[0].body,'Message 1');assert.equal(continuous.messages.at(-1).body,'A new message while history is loading');
 assert.deepEqual(continuous.messageHistory,{hasMore:false,nextCursor:null});
 assert.deepEqual(ui.mergeMessages(first.messages,first.messages),first.messages);
 assert.equal(ui.refreshedConversation(loaded,{...refreshed,id:otherProjectId}).id,otherProjectId);
 const disjoint={...refreshed,messages:[{id:crypto.randomUUID(),author_id:owner.id,body:'Separate newest page',created_at:'2027-01-01T00:00:00.000000Z'}]};
 assert.deepEqual(ui.refreshedConversation(loaded,disjoint),disjoint);
 await db.query("UPDATE fv_projects SET expires_at=now()-interval '1 day' WHERE id=$1",[projectId]);
 await assert.rejects(projects.listProjectMessages(db,owner,projectId,{before:first.nextCursor}),error=>error.code==='project_not_found');
 console.log('PASS: full 605-message history with exact timestamp ties, stable cursors across new posts, bounded/validated pagination, per-page owner/staff/verification/expiry access, cross-project cursor rejection, UI deduplication and refresh continuity. Synthetic local Postgres only; no accounts, emails or remote actions.');
}finally{await pg.close();}
