import {ArrowRight} from 'lucide-react';

export default function NotFound() {
  return <div className="fullview-recovery">
    <header className="recovery-header"><a className="recovery-brand" href="/" aria-label="Fullview Signature home"><img src="/brand/emblem-light.svg?v=mono-v8" alt="" width={40} height={50}/><span>Fullview <em>Signature</em><small>by Veridanth Group</small></span></a><a href="/contact">Contact Fullview <ArrowRight size={17} aria-hidden="true"/></a></header>
    <main className="recovery-main"><div className="recovery-copy"><span className="eyebrow">404 / A DIFFERENT DIRECTION</span><h1>Not this page.<br/><em>Still, a world of possibility.</em></h1><p>This address doesn’t lead to a research page. Explore our services or return to Fullview to begin again.</p><div className="recovery-actions"><a className="button" href="/">Return to Fullview <ArrowRight size={18} aria-hidden="true"/></a><a href="/services" className="text-link">Explore our expertise <ArrowRight size={19} aria-hidden="true"/></a></div></div><div className="recovery-art" aria-hidden="true"><img src="/services/photography/gallery-hero.webp" alt=""/><span>EVERY QUESTION<br/><em>OPENS A NEW VIEW.</em></span></div></main>
    <footer className="recovery-footer"><span>Fullview Signature by Veridanth Group</span><span>Independent thinking. Shared possibility.</span></footer>
  </div>;
}
