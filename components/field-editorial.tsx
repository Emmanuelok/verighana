'use client';

import {useState} from 'react';
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

function Action({href, children, variant = ''}: {href: string; children: React.ReactNode; variant?: string}) {
  return <a className={'fs-ed-action ' + variant} href={href}>{children}<ArrowUpRight size={18} aria-hidden="true"/></a>;
}

export function InstitutionsPage() {
  const {detail} = useResearch();
  const [activeId, setActiveId] = useState<string | null>('government');
  const activeGroup = sectors.find(group => group.id === activeId) ?? sectors[0];
  const activeFocus = sectorFocus[activeGroup.id];
  return <div className="fs-ed fs-sectors">
    <section className="fs-sector-hero" aria-labelledby="fs-sector-title">
      <div className="fs-sector-intro">
        <span className="fs-ed-label">For organisations</span>
        <h1 id="fs-sector-title">Research for<br/><em>real decisions.</em></h1>
        <p>Commission research around the people you serve, the options you face and the decision you need to make.</p>
        <a href="#sector-directory" className="fs-ed-action fs-ed-citron">Find your sector <ArrowDown size={18} aria-hidden="true"/></a>
      </div>
      <figure className="fs-sector-cover">
        <ResearchImage id="government-local-planning" priority/>
        <figcaption>District planning <span>Land use &amp; investment</span></figcaption>
      </figure>
    </section>

    <section id="sector-directory" className="fs-ed-width fs-ed-section" aria-labelledby="fs-directory-title">
      <header className="fs-ed-sectionhead"><div><span className="fs-ed-label">Sector directory</span><h2 id="fs-directory-title">Who are you<br/><em>researching for?</em></h2></div><p>Choose your organisation to see a question you could investigate and the services that can help answer it.</p></header>
      <div className="fs-sector-directory">
        <figure className="fs-sector-selection" key={activeGroup.id}>
          <ResearchImage id={activeFocus.sample[0]}/>
          <figcaption><span className="fs-ed-label">{activeGroup.label}</span><strong>{activeFocus.question}</strong></figcaption>
        </figure>
        <div className="fs-sector-rows">
          {sectors.map(group => {
            const open = activeId === group.id;
            const focus = sectorFocus[group.id];
            const count = services.filter(service => service.audiences.includes(group.defaultAudience)).length;
            return <article className={'fs-sector-row' + (open ? ' is-open' : '')} key={group.id}>
              <h3><button type="button" onClick={() => setActiveId(open ? null : group.id)} aria-expanded={open} aria-controls={'sector-' + group.id}>
                <span>{group.label}</span><ChevronDown size={20} aria-hidden="true"/>
              </button></h3>
              <div className="fs-sector-content" id={'sector-' + group.id} hidden={!open}>
                <p className="fs-sector-mobile-question">{focus.question}</p><p>{group.description}</p>
                <ul>{focus.sample.map(id => {
                  const service = services.find(item => item.id === id);
                  return service && <li key={id}><button onClick={() => detail(service)}>{service.title}<ArrowUpRight size={14} aria-hidden="true"/></button></li>;
                })}</ul>
                <a className="fs-ed-underline" href={'/services?client=' + group.id}>Browse all {count} services <ArrowRight size={17} aria-hidden="true"/></a>
              </div>
            </article>;
          })}
        </div>
      </div>
    </section>
    <section className="fs-ed-dossier" aria-labelledby="fs-dossier-title">
      <div className="fs-ed-width fs-ed-dossier-inner"><div><span className="fs-ed-label">Before commissioning</span><h2 id="fs-dossier-title">Build a<br/><em>better brief.</em></h2><Action href="/workspace?audience=institution" variant="fs-ed-dark">Create a project brief</Action></div>
        <ul>{scopingPrompts.map(prompt => <li key={prompt}><Check size={19} aria-hidden="true"/><span>{prompt}</span></li>)}</ul>
      </div>
    </section>
    <section className="fs-ed-width fs-ed-afterword"><div><h2>Planning a budget?</h2><p>Review indicative fees by research pathway. A written scope sets the deliverables, timetable and final price.</p></div><Action href="/pricing" variant="fs-ed-dark">Explore pricing</Action></section>
  </div>;
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

export function InsightsPage() {
  const {article} = useResearch();
  const [checked, setChecked] = useState<number[]>([]);
  const lead = articles.find(item => item.id === 'fieldwork')!;
  const otherNotes = articles.filter(item => item.id !== lead.id);
  function exportChecklist() {
    const lines = readiness.map((text, index) => '[' + (checked.includes(index) ? 'x' : ' ') + '] ' + text);
    downloadText('Fullview-Signature-research-readiness.txt', [
      'FULLVIEW SIGNATURE | BY VERIDANTH GROUP', 'RESEARCH READINESS CHECKLIST', '', ...lines,
      '', 'Next step: discuss unchecked items with your supervisor or research adviser.',
    ].join('\n'));
  }
  return <div className="fs-ed fs-journal">
    <div className="fs-ed-width">
      <header className="fs-journal-mast"><div><span className="fs-ed-label">The Fullview research journal</span><h1>Field <em>notes.</em></h1></div>
        <div><p>A working journal on questions, methods and the practicalities of doing research in Ghana.</p><a className="fs-ed-underline" href="#readiness">Jump to the readiness checklist <ArrowDown size={16} aria-hidden="true"/></a></div>
      </header>
      <article className="fs-journal-lead">
        <div className="fs-journal-lead-photo"><ResearchImage id={articlePhoto[lead.id]} priority/></div>
        <div className="fs-journal-lead-copy"><div className="fs-journal-category"><span>{lead.category}</span><span>{lead.read}</span></div>
          <h2>{lead.title}</h2><p>{lead.intro}</p><button className="fs-ed-action fs-ed-dark" onClick={() => article(lead.id)}>Read the field note <ArrowRight size={17} aria-hidden="true"/></button>
        </div>
      </article>
      <section className="fs-journal-index" aria-labelledby="fs-journal-index-title"><h2 id="fs-journal-index-title">More from the journal</h2>
        <div className="fs-journal-stories">{otherNotes.map(note => <article key={note.id} className="fs-journal-story">
          <h3><button onClick={() => article(note.id)} className="fs-journal-story-link" aria-label={'Read ' + note.title}>
            <span className="fs-journal-thumb"><ResearchImage id={articlePhoto[note.id]}/><span className="fs-journal-open"><ArrowUpRight size={20} aria-hidden="true"/></span></span>
            <span className="fs-journal-category"><span>{note.category}</span><span>{note.read}</span></span>
            <span className="fs-journal-story-title">{note.title}</span>
          </button></h3><p>{note.intro}</p>
        </article>)}</div>
      </section>
    </div>
    <section className="fs-ed-readiness" id="readiness" aria-labelledby="fs-readiness-title"><div className="fs-ed-width fs-ed-readiness-inner">
      <div className="fs-readiness-copy"><span className="fs-ed-label">Planning toolkit</span><h2 id="fs-readiness-title">Ready for<br/><em>research?</em></h2><p>Use this self-check before your next conversation with a supervisor, adviser or project team.</p>
        <div className="fs-ed-completion" aria-live="polite">{checked.length} of {readiness.length} checked</div><progress aria-label="Research readiness checklist completion" max={readiness.length} value={checked.length}/>
        <button className="fs-ed-action fs-ed-citron" onClick={exportChecklist}>Download my checklist <Download size={17} aria-hidden="true"/></button>
      </div>
      <fieldset className="fs-ed-checks"><legend className="sr-only">Research readiness checklist</legend>{readiness.map((text, index) => <label key={text}>
        <input type="checkbox" checked={checked.includes(index)} onChange={event => {
          const selected = event.currentTarget.checked;
          setChecked(current => selected ? [...current, index] : current.filter(item => item !== index));
        }}/><span>{text}</span>
      </label>)}</fieldset>
    </div></section>
  </div>;
}

const principles = [
  {title: 'Start with the decision', question: 'What do we need to know, and why?', text: 'Define the uncertainty, who will use the answer and what a useful finding would change before choosing a method.'},
  {title: 'Make the method visible', question: 'Could someone else follow the reasoning?', text: 'Document the sources, sampling choices, assumptions and analytical decisions closely enough for another researcher to examine the work.'},
  {title: 'Listen to the context', question: 'Whose experience belongs in the study?', text: 'Consider language, local institutions, access and the people who understand the setting. Use their experience to refine the question and the way evidence is gathered.'},
  {title: 'Agree the scope', question: 'What exactly are we undertaking?', text: 'Record deliverables, timing, fees, responsibilities, revision terms and data arrangements in writing before work starts.'},
  {title: 'Protect authorship', question: 'Who is responsible for each contribution?', text: 'Researchers retain responsibility for their original academic work. Agree what support is permitted and how professional contributions should be acknowledged.'},
  {title: 'Design for use', question: 'How will the findings reach the people who need them?', text: 'Choose an output that fits the decision. That might be a clear argument for a supervisor, a reproducible analysis for a research team or a decision brief for a board.'},
];

export function ApproachPage() {
  const {policy} = useResearch();
  return <div className="fs-ed fs-approach">
    <header className="fs-approach-cover"><img src="/courtyard.jpg" alt="Illustrative Ghana-inspired courtyard with sunlit arches, palms and a shaded walkway" fetchPriority="high" width={1600} height={1000}/>
      <div className="fs-approach-title fs-ed-width"><span className="fs-ed-label">Our approach</span><h1>Research<br/>with <em>perspective.</em></h1><a className="fs-ed-underline" href="#working-principles">Explore our working principles <ArrowDown size={16} aria-hidden="true"/></a></div>
    </header>
    <section className="fs-ed-width fs-approach-essay"><span className="fs-ed-label">Fullview Signature · Ghana</span><div><h2>Behind every study,<br/><em>someone needs an answer.</em></h2><p>A student shaping a first question. A researcher testing an idea. An institution deciding where to invest. We begin by understanding who needs the evidence and how they intend to use it.</p></div></section>
    <section id="working-principles" className="fs-principles" aria-labelledby="fs-principle-title"><div className="fs-ed-width fs-principle-grid"><div className="fs-principle-heading"><span className="fs-ed-label">The Fullview standard</span><h2 id="fs-principle-title">Our working<br/><em>principles.</em></h2><p>Six questions guide the work from the first conversation to the final handover.</p></div>
      <div className="fs-principle-list">{principles.map((item, index) => <details key={item.title} open={index === 0} name="fullview-principles">
        <summary><span>{item.title}</span><ChevronDown size={22} aria-hidden="true"/></summary><div><h3>{item.question}</h3><p>{item.text}</p></div>
      </details>)}</div>
    </div></section>
    <section className="fs-ed-width fs-ed-section fs-integrity" aria-labelledby="fs-integrity-title">
      <figure><ResearchImage id="ethics"/></figure><div><span className="fs-ed-label">Research integrity</span><h2 id="fs-integrity-title">Your work.<br/><em>Your authorship.</em></h2><p>Academic support includes coaching, feedback, transparent analysis support and editing. You retain responsibility for the decisions, the writing and the submission.</p>
        <button className="fs-ed-action fs-ed-dark" onClick={() => policy('integrity')}>Read the integrity standard <ArrowUpRight size={17} aria-hidden="true"/></button>
      </div>
    </section>
    <section className="fs-ed-afterword fs-ed-width"><div><h2>Bring us your question.</h2><p>Use the research desk to outline your study and the support you are looking for.</p></div><Action href="/workspace" variant="fs-ed-dark">Start a brief</Action></section>
  </div>;
}
