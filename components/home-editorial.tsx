'use client';

import {useEffect, useRef, useState} from 'react';
import {ArrowRight, ArrowUpRight, ArrowDown, Play, Pause, Globe2, Plus, Minus} from 'lucide-react';
import {useResearch, Dialog} from './research-context';
import {services, categories, articles} from '../lib/catalog';

const pathways = [
  {id:'students',label:'Students & graduates',title:'Your next chapter,',emphasis:'with a clearer direction.',body:'From the first research question to the final presentation. Find thoughtful support that helps you understand the work, make progress and keep your authorship.',image:'/services/photography/gallery-hero.webp',alt:'Illustrative sunlit research library',href:'/services?client=students',tags:['Proposals','Methods & analysis','Dissertation support']},
  {id:'researchers',label:'Scholars & researchers',title:'Ideas worth pursuing.',emphasis:'Evidence worth sharing.',body:'Strengthen your methods, make sense of your findings and bring your contribution into focus. Specialist support for ambitious, independent scholarship.',image:'/media/researchers.jpg',alt:'Illustrative researchers working together',href:'/services?client=researchers',tags:['Evidence synthesis','Advanced analytics','Publication support']},
  {id:'organisations',label:'Business & institutions',title:'See the full picture.',emphasis:'Make your next move.',body:'Understand your market, evaluate an intervention or answer a policy question. Commission research around the decisions that matter to your organisation.',image:'/media/ghana-landscape.jpg',alt:'Illustrative landscape inspired by Ghana',href:'/institutions',tags:['Market intelligence','Policy & evaluation','Team development']},
];

function SignatureCinema(){
  const {guide}=useResearch();
  const video=useRef<HTMLVideoElement>(null);
  const motion=useRef(false);
  const [playing,setPlaying]=useState(false);
  const [film,setFilm]=useState(false);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply=()=>{motion.current=!preference.matches;if(motion.current)video.current?.play().catch(()=>{});else video.current?.pause()};
    const visibility=()=>{if(document.hidden)video.current?.pause();else if(motion.current)video.current?.play().catch(()=>{})};
    apply();preference.addEventListener('change',apply);document.addEventListener('visibilitychange',visibility);
    return()=>{preference.removeEventListener('change',apply);document.removeEventListener('visibilitychange',visibility)};
  },[]);
  useEffect(()=>{if(film)video.current?.pause();else if(motion.current)video.current?.play().catch(()=>{})},[film]);
  return <>
    <section className="signature-hero" aria-labelledby="signature-title">
      <div className="signature-film" aria-hidden="true">
        <img src="/media/hero-poster.jpg" alt="" fetchPriority="high"/>
        <video ref={video} muted playsInline loop preload="metadata" poster="/media/hero-poster.jpg" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>{setFailed(true);setPlaying(false)}}><source src="/media/veridanth-film.mp4" type="video/mp4"/></video>
      </div>
      <div className="signature-film-shade"/>
      <div className="signature-hero-top wrap"><span><i/> INDEPENDENT RESEARCH. SHARED POSSIBILITY.</span><span><Globe2 size={15}/> GHANA · OPEN TO THE WORLD</span></div>
      <div className="signature-hero-copy wrap">
        <span className="signature-pretitle">A different perspective changes everything.</span>
        <h1 id="signature-title">A fuller view.<br/>A <em>bolder</em><br className="hero-poetry"/> future<span className="signature-dot">.</span></h1>
        <p>Big questions deserve extraordinary thinking.<br/>Research, insight and expertise for the work<br className="desktop-break"/> you want to move forward.</p>
        <div className="signature-hero-actions"><a className="button signature-lime" href="/services">Explore our expertise <ArrowUpRight size={20}/></a><button className="signature-quiet-link" onClick={guide}>Find my pathway <ArrowRight size={18}/></button></div>
      </div>
      <button className="signature-play" onClick={()=>setFilm(true)} aria-label="Watch the Fullview film"><span><Play size={19} fill="currentColor"/></span><span>THE FULLVIEW FILM<small>A world of possibility</small></span></button>
      <div className="signature-hero-bottom wrap"><a href="#possibilities"><ArrowDown size={17}/> SCROLL TO EXPLORE</a><span>CURIOUS MINDS. REAL POSSIBILITIES.</span>{!failed&&<button onClick={()=>{motion.current=!playing;if(playing)video.current?.pause();else video.current?.play().catch(()=>{})}} aria-label={playing?'Pause background film':'Play background film'}>{playing?<Pause size={15}/>:<Play size={15}/>}<span>{playing?'Pause motion':'Play motion'}</span></button>}</div>
    </section>
    {film&&<Dialog title="The Fullview film · A world of possibility" onClose={()=>setFilm(false)}><div className="film-player"><video controls autoPlay playsInline muted loop poster="/media/hero-poster.jpg"><source src="/media/veridanth-film.mp4" type="video/mp4"/></video><p>An AI-generated cinematic impression of Ghana, research and possibility. These illustrative scenes do not depict our staff or premises. This film has no audio.</p></div></Dialog>}
  </>;
}

export function EditorialHome(){
  const {guide,article}=useResearch();
  const [path,setPath]=useState(0);
  const [method,setMethod]=useState(0);
  const selected=pathways[path];
  const steps=[
    {title:'Bring us your question.',copy:'Tell us what you are exploring, what you have already done and the outcome you have in mind. A clear brief starts the conversation.',detail:'Your question · Your context · Your ambition'},
    {title:'Build the right approach.',copy:'Agree the methods, deliverables, timing and responsibilities. Set a transparent scope and budget before any commissioned work begins.',detail:'Defined scope · Clear fees · Shared expectations'},
    {title:'Move forward with evidence.',copy:'Review the findings, understand the reasoning and put the work to use. Academic support strengthens your capabilities and respects your authorship.',detail:'Thoughtful analysis · Useful outputs · Your next step'},
  ];
  return <>
    <SignatureCinema/>
    <div className="signature-index"><div className="wrap"><span>RESEARCH. IN FULL VIEW.</span><a href="/services">{services.length} specialist services <ArrowUpRight size={16}/></a><a href="/institutions">Individuals & institutions <ArrowUpRight size={16}/></a><a href="/approach">Integrity, at every step <ArrowUpRight size={16}/></a></div></div>
    <section className="signature-intro wrap" id="possibilities">
      <div className="signature-section-label"><span>01 / THE BIGGER PICTURE</span><span className="signature-asterisk" aria-hidden="true">✳</span></div>
      <div><h2>Good research opens doors.<br/><em>Great thinking opens worlds.</em></h2><div className="signature-intro-bottom"><p>From a student’s first proposal to an organisation’s next big decision, we help people see further. Fullview Signature brings specialist research support, analysis and insight together—around you.</p><a className="signature-round-link" href="/approach" aria-label="Discover the Fullview approach"><ArrowUpRight size={30}/></a></div></div>
    </section>
    <section className="signature-pathways" aria-labelledby="pathways-title">
      <div className="wrap"><div className="signature-section-heading"><div><span className="signature-section-label">02 / FIND YOUR PERSPECTIVE</span><h2 id="pathways-title">Where do you<br/><em>want to go?</em></h2></div><p>Different questions. Different ambitions.<br/>A pathway shaped around your world.</p></div>
      <div className="signature-path-tabs" role="tablist" aria-label="Research pathways">{pathways.map((p,i)=><button key={p.id} id={'perspective-'+p.id} role="tab" aria-selected={i===path} aria-controls="perspective-panel" tabIndex={i===path?0:-1} onClick={()=>setPath(i)} onKeyDown={event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?2:(i+(event.key==='ArrowRight'?1:2))%3;setPath(next);document.getElementById('perspective-'+pathways[next].id)?.focus()}}}><span>0{i+1}</span>{p.label}<ArrowUpRight size={20}/></button>)}</div>
      <div className="signature-path-panel" id="perspective-panel" role="tabpanel" aria-labelledby={'perspective-'+selected.id} tabIndex={0}>
        <div className="signature-path-image" key={selected.image}><img src={selected.image} alt={selected.alt} loading="lazy"/><span>YOUR AMBITION. OUR STARTING POINT.</span></div>
        <div className="signature-path-copy" key={selected.id}><span className="signature-section-label">FOR {selected.label.toUpperCase()}</span><h3>{selected.title}<br/><em>{selected.emphasis}</em></h3><p>{selected.body}</p><div className="signature-tags">{selected.tags.map(t=><span key={t}>{t}</span>)}</div><a className="button signature-lime" href={selected.href}>Explore this pathway <ArrowUpRight size={19}/></a></div>
      </div></div>
    </section>
    <section className="signature-expertise wrap">
      <div className="signature-section-heading"><div><span className="signature-section-label">03 / A WORLD OF EXPERTISE</span><h2>From the first question.<br/><em>To the full picture.</em></h2></div><a className="text-link" href="/services">View all {services.length} services <ArrowRight size={20}/></a></div>
      <div className="signature-expertise-grid"><div className="signature-expertise-art"><img src="/services/photography/advanced-modelling.webp" alt="Illustrative analytical workspace with data visualisations" loading="lazy"/><span>{categories.length}<small>CONNECTED AREAS<br/>OF EXPERTISE</small></span></div><div className="signature-expertise-list">{[
        ['01','Research design & proposals','A sound question. A well-considered plan.','design'],
        ['02','Literature & evidence','Bring the knowledge that matters into focus.','evidence'],
        ['03','Data & advanced analytics','Turn observations into meaningful understanding.','data'],
        ['04','Writing & publication','Clarity and confidence in your own contribution.','publication'],
        ['05','Business, policy & impact','Better evidence for consequential decisions.','business']
      ].map(([n,title,copy,id])=><a key={id} href={'/services?category='+id}><span>{n}</span><div><h3>{title}</h3><p>{copy}</p></div><ArrowUpRight size={25}/></a>)}</div></div>
      <div className="signature-expertise-note"><span>Not sure what your project needs?</span><button onClick={guide}>Let’s find your starting point <ArrowRight size={18}/></button></div>
    </section>
    <section className="signature-manifesto"><div className="signature-manifesto-image"><img src="/courtyard.jpg" alt="Illustrative Ghana-inspired academic courtyard" loading="lazy"/></div><div className="signature-manifesto-copy"><span className="signature-section-label">THE FULLVIEW STANDARD</span><h2>Ambition,<br/>meet <em>integrity.</em></h2><p>Rigorous thinking. Human understanding. Work that respects your context, your questions and your authorship.</p><a className="button signature-lime" href="/approach">The way we work <ArrowUpRight size={20}/></a><div className="signature-manifesto-caption"><Globe2 size={20}/><span>ROOTED IN GHANA.<br/>LOOKING BEYOND BORDERS.</span></div></div></section>
    <section className="signature-method wrap"><div><span className="signature-section-label">04 / MAKE YOUR NEXT MOVE</span><h2>Big ambitions.<br/><em>Clear next steps.</em></h2><p>A thoughtful process, from the first conversation to the work ahead.</p><a className="text-link" href="/workspace">Start your research brief <ArrowRight size={20}/></a></div><div className="signature-method-list">{steps.map((step,i)=><div key={step.title} className={method===i?'active':''}><button aria-expanded={method===i} aria-controls={'method-'+i} onClick={()=>setMethod(method===i?-1:i)}><span>0{i+1}</span><h3>{step.title}</h3>{method===i?<Minus size={22}/>:<Plus size={22}/>}</button><div id={'method-'+i} hidden={method!==i}><p>{step.copy}</p><span>{step.detail}</span></div></div>)}</div></section>
    <section className="signature-journal"><div className="wrap"><div className="signature-section-heading"><div><span className="signature-section-label">05 / NOTES FOR THE CURIOUS</span><h2>A fresh <em>perspective.</em></h2></div><a className="text-link" href="/insights">Open the journal <ArrowUpRight size={20}/></a></div><div className="signature-journal-grid">{articles.slice(0,3).map((a,i)=><button className="signature-journal-card" key={a.id} onClick={()=>article(a.id)}><div><span>{['The art\nof asking.','Method\nin the making.','Notes\nfrom the field.'][i]}</span><ArrowUpRight size={28}/><small>FULLVIEW / FIELD NOTES — 0{i+1}</small></div><p>{a.category} <span>{a.read}</span></p><h3>{a.title}</h3><span>Read the field note <ArrowRight size={17}/></span></button>)}</div></div></section>
  </>;
}
