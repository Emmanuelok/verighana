import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowLeft, ArrowRight} from 'lucide-react';
import {Brand} from '../../components/platform';
import {ContactForm} from '../../components/contact-form';
import {fullviewContact} from '../../lib/contact';
import {ContactEmail} from '../../components/contact-email';

export const metadata: Metadata = {
  title: 'Contact Fullview Signature — Research inquiries',
  description: 'Discuss your research question and support needs with Fullview Signature by Veridanth Group.',
  alternates: {canonical: '/contact'},
};

export default function ContactPage() {
  return <div className="site-shell contact-page">
    <a className="skip-link" href="#contact-main">Skip to content</a>
    <header className="contact-header wrap"><Brand/><nav aria-label="Contact page navigation"><Link href="/services">Explore services</Link><Link href="/workspace">Research desk <ArrowRight size={16}/></Link></nav></header>
    <main id="contact-main" className="wrap contact-main">
      <div className="contact-intro"><span className="eyebrow">LET’S TALK RESEARCH</span><h1>Every project starts<br/>with <em>a question.</em></h1><p>Tell us what you are working towards. Share a short outline so Fullview can discuss the right support, availability and next steps.</p></div>
      <div className="contact-layout"><ContactForm/><aside className="contact-aside" aria-label="Fullview contact details"><span className="eyebrow">FULLVIEW SIGNATURE</span><h2>A conversation,<br/><em>in full view.</em></h2><address><ContactEmail/><a href={fullviewContact.phoneHref}>{fullviewContact.phoneDisplay}</a><p>{fullviewContact.street}<br/>{fullviewContact.locality}</p><p>GhanaPost GPS<br/><strong>{fullviewContact.ghanaPostGps}</strong></p></address><div className="contact-account-note"><h3>Ongoing project?</h3><p>Visit the account area for project access and secure collaboration when the service is available. Use this form for a general inquiry, with no private research files.</p><Link className="text-link" href="/account">Project account <ArrowRight size={17}/></Link></div></aside></div>
    </main>
    <footer className="wrap contact-footer"><Link href="/" className="text-link"><ArrowLeft size={17}/>Back to Fullview</Link><span>Fullview Signature by Veridanth Group</span></footer>
  </div>;
}
