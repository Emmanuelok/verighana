import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import {ContactForm} from '../../components/contact-form';
import {fullviewContact} from '../../lib/contact';
import {ContactEmail} from '../../components/contact-email';

export const metadata: Metadata = {
  title: 'Contact Fullview Signature — Research inquiries',
  description: 'Discuss your research question and support needs with Fullview Signature by Veridanth Group.',
  alternates: {canonical: '/contact'},
};

export default function ContactPage() {
  return <div className="site-shell studio-task-page">
    <a className="skip-link" href="#contact-main">Skip to content</a>
    <main id="contact-main" className="studio-contact-layout">
      <section className="studio-contact-form">
        <div className="studio-task-heading"><h1>Contact the studio</h1>
          <p>Tell us what you’re researching and where you need support.</p></div>
        <ContactForm/>
      </section>
      <aside className="studio-contact-office" aria-label="Fullview contact details">
        <img src="/services/photography/research-consultation.webp" width={1200} height={800} alt="Illustrative setting for a research consultation"/>
        <div className="studio-office-body">
          <h2>Adenta office</h2>
          <address><p>{fullviewContact.street}<br/>{fullviewContact.locality}, Ghana</p>
            <p className="studio-gps">GhanaPost GPS <b>{fullviewContact.ghanaPostGps}</b></p>
            <ContactEmail/><a href={fullviewContact.phoneHref}>{fullviewContact.phoneDisplay}</a>
          </address>
          <Link href="/projects" className="studio-office-link">Open a shared project <ArrowUpRight size={17}/></Link>
        </div>
      </aside>
    </main>
  </div>;
}
