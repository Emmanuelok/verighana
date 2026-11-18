'use client';
import {useEffect, useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,ArrowRight,Globe2,Menu,X,FolderOpen,BookOpen,House,LayoutDashboard} from 'lucide-react';
import {ResearchProvider,useResearch} from './research-context';
import {ServiceCatalogue,PricingPage,InstitutionsPage,InsightsPage,ApproachPage} from './research-pages';
import {Workspace,type Viewer} from './workspace';
import {BundleCatalogue} from './bundle-catalogue';
import {PwaExperience} from './pwa-experience';
import {fullviewContact} from '../lib/contact';
import {ContactEmail} from './contact-email';
import {EditorialHome} from './home-editorial';
export type View='home'|'services'|'bundles'|'pricing'|'institutions'|'insights'|'approach'|'workspace';
export default function Platform({view='home',viewer=null}:{view?:View;viewer?:Viewer|null}){return <ResearchProvider><Site view={view} viewer={viewer}/></ResearchProvider>}
function Site({view,viewer}:{view:View;viewer:Viewer|null}){
  const [mobile,setMobile]=useState(false);
  useEffect(()=>{const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.08});document.querySelectorAll('[data-reveal]').forEach(el=>observer.observe(el));return()=>observer.disconnect()},[view]);
  return <div className={'site-shell view-'+view}><a className="skip-link" href="#main">Skip to content</a><Header view={view} mobile={mobile} setMobile={setMobile}/><main id="main">{view==='home'?<><EditorialHome/><CallToAction/></>:view==='services'?<ServiceCatalogue/>:view==='bundles'?<BundleCatalogue/>:view==='pricing'?<PricingPage/>:view==='institutions'?<InstitutionsPage/>:view==='insights'?<InsightsPage/>:view==='approach'?<ApproachPage/>:<Workspace viewer={viewer}/>}</main><PwaExperience/><Footer/><MobileNavigation view={view} mobile={mobile} setMobile={setMobile}/></div>
}
export function Brand({light=false}:{light?:boolean}){return <a href="/" className={'brand'+(light?' light':'')} aria-label="Fullview Signature by Veridanth Group home"><img className="brand-emblem" src={light?"/brand/emblem-light.svg?v=mono-v8":"/brand/emblem-dark.svg?v=mono-v8"} alt="" width={52} height={64}/><span className="brand-type"><span className="brand-name"><span className="fullview-word">Fullview</span><em className="signature-word">Signature</em></span><span className="brand-endorsement">by Veridanth Group</span></span></a>}
function Header({view,mobile,setMobile}:{view:View;mobile:boolean;setMobile:(open:boolean)=>void}){
  const {items,estimate}=useResearch();
  const links=[['Services','/services','services'],['Packages','/bundles','bundles'],['Organisations','/institutions','institutions'],['Our approach','/approach','approach'],['Insights','/insights','insights'],['Pricing','/pricing','pricing']];
  useEffect(()=>{if(!mobile)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){setMobile(false);const trigger=[...document.querySelectorAll<HTMLButtonElement>('button[aria-controls="main-navigation"]')].find(button=>button.getClientRects().length);trigger?.focus()}};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close)},[mobile,setMobile]);
  return <header className="header"><div className="header-inner"><Brand/>
    <nav id="main-navigation" className={mobile?'main-nav open':'main-nav'} aria-label="Main navigation">
      {links.map(([name,url,id])=><a key={id} href={url} aria-current={view===id?'page':undefined} onClick={()=>setMobile(false)}>{name}</a>)}
      <div className="mobile-account-links" role="group" aria-label="Account access">
        <Link className="account-sign-in" href="/account?mode=signin" onClick={()=>setMobile(false)}>Sign in</Link>
        <Link className="button account-create-account" href="/account?mode=signup" onClick={()=>setMobile(false)}>Create account</Link>
      </div>
      <a className="mobile-desk" href="/workspace" onClick={()=>setMobile(false)}>Start your research <ArrowUpRight size={18} aria-hidden="true"/></a>
    </nav>
    <div className="header-actions">
      <button type="button" className="estimate-icon" onClick={estimate} aria-label={`Open project estimate, ${items.length} services`}><FolderOpen size={21} strokeWidth={1.7} aria-hidden="true"/>{items.length>0&&<span>{items.length}</span>}</button>
      <div className="header-account-links" role="group" aria-label="Account access">
        <Link className="account-sign-in" href="/account?mode=signin" onClick={()=>setMobile(false)}>Sign in</Link>
        <Link className="button small account-create-account" href="/account?mode=signup" onClick={()=>setMobile(false)}>Create account</Link>
      </div>
      <a className="button small" href="/workspace">Let’s talk research <ArrowUpRight size={17} aria-hidden="true"/></a>
      <button type="button" className="menu-button icon-button" aria-label={mobile?'Close menu':'Open menu'} aria-expanded={mobile} aria-controls="main-navigation" onClick={()=>setMobile(!mobile)}>{mobile?<X aria-hidden="true"/>:<Menu aria-hidden="true"/>}</button>
    </div>
  </div></header>
}
function MobileNavigation({view,mobile,setMobile}:{view:View;mobile:boolean;setMobile:(open:boolean)=>void}){
  const {items,estimate}=useResearch();
  const moreActive=!['home','services','workspace'].includes(view);
  return <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
    <a href="/" aria-current={view==='home'?'page':undefined} onClick={()=>setMobile(false)}><House aria-hidden="true"/><span>Home</span></a>
    <a href="/services" aria-current={view==='services'?'page':undefined} onClick={()=>setMobile(false)}><BookOpen aria-hidden="true"/><span>Services</span></a>
    <button type="button" onClick={()=>{setMobile(false);estimate()}} aria-label={`Open project estimate, ${items.length} services`}><span className="mobile-nav-icon"><FolderOpen aria-hidden="true"/>{items.length>0&&<span className="mobile-nav-count" aria-hidden="true">{items.length}</span>}</span><span>Estimate</span></button>
    <a href="/workspace" aria-label="Research desk" aria-current={view==='workspace'?'page':undefined} onClick={()=>setMobile(false)}><LayoutDashboard aria-hidden="true"/><span>Desk</span></a>
    <button type="button" aria-label={mobile?'Close menu':'Open menu'} aria-expanded={mobile} aria-controls="main-navigation" data-active={mobile||moreActive} onClick={()=>setMobile(!mobile)}>{mobile?<X aria-hidden="true"/>:<Menu aria-hidden="true"/>}<span>Menu</span></button>
  </nav>
}
export function CallToAction(){const {guide}=useResearch();return <section className="cta-section signature-cta"><div className="cta-orbit" aria-hidden="true"/><div className="wrap cta-inner"><div><span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span><h2>A big idea?<br/><em>Let’s give it perspective.</em></h2></div><div><a className="button gold" href="/workspace">Start a conversation <ArrowUpRight size={21}/></a><button className="text-link light-link" onClick={guide}>Help me find my pathway <ArrowRight size={18}/></button></div></div></section>}
function Footer(){const {policy}=useResearch();return <footer className="footer"><div className="wrap footer-grid"><div className="footer-brand"><Brand light/><p>Curiosity into clarity.<br/>Evidence into progress.</p><span className="location"><Globe2 size={17}/> Ghana. A world of possibility.</span></div><div><span className="eyebrow">RESEARCH WITH US</span><a href="/services?audience=undergraduate">Students & graduates</a><a href="/services?audience=phd">Doctoral researchers</a><a href="/services?audience=academic">Academics & postdocs</a><a href="/institutions">Business & institutions</a></div><div><span className="eyebrow">EXPLORE FULLVIEW</span><a href="/approach">Our approach</a><a href="/pricing">Services & pricing</a><a href="/bundles">Research packages</a><a href="/insights">Insights & tools</a><a href="/contact">Contact Fullview</a><a href="/projects">Shared projects</a><a href="/workspace">Your research desk <ArrowUpRight size={15}/></a></div><div className="footer-contact-block"><span className="eyebrow">GET IN TOUCH</span><address className="footer-contact"><p>{fullviewContact.street}<br/>{fullviewContact.locality}</p><p><span>GhanaPost GPS</span><br/>{fullviewContact.ghanaPostGps}</p><a className="footer-phone" href={fullviewContact.phoneHref} aria-label={`Call Fullview Signature on ${fullviewContact.phoneDisplay}`}>{fullviewContact.phoneDisplay}</a><ContactEmail className="footer-email"/></address></div></div><div className="wrap footer-bottom"><span>© {new Date().getFullYear()} Fullview Signature by Veridanth Group</span><div><button onClick={()=>policy('privacy')}>Privacy</button><button onClick={()=>policy('integrity')}>Research integrity & terms</button></div></div><div className="wrap footer-disclosure">Independent research support. No university affiliation implied. Service imagery and cinematic scenes are AI-generated illustrations, not depictions of our staff, clients or premises.</div></footer>}
