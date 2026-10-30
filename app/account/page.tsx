import Link from 'next/link';
import {AccountAccess} from '../../components/account-access';
import {authConfigured, getPrincipal} from '../../lib/fullview-auth';
import {fullviewContact} from '../../lib/contact';
import type {Principal} from '../../lib/operations/core';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Your account — Fullview Signature', robots: {index: false, follow: false}};

export default async function AccountPage() {
  let principal: Principal|null = null;
  let available = authConfigured();
  if (available) {
    try {principal = await getPrincipal();}
    catch {available = false;}
  }
  return <main id="main" className="wrap" style={{maxWidth: 720, paddingBlock: '40px 80px'}}>
    <Link href="/" className="text-link">Fullview Signature</Link>
    <div className="page-intro" style={{paddingBlock: '40px 24px'}}><span className="eyebrow">YOUR FULLVIEW ACCOUNT</span><h1>A shared place<br/><em>for your project.</em></h1><p>Sign in to access projects you have explicitly submitted. Your device-local drafts are not uploaded by signing in.</p></div>
    {available ? <AccountAccess initialPrincipal={principal}/> : <section className="muted-info" aria-labelledby="account-unavailable"><h2 id="account-unavailable">Online accounts are not available yet.</h2><p>We are connecting the account service. You can continue preparing your brief in the local research desk or contact Fullview directly.</p><div className="hero-buttons"><Link className="button" href="/workspace">Use the research desk</Link><a className="text-link" href={fullviewContact.emailHref}>{fullviewContact.email}</a></div></section>}
    <p className="fine-print" style={{marginTop: 24}}>Creating an account does not submit a project, accept a quote or book a service. Passwords and verification codes are handled by the authentication service; they are not stored in your local research drafts.</p>
  </main>;
}
