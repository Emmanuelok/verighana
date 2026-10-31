'use client';

import {useEffect, useRef, useState, type FormEvent} from 'react';
import Link from 'next/link';
import {fullviewContact} from '../lib/contact';
import {ContactEmail} from './contact-email';
import {NotificationFollowUp,notificationLabel,type NotificationSummary} from './notification-follow-up';
import {SubmittedBrief} from './submitted-brief';
import type {Quote, QuoteInput, QuoteTerms} from '../lib/operations/quotes';

type Actor = {id:string;email:string;role:'client'|'staff'|'admin'};
type Staff = {user_id:string;role:string};
type Project = {id:string;reference:string;title:string;status:string;assigned_to:string|null;version:number;created_at:string;expired?:boolean};
type Inquiry = {id:string;reference:string;data:{name:string;email:string;subject:string;message:string};status:string;assigned_to:string|null;version:number;created_at:string;notification:string|null};
type Notification = NotificationSummary;
type DeletionReview = {id:string;project_id:string;reference:string;requested_by:string;status:'pending'|'in_review';version:number;created_at:string;updated_at:string};
type RetentionReview = {kind:'project'|'inquiry';id:string;reference:string;expiresAt:string;reason:'expired'|'deletion_requested';documentCleanupRequired:boolean};
type Overview = {actor:Actor;projects:Project[];inquiries?:Inquiry[];staff?:Staff[];notifications?:Notification[];deletionRequests?:DeletionReview[];retentionReviews?:RetentionReview[];retentionDays?:number;uploadsAvailable?:boolean;checkoutEnabled?:boolean};
type Message = {id:string;author_id:string;body:string;created_at:string};
type MessagePage = {messages:Message[];hasMore:boolean;nextCursor:string|null};
type Detail = Project & {description:string;expires_at:string;brief:Record<string,unknown>;messages:Message[];messageHistory:Omit<MessagePage,'messages'>};
type Invoice = {id:string;reference:string;quoteId:string;totalMinor:number;currency:'GHS';dueDate:string;status:'draft'|'issued'|'void';checkoutEnabled:false};
type ApiFailure = {message:string;status?:number;code?:string;requestId?:string};
type Perform = (work:()=>Promise<void>,message:string)=>Promise<void>;

class ApiError extends Error {
  constructor(message:string,public status:number,public code?:string,public requestId?:string){super(message);}
}
async function request<T>(url:string,options:RequestInit={}):Promise<T> {
  const response=await fetch(url,{...options,credentials:'same-origin',cache:'no-store',headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});
  const data=await response.json().catch(()=>null);
  if(!response.ok){const details=data&&typeof data==='object'?data as Record<string,unknown>:{};throw new ApiError(typeof details.error==='string'?details.error:'This action could not be completed. Please try again.',response.status,typeof details.code==='string'?details.code:undefined,typeof details.requestId==='string'?details.requestId:undefined);}
  return data as T;
}
function failure(error:unknown):ApiFailure {return error instanceof ApiError?{message:error.message,status:error.status,code:error.code,requestId:error.requestId}:{message:error instanceof Error?error.message:'The service could not be reached. Please try again.'};}
const labels:Record<string,string>={new:'New inquiry',scoped:'Scoped',quoted:'Quoted',accepted:'Accepted',in_progress:'In progress',delivered:'Delivered',closed:'Closed'};
const nextStatuses:Record<string,string[]>={new:['scoped','closed'],scoped:['new','closed'],quoted:['closed'],accepted:['in_progress','closed'],in_progress:['delivered','closed'],delivered:['closed'],closed:[]};
const termLabels:Record<keyof QuoteTerms,string>={scope:'Scope and deliverables',revisions:'Revisions',timeline:'Delivery and timing',taxTreatment:'Taxes and external costs',deposit:'Deposit and payment terms',cancellation:'Cancellation terms'};
const blankTerms:QuoteTerms={scope:'',revisions:'',timeline:'',taxTreatment:'',deposit:'',cancellation:''};
const amount=(minor:number)=>new Intl.NumberFormat('en-GH',{style:'currency',currency:'GHS'}).format(minor/100);
function date(value:string){const parsed=new Date(value);return Number.isNaN(parsed.valueOf())?'Date unavailable':parsed.toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'});}
function mergeMessages(earlier:Message[],latest:Message[]){return [...new Map([...earlier,...latest].map(message=>[message.id,message])).values()].sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id));}
function refreshedConversation(previous:Detail|null,current:Detail):Detail {
  if(previous?.id!==current.id)return current;
  const known=new Set(previous.messages.map(message=>message.id));
  // If the newest page no longer overlaps, restart its cursor rather than silently skipping a gap.
  if(!current.messages.some(message=>known.has(message.id)))return current;
  return {...current,messages:mergeMessages(previous.messages,current.messages),messageHistory:previous.messageHistory};
}

export function OperationsDashboard({mode}:{mode:'client'|'staff'}) {
  const [overview,setOverview]=useState<Overview|null>(null);
  const [selected,setSelected]=useState<string|null>(null);
  const [detail,setDetail]=useState<Detail|null>(null);
  const [quotes,setQuotes]=useState<Quote[]>([]);
  const [invoices,setInvoices]=useState<Invoice[]>([]);
  const [loading,setLoading]=useState(true);
  const [detailLoading,setDetailLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<ApiFailure|null>(null);
  const [message,setMessage]=useState('');
  const overviewController=useRef<AbortController|null>(null);
  const detailController=useRef<AbortController|null>(null);
  const feedback=useRef<HTMLDivElement>(null);
  const projectHeading=useRef<HTMLHeadingElement>(null);
  const endpoint=mode==='staff'?'/api/staff':'/api/projects';
  useEffect(()=>{
    const controller=new AbortController();overviewController.current=controller;
    request<Overview>(endpoint,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted){setOverview(data);setLoading(false);}}).catch(reason=>{if(!controller.signal.aborted){setError(failure(reason));setLoading(false);}});
    return()=>{controller.abort();detailController.current?.abort();};
  },[endpoint]);
  async function refreshOverview(){
    overviewController.current?.abort();const controller=new AbortController();overviewController.current=controller;
    const data=await request<Overview>(endpoint,{signal:controller.signal});
    if(!controller.signal.aborted){setOverview(data);if(selected&&!data.projects.some(project=>project.id===selected&&!project.expired)){setSelected(null);setDetail(null);setQuotes([]);setInvoices([]);}}
  }
  async function refreshDetail(id:string){
    detailController.current?.abort();const controller=new AbortController();detailController.current=controller;
    const [project,quoteResult,invoiceResult]=await Promise.all([request<Detail>(`/api/projects/${id}`,{signal:controller.signal}),request<{quotes:Quote[]}>(`/api/projects/${id}/quotes`,{signal:controller.signal}),request<{invoices:Invoice[]}>(`/api/projects/${id}/invoices`,{signal:controller.signal})]);
    if(!controller.signal.aborted){setDetail(previous=>refreshedConversation(previous,project));setQuotes(quoteResult.quotes);setInvoices(invoiceResult.invoices);}
  }
  function prependMessages(projectId:string,page:MessagePage){setDetail(current=>current?.id===projectId?{...current,messages:mergeMessages(page.messages,current.messages),messageHistory:{hasMore:page.hasMore,nextCursor:page.nextCursor}}:current);}
  async function perform(work:()=>Promise<void>,success:string){
    if(busy)return;setBusy(true);setError(null);setMessage('');
    try{await work();setMessage(success);}
    catch(reason){const next=failure(reason);setError(next);if(next.status===401||next.status===403||next.status===503){setOverview(null);setDetail(null);setQuotes([]);setInvoices([]);}}
    finally{setBusy(false);requestAnimationFrame(()=>feedback.current?.focus());}
  }
  async function retry(){setLoading(true);await perform(refreshOverview,'Workspace refreshed.');setLoading(false);}
  async function openProject(id:string){
    if(overview?.projects.some(project=>project.id===id&&project.expired)){setMessage('The retention review date has been reached. Only review metadata is available; project content is not open for access.');return;}
    if(busy)return;setSelected(id);setDetail(null);setQuotes([]);setInvoices([]);setDetailLoading(true);setError(null);setMessage('');
    try{await refreshDetail(id);requestAnimationFrame(()=>projectHeading.current?.focus());}
    catch(reason){if(!(reason instanceof DOMException&&reason.name==='AbortError'))setError(failure(reason));}
    finally{setDetailLoading(false);}
  }
  async function afterProjectAction(){await refreshOverview();if(selected)await refreshDetail(selected);}
  const isStaff=overview?.actor.role==='staff'||overview?.actor.role==='admin';
  const signedOut=error?.status===401;
  return <main id="main" className="wrap operations-shell">
    <nav className="operations-toolbar" aria-label="Workspace navigation"><Link className="text-link" href="/">Fullview Signature</Link><Link className="text-link" href="/workspace">Local research desk</Link><Link className="text-link" href="/account">Your account</Link>{isStaff&&<Link className="text-link" href={mode==='staff'?'/projects':'/staff'}>{mode==='staff'?'Projects view':'Staff workspace'}</Link>}</nav>
    <header className="page-intro"><span className="eyebrow">{mode==='staff'?'FULLVIEW STAFF WORKSPACE':'YOUR SHARED PROJECTS'}</span><h1>{mode==='staff'?'A clear view of the work.':'Your project, together.'}</h1><p>{mode==='staff'?'Review inquiries, coordinate project stages and prepare clear terms for client acceptance.':'Review submitted projects, discuss the scope and keep track of agreed work. Signing in does not upload your device-local drafts.'}</p></header>
    <div ref={feedback} tabIndex={-1} className="operations-feedback">
      {error&&<div className="muted-info" role="alert"><h2>{signedOut?'Sign in to continue.':error.status===403?'Access needs attention.':error.status===503?'Online services are not available yet.':'This action needs attention.'}</h2><p>{error.message}</p>{error.requestId&&<p className="fine-print">Support reference: {error.requestId}</p>}<div className="hero-buttons"><Link className="button outline" href="/account">{signedOut?'Sign in':'Manage your account'}</Link><ContactEmail withPhone/><button className="text-link" type="button" disabled={busy} onClick={()=>void retry()}>Try again</button></div></div>}
      {message&&<p role="status" className="muted-info">{message}</p>}
    </div>
    {loading&&<p role="status">Loading your workspace…</p>}
    {overview&&<>
      <div className="operations-toolbar"><p>Signed in as <strong>{overview.actor.email}</strong></p><button className="button outline" disabled={busy} onClick={()=>void perform(afterProjectAction,'Workspace refreshed.')}>Refresh workspace</button></div>
      <p className="fine-print">Project stages: New inquiry → Scoped → Quoted → Accepted → In progress → Delivered. A quote becomes accepted only through the client’s explicit acceptance.</p>
      {typeof overview.retentionDays==='number'&&<p className="fine-print">Retention review period: {overview.retentionDays} days from submission. Reaching the review date restricts content access; it does not automatically delete records.</p>}
      {mode==='staff'&&isStaff&&<>
        <section aria-labelledby="inquiries-heading"><h2 id="inquiries-heading">Inquiries</h2><p>These messages were explicitly submitted to Fullview. Email-provider acceptance is separate from inbox delivery.</p>
          {!overview.inquiries?.length?<p className="muted-info">No inquiries are available.</p>:<div className="operations-grid">{overview.inquiries.map(inquiry=><InquiryCard key={`${inquiry.id}:${inquiry.version}`} inquiry={inquiry} staff={overview.staff??[]} busy={busy} perform={perform} refresh={refreshOverview}/>)}</div>}
        </section>
        {!!overview.notifications?.length&&<NotificationFollowUp notifications={overview.notifications} busy={busy} onCheck={resourceId=>void perform(async()=>{await request(`/api/staff/notifications/${resourceId}`,{method:'POST'});await refreshOverview();},'The sending attempt was checked. Review its current state above.')}/>}
        {!!overview.deletionRequests?.length&&<section className="operations-card" aria-labelledby="deletion-review-heading"><h2 id="deletion-review-heading">Deletion requests</h2><p>These requests require retention review and a separate removal procedure. Changing the review status does not delete records.</p><div className="operations-table-wrap"><table className="operations-table"><thead><tr><th scope="col">Project</th><th scope="col">Requested</th><th scope="col">Review status</th><th scope="col">Action</th></tr></thead><tbody>{overview.deletionRequests.map(item=><tr key={item.id}><td><button className="text-link" disabled={busy||detailLoading} onClick={()=>void openProject(item.project_id)}>{item.reference}</button></td><td>{date(item.created_at)}</td><td>{item.status==='pending'?'Pending review':'In review'}</td><td>{overview.actor.role==='admin'&&item.status==='pending'?<button className="text-link" disabled={busy} onClick={()=>void perform(async()=>{await request(`/api/staff/deletion-requests/${item.id}`,{method:'POST',body:JSON.stringify({version:item.version,status:'in_review'})});await refreshOverview();},'The deletion request is marked in review. No records were deleted.')}>Mark in review</button>:<span className="fine-print">Administrator review required</span>}</td></tr>)}</tbody></table></div></section>}
        {!!overview.retentionReviews?.length&&<section className="operations-card" aria-labelledby="retention-review-heading"><h2 id="retention-review-heading">Retention review queue</h2><p>This queue contains metadata for records that reached their review date or received a deletion request. Expiry does not automatically delete data.</p><div className="operations-table-wrap"><table className="operations-table"><thead><tr><th scope="col">Record</th><th scope="col">Reason</th><th scope="col">Review date</th><th scope="col">Administrator action</th></tr></thead><tbody>{overview.retentionReviews.map(item=><tr key={`${item.kind}:${item.id}`}><td>{item.reference}<br/><span className="fine-print">{item.kind==='project'?'Project':'Inquiry'}</span></td><td>{item.reason==='expired'?'Review date reached':'Deletion requested'}</td><td>{date(item.expiresAt)}</td><td>{overview.actor.role==='admin'?<RetentionRemoval candidate={item} busy={busy} perform={perform} refresh={refreshOverview}/>:<span className="fine-print">Administrator review required</span>}</td></tr>)}</tbody></table></div></section>}
      </>}
      <section aria-labelledby="projects-heading"><h2 id="projects-heading">{mode==='staff'?'Projects':'Your submitted projects'}</h2>
        {!overview.projects.length?<div className="muted-info"><p>No shared projects are available here.</p><Link className="text-link" href="/workspace">Prepare a brief in the research desk</Link><p className="fine-print">A local draft appears here only after you explicitly submit it while signed in.</p></div>:<div className="operations-grid">{overview.projects.map(project=><article key={project.id} className="operations-card"><span className="eyebrow">{project.reference}</span><h3>{project.title}</h3><p className="operations-status">{labels[project.status]??project.status}</p><p className="fine-print">Submitted {date(project.created_at)}</p>{project.expired?<><p className="muted-info">The retention review date has been reached. Project content is no longer available here; removal has not been confirmed.</p>{overview.actor.role==='client'&&<DeletionRequest projectId={project.id} busy={busy} perform={perform}/>}</>:<button type="button" className="button outline" aria-pressed={selected===project.id} disabled={busy||detailLoading} onClick={()=>void openProject(project.id)}>Open project</button>}</article>)}</div>}
      </section>
      {detailLoading&&<p role="status">Loading the project and its quotes…</p>}
      {detail&&<section className="operations-details" aria-labelledby="project-detail-heading"><div className="operations-toolbar"><div><span className="eyebrow">{detail.reference} · {labels[detail.status]??detail.status}</span><h2 id="project-detail-heading" tabIndex={-1} ref={projectHeading}>{detail.title}</h2></div><button className="text-link" disabled={busy} onClick={()=>{setSelected(null);setDetail(null);setQuotes([]);setInvoices([]);}}>Close project</button></div>
        <SubmittedBrief brief={detail.brief} description={detail.description} expiresAt={detail.expires_at}/>
        {isStaff&&<ProjectEditor key={`${detail.id}:${detail.version}`} project={detail} staff={overview.staff??[]} busy={busy} perform={perform} refresh={afterProjectAction}/>}
        <section aria-labelledby="quotes-heading"><h3 id="quotes-heading">Quotes and engagement terms</h3><p>Review the exact version, total and terms before accepting. No payment is collected here.</p>{!quotes.length&&<p className="muted-info">No quotes are available.</p>}<div className="operations-stack">{quotes.map(item=><QuoteCard key={`${item.id}:${item.status}`} item={item} isStaff={isStaff} busy={busy} perform={perform} refresh={afterProjectAction}/>)}</div>
          {isStaff&&!['accepted','in_progress','delivered','closed'].includes(detail.status)&&<QuoteComposer key={detail.id} projectId={detail.id} busy={busy} perform={perform} refresh={afterProjectAction}/>}
        </section>
        <ProjectInvoices key={detail.id} projectId={detail.id} invoices={invoices} quotes={quotes} isStaff={isStaff} busy={busy} perform={perform} refresh={afterProjectAction}/>
        <section className="operations-card" aria-labelledby="documents-heading"><h3 id="documents-heading">Documents and payments</h3><p>Private uploads are not available yet. Please agree a suitable transfer process with Fullview before sharing manuscripts or datasets. Keep sensitive participant data out of this workspace.</p><p>Online checkout is disabled. Any payment instructions must be agreed separately with Fullview.</p></section>
        <ProjectMessages key={detail.id} project={detail} actor={overview.actor} busy={busy} perform={perform} refresh={afterProjectAction} prepend={prependMessages}/>
        {(!isStaff||overview.actor.role==='admin')&&<DeletionRequest key={detail.id} projectId={detail.id} busy={busy} perform={perform}/>}
      </section>}
    </>}
    <footer className="operations-toolbar"><ContactEmail/><a href={fullviewContact.phoneHref}>{fullviewContact.phoneDisplay}</a></footer>
  </main>;
}

function Assignee({staff,value,onChange}:{staff:Staff[];value:string;onChange:(value:string)=>void}) {
  return <label className="field">Assigned staff member<select value={value} onChange={event=>onChange(event.target.value)}><option value="">Unassigned</option>{value&&!staff.some(member=>member.user_id===value)&&<option value={value}>Previously assigned member</option>}{staff.map(member=><option key={member.user_id} value={member.user_id}>{member.user_id} ({member.role})</option>)}</select></label>;
}
function InquiryCard({inquiry,staff,busy,perform,refresh}:{inquiry:Inquiry;staff:Staff[];busy:boolean;perform:Perform;refresh:()=>Promise<void>}) {
  const [status,setStatus]=useState(inquiry.status),[assigned,setAssigned]=useState(inquiry.assigned_to??'');
  async function submit(event:FormEvent){event.preventDefault();await perform(async()=>{await request(`/api/staff/inquiries/${inquiry.id}`,{method:'PATCH',body:JSON.stringify({version:inquiry.version,status,assignedTo:assigned||null})});await refresh();},'Inquiry updated.');}
  return <article className="operations-card"><span className="eyebrow">{inquiry.reference}</span><h3>{inquiry.data.subject}</h3><p>{inquiry.data.name} · {inquiry.data.email}</p><p className="operations-copy">{inquiry.data.message}</p><p className="fine-print">Received {date(inquiry.created_at)} · {notificationLabel(inquiry.notification)}</p><form className="operations-form" onSubmit={submit}><label className="field">Inquiry stage<select value={status} onChange={event=>setStatus(event.target.value)}>{['new','scoped','closed'].map(value=><option key={value} value={value}>{labels[value]}</option>)}</select></label><Assignee staff={staff} value={assigned} onChange={setAssigned}/><button className="button outline" disabled={busy}>Save inquiry changes</button></form></article>;
}
function ProjectEditor({project,staff,busy,perform,refresh}:{project:Project;staff:Staff[];busy:boolean;perform:Perform;refresh:()=>Promise<void>}) {
  const [status,setStatus]=useState(project.status),[assigned,setAssigned]=useState(project.assigned_to??'');
  async function submit(event:FormEvent){event.preventDefault();await perform(async()=>{await request(`/api/projects/${project.id}`,{method:'PATCH',body:JSON.stringify({version:project.version,status,assignedTo:assigned||null})});await refresh();},'Project updated.');}
  return <form className="operations-card operations-form" onSubmit={submit}><h3>Staff coordination</h3><label className="field">Project stage<select value={status} onChange={event=>setStatus(event.target.value)}>{[project.status,...(nextStatuses[project.status]??[])].map(value=><option key={value} value={value}>{labels[value]??value}</option>)}</select></label><Assignee staff={staff} value={assigned} onChange={setAssigned}/><p className="fine-print">Quoted and accepted stages are controlled by the quote workflow. This form does not accept terms for a client.</p><button className="button outline" disabled={busy}>Save project changes</button></form>;
}

function QuoteCard({item,isStaff,busy,perform,refresh}:{item:Quote;isStaff:boolean;busy:boolean;perform:Perform;refresh:()=>Promise<void>}) {
  const [accepted,setAccepted]=useState(false);
  const [expired,setExpired]=useState(()=>new Date(item.expiresAt).valueOf()<=Date.now());
  useEffect(()=>{const timer=setInterval(()=>setExpired(new Date(item.expiresAt).valueOf()<=Date.now()),60000);return()=>clearInterval(timer);},[item.expiresAt]);
  const complete=Object.values(item.terms).every(value=>value.trim());
  async function action(kind:'issue'|'accept'){await perform(async()=>{await request(`/api/projects/${item.projectId}/quotes/${item.id}`,{method:'POST',body:JSON.stringify({action:kind,version:item.version,...(kind==='accept'?{termsAccepted:true}:{})})});setAccepted(false);await refresh();},kind==='accept'?'This quote version was accepted. No payment was collected.':'The quote was issued for client review.');}
  return <article className="operations-card operations-quote"><div className="operations-toolbar"><h4>Quote version {item.version}</h4><span className="operations-status">{item.status}{item.status==='issued'&&expired?' · Expired':''}</span></div><div className="operations-table-wrap"><table className="operations-table"><caption>Itemised quote in Ghana cedis</caption><thead><tr><th scope="col">Scope item</th><th scope="col">Quantity</th><th scope="col">Unit price</th><th scope="col">Amount</th></tr></thead><tbody>{item.lines.map((line,index)=><tr key={index}><td>{line.description}</td><td>{line.quantity}</td><td>{amount(line.unitAmountMinor)}</td><td>{amount(line.quantity*line.unitAmountMinor)}</td></tr>)}</tbody><tfoot><tr><th scope="row" colSpan={3}>Quote total</th><td>{amount(item.totalMinor)}</td></tr></tfoot></table></div><dl>{Object.entries(termLabels).map(([key,label])=><div key={key}><dt>{label}</dt><dd className="operations-copy">{item.terms[key as keyof QuoteTerms]||'Not specified — draft cannot be issued.'}</dd></div>)}</dl><p>Valid until {date(item.expiresAt)}</p>{item.acceptedAt&&<p className="muted-info">Accepted {date(item.acceptedAt)}. This records acceptance of this version; it is not a payment receipt.</p>}
    {isStaff&&item.status==='draft'&&<><p className="fine-print">Issuing makes these terms visible to the client. All six business-term fields must be complete.</p><button className="button outline" disabled={busy||expired||!complete} onClick={()=>void action('issue')}>Issue quote version {item.version}</button></>}
    {!isStaff&&item.status==='issued'&&!expired&&<><label className="operations-check"><input type="checkbox" checked={accepted} onChange={event=>setAccepted(event.target.checked)}/><span>I have reviewed quote version {item.version}, its {amount(item.totalMinor)} total and all scope, timing, tax, payment and cancellation terms, and agree to this engagement.</span></label><button className="button" disabled={busy||!accepted} onClick={()=>void action('accept')}>Accept quote version {item.version}</button></>}
  </article>;
}

type LineDraft={description:string;quantity:string;price:string};
function minorUnits(value:string){if(!/^\d+(?:\.\d{1,2})?$/.test(value.trim()))return null;const [whole,fraction='']=value.trim().split('.');const result=Number(whole)*100+Number(fraction.padEnd(2,'0'));return Number.isSafeInteger(result)&&result<=1_000_000_000?result:null;}
function QuoteComposer({projectId,busy,perform,refresh}:{projectId:string;busy:boolean;perform:Perform;refresh:()=>Promise<void>}) {
  const [lines,setLines]=useState<LineDraft[]>([{description:'',quantity:'1',price:''}]);
  const [terms,setTerms]=useState<QuoteTerms>({...blankTerms});
  const [expiry,setExpiry]=useState('');
  const [formError,setFormError]=useState('');
  function update(index:number,field:keyof LineDraft,value:string){setLines(current=>current.map((line,i)=>i===index?{...line,[field]:value}:line));}
  async function submit(event:FormEvent){event.preventDefault();setFormError('');const parsed=[];
    for(const line of lines){const unitAmountMinor=minorUnits(line.price),quantity=Number(line.quantity);if(unitAmountMinor===null||!/^\d+$/.test(line.quantity)||!Number.isInteger(quantity)||quantity<1||quantity>10000||!line.description.trim()){setFormError('Give each line a description, a whole quantity from 1 to 10,000 and a GHS price with at most two decimal places.');return;}parsed.push({description:line.description.trim(),quantity,unitAmountMinor});}
    const expires=new Date(expiry);if(!Number.isFinite(expires.valueOf())||expires.valueOf()<=Date.now()){setFormError('Choose a future quote expiry date and time.');return;}
    const input:QuoteInput={lines:parsed,terms,expiresAt:expires.toISOString()};
    await perform(async()=>{await request(`/api/projects/${projectId}/quotes`,{method:'POST',body:JSON.stringify(input)});setLines([{description:'',quantity:'1',price:''}]);setTerms({...blankTerms});setExpiry('');await refresh();},'A new quote draft version was saved. Review it before issuing.');
  }
  return <details className="operations-card"><summary>Create a new quote draft</summary><form className="operations-form" onSubmit={submit}><p>Enter the agreed business terms explicitly. Saving creates an immutable version; to revise it, create another version. No deposit, tax or cancellation terms are supplied automatically.</p>{formError&&<p role="alert" className="muted-info">{formError}</p>}{lines.map((line,index)=><fieldset key={index}><legend>Line {index+1}</legend><label className="field">Description<input required maxLength={1000} value={line.description} onChange={event=>update(index,'description',event.target.value)}/></label><div className="operations-grid"><label className="field">Quantity<input required type="number" min={1} max={10000} step={1} value={line.quantity} onChange={event=>update(index,'quantity',event.target.value)}/></label><label className="field">Unit price (GHS)<input required inputMode="decimal" placeholder="Enter price" value={line.price} onChange={event=>update(index,'price',event.target.value)}/></label></div>{lines.length>1&&<button type="button" className="text-link" disabled={busy} aria-label={`Remove quote line ${index+1}`} onClick={()=>setLines(current=>current.filter((_,i)=>i!==index))}>Remove line</button>}</fieldset>)}<button type="button" className="text-link" disabled={busy||lines.length>=25} onClick={()=>setLines(current=>[...current,{description:'',quantity:'1',price:''}])}>Add scope item</button>{Object.entries(termLabels).map(([key,label])=><label key={key} className="field">{label}<textarea rows={3} maxLength={key==='scope'?12000:4000} value={terms[key as keyof QuoteTerms]} onChange={event=>setTerms(current=>({...current,[key]:event.target.value}))}/></label>)}<label className="field">Quote expires at (your local time)<input required type="datetime-local" value={expiry} onChange={event=>setExpiry(event.target.value)}/></label><p className="fine-print">Incomplete terms can be saved as a private draft, but the quote cannot be issued until every term is specified.</p><button className="button outline" disabled={busy}>Save new draft version</button></form></details>;
}
function ProjectMessages({project,actor,busy,perform,refresh,prepend}:{project:Detail;actor:Actor;busy:boolean;perform:Perform;refresh:()=>Promise<void>;prepend:(projectId:string,page:MessagePage)=>void}) {
  const [body,setBody]=useState('');
  async function loadEarlier(){const cursor=project.messageHistory.nextCursor;if(!cursor)return;await perform(async()=>{const page=await request<MessagePage>(`/api/projects/${project.id}/messages?before=${encodeURIComponent(cursor)}`,{signal:AbortSignal.timeout(20000)});prepend(project.id,page);},'Earlier project messages loaded.');}
  async function submit(event:FormEvent){event.preventDefault();await perform(async()=>{await request(`/api/projects/${project.id}/messages`,{method:'POST',body:JSON.stringify({body:body.trim()})});setBody('');await refresh();},'Your message was added to this project workspace. No email was sent.');}
  return <section className="operations-card" aria-labelledby="messages-heading"><h3 id="messages-heading">Project conversation</h3>{project.messageHistory.hasMore&&<button type="button" className="button outline" aria-controls="project-message-history" disabled={busy} onClick={()=>void loadEarlier()}>Load earlier messages</button>}{!project.messages.length?<p>No messages yet.</p>:<><p className="fine-print">{project.messages.length} messages shown{project.messageHistory.hasMore?' · Earlier messages are available.':' · Beginning of this project conversation reached.'}</p><ol id="project-message-history" className="operations-stack" aria-busy={busy}>{project.messages.map(message=><li key={message.id} className="operations-message"><p className="fine-print">{message.author_id===actor.id?'You':'Project participant'} · {date(message.created_at)}</p><p className="operations-copy">{message.body}</p></li>)}</ol></>}<form className="operations-form" onSubmit={submit}><label className="field">Message<textarea required minLength={1} maxLength={4000} rows={4} value={body} onChange={event=>setBody(event.target.value)}/></label><p className="fine-print">This posts to the shared project workspace. It does not send an email. Do not include participant identifiers or confidential datasets.</p><button className="button outline" disabled={busy||!body.trim()}>Post project message</button></form></section>;
}
function DeletionRequest({projectId,busy,perform}:{projectId:string;busy:boolean;perform:Perform}) {
  const [confirmed,setConfirmed]=useState(false),[result,setResult]=useState('');
  async function submit(event:FormEvent){event.preventDefault();if(!confirmed)return;await perform(async()=>{const response=await request<{requested:boolean;message:string}>(`/api/projects/${projectId}`,{method:'DELETE'});setResult(response.message);setConfirmed(false);},'Your deletion request was recorded for review; removal is not yet confirmed.');}
  return <details className="operations-card"><summary>Request deletion of this project</summary><p>Fullview must review applicable retention obligations and complete removal. Sending this request does not delete the project immediately.</p>{result&&<p className="muted-info" role="status">{result}</p>}<form className="operations-form" onSubmit={submit}><label className="operations-check"><input type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/><span>Ask Fullview to review and delete this project’s stored records.</span></label><button className="button outline" disabled={busy||!confirmed}>Request deletion review</button></form></details>;
}

function ProjectInvoices({projectId,invoices,quotes,isStaff,busy,perform,refresh}:{projectId:string;invoices:Invoice[];quotes:Quote[];isStaff:boolean;busy:boolean;perform:Perform;refresh:()=>Promise<void>}) {
  const [quoteId,setQuoteId]=useState(''),[dueDate,setDueDate]=useState('');
  const acceptedQuotes=quotes.filter(item=>item.status==='accepted');
  async function create(event:FormEvent){event.preventDefault();await perform(async()=>{await request(`/api/projects/${projectId}/invoices`,{method:'POST',body:JSON.stringify({quoteId,dueDate})});setQuoteId('');setDueDate('');await refresh();},'Invoice draft created from the accepted quote. Review before issuing.');}
  async function action(invoice:Invoice,kind:'issue'|'void'){await perform(async()=>{await request(`/api/projects/${projectId}/invoices/${invoice.id}`,{method:'POST',body:JSON.stringify({action:kind})});await refresh();},kind==='issue'?'Invoice issued for client review. No payment was collected.':'Invoice marked void. This does not record a payment or refund.');}
  return <section className="operations-card" aria-labelledby="invoices-heading"><h3 id="invoices-heading">Invoices</h3><p>Invoices refer to accepted quote terms. Online checkout is disabled; these records do not confirm payment.</p>{!invoices.length&&<p>No invoices are available.</p>}<div className="operations-stack">{invoices.map(invoice=><article key={invoice.id} className="operations-quote"><div className="operations-toolbar"><h4>{invoice.reference}</h4><span className="operations-status">{invoice.status}</span></div><p><strong>{amount(invoice.totalMinor)}</strong> · Due {invoice.dueDate}</p><p className="fine-print">{quotes.find(item=>item.id===invoice.quoteId)?`From accepted quote version ${quotes.find(item=>item.id===invoice.quoteId)!.version}.`:'Linked to the accepted quote for this project.'} No payment receipt is generated here.</p>{isStaff&&<div className="hero-buttons">{invoice.status==='draft'&&<button className="button outline" disabled={busy} onClick={()=>void action(invoice,'issue')}>Issue invoice</button>}{invoice.status!=='void'&&<button className="text-link" disabled={busy} onClick={()=>void action(invoice,'void')}>Void invoice</button>}</div>}</article>)}</div>{isStaff&&acceptedQuotes.length>0&&<details><summary>Create invoice from an accepted quote</summary><form className="operations-form" onSubmit={create}><label className="field">Accepted quote<select required value={quoteId} onChange={event=>setQuoteId(event.target.value)}><option value="">Choose a quote</option>{acceptedQuotes.map(item=><option key={item.id} value={item.id}>Version {item.version} · {amount(item.totalMinor)}</option>)}</select></label><label className="field">Invoice due date<input required type="date" value={dueDate} onChange={event=>setDueDate(event.target.value)}/></label><p className="fine-print">The accepted quote supplies the amount and terms. Choose the due date explicitly; no deposit, tax or payment rule is inferred.</p><button className="button outline" disabled={busy||!quoteId||!dueDate}>Create invoice draft</button></form></details>}</section>;
}

function RetentionRemoval({candidate,busy,perform,refresh}:{candidate:RetentionReview;busy:boolean;perform:Perform;refresh:()=>Promise<void>}) {
  const [confirmReference,setConfirmReference]=useState(''),[retentionCleared,setRetentionCleared]=useState(false),[result,setResult]=useState('');
  async function submit(event:FormEvent){event.preventDefault();if(confirmReference!==candidate.reference||!retentionCleared||candidate.documentCleanupRequired)return;await perform(async()=>{const response=await request<{message?:string}>('/api/staff/retention',{method:'POST',body:JSON.stringify({kind:candidate.kind,id:candidate.id,confirmReference,retentionCleared:true})});setResult(response.message??'The retention action completed. Check the refreshed review queue.');setConfirmReference('');setRetentionCleared(false);await refresh();},'The retention action completed. Review the refreshed queue.');}
  return <details><summary>Review permanent removal</summary><p>Permanent removal requires a completed retention review. The server must verify cleanup of private file objects before removing stored record data; a cleanup failure blocks removal.</p>{candidate.documentCleanupRequired&&<p className="muted-info">Private file cleanup is still required. Record removal remains blocked until that cleanup is verified.</p>}{result&&<p className="muted-info" role="status">{result}</p>}<form className="operations-form" onSubmit={submit}><label className="field">Type the exact reference {candidate.reference}<input required autoComplete="off" value={confirmReference} onChange={event=>setConfirmReference(event.target.value)}/></label><label className="operations-check"><input type="checkbox" checked={retentionCleared} onChange={event=>setRetentionCleared(event.target.checked)}/><span>I have reviewed retention obligations and authorize permanent removal.</span></label><button className="button outline" disabled={busy||confirmReference!==candidate.reference||!retentionCleared||candidate.documentCleanupRequired}>Permanently remove this record</button></form></details>;
}
