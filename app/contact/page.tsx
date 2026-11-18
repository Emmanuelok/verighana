import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowRight} from 'lucide-react';
import {FieldHeader, FieldFooter} from '../../components/field-shell';
import {ContactForm} from '../../components/contact-form';
import {fullviewContact} from '../../lib/contact';
import {ContactEmail} from '../../components/contact-email';

export const metadata: Metadata = {
  title: 'Contact Fullview Signature — Research inquiries',
  description: 'Discuss your research question and support needs with Fullview Signature by Veridanth Group.',
  alternates: {canonical: '/contact'},
};

export default function ContactPage() {
  return <div className="site-shell wf-page wf-contact">
    <a className="skip-link" href="#main">Skip to contact</a>
    <FieldHeader current="contact"/>
    <main id="main" className="wf-contact-main">
      <section className="wf-contact-top" aria-labelledby="contact-heading">
        <div className="wf-contact-lede"><span className="wf-label">Contact Fullview</span>
          <h1 id="contact-heading">What’s your<br/><em>question?</em></h1>
          <p>Tell us what you’re working on. We’ll discuss the scope, timing and research support that fits.</p>
          <a className="wf-underlink" href="#write-inquiry">Write an inquiry <ArrowRight size={18} aria-hidden="true"/></a>
        </div>
        <div className="wf-contact-photo" aria-hidden="true"><img src="/services/photography/research-consultation.webp" alt="" width="1200" height="800" fetchPriority="high"/></div>
      </section>
      <div className="wf-contact-body">
        <aside className="wf-office" aria-labelledby="office-heading"><span className="wf-label">Direct contact</span><h2 id="office-heading">Adenta, <em>Ghana.</em></h2>
          <address><div><span>Email</span><ContactEmail/></div><div><span>Telephone</span><a href={fullviewContact.phoneHref}>{fullviewContact.phoneDisplay}</a></div><div><span>Office</span><p>{fullviewContact.street}<br/>{fullviewContact.locality}</p></div><div><span>GhanaPost GPS</span><p>{fullviewContact.ghanaPostGps}</p></div></address>
          <div className="wf-office-account"><strong>Working with us already?</strong><Link className="wf-underlink" href="/projects">Open your projects <ArrowRight size={16} aria-hidden="true"/></Link></div>
        </aside>
        <section id="write-inquiry" className="wf-inquiry" aria-label="Write an inquiry"><ContactForm/></section>
      </div>
    </main>
    <FieldFooter/>
  </div>;
}
