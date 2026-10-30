# Fullview operational platform — implementation and activation

## Verified infrastructure, 30 October 2026

Existing Vercel project `verighana` (`prj_4YHGkUBOq3SuKOR205qjPdLjbXKX`, team `team_G8Fwt1G5TCufG58zqu18buXA`) hosts fvsignature.com. Environment metadata is empty. Existing production remains dcdad972 / deployment dpl_BNCUvqFBkQw32LRfsUFqjDgYK2AG; no release was performed during this work.

Matching Neon project `empty-breeze-85983737`, production branch `br-round-bird-bariynrh`, database `verighana`, region aws-eu-central-1, Postgres18 already has managed Better Auth. Only neon_auth tables exist remotely. Storage is enabled but no bucket exists. No application tables, migrations or storage objects were created remotely.

Auth URL: https://ep-tiny-night-bahe2uz5.neonauth.c-8.eu-central-1.aws.neon.tech/verighana/auth . Its only configured trusted origin is https://verighana.vercel.app. Email verification is not currently required by the provider. The application independently denies shared records to unverified sessions and never trusts the old identity headers. Account forms are disabled until the explicit runtime configuration is complete.

Resend has no verified veridanth.com or fvsignature.com sending domain and no inboxes. The owner explicitly supplied fvsignature@veridanth.com as the Fullview contact and inquiry recipient. That authorizes this destination, not use of unrelated verified domains or arbitrary outbound mail. No test email was sent. Vercel integration listing returned403 and was not retried or bypassed.

## Implemented locally

1. Public email/contact page, explicit inquiry consent, strict validation, honeypot/time checks, durable IP/email rate counters, deduplicated request references and an office-only email outbox. Provider acceptance is explicitly different from delivery. Retry leases use the same provider key, are bounded to three attempts within23hours, and preserve unknown outcomes for manual review. No visitor auto-acknowledgment is sent.
2. Staff intake with assignment, stages, pending notification visibility/retry and a deletion-review queue. Staff privileges come only from server-side fv_staff records tied to a verified managed identity. There is no self-granting staff endpoint.
3. Managed account UI/proxy and durable client-owned projects/messages. Each API checks the managed session, verified email, server-side role and project access. An explicit Review online submission → consent → Submit action shares a local brief; signing in or saving locally never uploads it. Server prices are recalculated from the catalogue and stored as a dated snapshot.
4. Immutable quote versions, mandatory owner-entered scope/revision/timeline/tax/deposit/cancellation terms, expiry, issuance and explicit acceptance by the actual client-owner. Stale and superseded acceptances are rejected. Draft/issued/void invoice records are derived from accepted quotes with an explicitly entered due date. Checkout remains disabled; there is no payment or paid-state claim.
5. Tested document-exchange service foundation: project checks, private storage interface, quarantine/scanning/available lifecycle, checksum, type/size checks, expiry/revocation/deletion and cleanup state. No actual storage/scanner adapter was fabricated. HTTP upload/read functionality remains disabled. PDF/plaintext/CSV are the supported validation types; DOCX/archives are deliberately not supported without appropriate inspection. This is not an operational upload service yet.
6. Accessible forms, keyboard/focus behavior, truthful unavailable/error states, no-store private routes, PWA private-route exclusion, structured error references without project text/credentials in logs, and existing catalogue/quantity/price/mobile fixes.

## Activation approvals and owner decisions

These are required before genuine end-to-end testing or publication; they have not been performed.

- **Runtime database identity:** approve a least-privileged application role/credential scoped to this Fullview database, and its Vercel secret binding. Use a separate approved migration connection. Do not use another project's database or role. Confirm any branch/compute costs before provisioning an isolated remote test branch.
- **Authentication:** approve the cookie-signing secret and Vercel binding, Fullview trusted origins, verified-email enforcement and production authentication email settings. Identify a registered, verified account ID for the first administrator. Do not infer staff privileges from the contact mailbox or an unverified address.
- **Email:** verify the veridanth.com sending domain with its authorized DNS provider and configure an appropriately scoped sender credential. Use only fvsignature@veridanth.com as the inquiry recipient and approved sender. Then send one clearly synthetic test only to this mailbox and inspect its provider receipt/delivery result; no customer test recipients.
- **Retention and recovery:** owner chooses inquiry/project retention review period (`FULLVIEW_RETENTION_DAYS`), document retention/size/types, backup/recovery expectations and deletion handling. Existing Neon history retention is six hours, with no scheduled snapshots observed; restore has not been tested. Expiry denies normal access; no automatic database deletion or legal retention policy is claimed. Deletion requests become a staff queue, not a false immediate-removal confirmation.
- **Document exchange:** approve a private bucket and scoped runtime binding, choose/verify a real scanning integration and cleanup process, and approve the policy before activating upload/read HTTP routes. No public URLs, public buckets or unscanned files are acceptable substitutes. Current code fails closed.
- **Commercial setup:** staff must enter actual quote terms and invoice due dates. No default legal/tax/deposit/cancellation policy is supplied. Payment provider, merchant setup, fees and checkout require their own decisions; all checkout controls remain disabled.

The earlier bundle pricing and scope approval remains unchanged. The browser PDF-save release condition has not been waived.

## Runtime settings (names only; no values or credentials created)

`FULLVIEW_APP_ORIGIN`, `FULLVIEW_OPERATIONS_ENABLED`, `FULLVIEW_DATABASE_URL`, `FULLVIEW_RETENTION_DAYS`, `FULLVIEW_AUTH_ENABLED`, `FULLVIEW_NEON_AUTH_BASE_URL`, `FULLVIEW_AUTH_COOKIE_SECRET`, `FULLVIEW_EMAIL_FROM`, `FULLVIEW_RESEND_API_KEY`.

No credentials belong in NEXT_PUBLIC variables, source control, browser localStorage or logs. FULLVIEW_EMAIL_FROM must equal the owner-approved mailbox. Enabling flags alone does not verify the providers or apply migrations.

## Migrations and verification

`migrations/operations/001-core.sql` through `005-invoices.sql` define the application schema. `npm run operations:migrate` only prints the plan and hashes and does not contact a database. `--apply --confirm-database=verighana` is a deliberate migration action that requires the approved connection and target; test on an isolated authorized branch before production. The runner checks the database name and applied hashes, locks migration execution and records each transaction. No auth schema is altered. Grant the runtime role only the necessary application-table privileges after review, never neon_auth administrative privileges.

`npm run verify:operations` applies the complete schema to in-memory PostgreSQL (PGlite) and uses synthetic records. It tests consent/idempotency, notification failure/recovery, wrong user/project/role, verified-session boundaries, immutable commercial terms, expiration, private-document rejection, deletion queues and disabled checkout. Auth/provider adapters are mocked in boundary tests; these do not prove real account recovery, email delivery, object storage or scanning.

`npm run verify:package-pdf` checks the public-only HTTP PDF endpoint. It receives only package/tier/add-on catalogue choices and bundled assets, with no private brief data. A public HTTP download does not prove the separate private Blob save path. The denied chrome://downloads route must never be retried indirectly or bypassed.

## Browser/public-PDF verification

The normal website HTTP package link was successfully downloaded by the supported browser tool. It returned the exact saved path `/Users/elkings/Downloads/Fullview-Signature-dissertation-quantitative-package (1).pdf`; only that returned file was read (no Downloads inventory or internal-browser page). The saved file is 151,064bytes, 2pages, titled Package estimate, contains GHS10,850 and the14-calendar-day revision scope, and contains no stale owner-approval wording. Copy: work/verification/public-http-package-download.pdf. Build trace includes all four font/logo assets. This closes the public-package output check only; private-brief Blob save remains unverified.

Desktop/mobile contact and account unavailable states were checked. Contact form cannot send without configured database/email/retention and offers the approved email/telephone. At390px the page/document widths match. No real contact or account form was submitted.

## Zoho receiving mailbox and sender choices

No connected Zoho tool, SMTP/API runtime configuration or repository sender integration was found. The existing mailbox remains the receiving destination; no mailbox migration or DNS change has occurred. Zoho Mail's published usage policy excludes automated/transactional email from ordinary mailbox sending and directs this traffic to its transactional service. Do not use an app password or mailbox-reading grant as a shortcut.

Two activation choices remain: a Zoho CPaaS/transactional email agent with a verified domain and agent-specific sending credential, or the existing connected Resend account with a sending key restricted to the verified veridanth.com domain. No credentials or provider settings were created. The local implementation currently supplies a dormant Resend adapter; choosing Zoho transactional sending requires its own tested adapter and retry semantics, not merely replacing a URL or token. Neither option requires replacing the current Zoho receiving MX. Any provider-generated DKIM/return-path records must be reviewed exactly before changing DNS.

Account-specific costs, existing Zoho transactional credits and Resend additional-domain/remaining-quota allowance are unknown. No free allowance or paid overage is assumed, and no purchase is authorized. Sources: https://www.zoho.com/mail/help/usage-policy.html ; https://www.zoho.com/cpaas/help/api/api-authentication.html ; https://www.zoho.com/cpaas/help/subscription.html ; https://resend.com/pricing .

## Retention and security review corrections

The independently reproduced 200-message window issue was fixed to show the newest200messages in display order. Expired projects remain listed only as minimal metadata, with an owner deletion-request action; their brief content stays unavailable. Administrators have an explicit retention-review queue. Permanent removal requires the exact record reference and an explicit retention-cleared confirmation, and refuses unreviewed active records, in-flight email or outstanding private-file cleanup. Related content is removed transactionally with a minimal non-content audit event. These controls were tested with synthetic local records; no real deletion was performed and no automatic retention schedule is claimed.

## Final local verification and release status

The final production build (`npm run build -- --webpack`) passed, including the retention API and UI. TypeScript, targeted ESLint, all six operations suites, package PDF validation (82 valid and 37 rejected configurations), the existing catalogue/bundle/estimate/desk/handoff/PWA checks, and whitespace checks passed. An independent bounded security review confirmed the message-window and expired-project deletion fixes and found no further activation-critical issue. This is local verification, not a production security certification.

Normal browser checks covered desktop project/staff unavailable states and the mobile contact page. Protected content stayed unavailable without configured authentication, and the approved email and telephone remained visible. HTTP checks confirmed no-store responses, disabled legacy brief submission, rejected private data on the public PDF endpoint, and rejection of old identity-header impersonation. No real inquiry, account, quote acceptance, invoice, payment or private document was submitted during browser testing.

The latest production deployment was rechecked after the build: it remains READY at `dcdad9722c385f478745a758063a33db01ea7de7` (`dpl_BNCUvqFBkQw32LRfsUFqjDgYK2AG`). No push, merge or deployment occurred. Real provider tests, remote migration/restore tests and the private-brief PDF save confirmation remain pending.

The smallest next setup sequence is: (1) choose the transactional sender and confirm account cost/limits; (2) approve a database application role, protected Vercel bindings, auth signing secret, trusted Fullview origins and verified-email settings; (3) test the schema on an approved isolated database branch and bind the verified first administrator; (4) verify sign-in/recovery, owner/staff separation and one synthetic office notification; (5) separately approve private storage, scanning, retention and recovery before enabling uploads. The parent conversation has already asked for the first administrator and retention policy; do not infer either from the contact address. Each credential/permission or DNS action needs its concrete action-time approval. Do not put secrets in chat or enable paid overages.
