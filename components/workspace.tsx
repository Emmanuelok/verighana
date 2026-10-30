'use client';

import { ArrowRight, ShieldCheck, FolderOpen } from 'lucide-react';
import { audiences, money } from '../lib/catalog';
import { researchDeskUrl } from '../lib/estimate-transfer';
import { useResearch } from './research-context';
import { PageIntro } from './research-pages';

export type Viewer = { name: string; email: string };

export function Workspace(_props: { viewer: Viewer | null }) {
  const { audience, items, total, estimate, policy } = useResearch();
  return <>
    <PageIntro eyebrow="YOUR PERSONAL RESEARCH DESK" title="A considered start." italic="A clearer next chapter." description="Shape a research brief, keep a record of what you need and return to your projects in one place." />
    <section className="workspace-section wrap">
      <div className="signin-panel">
        <ShieldCheck size={42} strokeWidth={1} aria-hidden="true" />
        <h2>Your research.<br /><em>Your own space.</em></h2>
        <p>Your secure research desk uses ChatGPT sign-in. Continue to create a brief or return to your saved projects, with the same account and access settings.</p>
        {items.length > 0 && <p><strong>{items.length} selected {items.length === 1 ? 'service' : 'services'} · GHS {money(total)}</strong><br />{audiences.find(item => item.id === audience)?.label}. Your service selections will go with you.</p>}
        <a className="button" href={researchDeskUrl(audience, items)}>Continue to research desk <ArrowRight size={18} aria-hidden="true" /></a>
        <button className="text-link" onClick={estimate}><FolderOpen size={17} aria-hidden="true" /> Review my estimate</button>
        <button className="text-link" onClick={() => policy('privacy')}>How your information is used <ArrowRight size={15} aria-hidden="true" /></button>
      </div>
    </section>
  </>;
}
