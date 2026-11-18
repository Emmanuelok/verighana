'use client';

import Link from 'next/link';
import Image from 'next/image';
import {useId, useState, type FormEvent, type KeyboardEvent} from 'react';
import {ArrowDown, ArrowRight, ArrowUpRight, Minus, Play, Plus, Search} from 'lucide-react';
import {articles, audiences, categories, money, rate, services, type Service} from '../lib/catalog';
import {servicePhotography} from '../lib/service-photography';
import {Dialog, useResearch} from './research-context';

const pathways = [
  {title:'Students & graduates', subject:'Research proposals, dissertations and thesis support.', photo:'proposal-review', href:'/services?client=students#service-collection'},
  {title:'Academics & researchers', subject:'Study design, data analysis and publication.', photo:'advanced-modelling', href:'/services?client=researchers#service-collection'},
  {title:'Businesses & institutions', subject:'Market intelligence, programme evaluation and policy.', photo:'market-research', href:'/institutions'},
];

const featured = ['research-consultation', 'systematic-protocol', 'quantitative', 'market-research']
  .map(id => services.find(item => item.id === id))
  .filter((item): item is Service => item !== undefined);

const index = services.map(service => ({
  service,
  text:[service.title, service.description, ...service.deliverables, categories.find(item => item.id === service.category)?.title].join(' ').toLowerCase(),
}));

function ServiceFinder() {
  const {detail} = useResearch();
  const [query,setQuery] = useState('');
  const [open,setOpen] = useState(false);
  const [active,setActive] = useState(-1);
  const id = useId();
  const term = query.trim().toLowerCase();
  const matches = term ? index.filter(item => item.text.includes(term)) : [];
  const shortlist = matches.slice(0,4);
  const visible = Boolean(term && open);
  const catalogue = term ? '/services?q=' + encodeURIComponent(query.trim()) + '#service-collection' : '/services#service-collection';

  function choose(service:Service) {
    setOpen(false);
    setActive(-1);
    detail(service);
  }

  function onSubmit(event:FormEvent) {
    event.preventDefault();
    if (visible && active >= 0 && shortlist[active]) {
      choose(shortlist[active].service);
    } else {
      window.location.assign(catalogue);
    }
  }

  function navigate(event:KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (!shortlist.length || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    setOpen(true);
    setActive(previous => {
      if (previous < 0) return event.key === 'ArrowUp' ? shortlist.length - 1 : 0;
      return (previous + (event.key === 'ArrowUp' ? -1 : 1) + shortlist.length) % shortlist.length;
    });
  }

  return <div className="os-finder-strip" id="service-finder">
    <div className="os-frame os-finder-layout">
      <div><label htmlFor={id + '-search'}>Find a research service</label><p>Search {services.length} services by topic, method or deliverable.</p></div>
      <form action="/services" method="get" role="search" onSubmit={onSubmit} onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) {setOpen(false);setActive(-1);}
      }}>
        <div className="os-input-line">
          <Search size={21} strokeWidth={1.8} aria-hidden="true"/>
          <input id={id + '-search'} name="q" type="search" autoComplete="off" role="combobox"
            aria-autocomplete="list" aria-expanded={visible && shortlist.length > 0} aria-controls={visible && shortlist.length ? id + '-results' : undefined}
            aria-activedescendant={visible && active >= 0 ? id + '-option-' + active : undefined}
            placeholder="Try “survey” or “fieldwork”" value={query}
            onChange={event => {setQuery(event.target.value);setOpen(true);setActive(-1);}}
            onFocus={()=>setOpen(true)} onKeyDown={navigate}/>
          <button type="submit" aria-label="Search the catalogue"><ArrowRight size={21} aria-hidden="true"/></button>
        </div>
        {visible && <div className="os-suggestions">
          {shortlist.length > 0 ? <>
            <div id={id+'-results'} role="listbox" aria-label="Matching research services">
              {shortlist.map(({service},i) => <button type="button" role="option" id={id+'-option-'+i} aria-selected={active===i}
                key={service.id} tabIndex={-1} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(service)}>
                {service.title}<ArrowUpRight size={17} aria-hidden="true"/>
              </button>)}
            </div>
            <Link href={catalogue}>See all {matches.length} {matches.length===1?'result':'results'} <ArrowRight size={17}/></Link>
          </> : <><p role="status">No matching services. Try a shorter search.</p><Link href="/services#service-collection">Browse the catalogue <ArrowRight size={17}/></Link></>}
        </div>}
      </form>
    </div>
  </div>;
}

function ProjectScopes() {
  const {detail,audience} = useResearch();
  const [current,setCurrent] = useState<string | null>(featured[0]?.id ?? null);
  return <section className="os-scopes" aria-labelledby="os-scopes-title">
    <div className="os-frame os-scope-layout">
      <div className="os-scope-intro">
        <h2 id="os-scopes-title">Inside a <br/>service.</h2>
        <p>See what’s included, how long it takes and where pricing starts. We confirm the fee once we agree your scope.</p>
        <Link className="os-text-link" href="/pricing">Open the rate guide <ArrowUpRight size={17}/></Link>
      </div>
      <div className="os-accordions">{featured.map(s=>{
        const expanded=s.id===current;
        const priceFor=s.audiences.includes(audience)?audience:s.audiences[0];
        return <div className="os-scope-item" key={s.id}>
          <h3><button type="button" aria-expanded={expanded} aria-controls={'os-scope-'+s.id} onClick={()=>setCurrent(expanded?null:s.id)}>
            {s.title}{expanded?<Minus size={20}/>:<Plus size={20}/>}
          </button></h3>
          <div id={'os-scope-'+s.id} hidden={!expanded} className="os-scope-detail">
            <p>{s.description}</p>
            <ul>{s.deliverables.map(deliverable=><li key={deliverable}>{deliverable}</li>)}</ul>
            <div className="os-scope-meta"><div><small>Starting fee{s.fixed?'':' · '+audiences.find(a=>a.id===priceFor)?.short}</small><strong>GHS {money(rate(s,priceFor))}</strong></div><div><small>Timing</small><strong>{s.days}</strong></div></div>
            <button className="os-text-link" type="button" onClick={()=>detail(s)}>Full scope and estimate <ArrowRight size={17}/></button>
          </div>
        </div>;
      })}</div>
    </div>
  </section>;
}

export function EditorialHome() {
  const {guide,article} = useResearch();
  const [film,setFilm] = useState(false);
  return <div className="optics-home">
    <section className="os-hero" aria-labelledby="os-title">
      <picture className="os-hero-art">
        <source media="(max-width: 660px)" srcSet="/media/research-optics-mobile.webp"/>
        <img src="/media/research-optics.webp" alt="" fetchPriority="high" loading="eager"/>
      </picture>
      <div className="os-frame os-cover">
        <div className="os-hero-copy">
          <span className="os-location"><i aria-hidden="true"/>Independent research studio · Ghana</span>
          <h1 id="os-title">Research<br/>in focus<span>.</span></h1>
          <p>Shape your study, analyse your data or commission research for your organisation.</p>
          <div className="os-actions"><a className="os-action os-white" href="#service-finder">Find a service <ArrowDown size={18}/></a>
            <button className="os-film-trigger" onClick={()=>setFilm(true)}><span><Play size={12} fill="currentColor"/></span>Studio film</button></div>
        </div>
      </div>
    </section>
    {film && <Dialog title="The Fullview studio film" onClose={()=>setFilm(false)}><div className="film-player"><video controls autoPlay playsInline muted poster="/media/hero-poster.jpg"><source src="/media/veridanth-film.mp4" type="video/mp4"/></video><p>A silent, AI-generated film inspired by Ghana and the settings where research takes place.</p></div></Dialog>}
    <ServiceFinder/>
    <section className="os-frame os-pathways" aria-labelledby="os-path-title">
      <div className="os-section-heading"><h2 id="os-path-title">Who we work with.</h2><button className="os-text-link" onClick={guide}>Help me choose <ArrowRight size={17}/></button></div>
      <div className="os-path-grid">{pathways.map(path=>{
        const photo=servicePhotography[path.photo];
        return <Link className="os-path" href={path.href} key={path.title}><figure><Image unoptimized src={photo.src} alt={photo.alt} loading="lazy" width={1200} height={800}/></figure>
          <div><h3>{path.title}</h3><ArrowUpRight size={22}/></div><p>{path.subject}</p>
        </Link>;
      })}</div>
    </section>
    <ProjectScopes/>
    <section className="os-frame os-journal" aria-labelledby="os-journal-title">
      <div className="os-section-heading"><h2 id="os-journal-title">Research journal.</h2><Link className="os-text-link" href="/insights">All field notes <ArrowUpRight size={17}/></Link></div>
      <div className="os-journal-layout">
        <button className="os-lead" onClick={()=>article('fieldwork')}>
          <Image unoptimized src={servicePhotography.fieldwork.src} alt={servicePhotography.fieldwork.alt} loading="lazy" width={1200} height={800}/>
          <div><span>Ghana field notes</span><h3>The work before the fieldwork.</h3><ArrowUpRight size={24}/></div>
        </button>
        <div className="os-reading">{articles.filter(note=>note.id!=='fieldwork').map(note=>
          <button onClick={()=>article(note.id)} key={note.id}><small>{note.category} <span> / {note.read}</span></small><h3>{note.title}</h3><ArrowUpRight size={18}/></button>)}</div>
      </div>
    </section>
    <section className="os-brief"><div className="os-frame os-brief-inner"><div><h2>Build your<br/>research brief.</h2><p>Set out your question, timetable and budget. Save your brief or download it as a PDF.</p></div>
      <Link className="os-action os-dark" href="/workspace">Open the research desk <ArrowUpRight size={19}/></Link></div></section>
  </div>;
}
