/** Phone/address verified on fvsignature.com; email supplied by the owner for Fullview inquiries. */
const email = 'hello@fvsignature.com';
// Zoho shows this alias on hello@veridanth.com; ownership, MX, SPF and DKIM are verified.
// No message-delivery test is claimed. Application delivery has separate runtime gates.
const emailReady = true;
export const fullviewContact = {
  email,
  emailReady,
  emailHref: emailReady ? `mailto:${email}` : undefined,
  emailPendingNotice: 'Email setup in progress; please call.',
  phoneDisplay: '+233 20 940 9668',
  phoneHref: 'tel:+233209409668',
  street: '24 Nii Kodia Road',
  locality: 'Adenta',
  ghanaPostGps: 'GM-052-8745',
} as const;
