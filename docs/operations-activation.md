# Fullview operational platform — activation record

## Current status, 31 October 2026

The validation gate was merged through PR #4 at `224755910ea66a4ff8561328974f3d66daa3c42a` and deployed with authentication and operations disabled. The owner has approved the scoped database rehearsal, five production application migrations, a restricted runtime credential, protected Vercel bindings, Resend sending for fvsignature.com with its required DNS and a restricted key, and synthetic tests addressed to hello@fvsignature.com. Approval to perform a step is distinct from evidence that it has completed.

| Area | Verified state | Still pending |
| --- | --- | --- |
| Isolated database rehearsal | Branch `br-plain-king-ba2eycp9`; five migration hashes, finite grants, 19 SQLSTATE `42501` denials and rolled-back synthetic fixtures passed. Server-generated password initialization and actual pooled TLS/identity/ACL verification also passed. The role was returned to `NOLOGIN` and its held secret copy cleared. | No application is bound to the rehearsal credential; cleanup is not recorded. |
| Production database | Seven schema/role/grant transactions and all 13 postflight checks passed across 12 tables; mismatch arrays and the rehearsal schema comparison were empty. Credential initialization for role OID `24576`, post-initialization `NOLOGIN` checks, subsequent `LOGIN` enablement and actual pooled TLS/identity/ACL verification passed. Administrative attributes remain false. No synthetic writes or managed-auth data reads occurred during these checks. | Application-level use and end-to-end feature validation remain gated. |
| Production Vercel configuration | Protected auth cookie secret, protected Production-only `FULLVIEW_DATABASE_URL` and seven plain settings exist. Database binding metadata was verified. Authentication and operations flags are both `false`. | Resend key and the owner-selected retention period are not bound. Active application use of the database is not established by storing the binding. |
| Public deployment | `dpl_9N8wpfs9amN72JG4BpPuHLJ8aH4H` is READY at `2247559`; live-alias smoke verification passed all 13 GET checks. | Authentication, inquiry/operations activation and their real-user flows remain disabled or unavailable. |
| Receiving email | Zoho ownership, MX, SPF and DKIM verified; hello@fvsignature.com exists as an alias of hello@veridanth.com. | End-to-end message receipt has not yet been established. |
| Transactional email | Resend domain `ee329238-537b-4151-9a93-826fc1da9e46` is verified in `eu-west-1`, with sending enabled and receiving disabled. Four DNS records were added while all 11 existing records were preserved. Tracking is off and TLS is enforced. | Restricted key creation is awaiting action-time approval; its form is prepared. No application email key is bound and no synthetic send has been reported complete. |
| Authentication | Canonical origin and required email verification are configured; `allow_localhost=false` is verified. Provider application name is Fullview Signature. Application validation mode is implemented and tested locally. | Real signup, verification, recovery and separation checks; custom production SMTP. The provider still uses its shared sender. |
| Owner decisions | Existing bundle prices/scopes and the official contact address remain approved. | First administrator's verified identity, retention period and a second owner-controlled test mailbox. |
| Documents and payments | Access controls and data models exist. | Storage/scanner activation and checkout remain disabled. |

This record supersedes the earlier empty-environment, pre-Resend and untested-database-login snapshots. The verified public release keeps unfinished integrations gated; deployment does not establish those features as active or tested.

## Targets and configuration

- Website: https://fvsignature.com; Vercel project `verighana`, ID `prj_4YHGkUBOq3SuKOR205qjPdLjbXKX`, team `team_G8Fwt1G5TCufG58zqu18buXA`.
- Neon project: `empty-breeze-85983737`; production branch `br-round-bird-bariynrh`; database `verighana`; region `aws-eu-central-1`; PostgreSQL 18.
- Existing managed auth endpoint: https://ep-tiny-night-bahe2uz5.neonauth.c-8.eu-central-1.aws.neon.tech/verighana/auth .
- Official contact, office notification recipient and intended application sender: hello@fvsignature.com. The contact alias does not itself configure transactional or authentication email.

The following settings are present in Vercel **Production**. Secret contents are deliberately omitted.

| Setting | Recorded configuration |
| --- | --- |
| `FULLVIEW_AUTH_COOKIE_SECRET` | Protected secret, securely created without printing its value. |
| `FULLVIEW_DATABASE_URL` | Protected Production-only binding for the restricted pooled runtime connection; metadata ID `m7jEPrVsq3wyUAs1` verified. Value omitted. |
| `FULLVIEW_APP_ORIGIN` | `https://fvsignature.com` |
| `FULLVIEW_NEON_AUTH_BASE_URL` | Existing managed auth endpoint above. |
| `FULLVIEW_AUTH_MODE` | `validation` |
| `FULLVIEW_AUTH_TEST_EMAIL` | `hello@fvsignature.com` |
| `FULLVIEW_AUTH_ENABLED` | `false` |
| `FULLVIEW_OPERATIONS_ENABLED` | `false` |
| `FULLVIEW_EMAIL_FROM` | `hello@fvsignature.com` |

`FULLVIEW_RESEND_API_KEY` and `FULLVIEW_RETENTION_DAYS` are not yet configured. Do not invent a retention value to make availability checks pass. Credentials belong in protected server-side configuration, never `NEXT_PUBLIC` variables, source control, browser storage, logs or this document. Flags alone neither apply migrations nor verify a provider. The application uses one canonical origin; a www route must redirect before forms/auth or receive an explicitly reviewed origin change.

## Database execution and minimum runtime access

The approved isolated rehearsal uses branch `br-plain-king-ba2eycp9`, compute minimum/maximum `0.25/0.25`, and the provider's default timeout. A requested timeout of 300 was rejected on the Free plan; no paid compute upgrade is recorded.

All five files from `migrations/operations/001-core.sql` through `005-invoices.sql` were applied with their hashes on that branch; all 12 application/ledger tables are in `public`. The SQL-created `fullview_runtime` role began as `NOLOGIN`. Finite grants passed positive synthetic fixtures and 19 negative remote checks with SQLSTATE `42501`. Fixture writes were rolled back, no managed-auth data was read and no external request was made by that SQL rehearsal. Initial schema/grant evidence: `work/verification/fullview-activation-progress-2026-10-31.json`.

The later credential rehearsal successfully initialized a server-generated password and verified an actual pooled PostgreSQL login. Checks passed for an encrypted, authorized TLS connection, `current_user` and `session_user` matching the intended identity, read-only transaction settings, restricted role attributes and finite effective ACLs. The verifier used catalog reads inside `BEGIN READ ONLY` and ended with `ROLLBACK`; it wrote no synthetic data and read no application or managed-auth rows. The rehearsal role was then returned to `NOLOGIN`, and the temporary held secret copy was cleared. No public application uses that rehearsal credential.

A separate API-created rehearsal role named `fullview_app` is unused. The provider reports `authentication_method=no_login` with no password, while SQL inspection shows administrative role flags. An attempted hardening `ALTER` failed and was rolled back. Do not bind or treat this role as the restricted runtime credential. It remains unbound; no cleanup is recorded.

Production completed all seven approved transactions: creation of `fullview_runtime` with `NOLOGIN` and negative administrative attributes, the five migration/hash pairs, and the finite grants. Read-only postflight passed all 13 checks with 12 tables and empty table, column and ledger mismatch arrays. The provider's production-to-rehearsal schema comparison returned an empty diff.

Production role OID `24576` then received a server-generated password using the method verified on rehearsal. All 13 post-initialization checks passed while the role remained `NOLOGIN`. The restricted pooled connection was stored only in protected Vercel Production configuration, with binding metadata verified. `LOGIN` was subsequently enabled without enabling administrative attributes; actual pooled production TLS, identity and effective-ACL verification passed. The verifier made zero synthetic writes and read no application or managed-auth rows. Temporary held secret copies for both branches were cleared; the protected Production binding remains. Neither application enablement flag was changed. The local [runtime-login verifier handoff](../work/verification/fullview-runtime-login-check.md) describes the bounded read-only checks; their success does not establish client authorization, email delivery or recovery behavior.

The grant summary below is descriptive, not a broad table-level grant instruction. The exact column-scoped SQL is [Appendix A of the local runtime access manifest](../work/verification/fullview-minimum-activation.md#appendix-a--exact-proposed-runtime-grants), SHA-256 `2145f418d66f766e8d48d8ee373a1509b8ea695825618e02d4e0ac896b12809c`. All `INSERT` and `UPDATE` grants are limited to the named columns in that SQL; no future-object default grants are included.

| Object | Privilege summary |
| --- | --- |
| Database and application schema | `CONNECT` and schema `USAGE`; no schema `CREATE` or role management. |
| `fv_staff` | `SELECT` only on `user_id`, `role`, `active`. |
| `fv_audit` | Column-scoped `INSERT` only. |
| `fv_messages` | `SELECT`, column-scoped `INSERT`, `DELETE`; no `UPDATE`. |
| `fv_rate_limits` | `SELECT`, column-scoped `INSERT`, `UPDATE(count)`. |
| `fv_inquiries`, `fv_projects`, `fv_email_outbox`, `fv_quotes`, `fv_invoices`, `fv_deletion_requests` | `SELECT`, column-scoped `INSERT` and `UPDATE`, `DELETE`. |
| `fv_documents` | `SELECT`, `DELETE`, and only `UPDATE(rejection_code)` for the retention row-lock requirement. No insertion or document lifecycle update. |
| `fv_schema_migrations`, `neon_auth` administration | No runtime access. |

The production execution used a separate approved administrative identity. `npm run operations:migrate` prints the plan and hashes without contacting a database; `--apply --confirm-database=verighana` performs migrations against the explicitly selected connection. The runner checks the database name and applied hashes, locks execution and records each migration transaction. It does not alter the auth schema. Database login verification is separate from end-user account login, client authorization and backup restoration, which remain unverified live.

## Authentication validation and owner identities

The provider trusts both the existing https://verighana.vercel.app origin and https://fvsignature.com. The latest independent read-back confirms those same two origins, `require_email_verification=true` and `allow_localhost=false`; the UI's Allow Localhost control is off. The application name was updated to Fullview Signature and confirmed after a UI reload. Evidence: `work/verification/fullview-auth-production-origins.png`. Earlier verification established method `otp` and the UI's Verify at Sign-up setting in `work/verification/fullview-auth-verification-enabled.png`. The separate `verify_email_on_sign_up` and `verify_email_on_sign_in` fields were last observed as false; this record does not claim they changed.

The application requires an explicit `FULLVIEW_AUTH_MODE` of `validation` or `public`; missing or invalid mode fails closed. Validation mode also requires a valid `FULLVIEW_AUTH_TEST_EMAIL`. It limits application signup/sign-in/OTP actions and restored-session access to the normalized configured address, currently hello@fvsignature.com. Email-bearing POST actions for other addresses are rejected before provider calls. Restored sessions are checked with the provider, bypassing the cookie cache, then disallowed identities are masked rather than forwarded. Token-only link recovery routes are unavailable in validation mode; sign-out remains available. Same-origin checks and bounded request bodies remain enforced. This is an application boundary, not a claim that the underlying provider itself has the same address allow-list.

Runtime auth is currently disabled. The provider's shared `auth@mail.myneon.app` SMTP sender is unchanged and remains suitable for the approved bounded validation tests. Localhost is now disabled; custom SMTP remains the outstanding production sender setting. Before public mode, complete that sender setup and real verification/recovery and owner-controlled access-separation tests. The office Resend adapter does not configure authentication mail. A second controlled mailbox is still needed for the two-client test; do not infer ownership of another address or send to it without authorization.

The owner must identify the first administrator's registered, verified account. Staff authority is stored in server-side `fv_staff` records and is not inferred from the public contact address, an email string or the first signup. The application rejects unverified sessions for protected records and never trusts the legacy identity headers.

## Email setup and approval history

Zoho domain ownership, receiving MX, SPF and DKIM are verified. The original five website/DNS records were preserved when six Zoho records were added. The owner then selected adding Fullview Signature <hello@fvsignature.com> as an alias of the existing hello@veridanth.com mailbox; the alias row was visibly verified and the primary mailbox stayed unchanged. No separate mailbox or licence was required. See [Zoho DNS audit](zoho-mail-setup.md), `work/verification/fullview-zoho-dns-verified.png` and `work/verification/fullview-zoho-alias-created.png`.

The earlier instruction to keep Resend unchanged applied to the earlier phase. It is superseded for the explicitly approved fvsignature.com sending setup by the latest authorization. The verified Resend domain now exists in `eu-west-1`, sending only, with tracking off and TLS enforced. Four required DNS records were added without changing any of the 11 existing records, including Zoho receiving records. No unrelated domain, mailbox-reading access, paid overage or plan upgrade is part of this activation.

The restricted sending-key form is prepared, but key creation and protected runtime binding are not yet complete. Handle its value through the approved protected path without exposing it in chat or logs. A domain-scoped key still needs the application's independent fixed office-recipient check. Synthetic email tests to hello@fvsignature.com are authorized; authorization alone is not a send, provider acceptance or evidence of inbox delivery.

Historical veridanth.com Resend records and their ownership mismatch no longer block the chosen fvsignature.com setup. No claim, migration or rotation of that other domain is needed. The old fvsignature@veridanth.com address is superseded as the Fullview contact.

## Implemented application behavior

1. The public contact form uses explicit unchecked consent, strict validation, honeypot/time checks, durable rate counters, deduplicated references and an office-only outbox. Inquiry receipt, provider acceptance and inbox delivery are distinct states. No automatic visitor acknowledgment is sent.
2. Staff intake supports assignment, stages, notification review and a deletion-review queue. Notification recovery retains the original provider idempotency key, a three-attempt limit and a 23-hour window. Transactions protect active sends and reconcile abandoned leases without silently sending during retention removal.
3. Managed accounts provide client-owned projects and messages. Sharing a local brief requires Review online submission, consent and Submit; signing in or saving locally does not upload it. Initial submission stores a dated server price snapshot. The dashboard displays that saved pathway, service quantities, units, rates, deliverables, package details and pricing date without repricing from the current catalogue. Missing or inconsistent snapshots are explicitly qualified.
4. Quotes have immutable versions and explicit owner-entered scope, revision, timeline, tax, deposit and cancellation terms. Acceptance requires the actual client-owner and rejects stale/superseded versions. Invoice records derive from accepted quotes with a specified due date. Checkout remains disabled; no payment or paid-state claim is made.
5. The document foundation checks project access and models private storage, quarantine/scanning/availability, checksums, type/size limits, expiry, revocation and cleanup. PDF/plaintext/CSV validation exists; DOCX/archives require further inspection support. No actual storage/scanner adapter is configured, and upload/read HTTP functionality stays disabled. The local [storage-options report](../work/verification/fullview-storage-options.md) informs the outstanding choice; it does not activate storage or establish a free production scanner.
6. Private routes use no-store responses and are excluded from PWA caching. Forms provide accessible labels/focus and honest unavailable/error states. Logs use references rather than private project text or credentials. Existing catalogue, bundle, quantity and mobile behavior is preserved.

Project messages are saved in the workspace and do not send email or import external mailbox history. The newest message window has a validated project-bound cursor and a Load earlier messages control; retained history is deduplicated across refreshes without silently skipping gaps.

## Retention, documents and commercial gates

The retention period remains an owner decision. Expiry restricts normal content access; it does not promise automatic deletion. Expired projects expose only minimal metadata and an owner deletion-request action. Administrators review removal using the exact reference and explicit retention clearance. Removal refuses unreviewed active records, active email sends and outstanding file cleanup; content deletion is transactional with a minimal non-content audit event. No real customer deletion or automatic purge schedule is claimed.

The earlier infrastructure audit observed six hours of Neon history retention and no scheduled snapshots; restoration has not been tested. Confirm recovery expectations before representing a recovery process as proven. Private storage, scanner integration, cleanup and document policy remain required before uploads can be enabled. Actual commercial terms and invoice due dates must be entered; no legal/tax/deposit/cancellation policy or payment-provider setup is invented.

## Verification evidence and remaining checks

All ten current `verify:operations` suites passed in this activation phase, including the new validation-mode suite. Local fixtures cover consent/idempotency, notification recovery, verified sessions and wrong-user/project/role boundaries, immutable commercial terms, expiration, document rejection, retention queues, message history, saved-price truthfulness and disabled checkout. Auth and email adapters are mocked in these suites. The remote rehearsal, production postflight and actual pooled login verifier established the separate database checks above. These results do not prove live email, end-user account recovery, storage, scanning or restore behavior.

The current production build passed. Independent review of the validation gate and its boundaries found no code blocker; this is a bounded code review, not a production security certification or completed live-provider test. Earlier implementation checks also passed TypeScript, targeted ESLint, catalogue/bundle/estimate/desk/handoff/PWA checks and whitespace validation. Those earlier results should not be substituted for verification of a later change.

PR #4 merged at `224755910ea66a4ff8561328974f3d66daa3c42a`. Deployment `dpl_9N8wpfs9amN72JG4BpPuHLJ8aH4H` is READY on the live aliases. All 13 GET-only production smoke checks passed without credentials or cookies, including approved bundle prices, contact links and gated account/operations responses. Evidence: `work/verification/fullview-production-smoke.json`. No form submission, account creation or email send is established by these read-only checks.

The public HTTP package PDF was downloaded through the supported browser tool to its exact returned path. The saved file was 151,064 bytes, two pages, titled Package estimate, with GHS 10,850 and the 14-calendar-day revision scope. Evidence copy: `work/verification/public-http-package-download.pdf`. Package-PDF validation covered 82 valid and 37 rejected configurations. This proves the public package output only. The separate private-brief Blob save remains unverified; the denied `chrome://downloads` route must not be retried indirectly or bypassed.

Earlier desktop/mobile checks covered honest unavailable contact/account/project/staff states, no-store responses, disabled legacy brief submission, rejection of private data on the public PDF route and rejection of old identity-header impersonation. They did not submit real inquiries, accounts, accepted quotes, invoices, payments or private documents. The current authorized synthetic email/account tests still require their own recorded results.

Remaining activation work includes the restricted email key/binding, retention and administrator decisions, a second controlled test mailbox, authentication readiness settings and authorized application-level tests. Keep public auth, inquiry/operations availability, uploads and checkout gated according to their independent prerequisites. Both production enablement flags remain `false`; no administrator or retention value has been configured. No Resend key or email send is recorded. The live public release and verified database connection do not establish the gated workflows as active.
