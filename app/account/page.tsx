import Link from 'next/link';
import {ArrowRight} from 'lucide-react';
import {AccountAccess} from '../../components/account-access';
import {authConfigured, authenticationMode, getPrincipal} from '../../lib/fullview-auth';
import {ContactEmail} from '../../components/contact-email';
import type {Principal} from '../../lib/operations/core';
import {databaseConfigured} from '../../lib/operations/database';
import {retentionDays} from '../../lib/operations/validation';
import {fullviewContact} from '../../lib/contact';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Your account — Fullview Signature', robots: {index: false, follow: false}};

type AccountMode = 'signin'|'signup'|'verify'|'recover'|'reset';
type SearchParams = Promise<Record<string, string|string[]|undefined>>;

function accountMode(value: string|string[]|undefined): AccountMode {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return ['signin', 'signup', 'verify', 'recover', 'reset'].includes(normalized)
    ? normalized as AccountMode : 'signin';
}

export default async function AccountPage({searchParams}: {searchParams: SearchParams}) {
  const initialMode = accountMode((await searchParams).mode);
  let principal: Principal|null = null;
  const availability = authenticationMode();
  let available = authConfigured() && availability !== null;
  if (available) {
    try {principal = await getPrincipal();}
    catch {available = false;}
  }
  let projectsAvailable = false;
  if (available && databaseConfigured()) {
    try {projectsAvailable = retentionDays() > 0;}
    catch {projectsAvailable = false;}
  }

  return <div className="site-shell studio-task-page">
    <a className="skip-link" href="#account-main">Skip to account</a>
    <main id="account-main" className="studio-account-layout">
      <div className="studio-account-panel">
        <div className="studio-task-heading">
          <h1>Client account</h1>
        </div>
        {available && availability ? <>
          {(availability === 'validation' || !projectsAvailable) && <aside className="account-availability" aria-label="Account availability">
            {availability === 'validation' && <p><strong>Limited account access.</strong> Account access is currently limited to approved email addresses.</p>}
            {!projectsAvailable && <p>Project tracking is being connected. You can prepare a brief in the research desk or contact Fullview in the meantime.</p>}
          </aside>}
          <AccountAccess initialPrincipal={principal} initialMode={initialMode} availability={availability} projectsAvailable={projectsAvailable}/>
        </> : <section className="account-availability" aria-labelledby="account-unavailable">
          <h2 id="account-unavailable">Account access is being connected.</h2>
          <p>You can still prepare your brief in the local research desk or speak with Fullview about your project.</p>
          <div className="hero-buttons"><Link className="button" href="/workspace">Open the research desk<ArrowRight size={18} aria-hidden="true"/></Link><Link className="text-link" href="/contact">Contact Fullview</Link></div>
        </section>}
        <div className="account-support"><p>Account support</p><ContactEmail/><a href={fullviewContact.phoneHref}>{fullviewContact.phoneDisplay}</a></div>
        <p className="account-disclosure">Local drafts stay on your device. You can share a brief from your research desk when you are ready.</p>
      </div>
      <aside className="studio-account-visual" aria-label="Research desk">
        <img src="/services/photography/proposal-review.webp" alt="" width={1200} height={800}/>
        <div><h2>Preparing a project?</h2><p>Outline your question and build an estimate in the public research desk.</p>
        <Link href="/workspace">Create a research brief <ArrowRight size={18} aria-hidden="true"/></Link></div>
      </aside>
    </main>
  </div>;
}
