'use client';

import {useRef, useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type {CSSProperties, KeyboardEvent} from 'react';
import {ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Play} from 'lucide-react';
import {articles, services} from '../lib/catalog';
import {Dialog, useResearch} from './research-context';

const scenes = [
  {name: 'Market life', image: '/media/field-market.webp', position: '63% 52%', alt: 'An illustrative study of a colourful Ghanaian market.'},
  {name: 'Campus light', image: '/courtyard.jpg', position: '62% 52%', alt: 'A sunlit courtyard framed by columns and trees, an illustrative academic setting.'},
  {name: 'River country', image: '/media/ghana-landscape.jpg', position: '62% 57%', alt: 'An illustrative aerial view of a river winding through green woodland.'},
];

const pathways = [
  {label: 'Students', headline: 'Shape your study.', description: 'Bring a topic, a draft proposal or a dataset. Find support for the part of your degree you are working on now.', image: 'gallery-hero', alt: 'Research books and papers on a sunlit library desk.', href: '/services?client=students', action: 'Explore student services'},
  {label: 'Academics & researchers', headline: 'Build on the evidence.', description: 'Plan a review, work through a complex method or prepare your manuscript for its next round of peer review.', image: 'evidence-synthesis', alt: 'A workstation arranged for evidence synthesis with research papers and a spreadsheet.', href: '/services?client=researchers', action: 'Explore research services'},
  {label: 'Businesses', headline: 'Know your market.', description: 'Understand the customers behind the numbers, test a proposition or gather evidence for a change in direction.', image: 'market-research', alt: 'A colourful market stall displaying fresh fruit and vegetables.', href: '/services?client=businesses', action: 'Explore business services'},
  {label: 'Institutions & NGOs', headline: 'Understand what works.', description: 'Define a programme baseline, listen to communities or assess the outcomes that inform your next investment.', image: 'impact', alt: 'Irrigated agricultural plots beside a water channel, with field notes in the foreground.', href: '/institutions', action: 'Explore institutional research'},
];

function FieldAtlas() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [showFilm, setShowFilm] = useState(false);
  const touchStart = useRef<{x: number; y: number} | null>(null);
  const selected = scenes[sceneIndex];
  const move = (direction: number) => {
    setSceneIndex(current => (current + direction + scenes.length) % scenes.length);
  };

  return <>
    <section className="fh-atlas" aria-labelledby="fh-title"
      onTouchStart={event => {
        const start = event.touches[0];
        touchStart.current = event.touches.length === 1 && !(event.target as Element).closest('a, button')
          ? {x: start.clientX, y: start.clientY}
          : null;
      }}
      onTouchCancel={() => {touchStart.current = null;}}
      onTouchEnd={event => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start || !event.changedTouches.length) return;
        const end = event.changedTouches[0];
        const dx = end.clientX - start.x;
        if (Math.abs(dx) > 55 && Math.abs(dx) > 1.6 * Math.abs(end.clientY - start.y)) move(dx < 0 ? 1 : -1);
      }}
    >
      <div className="fh-imagery">
        {scenes.map((scene, index) => <picture key={scene.image} className={index === sceneIndex ? 'fh-scene is-current' : 'fh-scene'}>
          {index === 0 && <source media="(max-width: 640px)" srcSet="/media/field-market-mobile.webp"/>}
          <img src={scene.image} alt={scene.alt}
            aria-hidden={index !== sceneIndex} style={{'--fh-position': scene.position} as CSSProperties}
            fetchPriority={index === 0 ? 'high' : 'low'} loading={index === 0 ? 'eager' : 'lazy'}
          />
        </picture>)}
      </div>
      <div className="fh-atlas-shade" aria-hidden="true"/>
      <div className="fh-atlas-inner">
        <div className="fh-atlas-copy">
          <span className="fh-caption fh-atlas-label"><span className="fh-registration" aria-hidden="true"/>Independent research studio <span aria-hidden="true">/</span> Ghana</span>
          <h1 id="fh-title">Research,<br/><em>in full view.</em></h1>
          <p>Research support for the questions that matter to students, scholars and organisations in Ghana and beyond.</p>
          <div className="fh-actions">
            <Link className="fh-button" href="/services">Explore services <ArrowUpRight size={20} aria-hidden="true"/></Link>
            <button type="button" className="fh-film-link" onClick={() => setShowFilm(true)}>
              <span className="fh-play"><Play size={13} fill="currentColor" aria-hidden="true"/></span> Watch our film
            </button>
          </div>
        </div>
        <div className="fh-atlas-foot">
          <a className="fh-scroll" href="#possibilities"><ArrowDown size={16} aria-hidden="true"/> Research pathways</a>
          <div className="fh-reel" role="group" aria-label="Field atlas image controls">
            <div aria-live="polite" aria-atomic="true" className="fh-frame">
              <span className="fh-frame-count">{String(sceneIndex + 1).padStart(2, '0')} <span>/ {String(scenes.length).padStart(2, '0')}</span></span>
              <span className="fh-frame-name"><small>Field atlas</small>{selected.name}</span>
            </div>
            <div className="fh-arrows">
              <button type="button" aria-label="Previous field atlas image" onClick={() => move(-1)}><ArrowLeft size={18} aria-hidden="true"/></button>
              <button type="button" aria-label="Next field atlas image" onClick={() => move(1)}><ArrowRight size={18} aria-hidden="true"/></button>
            </div>
          </div>
        </div>
      </div>
    </section>
    {showFilm && <Dialog title="The Fullview film" onClose={() => setShowFilm(false)}>
      <div className="fh-film-screen"><video controls autoPlay playsInline muted preload="metadata" poster="/media/hero-poster.jpg" aria-label="The Fullview film, a silent visual impression of Ghana">
        <source src="/media/veridanth-film.mp4" type="video/mp4"/>
      </video><p>A silent visual impression of Ghana. The film and field atlas use AI-generated illustrative scenes.</p></div>
    </Dialog>}
  </>;
}

function PathwayDirectory() {
  const {guide} = useResearch();
  const [active, setActive] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const path = pathways[active];

  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys: Record<string, number> = {ArrowDown: (index + 1) % pathways.length, ArrowUp: (index + pathways.length - 1) % pathways.length, Home: 0, End: pathways.length - 1};
    if (event.key in keys) {
      event.preventDefault();
      setActive(keys[event.key]);
      tabs.current[keys[event.key]]?.focus();
    }
  };

  return <section className="fh-directory" id="possibilities" aria-labelledby="fh-pathway-title">
    <div className="fh-container">
      <div className="fh-directory-heading">
        <div><span className="fh-caption fh-section-label">Research pathways</span><h2 id="fh-pathway-title">Who’s <em>asking?</em></h2></div>
        <p>Find support for your dissertation, your next publication or a decision your organisation needs to make.</p>
      </div>
      <div className="fh-path-layout" id="expertise">
        <div className="fh-path-index">
          <div className="fh-path-list" role="tablist" aria-label="Research pathways" aria-orientation="vertical">
            {pathways.map((item, i) => <button key={item.label} type="button" id={'fh-tab-'+i} role="tab" aria-selected={active === i} aria-controls="fh-path-panel"
              tabIndex={active === i ? 0 : -1} ref={element => {tabs.current[i] = element;}}
              onKeyDown={event => navigate(event, i)} onClick={() => setActive(i)}>
              <span>{item.label}</span><ArrowRight size={22} aria-hidden="true"/>
            </button>)}
          </div>
          <button className="fh-simple-link" onClick={guide} type="button">Help me find a pathway <ArrowUpRight size={18} aria-hidden="true"/></button>
        </div>
        <div className="fh-path-panel" id="fh-path-panel" role="tabpanel" tabIndex={0} aria-labelledby={'fh-tab-'+active}>
          <Image unoptimized key={path.image} className="fh-path-image" src={'/services/photography/'+path.image+'.webp'} alt={path.alt} loading="lazy" width="1200" height="800"/>
          <div className="fh-path-overlay" aria-hidden="true"/>
          <div className="fh-path-copy">
            <h3>{path.headline}</h3><p>{path.description}</p>
            <Link className="fh-panel-link" href={path.href}>{path.action} <ArrowUpRight size={18} aria-hidden="true"/></Link>
          </div>
        </div>
      </div>
    </div>
  </section>;
}

function JournalSpread() {
  const {article} = useResearch();
  const featured = articles.find(note => note.id === 'fieldwork')!;
  return <section className="fh-journal" aria-labelledby="fh-journal-title">
    <div className="fh-container">
      <div className="fh-journal-head"><div><span className="fh-caption fh-section-label">The research journal</span><h2 id="fh-journal-title">Notes from <em>the field.</em></h2></div><Link className="fh-journal-all" href="/insights">All insights <ArrowUpRight size={18} aria-hidden="true"/></Link></div>
      <div className="fh-journal-body">
        <button type="button" className="fh-cover" onClick={() => article(featured.id)}>
          <Image unoptimized src="/services/photography/fieldwork.webp" alt="" loading="lazy" width="1200" height="800"/>
          <div className="fh-cover-shade" aria-hidden="true"/>
          <span className="fh-cover-copy">
            <span className="fh-caption">{featured.category}<span aria-hidden="true"> · </span>{featured.read}</span>
            <strong>{featured.title}</strong><span className="fh-cover-action">Read the field note <ArrowUpRight size={18} aria-hidden="true"/></span>
          </span>
        </button>
        <div className="fh-notes">
          {articles.filter(note => note.id !== featured.id).map(note => <button type="button" key={note.id} className="fh-note" onClick={() => article(note.id)}>
            <span className="fh-note-meta">{note.category}<span>{note.read}</span></span>
            <span className="fh-note-title">{note.title}<ArrowUpRight size={23} aria-hidden="true"/></span>
          </button>)}
        </div>
      </div>
    </div>
  </section>;
}

export function FieldHome() {
  return <div className="field-home">
    <FieldAtlas/>
    <nav className="fh-index-band" aria-label="Catalogue shortcuts">
      <div className="fh-band-inner">
        <Link href="/services" className="fh-index-first"><strong>{services.length}</strong> specialist services</Link>
        <Link href="/services?category=design">Research design <ArrowUpRight aria-hidden="true" size={16}/></Link>
        <Link href="/services?category=data">Data &amp; analytics <ArrowUpRight aria-hidden="true" size={16}/></Link>
        <Link href="/services?category=business">Market intelligence <ArrowUpRight aria-hidden="true" size={16}/></Link>
        <Link href="/services?category=policy">Policy research <ArrowUpRight aria-hidden="true" size={16}/></Link>
      </div>
    </nav>
    <PathwayDirectory/>
    <JournalSpread/>
    <section className="fh-start" aria-labelledby="fh-start-title">
      <div className="fh-container fh-start-inner">
        <div><span className="fh-caption fh-section-label">The research desk</span><h2 id="fh-start-title">Start with <em>your question.</em></h2></div>
        <div><p>Outline your research, select the support you need and put together a project brief.</p>
          <div className="fh-start-links"><Link className="fh-button" href="/workspace">Draft a brief <ArrowUpRight size={20} aria-hidden="true"/></Link>
            <Link className="fh-simple-link" href="/bundles">Compare packages <ArrowRight size={17} aria-hidden="true"/></Link></div>
        </div>
      </div>
    </section>
  </div>;
}
