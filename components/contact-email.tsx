import {fullviewContact} from '../lib/contact';

/** Keep the proposed address visible without presenting an unverified mailbox as usable. */
export function ContactEmail({className, withPhone = false}: {className?: string; withPhone?: boolean}) {
  if (fullviewContact.emailReady) return <a className={className} href={fullviewContact.emailHref} aria-label={`Email Fullview Signature at ${fullviewContact.email}`}>{fullviewContact.email}</a>;
  return <span className={`contact-email-pending${className ? ` ${className}` : ''}`}><span>{fullviewContact.email}</span><small>{fullviewContact.emailPendingNotice}</small>{withPhone && <a href={fullviewContact.phoneHref}>{fullviewContact.phoneDisplay}</a>}</span>;
}
