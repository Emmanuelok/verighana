'use client';

import {useState} from 'react';
import Link from 'next/link';
import {ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, Download} from 'lucide-react';
import {articles, clientGroups, services} from '../lib/catalog';
import {servicePhotography} from '../lib/service-photography';
import {downloadText, useResearch} from './research-context';

const sectorFocus: Record<string, {question: string; sample: string[]}> = {
  government: {question: 'Which investment best serves the district?', sample: ['government-investment', 'government-local-planning', 'government-policy-options']},
  public: {question: 'Where are people encountering barriers to public services?', sample: ['public-service-quality', 'public-transport', 'public-workforce']},
  private: {question: 'Where could a change in operations make the greatest difference?', sample: ['private-process', 'private-governance', 'private-strategy']},
  schools: {question: 'What would make teaching and learning more inclusive?', sample: ['school-inclusion', 'school-learning', 'school-teacher-learning']},
  universities: {question: 'How well do programmes serve students after graduation?', sample: ['university-graduate-tracer', 'university-curriculum', 'university-capacity']},
  businesses: {question: 'What do customers value, and where is there room to grow?', sample: ['market-research', 'customer-insights', 'business-pricing']},
  nonprofits: {question: 'Whose needs are being met, and who is being missed?', sample: ['ngo-needs', 'ngo-participatory', 'ngo-outcomes']},
};
const sectors = clientGroups.filter(group => Object.hasOwn(sectorFocus, group.id));
const scopingPrompts = [
  'Which decision will the findings inform, and who will make it?',
  'What terms of reference or procurement rules apply?',
  'Which communities, locations and questions should the study cover?',
  'What must be delivered, by when, and within which budget?',
  'Who can access the data, and who will own the outputs?',
];

function ResearchImage({id, priority = false}: {id: string; priority?: boolean}) {
  const photo = servicePhotography[id];
  return <img src={photo.src} alt={photo.alt} width={1200} height={800} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'}/>;
}

const readiness = [
  'I can state my research question in one sentence.',
  'My objectives align with that question.',
  'I know which data or evidence I need.',
  'I have a realistic way to access that evidence.',
  'I understand consent and permission requirements.',
  'I can explain my proposed analysis approach.',
  'My timeline includes feedback and revision.',
  'My budget covers the full scope of the study.',
];

const articlePhoto: Record<string, string> = {
  'better-question': 'topic-development',
  'choosing-methods': 'mixed-methods',
  fieldwork: 'fieldwork',
  'research-to-decisions': 'policy-analysis',
};

const principles = [
  {title: 'Start with the decision', question: 'What do we need to know, and why?', text: 'Define the uncertainty, who will use the answer and what a useful finding would change before choosing a method.'},
  {title: 'Make the method visible', question: 'Could someone else follow the reasoning?', text: 'Document the sources, sampling choices, assumptions and analytical decisions closely enough for another researcher to examine the work.'},
  {title: 'Listen to the context', question: 'Whose experience belongs in the study?', text: 'Consider language, local institutions, access and the people who understand the setting. Use their experience to refine the question and the way evidence is gathered.'},
  {title: 'Agree the scope', question: 'What exactly are we undertaking?', text: 'Record deliverables, timing, fees, responsibilities, revision terms and data arrangements in writing before work starts.'},
  {title: 'Protect authorship', question: 'Who is responsible for each contribution?', text: 'Researchers retain responsibility for their original academic work. Agree what support is permitted and how professional contributions should be acknowledged.'},
  {title: 'Design for use', question: 'How will the findings reach the people who need them?', text: 'Choose an output that fits the decision. That might be a clear argument for a supervisor, a reproducible analysis for a research team or a decision brief for a board.'},
];

const researchStages=[
 {title:'Frame the question',label:'A clear starting point',copy:'We begin with your purpose: the question you are asking, the decision it serves and the people who will use the findings.',points:['Your context and intended outcomes','The evidence you already have','Your timeline and available resources']},
 {title:'Shape the scope',label:'A shared understanding',copy:'Before the work starts, agree the methods, deliverables, responsibilities and fees. A clear scope makes the next step easier for everyone.',points:['Methods and deliverables','Confidentiality and data arrangements','Written scope, fees and responsibilities']},
 {title:'Build the evidence',label:'Rigour in the details',copy:'Work through the agreed research or support activities with transparent methods, documented decisions and room for thoughtful feedback.',points:['Traceable sources and assumptions','Methods appropriate to the question','Review at agreed milestones']},
 {title:'Make it useful',label:'Clarity for what comes next',copy:'Bring the work together in an agreed format, discuss what the evidence does and does not show, and identify the next decisions.',points:['Clear findings and limitations','Agreed deliverables and handover','Practical next steps']},
];

function DirectionLink({href, children}: {href:string; children:React.ReactNode}) {
  return <a href={href} className="se-action">{children}<ArrowUpRight size={18} aria-hidden="true"/></a>;
}

export function InstitutionsPage() {
  const {detail}=useResearch();
  const [sectorId,setSectorId]=useState(sectors[0].id);
  const group=sectors.find(item=>item.id===sectorId)!;
  const focus=sectorFocus[group.id];
  const count=services.filter(service=>service.audiences.includes(group.defaultAudience)).length;
  return <div className="studio-ed se-orgs">
    <header className="se-org-cover">
      <div className="se-wide se-org-spread">
        <div className="se-org-title"><span className="se-sub">Commissioned research</span><h1>Research for organisations<span>.</span></h1>
          <p>Frame a decision about your organisation, choose the evidence you need and commission a study around the people it affects.</p>
          <a href="#institution-pathways" className="se-action">Explore your sector<ArrowDown size={18} aria-hidden="true"/></a>
        </div>
        <div className="se-org-photo"><ResearchImage id="government-local-planning" priority/></div>
      </div>
    </header>
    <section id="institution-pathways" className="se-wide se-section">
      <div className="se-section-title"><h2>Sector directory</h2><p>Choose the type of organisation you represent.</p></div>
      <div className="se-sector-workbench">
        <div className="se-sectors" role="group" aria-label="Organisation sectors">
          {sectors.map(item=><button type="button" key={item.id} aria-pressed={item.id===sectorId} onClick={()=>setSectorId(item.id)}>{item.label}<ArrowRight size={19} aria-hidden="true"/></button>)}
        </div>
        <div className="se-sector-detail" key={sectorId}>
          <div className="se-sector-sample"><div><span className="se-sub">{group.label}</span><h3>{focus.question}</h3></div><ResearchImage id={focus.sample[0]}/></div>
          <p>{group.description}</p>
          <ul>{focus.sample.map(id=>{
            const service=services.find(item=>item.id===id)!;
            return <li key={id}><button type="button" onClick={()=>detail(service)}>{service.title}<ArrowUpRight size={16} aria-hidden="true"/></button></li>;
          })}</ul>
          <DirectionLink href={'/services?client='+sectorId}>Explore {count} services</DirectionLink>
        </div>
      </div>
    </section>
    <section className="se-commission"><div className="se-wide se-two-col"><div><h2>What to include<br/>in your brief</h2><DirectionLink href={'/workspace?audience='+group.defaultAudience}>Start a project brief</DirectionLink></div>
      <ul>{scopingPrompts.map(prompt=><li key={prompt}><Check size={16} aria-hidden="true"/>{prompt}</li>)}</ul>
    </div></section>
    <section className="se-wide se-linkband"><h2>Budgeting for a study?</h2><DirectionLink href="/pricing">View pricing and FAQs</DirectionLink></section>
  </div>;
}

export function InsightsPage() {
  const {article}=useResearch();
  const [checked,setChecked]=useState<number[]>([]);
  const lead=articles.find(item=>item.id==='fieldwork')!;
  function download(){
    const lines=readiness.map((text,index)=>(checked.includes(index)?'[x] ':'[ ] ')+text);
    downloadText('Fullview-Signature-research-readiness.txt',['Fullview Signature by Veridanth Group','Research readiness checklist','',...lines,'','Discuss the unchecked items with your supervisor, adviser or project team.'].join('\n'));
  }
  return <div className="studio-ed se-journal">
    <div className="se-wide">
      <header className="se-notes-title"><h1>Field notes<span>.</span></h1><p>Practical reading on research questions, methods and decisions.</p></header>
      <article className="se-note-lead"><div className="se-note-visual"><ResearchImage id={articlePhoto[lead.id]} priority/></div><div className="se-note-lead-copy">
        <div className="se-note-meta"><span>{lead.category}</span><span>{lead.read}</span></div>
        <h2>{lead.title}</h2><p>{lead.intro}</p><button className="se-action" type="button" onClick={()=>article(lead.id)}>Read the field note<ArrowRight size={18} aria-hidden="true"/></button>
      </div></article>
      <section className="se-note-index se-section" id="research-journal"><h2>More from the journal</h2><div className="se-notes-list">
        {articles.filter(item=>item.id!==lead.id).map(note=><article key={note.id}>
          <h3><button className="se-note-link" type="button" onClick={()=>article(note.id)}>
            <span className="se-note-thumb"><ResearchImage id={articlePhoto[note.id]}/></span>
            <span className="se-note-heading"><span className="se-note-meta"><span>{note.category}</span><span>{note.read}</span></span><span className="se-story-title">{note.title}</span></span>
            <ArrowUpRight aria-hidden="true" size={24}/>
          </button></h3>
        </article>)}
      </div></section>
    </div>
    <section id="readiness" className="se-readiness"><div className="se-wide se-two-col"><div>
      <span className="se-sub">Planning toolkit</span><h2>Research readiness checklist</h2><p>Mark what you have covered, then download a copy to discuss with your supervisor or project team.</p>
      <div className="se-progress"><strong aria-live="polite">{checked.length} / {readiness.length}</strong><progress value={checked.length} max={readiness.length} aria-label="Checklist completion"/></div>
      <button type="button" className="se-action" onClick={download}>Download my checklist<Download aria-hidden="true" size={18}/></button>
    </div><fieldset className="se-checks"><legend className="sr-only">Research readiness</legend>
      {readiness.map((item,index)=><label key={item}><input type="checkbox" checked={checked.includes(index)} onChange={event=>{const selected=event.currentTarget.checked;setChecked(previous=>selected?[...previous,index]:previous.filter(i=>i!==index));}}/><span>{item}</span></label>)}
    </fieldset></div></section>
  </div>;
}

export function ApproachPage() {
  const {policy}=useResearch();
  const [stageIndex,setStageIndex]=useState(0);
  const current=researchStages[stageIndex];
  const stageImages=['topic-development','research-consultation','fieldwork','research-visualisation'];
  return <div className="studio-ed se-approach">
    <header className="se-method-cover"><div className="se-wide se-method-grid"><div className="se-method-heading"><span className="se-sub">Our approach</span><h1>Research<br/>principles<span>.</span></h1>
      <p>Our starting point is the decision your work needs to inform. From there we agree the question, the scope and how the evidence will be used.</p>
      <a className="se-action" href="#research-process">Follow the process<ArrowDown size={18} aria-hidden="true"/></a>
    </div><figure className="se-method-image"><img src="/media/researchers.jpg" alt="Illustration of two researchers examining notes together at a desk" width={1600} height={900} fetchPriority="high"/></figure></div></header>
    <section className="se-wide se-section" id="research-process"><div className="se-section-title"><h2>How we work</h2><p>Explore each stage of an engagement.</p></div>
      <div className="se-stage-tabs" role="group" aria-label="Research process">{researchStages.map((stage,i)=><button type="button" key={stage.title} onClick={()=>setStageIndex(i)} aria-pressed={i===stageIndex}><span>0{i+1}</span>{stage.title}</button>)}</div>
      <div className="se-stage" key={current.title}><div className="se-stage-photo"><ResearchImage id={stageImages[stageIndex]}/></div><div className="se-stage-content"><span className="se-sub">Stage {stageIndex+1} of {researchStages.length}</span><h3>{current.title}</h3><p>{current.copy}</p><ul>{current.points.map(point=><li key={point}><Check size={17} aria-hidden="true"/>{point}</li>)}</ul></div></div>
    </section>
    <section className="se-standard"><div className="se-wide se-two-col"><div><h2>Our working standard</h2><p>These questions guide the choices we make with you throughout the project.</p><button type="button" className="se-action" onClick={()=>policy('integrity')}>Read the integrity standard<ArrowUpRight size={18} aria-hidden="true"/></button></div>
      <div className="se-principles">{principles.map((item,i)=><details key={item.title} name="studio-principles" open={i===0}><summary>{item.title}<ChevronDown size={18} aria-hidden="true"/></summary><div><h3>{item.question}</h3><p>{item.text}</p></div></details>)}</div>
    </div></section>
    <section className="se-wide se-linkband"><h2>Start with your question.</h2><div><Link href="/pricing" className="se-line-link">Pricing and FAQs<ArrowRight size={16}/></Link><DirectionLink href="/workspace">Prepare a brief</DirectionLink></div></section>
  </div>;
}
