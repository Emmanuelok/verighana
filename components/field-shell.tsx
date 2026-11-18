'use client';

import {useEffect, useRef, useState} from 'react';
import {ArrowUpRight, ChevronDown, FolderOpen, Menu, X} from 'lucide-react';
import {useResearch} from './research-context';
import {fullviewContact} from '../lib/contact';
import {ContactEmail} from './contact-email';

const destinations = [
  {id:'services', label:'Services', href:'/services'},
  {id:'bundles', label:'Packages', href:'/bundles'},
  {id:'pricing', label:'Pricing', href:'/pricing'},
  {id:'insights', label:'Journal', href:'/insights'},
  {id:'institutions', label:'For organisations', href:'/institutions'},
  {id:'approach', label:'Our approach', href:'/approach'},
  {id:'contact', label:'Contact', href:'/contact'},
  {id:'workspace', label:'Research desk', href:'/workspace'},
  {id:'projects', label:'Shared projects', href:'/projects'},
];

export function Brand({light=false}:{light?:boolean}) {
  return <a className="field-brand" href="/" aria-label="Fullview Signature by Veridanth Group home">
    <img width="38" height="46" src={light ? '/brand/emblem-light.svg?v=mono-v8' : '/brand/emblem-dark.svg?v=mono-v8'} alt=""/>
    <span><span className="field-brand-name">Fullview <i>Signature</i></span><span className="field-brand-credit">by Veridanth Group</span></span>
  </a>;
}

export function FieldHeader({current}:{current:string}) {
  const {estimate,items} = useResearch();
  const [menuOpen,setMenuOpen] = useState(false);
  const more = useRef<HTMLDetailsElement>(null);
  const menu = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const outside = (e:PointerEvent) => {
      if (more.current?.open && !more.current.contains(e.target as Node)) more.current.open = false;
    };
    const escape = (e:KeyboardEvent) => {
      if (e.key === 'Escape' && more.current?.open) {
        more.current.open = false;
        more.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',escape);
    return () => {
      document.removeEventListener('pointerdown',outside);
      document.removeEventListener('keydown',escape);
    };
  },[]);

  useEffect(() => {
    if (!menuOpen) return;
    const node = menu.current;
    node?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const wide = window.matchMedia('(min-width: 1101px)');
    const closeWideMenu = () => {if (wide.matches) setMenuOpen(false);};
    wide.addEventListener('change',closeWideMenu);
    return () => {
      wide.removeEventListener('change',closeWideMenu);
      node?.close();
      document.body.style.overflow = previous;
    };
  },[menuOpen]);

  const link = (page:typeof destinations[number]) =>
    <a key={page.id} href={page.href} aria-current={page.id===current?'page':undefined}>{page.label}</a>;

  return <header className="field-mast">
    <div className="field-mast-row">
      <Brand/>
      <nav className="field-nav" aria-label="Main navigation">
        {destinations.slice(0,4).map(link)}
        <details ref={more} className="field-nav-more" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.open=false;}}>
          <summary>Explore <ChevronDown size={14} aria-hidden="true"/></summary>
          <div>{destinations.slice(4).map(link)}</div>
        </details>
      </nav>
      <div className="field-mast-actions">
        <button type="button" className="field-estimate" onClick={estimate} aria-label={`Open project estimate, ${items.length} services`} title="Project estimate"><FolderOpen size={20} strokeWidth={1.6} aria-hidden="true"/>{items.length>0&&<span>{items.length}</span>}</button>
        <a className="field-signin" href="/account?mode=signin">Sign in</a>
        <a className="field-signup" href="/account?mode=signup">Create account <ArrowUpRight size={15} aria-hidden="true"/></a>
        <button className="field-menu-trigger" type="button" aria-haspopup="dialog" aria-expanded={menuOpen} aria-label="Open menu" onClick={()=>setMenuOpen(true)}><Menu size={23}/></button>
      </div>
    </div>
    {menuOpen && <dialog className="field-menu-sheet" ref={menu} aria-label="Navigation" onCancel={()=>setMenuOpen(false)} onClick={e=>{if(e.target===menu.current)setMenuOpen(false);}}>
      <div className="field-menu-inner">
        <div className="field-menu-top"><Brand/><button autoFocus aria-label="Close menu" onClick={()=>setMenuOpen(false)}><X size={25}/></button></div>
        <nav className="field-menu-links" aria-label="Main menu">{destinations.map(link)}</nav>
        <div className="field-menu-account"><a href="/account?mode=signin">Sign in</a><a href="/account?mode=signup">Create account <ArrowUpRight size={17}/></a></div>
        <button className="field-menu-estimate" onClick={()=>{setMenuOpen(false);estimate();}}><FolderOpen size={19}/>Open project estimate ({items.length})</button>
      </div>
    </dialog>}
  </header>;
}

export function FieldFooter() {
  const {policy} = useResearch();
  return <footer className="field-colophon">
    <div className="field-colophon-grid">
      <div className="field-office"><Brand light/>
        <address>{fullviewContact.street}<br/>{fullviewContact.locality}, Ghana<br/><span>GhanaPost GPS {fullviewContact.ghanaPostGps}</span></address>
        <ContactEmail/><a href={fullviewContact.phoneHref}>{fullviewContact.phoneDisplay}</a>
      </div>
      <nav aria-label="Explore Fullview"><h2>Explore</h2>
        <a href="/services">Service catalogue</a><a href="/bundles">Research packages</a><a href="/pricing">Pricing</a><a href="/institutions">For organisations</a><a href="/approach">Our approach</a><a href="/insights">Field journal</a>
      </nav>
      <nav aria-label="Work with Fullview"><h2>Work with us</h2>
        <a href="/workspace">Prepare a brief <ArrowUpRight size={14}/></a><a href="/contact">Send an inquiry</a><a href="/projects">Shared projects</a><a href="/account?mode=signin">Sign in</a><a href="/account?mode=signup">Create account</a>
      </nav>
    </div>
    <div className="field-colophon-end">
      <span>© {new Date().getFullYear()} Fullview Signature by Veridanth Group</span>
      <div><button onClick={()=>policy('privacy')}>Privacy</button><button onClick={()=>policy('integrity')}>Research integrity &amp; terms</button></div>
    </div>
    <p className="field-image-credit">Photography and film are AI-generated illustrations inspired by Ghana. Independent research support.</p>
  </footer>;
}
