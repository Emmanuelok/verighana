import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {basename,dirname,resolve} from 'node:path';
import {build} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

// Synthetic component/route fixtures only. No browser, database, provider, or real submission.
const require=createRequire(import.meta.url);
let stateValues=[],stateIndex=0;
const hooks={...React,useState(initial){const index=stateIndex++;if(!(index in stateValues))stateValues[index]=typeof initial==='function'?initial():initial;return[stateValues[index],value=>{stateValues[index]=typeof value==='function'?value(stateValues[index]):value;}];},useEffect(){},useRef:initial=>({current:initial}),useCallback:value=>value};
function render(component,props,states=[]){stateValues=[...states];stateIndex=0;const element=component(props);return {element,markup:renderToStaticMarkup(element)};}
function find(element,type){if(!element||typeof element!=='object')return null;if(element.type===type)return element;for(const child of React.Children.toArray(element.props?.children)){const match=find(child,type);if(match)return match;}return null;}
async function load(path,expose=[],plugins=[]){
 const source=readFileSync(path,'utf8')+(expose.length?`\nexport {${expose.join(',')}};`:'');
 const result=await build({stdin:{contents:source,resolveDir:dirname(resolve(path)),sourcefile:basename(path),loader:path.endsWith('tsx')?'tsx':'ts'},bundle:true,write:false,format:'cjs',platform:'node',packages:'external',jsx:'automatic',plugins,logLevel:'silent'});
 const compiled={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(id=>id==='react'?hooks:require(id),compiled,compiled.exports);return compiled.exports;
}

const priorFetch=globalThis.fetch;
let networkCalls=0,performCalls=0,refreshCalls=0;
const candidate={kind:'project',id:'00000000-0000-4000-8000-000000000001',reference:'SYNTHETIC-REVIEW',expiresAt:'2026-10-01T00:00:00.000Z',reason:'expired',documentCleanupRequired:false,financialRetentionRequired:false};
try{
 globalThis.fetch=async()=>{networkCalls++;assert.fail('Unexpected network request');};
 const {RetentionRemoval,OperationsDashboard}=await load('components/operations-dashboard.tsx',['RetentionRemoval']);
 const props={candidate,cleanupAvailable:true,busy:false,perform:async work=>{performCalls++;await work();},refresh:async()=>{refreshCalls++;}};
 const blocked=[
  {label:'policy unavailable',props:{cleanupAvailable:false},notice:'retention and removal policy is confirmed'},
  {label:'missing policy flag',props:{cleanupAvailable:undefined},notice:'retention and removal policy is confirmed'},
  {label:'malformed policy flag',props:{cleanupAvailable:'true'},notice:'retention and removal policy is confirmed'},
  {label:'financial hold',record:{financialRetentionRequired:true},notice:'separate financial retention review'},
  {label:'missing financial review',record:{financialRetentionRequired:undefined},notice:'financial retention review status is unavailable'},
  {label:'malformed financial review',record:{financialRetentionRequired:'false'},notice:'financial retention review status is unavailable'},
  {label:'file cleanup',record:{documentCleanupRequired:true},notice:'Private file cleanup is still required'},
  {label:'missing file review',record:{documentCleanupRequired:undefined},notice:'Private file cleanup status is unavailable'},
  {label:'busy',props:{busy:true}},
 ];
 for(const item of blocked){
  const view=render(RetentionRemoval,{...props,...item.props,candidate:{...candidate,...item.record}},[candidate.reference,true,'']);
  assert.equal(find(view.element,'button').props.disabled,true,item.label);
  assert.equal(find(view.element,'input').props.disabled,true,item.label);
  if(item.notice)assert.ok(view.markup.includes(item.notice),item.label);
  assert.ok(!view.markup.includes('FULLVIEW_'),'Product copy must not expose environment settings');
  let prevented=false;await find(view.element,'form').props.onSubmit({preventDefault(){prevented=true;}});
  assert.equal(prevented,true);assert.equal(performCalls,0,`${item.label}: direct submit must stop before work`);
  assert.equal(networkCalls,0);assert.equal(refreshCalls,0);
 }
 for(const states of [['WRONG',true,''],[candidate.reference,false,'']]){
  const view=render(RetentionRemoval,props,states);assert.equal(find(view.element,'button').props.disabled,true);
  await find(view.element,'form').props.onSubmit({preventDefault(){}});assert.equal(performCalls,0);
 }
 // The legitimate ready path still requires exact reference/consent and sends one mocked action.
 let posted;
 globalThis.fetch=async(url,options)=>{networkCalls++;assert.equal(url,'/api/staff/retention');assert.equal(options.method,'POST');posted=JSON.parse(options.body);return Response.json({message:'Synthetic local removal result'});};
 const ready=render(RetentionRemoval,props,[candidate.reference,true,'']);
 assert.equal(find(ready.element,'button').props.disabled,false);
 await find(ready.element,'form').props.onSubmit({preventDefault(){}});
 assert.deepEqual(posted,{kind:candidate.kind,id:candidate.id,confirmReference:candidate.reference,retentionCleared:true});
 assert.equal(performCalls,1);assert.equal(networkCalls,1);assert.equal(refreshCalls,1);

 // Exercise the dashboard's real response-to-component wiring, including older responses.
 const overview={actor:{id:'synthetic-admin',email:'synthetic@example.org',role:'admin'},projects:[],retentionReviews:[candidate]};
 for(const cleanup of [false,undefined,'true',true]){
  const view=render(OperationsDashboard,{mode:'staff'},[{...overview,retentionCleanupAvailable:cleanup},null,null,[],[],false,false,false,null,'']);
  assert.equal(view.markup.includes('retention and removal policy is confirmed'),cleanup!==true);
 }
 const held=render(OperationsDashboard,{mode:'staff'},[{...overview,retentionCleanupAvailable:true,retentionReviews:[{...candidate,financialRetentionRequired:true}]},null,null,[],[],false,false,false,null,'']);
 assert.ok(held.markup.includes('separate financial retention review'));

 const {readAvailability,ContactForm}=await load('components/contact-form.tsx',['readAvailability']);
 const availability={available:true,recipient:'hello@fvsignature.com',consentVersion:'fullview-inquiry-v1',retentionDays:30};
 let current=availability;
 globalThis.fetch=async(url,options)=>{networkCalls++;assert.equal(url,'/api/inquiries');assert.equal(options.method,undefined,'Availability must only read');return Response.json(current);};
 for(const days of [1,30]){
  current={...availability,retentionDays:days};assert.deepEqual(await readAvailability(new AbortController().signal),{state:'available',retentionDays:days});
 }
 for(const days of [0,-1,31,3650,1.5,null,'30']){
  current={...availability,retentionDays:days};assert.deepEqual(await readAvailability(new AbortController().signal),{state:'unavailable'});
 }
 for(const change of [{available:false},{retentionDays:undefined},{recipient:'other@example.org'},{consentVersion:'other'}]){
  current={...availability,...change};assert.deepEqual(await readAvailability(new AbortController().signal),{state:'unavailable'});
 }
 const fields={name:'',email:'',subject:'',message:'',website:''};
 const availableForm=render(ContactForm,{},[fields,false,{state:'available',retentionDays:30},false,'','',null]);
 assert.ok(availableForm.markup.includes('30 days from submission'));
 assert.ok(availableForm.markup.includes('A review does not confirm automatic deletion.'));
 assert.equal(find(availableForm.element,'button').props.disabled,false);
 const unavailableForm=render(ContactForm,{},[fields,false,{state:'unavailable'},false,'','',null]);
 assert.ok(unavailableForm.markup.includes('The retention policy must be available before online submission is enabled.'));
 assert.ok(!unavailableForm.markup.includes('days from submission'));
 const form=find(unavailableForm.element,'form');
 assert.equal(find(form,'button').props.disabled,true);
 const callsBefore=networkCalls;await form.props.onSubmit({preventDefault(){}});assert.equal(networkCalls,callsBefore,'Unavailable form cannot submit');

 // Both staff read endpoints expose the same current availability flag without configuration details.
 globalThis.__retentionUiRoute={available:false,actor:overview.actor,reviews:[{...candidate,financialRetentionRequired:true}]};
 const routeFixtures={name:'retention-ui-routes',setup(builder){
  builder.onResolve({filter:/operations\/(http|retention|core|inquiries|projects|email|validation)$/},args=>({path:args.path.split('/').at(-1),namespace:'retention-ui-route'}));
  builder.onLoad({filter:/.*/,namespace:'retention-ui-route'},args=>({loader:'js',contents:{
   http:'export const context=async()=>({actor:globalThis.__retentionUiRoute.actor,db:{query:async()=>({rows:[]})}});export const respond=async work=>Response.json(await work());export const readJson=async request=>request.json();',
   retention:'export const listRetentionReviews=async()=>globalThis.__retentionUiRoute.reviews;export const purgeReviewedRecord=()=>{throw Error("No purge in endpoint fixtures");};',
   core:'export const requireStaff=actor=>{if(!["staff","admin"].includes(actor.role))throw Error("Forbidden");};',
   inquiries:'export const listInquiries=async()=>[];',projects:'export const listProjects=async()=>[];export const listDeletionRequests=async()=>[];',
   email:'export const listStaffNotifications=async()=>[];',validation:'export const retentionCleanupConfigured=()=>globalThis.__retentionUiRoute.available;',
  }[args.path]}));
 }};
 for(const path of ['app/api/staff/route.ts','app/api/staff/retention/route.ts']){
  const route=await load(path,[],[routeFixtures]);
  for(const available of [false,true]){
   globalThis.__retentionUiRoute.available=available;
   const response=await(await route.GET()).json();assert.equal(response.retentionCleanupAvailable,available);
   assert.equal(response.retentionReviews[0].financialRetentionRequired,true);
   assert.ok(!JSON.stringify(response).includes('FULLVIEW_'));
  }
 }
 console.log('PASS: policy/financial/file holds and missing metadata disable removal and direct submits; reviewed ready path works only in local mocks; staff flags propagate; contact readiness accepts only 1–30 days and discloses submission-based review. No real network, database, email or deletion.');
}finally{globalThis.fetch=priorFetch;delete globalThis.__retentionUiRoute;}
