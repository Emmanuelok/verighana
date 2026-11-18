import type {Metadata} from 'next';
import Link from 'next/link';
import Image from 'next/image';
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
      <section className="contact-intro" aria-labelledby="contact-title"><div className="contact-intro-copy"><span className="eyebrow">A CONVERSATION CAN CHANGE THE VIEW</span><h1 id="contact-title">Bring your<br/><em>big question.</em></h1><p>Tell us what you are working towards. Share a short outline so Fullview can discuss the right support, availability and next steps.</p><a className="text-link contact-jump" href="#inquiry">Start the conversation <ArrowRight size={20} aria-hidden="true"/></a></div><figure className="contact-hero-art"><Image src="/services/photography/research-consultation.webp" width={1200} height={800} alt="Illustrative research setting prepared for a thoughtful discussion" priority/><figcaption><span>IDEAS BECOME POSSIBILITIES.</span><small>Illustrative research scene</small></figcaption></figure></section>
      <div className="contact-layout" id="inquiry"><ContactForm/><aside className="contact-aside" aria-label="Fullview contact details"><span className="eyebrow">ROOTED IN GHANA. OPEN TO THE WORLD.</span><div className="contact-aside-symbol" aria-hidden="true"><svg viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="44"/><ellipse cx="50" cy="50" rx="23" ry="44"/><path d="M6 50h88M50 6v88M13 27h74M13 73h74"/></svg></div><h2>A conversation,<br/><em>in full view.</em></h2><address><ContactEmail/><a href={fullviewContact.phoneHref}>{fullviewContact.phoneDisplay}</a><p>{fullviewContact.street}<br/>{fullviewContact.locality}</p><p>GhanaPost GPS<br/><strong>{fullviewContact.ghanaPostGps}</strong></p></address><div className="contact-account-note"><h3>Ongoing project?</h3><p>Visit the account area for project access and secure collaboration when the service is available. Use this form for a general inquiry, with no private research files.</p><Link className="text-link" href="/account">Project account <ArrowRight size={17}/></Link></div></aside></div>
    </main>
    <footer className="wrap contact-footer"><Link href="/" className="text-link"><ArrowLeft size={17}/>Back to Fullview</Link><span>Fullview Signature by Veridanth Group</span></footer>
  </div>;
}
