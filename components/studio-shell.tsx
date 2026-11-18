'use client';

import {usePathname} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';
import {ArrowUpRight, Menu, X, FolderOpen} from 'lucide-react';
import {ContactEmail} from './contact-email';
import {fullviewContact} from '../lib/contact';
import {useResearch} from './research-context';

const practice = [
  ['Services','/services'], ['Packages','/bundles'], ['Pricing','/pricing'], ['Organisations','/institutions'],
];
const studio = [
  ['Our approach','/approach'], ['Field notes','/insights'], ['Contact','/contact'],
];
const tools = [['Research desk','/workspace'],['Shared projects','/projects']];

const footerGroups = [
  {label:'Research', links:practice},
  {label:'Studio', links:studio},
  {label:'Client access', links:[...tools,['Sign in','/account?mode=signin'],['Create account','/account?mode=signup']]},
];

export function StudioBrand({inverse=false}:{inverse?:boolean}) {
  return <a className="st-brand" href="/" aria-label="Fullview Signature by Veridanth Group home">
    <img src={inverse?'/brand/logo-light.svg':'/brand/logo-dark.svg'} width={901} height={174} alt="Fullview Signature by Veridanth Group"/>
  </a>;
}

export function StudioHeader() {
  const pathname=usePathname();
  const {estimate,items}=useResearch();
  const [open,setOpen]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!open)return;
    const el=dialog.current;
    el?.showModal();
    const original=document.body.style.overflow;
    document.body.style.overflow='hidden';
    return ()=>{el?.close();document.body.style.overflow=original;trigger.current?.focus();};
  },[open]);
  const openEstimate=()=>{setOpen(false);estimate();};
  const makeLink=([label,url]:string[]) => <a key={url} href={url} aria-current={pathname===url?'page':undefined}>{label}</a>;
  return <header className="st-mast">
    <div className="st-mast-inner">
      <StudioBrand/>
      <nav aria-label="Main navigation" className="st-primary">
        {practice.slice(0,3).map(makeLink)}{makeLink(studio[1])}{makeLink(studio[2])}
      </nav>
      <div className="st-header-actions">
        <button className="st-estimate" type="button" onClick={openEstimate} aria-label={'Open project estimate, '+items.length+' services'}><FolderOpen size={19}/>{items.length>0&&<b>{items.length}</b>}</button>
        <a className="st-signin" href="/account?mode=signin">Sign in</a>
        <a className="st-signup" href="/account?mode=signup">Create account <ArrowUpRight size={15}/></a>
        <button ref={trigger} className="st-nav-switch" onClick={()=>setOpen(true)} aria-label="Open full navigation" aria-haspopup="dialog" aria-expanded={open}><Menu size={22}/></button>
      </div>
    </div>
    {open&&<dialog ref={dialog} className="st-drawer" aria-label="Full navigation" onCancel={()=>setOpen(false)} onClick={e=>{if(e.target===dialog.current)setOpen(false);}}>
      <div className="st-drawer-inner">
        <div className="st-drawer-top"><StudioBrand/><button autoFocus aria-label="Close navigation" onClick={()=>setOpen(false)}><X/></button></div>
        <nav className="st-drawer-nav">{[...practice,...studio,...tools].map(makeLink)}</nav>
        <button className="st-drawer-estimate" onClick={openEstimate}><FolderOpen size={17}/> Your estimate ({items.length})</button>
        <div className="st-drawer-auth"><a href="/account?mode=signin">Sign in</a><a href="/account?mode=signup">Create account <ArrowUpRight size={15}/></a></div>
      </div>
    </dialog>}
  </header>;
}

export function StudioFooter(){
  const {policy}=useResearch();
  return <footer className="st-footer">
    <div className="st-footer-grid">
      <div className="st-office"><StudioBrand inverse/><address>{fullviewContact.street}, {fullviewContact.locality}, Ghana<br/>GhanaPost GPS {fullviewContact.ghanaPostGps}</address><ContactEmail/><a href={fullviewContact.phoneHref}>{fullviewContact.phoneDisplay}</a></div>
      {footerGroups.map(({label,links})=><nav key={label} aria-label={'Footer '+label}><h2>{label}</h2>{links.map(([name,url])=><a key={url} href={url}>{name}</a>)}</nav>)}
    </div>
    <div className="st-footer-baseline"><span>© {new Date().getFullYear()} Fullview Signature by Veridanth Group</span><button onClick={()=>policy('privacy')}>Privacy</button><button onClick={()=>policy('integrity')}>Research integrity &amp; terms</button></div>
    <p className="st-credit">Studio photography and film are AI-generated illustrations.</p>
  </footer>;
}
