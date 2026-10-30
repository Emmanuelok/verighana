'use client';
import {PdfDownload} from './pdf-download';
import {parseEstimateTransfer,researchDeskUrl} from '../lib/estimate-transfer';
import {isEstimateQuantity,normalizeEstimate,updateEstimateQuantity} from '../lib/estimate-selection';
import {createContext,useContext,useState,useEffect,useRef,type ReactNode,useId} from 'react';
import {X,ArrowUpRight,Check,Plus,Minus,Trash2,Compass,BookOpen,ChartNoAxesCombined,PenTool,GraduationCap,Building2,Landmark,Presentation} from 'lucide-react';
import {audiences,services,rate,money,estimateTotal,serviceImage,clientGroupFor,isOrganisation,type Audience,type Selection,type Service} from '../lib/catalog';

type ResearchContext = {audience:Audience;setAudience:(a:Audience)=>void;items:Selection[];add:(id:string)=>boolean;update:(id:string,n:number)=>void;clear:()=>void;total:number;detail:(s:Service)=>void;estimate:()=>void;guide:()=>void;article:(id:string)=>void;policy:(id:string)=>void;toast:(t:string)=>void;storageWarning:string;message:string;replaceEstimate:(audience:Audience,items:Selection[])=>boolean};
const Context=createContext<ResearchContext>(null!);
export const useResearch=()=>useContext(Context);
export function Icon({name,size=26}:{name:string;size?:number}){const icons:Record<string,typeof Compass>={Compass,BookOpen,ChartNoAxesCombined,PenTool,GraduationCap,Building2,Landmark,Presentation};const El=icons[name]||Compass;return <El size={size} strokeWidth={1.35}/>}
export function downloadText(name:string,body:string){const url=URL.createObjectURL(new Blob([body],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export function Dialog({title,children,onClose,drawer=false}:{title:string;children:ReactNode;onClose:()=>void;drawer?:boolean}){
  const ref=useRef<HTMLDialogElement>(null);const id=useId();const feedback=useContext(Context)?.message;
  useEffect(()=>{const el=ref.current;el?.showModal();const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{el?.close();document.body.style.overflow=previous}},[]);
  return <dialog ref={ref} className={drawer?'dialog drawer':'dialog'} aria-labelledby={id} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose()}}><div className="dialog-inner"><div className="dialog-top"><span className="eyebrow" id={id}>{title}</span><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={21}/></button></div>{feedback&&<p className="muted-info" role="status">{feedback}</p>}{children}</div></dialog>
}
export function AudienceSelect({onChange}:{onChange?:(audience:Audience)=>void}={}){const {audience,setAudience}=useResearch();return <label className="audience-select"><span>Research pathway</span><select value={audience} onChange={e=>{const a=e.target.value as Audience;setAudience(a);onChange?.(a)}}>{audiences.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select></label>}
export function ResearchProvider({children}:{children:ReactNode}){
  const [audience,setA]=useState<Audience>('undergraduate');const [items,setItems]=useState<Selection[]>([]);const [ready,setReady]=useState(false);const [selected,setSelected]=useState<Service|null>(null);const [modal,setModal]=useState('');const [message,setMessage]=useState('');const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [storageWarning,setStorageWarning]=useState('');
  const storageWritable=useRef(true);
  useEffect(()=>{
    const transferred=parseEstimateTransfer(location.hash);
    if(transferred){
      setA(transferred.audience);setItems(transferred.items);
      history.replaceState(history.state,'',location.pathname+location.search);
    }else{
      try{
        const raw=localStorage.getItem('vrg-estimate');
        if(raw){
          const saved=normalizeEstimate(JSON.parse(raw));
          if(!saved)throw new Error('Invalid saved estimate');
          setA(saved.audience);setItems(saved.items);
          if(saved.repaired)setStorageWarning('Some saved selections were invalid or unavailable for this pathway and were omitted. Please review your estimate.');
        }
      }catch{
        storageWritable.current=false;
        setStorageWarning('Your saved estimate could not be recovered. Existing browser data has been left unchanged. You can build a new estimate and download a PDF.');
      }
    }
    const q=new URLSearchParams(location.search).get('audience');
    if(audiences.some(a=>a.id===q)){setA(q as Audience);setItems(p=>p.filter(i=>services.find(s=>s.id===i.id)?.audiences.includes(q as Audience)))}
    setReady(true);
  },[]);
  useEffect(()=>{
    if(!ready||!storageWritable.current)return;
    try{localStorage.setItem('vrg-estimate',JSON.stringify({audience,items}));}
    catch{setStorageWarning('This browser could not save your estimate. It remains available while this page is open. Download a PDF before leaving.');}
  },[audience,items,ready]);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
  const toast=(t:string)=>{setMessage(t);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setMessage(''),4000)};
  const setAudience=(a:Audience)=>{
    if(!audiences.some(item=>item.id===a))return;
    const compatible=items.filter(i=>services.find(s=>s.id===i.id)?.audiences.includes(a));
    const removed=items.length-compatible.length;
    setA(a);setItems(compatible);
    if(removed)toast(`${removed} ${removed===1?'service was':'services were'} removed because ${removed===1?'it is':'they are'} unavailable for the selected pathway.`);
  };
  const replaceEstimate=(nextAudience:Audience,nextItems:Selection[])=>{
    const next=normalizeEstimate({audience:nextAudience,items:nextItems});
    if(!next||next.repaired){toast('The requested scope contains invalid selections. Your current estimate has been kept.');return false;}
    storageWritable.current=true;
    setA(next.audience);setItems(next.items);
    return true;
  };
  const add=(id:string)=>{
    const service=services.find(s=>s.id===id);
    if(!service)return false;
    if(items.some(i=>i.id===id)){toast('This service is already in your estimate.');return false}
    if(items.length>=12){toast('An estimate can include up to 12 services.');return false}
    if(!service.audiences.includes(audience)){
      const next=service.audiences[0];
      if(items.some(i=>!services.find(s=>s.id===i.id)?.audiences.includes(next))){setSelected(service);toast('This service needs a different research pathway. Review the pathway before changing your estimate.');return false}
      setAudience(next);
    }
    setItems(p=>[...p,{id,quantity:1}]);toast('Added to your project estimate.');return true;
  };
  const update=(id:string,n:number)=>{
    if(n===0){setItems(p=>p.filter(i=>i.id!==id));return;}
    if(!isEstimateQuantity(n)){toast('Enter a whole-number quantity from 1 to 500. Your previous quantity has been kept.');return;}
    setItems(p=>updateEstimateQuantity(p,id,n));
  };
  return <Context.Provider value={{audience,setAudience,items,add,update,clear:()=>setItems([]),total:estimateTotal(items,audience),detail:s=>{setModal('');setSelected(s)},estimate:()=>{setSelected(null);setModal('estimate')},guide:()=>{setSelected(null);setModal('guide')},article:id=>setModal('article:'+id),policy:id=>setModal('policy:'+id),toast,storageWarning,message,replaceEstimate}}>{children}{message&&<div className="toast" role="status"><Check size={17}/>{message}</div>}{selected&&<Dialog title="Service details" onClose={()=>setSelected(null)}><div className="service-detail"><img className="service-detail-photo" src={serviceImage(selected).src} alt={serviceImage(selected).alt} width={1200} height={800}/><div className="small-label">THE FULLVIEW SERVICE CATALOGUE</div><h2>{selected.title}</h2><p className="lead">{selected.description}</p><AudienceSelect/><div className="detail-price"><span>Indicative starting rate</span><strong>GHS {money(rate(selected,selected.audiences.includes(audience)?audience:selected.audiences[0]))}</strong><small>per {selected.unit}</small></div><h4>What’s included</h4><ul className="check-list">{selected.deliverables.map(d=><li key={d}><Check size={16}/>{d}</li>)}</ul><div className="muted-info">Typical turnaround: {selected.days}. Timing starts after the scope, materials and availability are agreed.</div>{!selected.audiences.includes(audience)&&<p className="note">This service is offered for {selected.audiences.map(a=>audiences.find(l=>l.id===a)?.short).join(', ')}. Choose a compatible research pathway to include it in your brief.</p>}<button className="button full" onClick={()=>{if(add(selected.id)){setSelected(null);setModal('estimate')}}}>Add to my estimate <Plus size={18}/></button><p className="fine-print">Proposed launch pricing. The final scope and price require agreement. No payment is collected here.</p></div></Dialog>}{modal==='estimate'&&<Dialog title="Your project estimate" drawer onClose={()=>setModal('')}><EstimatePanel/></Dialog>}{modal==='guide'&&<Dialog title="Find your research pathway" onClose={()=>setModal('')}><PathwayGuide/></Dialog>}{modal.startsWith('article:')&&<ArticleDialog id={modal.slice(8)} close={()=>setModal('')}/>} {modal.startsWith('policy:')&&<PolicyDialog id={modal.slice(7)} close={()=>setModal('')}/>}</Context.Provider>
}
export function EstimatePanel({compact=false}:{compact?:boolean}){
  const {items,audience,update,total,toast,clear,storageWarning}=useResearch();
  const deskTransfer=new URL(researchDeskUrl(audience,items));
  const deskHref=deskTransfer.pathname+deskTransfer.hash;
  const createPdf=async()=>{
    const {createEstimatePdf}=await import('../lib/estimate-pdf');
    return createEstimatePdf({pathway:audiences.find(a=>a.id===audience)!.label,items:items.map(item=>{const service=services.find(s=>s.id===item.id)!;return {title:service.title,quantity:item.quantity,unit:service.unit,unitPrice:rate(service,audience),days:service.days,deliverables:service.deliverables}})});
  };
  return <div className="estimate-panel"><h2>Give your project<br/><em>a clear starting point.</em></h2><p>Build your scope. See the cost. Start with confidence.</p>{storageWarning&&<p className="muted-info" role="status">{storageWarning}</p>}<AudienceSelect/>{!items.length?<div className="empty-state"><Compass size={36} strokeWidth={1}/><h3>A good place to begin.</h3><p>Add a service from the catalogue to build your personalised estimate.</p><a className="text-link" href="/services">Explore the catalogue <ArrowUpRight size={16}/></a></div>:<><div className="flex-between"><span className="eyebrow">SELECTED SERVICES</span><button className="text-link" onClick={clear}>Clear estimate</button></div><div className="estimate-lines">{items.map(i=>{const s=services.find(s=>s.id===i.id)!;return <div className="estimate-line" key={i.id}><div className="flex-between"><h4>{s.title}</h4><button className="icon-button" aria-label={`Remove ${s.title}`} onClick={()=>update(i.id,0)}><Trash2 size={15}/></button></div><small>GHS {money(rate(s,audience))} / {s.unit}</small><div className="flex-between"><div className="quantity"><button aria-label={`Decrease ${s.title}`} disabled={i.quantity<=1} onClick={()=>update(i.id,i.quantity-1)}><Minus size={13}/></button><input aria-label={`Quantity for ${s.title}`} type="number" min="1" max="500" step="1" value={i.quantity} onChange={e=>{const quantity=e.target.valueAsNumber;if(isEstimateQuantity(quantity))update(i.id,quantity);else toast('Enter a whole-number quantity from 1 to 500. Your previous quantity has been kept.')}}/><button aria-label={`Increase ${s.title}`} disabled={i.quantity>=500} onClick={()=>update(i.id,i.quantity+1)}><Plus size={13}/></button></div><strong>GHS {money(rate(s,audience)*i.quantity)}</strong></div></div>})}</div><div className="estimate-total"><span>Indicative subtotal</span><strong>GHS {money(total)}</strong></div><p className="fine-print">Proposed launch rates. Applicable taxes, travel, recruitment, software and journal fees are excluded unless listed. Final pricing follows scoping.</p><a className="button full" href={deskHref}>Turn this into a research brief <ArrowUpRight size={17}/></a><PdfDownload key={JSON.stringify([audience,items])} createPdf={createPdf} filename="Fullview-Signature-project-estimate.pdf" label="Prepare estimate PDF"/></>}</div>
}
function PathwayGuide(){const {audience,detail}=useResearch();const [stage,setStage]=useState('starting');const map:Record<string,string[]>={starting:['topic-development','methodology','research-consultation'],proposal:['proposal-review','ethics','instruments'],evidence:['search-strategy','literature-coaching','systematic-protocol'],analysis:['quantitative','qualitative','advanced-modelling'],publication:['academic-edit','manuscript-review','journal-strategy'],organisation:['market-research','policy-analysis','mel']};const institutional:Record<string,string[]>={government:['government-policy-options','government-procurement','government-local-planning'],public:['public-service-quality','public-performance','public-workforce'],private:['private-strategy','private-governance','private-process'],schools:['school-improvement','school-learning','school-curriculum'],university:['university-curriculum','university-graduate-tracer','university-capacity'],nonprofit:['ngo-needs','ngo-theory-change','ngo-outcomes']};const ids=isOrganisation(audience)?(institutional[audience]||map.organisation):map[stage];const picks=services.filter(s=>ids.includes(s.id)&&s.audiences.includes(audience));return <div className="pathway"><h2>Where are you<br/><em>in your research?</em></h2><p>A few clear choices can make the next step easier.</p><AudienceSelect/><label className="field">My current stage<select value={stage} onChange={e=>setStage(e.target.value)}><option value="starting">Finding a question / getting started</option><option value="proposal">Developing my proposal</option><option value="evidence">Reviewing the literature</option><option value="analysis">Working with data</option><option value="publication">Writing or preparing to publish</option><option value="organisation">Planning organisational research</option></select></label><h4>Your suggested starting points</h4><div className="recommendations">{(picks.length?picks:services.filter(s=>s.audiences.includes(audience)&&['research-consultation','methodology'].includes(s.id))).map(s=><button key={s.id} onClick={()=>detail(s)}><span><strong>{s.title}</strong><small>From GHS {money(rate(s,audience))}</small></span><ArrowUpRight size={20}/></button>)}</div><p className="fine-print">These are starting suggestions. A scoped consultation establishes the right fit for your project.</p></div>}
import {articles} from '../lib/catalog';
function ArticleDialog({id,close}:{id:string;close:()=>void}){const a=articles.find(a=>a.id===id);if(!a)return null;return <Dialog title="The research journal" onClose={close}><article className="article-body"><div className="small-label">{a.category} · {a.read}</div><h2>{a.title}</h2><p className="lead">{a.intro}</p>{a.sections.map(([heading,text])=><section key={heading}><h3>{heading}</h3><p>{text}</p></section>)}<div className="muted-info">Fullview field notes · A practical starting resource. Adapt it to your study, discipline and institutional requirements.</div><a className="button" href="/workspace">Discuss your research <ArrowUpRight size={16}/></a></article></Dialog>}
function PolicyDialog({id,close}:{id:string;close:()=>void}){const privacy=id==='privacy';return <Dialog title={privacy?'Privacy & your project':'Our research integrity standard'} onClose={close}><article className="article-body"><h2>{privacy?'Your research deserves discretion.':'Your work. Your authorship. Our support.'}</h2>{privacy?<><h3>Information collected</h3><p>The public research desk works without an account. Your draft, contact details, project description and selected services are stored in this browser when you use the public desk.</p><h3>What happens to your brief</h3><p>On the public desk, briefs stay on this device and are not sent to Fullview. You can download a PDF or remove a saved brief. Clearing browser data removes device-local copies. If you use an existing signed-in desk, account briefs remain in your account. No emails, payments or bookings are made automatically.</p><h3>Online inquiries and shared projects</h3><p>Saving a local brief does not submit it. When online services are available, a separate consent step lets you submit an inquiry or share a project through a verified account. The selected details are then stored for Fullview staff review and an office notification is addressed to fvsignature@veridanth.com. The form states the configured retention review period. Shared projects provide a deletion-request option; a request is not confirmation of deletion. Account sessions use the managed authentication service. Private research file uploads remain unavailable until the transfer safeguards are ready.</p><h3>Keep participant data out of your brief</h3><p>Use a high-level description. Do not submit confidential datasets, participant names, identification numbers, passwords or sensitive research records. A suitable transfer process and data handling terms should be agreed before any engagement.</p><h3>Device storage</h3><p>Your estimate and public desk drafts are saved in this browser so you can return to them. Download a PDF for a portable copy. No advertising trackers are included. Clear your estimate or remove saved briefs to delete device-local work.</p></>:<><h3>Support that builds capability</h3><p>Academic services provide coaching, design advice, transparent analysis support, feedback and editing. Students remain responsible for their research decisions, original writing and submissions.</p><h3>Honest research, transparent contributions</h3><p>We do not offer examination impersonation, fabricated data or references, ghostwritten assessed work, or guaranteed grades, funding, ethics approval or publication. Follow your institution’s rules and disclose professional assistance where required.</p><h3>Commissioned organisational research</h3><p>Businesses, government, public bodies and private institutions may commission original research and reports under an agreed scope. Methods, data sources, limitations, deliverables, ownership and confidentiality should be recorded before work begins.</p><h3>Agreed scope before work</h3><p>All listed prices are proposed starting rates. The final engagement must confirm deliverables, availability, timing, revisions, data responsibilities, fees, applicable taxes and cancellation terms in writing.</p></>}</article></Dialog>}
