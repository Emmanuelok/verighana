'use client';

import {ArrowRight, RefreshCw} from 'lucide-react';

export default function ErrorPage({reset}:{reset:()=>void}) {
  return <div className="fullview-recovery">
    <header className="recovery-header"><a className="recovery-brand" href="/" aria-label="Fullview Signature home"><img src="/brand/emblem-light.svg?v=mono-v8" alt="" width={40} height={50}/><span>Fullview <em>Signature</em><small>by Veridanth Group</small></span></a><a href="/contact">Contact Fullview <ArrowRight size={17} aria-hidden="true"/></a></header>
    <main className="recovery-main"><div className="recovery-copy"><span className="eyebrow">A MOMENT TO RECONNECT</span><h1>A brief pause.<br/><em>The inquiry continues.</em></h1><p>We couldn’t load this page. Try again, or return to Fullview to find your next step.</p><div className="recovery-actions"><button className="button" onClick={reset}>Try again <RefreshCw size={18} aria-hidden="true"/></button><a href="/" className="text-link">Back to Fullview <ArrowRight size={19} aria-hidden="true"/></a></div></div><div className="recovery-art" aria-hidden="true"><img src="/services/photography/gallery-hero.webp" alt=""/><span>THERE IS ALWAYS<br/><em>ANOTHER PERSPECTIVE.</em></span></div></main>
    <footer className="recovery-footer"><span>Fullview Signature by Veridanth Group</span><span>Independent thinking. Shared possibility.</span></footer>
  </div>;
}
