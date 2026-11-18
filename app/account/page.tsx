import Link from 'next/link';
import {ArrowRight, FolderOpen} from 'lucide-react';
import {FieldHeader, FieldFooter} from '../../components/field-shell';
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

  return <div className="site-shell wf-page wf-account">
    <a className="skip-link" href="#main">Skip to account</a>
    <FieldHeader current="account"/>
    <main id="main" className="wf-account-layout">
      <section className="wf-account-cover" aria-labelledby="account-heading">
        <img src="/courtyard.jpg" alt="" fetchPriority="high" width="1500" height="1000"/>
        <div className="wf-account-caption">
          <span className="wf-label">Client account</span>
          <h1 id="account-heading">Your work,<br/><em>in full view.</em></h1>
          <p>Follow your project from the first conversation to the final deliverable.</p>
        </div>
        <Link href="/workspace" className="wf-cover-link"><FolderOpen size={18} aria-hidden="true"/> Looking for your local drafts?<span>Research desk <ArrowRight size={16} aria-hidden="true"/></span></Link>
      </section>
      <div className="wf-account-right">
        <div className="wf-account-form-wrap">
          {available && availability ? <>
            <AccountAccess initialPrincipal={principal} initialMode={initialMode} availability={availability} projectsAvailable={projectsAvailable}/>
            {(availability === 'validation' || !projectsAvailable) && <aside className="account-availability" aria-label="Account availability">
              {availability === 'validation' && <p><strong>Limited account access.</strong> Sign-in and registration are currently available for approved email addresses.</p>}
              {!projectsAvailable && <p>Project tracking is being connected. You can prepare a brief in the research desk or contact Fullview in the meantime.</p>}
            </aside>}
          </> : <section className="wf-account-standby" aria-labelledby="account-unavailable">
            <span className="wf-label">Account availability</span>
            <h2 id="account-unavailable">Access is being connected.</h2>
            <p>You can prepare a brief in the research desk or contact us about an existing project.</p>
            <div className="wf-actions"><Link className="wf-action" href="/workspace">Open research desk <ArrowRight size={17} aria-hidden="true"/></Link><Link className="wf-underlink" href="/contact">Contact Fullview</Link></div>
          </section>}
          <div className="account-support"><p>Account support</p><ContactEmail/><a href={fullviewContact.phoneHref}>{fullviewContact.phoneDisplay}</a></div>
          <p className="account-disclosure">Your drafts stay on this device until you choose to share them. You review and accept project terms separately.</p>
        </div>
      </div>
    </main>
    <FieldFooter/>
  </div>;
}
