import Link from 'next/link';
import Image from 'next/image';
import {ArrowLeft, ArrowRight} from 'lucide-react';
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

  return <div className="site-shell account-page">
    <a className="skip-link" href="#account-main">Skip to account</a>
    <header className="account-header wrap">
      <Link href="/" className="brand" aria-label="Fullview Signature by Veridanth Group home">
        <Image className="brand-emblem" src="/brand/emblem-dark.svg?v=mono-v8" alt="" width={52} height={64}/>
        <span className="brand-type"><span className="brand-name"><span className="fullview-word">Fullview</span><em className="signature-word">Signature</em></span><span className="brand-endorsement">by Veridanth Group</span></span>
      </Link>
      <Link href="/" className="account-back text-link"><ArrowLeft size={17} aria-hidden="true"/>Back to Fullview</Link>
    </header>
    <main id="account-main" className="account-shell wrap">
      <section className="account-story" aria-labelledby="account-heading">
        <span className="account-kicker">YOUR FULLVIEW ACCOUNT</span>
        <h1 id="account-heading">Welcome to your<br/><em>research space.</em></h1>
        <p>A clearer view of the work you share with Fullview, from the first conversation to the next step.</p>
        <div className="account-story-details">
          <div><span aria-hidden="true">01</span><div><h2>Your work, in view.</h2><p>Review submitted briefs, agreed scope and project stages when project services are available.</p></div></div>
          <div><span aria-hidden="true">02</span><div><h2>A shared conversation.</h2><p>Keep messages about each submitted project together in its workspace.</p></div></div>
          <div><span aria-hidden="true">03</span><div><h2>Your next step, considered.</h2><p>Prepare your brief at your own pace. You choose when to share it with Fullview.</p></div></div>
        </div>
        <Link href="/workspace" className="text-link">Explore the research desk<ArrowRight size={18} aria-hidden="true"/></Link>
      </section>
      <div className="account-panel">
        {available && availability ? <>
          {(availability === 'validation' || !projectsAvailable) && <aside className="account-availability" aria-label="Account availability">
            {availability === 'validation' && <p><strong>Limited account access.</strong> Account access is currently limited to approved email addresses.</p>}
            {!projectsAvailable && <p>Project tracking is being connected. You can prepare a brief in the research desk or contact Fullview in the meantime.</p>}
          </aside>}
          <AccountAccess initialPrincipal={principal} initialMode={initialMode} availability={availability} projectsAvailable={projectsAvailable}/>
        </> : <section className="account-availability" aria-labelledby="account-unavailable">
          <span className="account-kicker">WE’RE GETTING READY</span>
          <h2 id="account-unavailable">Account access is being connected.</h2>
          <p>You can still prepare your brief in the local research desk or speak with Fullview about your project.</p>
          <div className="hero-buttons"><Link className="button" href="/workspace">Open the research desk<ArrowRight size={18} aria-hidden="true"/></Link><Link className="text-link" href="/contact">Contact Fullview</Link></div>
        </section>}
        <div className="account-support"><p>Need a hand with your account?</p><ContactEmail/><a href={fullviewContact.phoneHref}>{fullviewContact.phoneDisplay}</a></div>
        <p className="account-disclosure">Signing in does not upload your device-local drafts. Creating an account does not submit a project, accept a quote or book a service.</p>
      </div>
    </main>
  </div>;
}
