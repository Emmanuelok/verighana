# Fullview operational platform — activation record

## Current status, 31 October 2026

Activation work is proceeding on `codex/fullview-activation-validation`. The owner has approved the scoped database rehearsal, five production application migrations, a restricted runtime credential, protected Vercel bindings, Resend sending for fvsignature.com with its required DNS and a restricted key, and synthetic tests addressed to hello@fvsignature.com. Approval to perform a step is distinct from evidence that it has completed.

| Area | Verified state | Still pending |
| --- | --- | --- |
| Isolated database rehearsal | Branch `br-plain-king-ba2eycp9`; all five migration hashes applied; finite application grants tested through `fullview_runtime`; 19 restricted operations returned SQLSTATE `42501`; synthetic fixtures passed and rolled back. | Actual runtime login/TLS remains untested. |
| Production database | Seven transactions completed on `br-round-bird-bariynrh`: restricted `NOLOGIN` role, five migrations and finite grants. All 13 postflight checks passed across 12 tables; table/column/ledger mismatch arrays and the schema comparison against rehearsal were empty. No synthetic writes or managed-auth data reads occurred. | Restricted runtime credential, actual login/TLS verification and protected binding. The role remains `NOLOGIN`. |
| Production Vercel configuration | One protected auth cookie secret and seven plain settings exist. Authentication and operations flags are both `false`. | Database URL, Resend key and the owner-selected retention period are not bound. No activation deployment is established by these settings alone. |
| Receiving email | Zoho ownership, MX, SPF and DKIM verified; hello@fvsignature.com exists as an alias of hello@veridanth.com. | End-to-end message receipt has not yet been established. |
| Transactional email | Resend domain `ee329238-537b-4151-9a93-826fc1da9e46` is verified in `eu-west-1`, with sending enabled and receiving disabled. Four DNS records were added while all 11 existing records were preserved. Tracking is off and TLS is enforced. | Restricted key creation is awaiting action-time approval; its form is prepared. No application email key is bound and no synthetic send has been reported complete. |
| Authentication | Canonical origin and required email verification are configured. Application validation mode is implemented and tested locally. | Real signup, verification, recovery and separation checks; production sender/readiness settings. The provider still uses its shared SMTP sender and `allow_localhost` is `true`. |
| Owner decisions | Existing bundle prices/scopes and the official contact address remain approved. | First administrator's verified identity, retention period and a second owner-controlled test mailbox. |
| Documents and payments | Access controls and data models exist. | Storage/scanner activation and checkout remain disabled. |

This record supersedes the earlier empty-environment, pre-Resend and old deployment snapshots. It does not identify an old commit or deployment as the current live version. A public release may keep unfinished integrations gated; it must not represent them as active or tested.

## Targets and configuration

- Website: https://fvsignature.com; Vercel project `verighana`, ID `prj_4YHGkUBOq3SuKOR205qjPdLjbXKX`, team `team_G8Fwt1G5TCufG58zqu18buXA`.
- Neon project: `empty-breeze-85983737`; production branch `br-round-bird-bariynrh`; database `verighana`; region `aws-eu-central-1`; PostgreSQL 18.
- Existing managed auth endpoint: https://ep-tiny-night-bahe2uz5.neonauth.c-8.eu-central-1.aws.neon.tech/verighana/auth .
- Official contact, office notification recipient and intended application sender: hello@fvsignature.com. The contact alias does not itself configure transactional or authentication email.

The following settings are present in Vercel **Production**. Secret contents are deliberately omitted.

| Setting | Recorded configuration |
| --- | --- |
| `FULLVIEW_AUTH_COOKIE_SECRET` | Protected secret, securely created without printing its value. |
| `FULLVIEW_APP_ORIGIN` | `https://fvsignature.com` |
| `FULLVIEW_NEON_AUTH_BASE_URL` | Existing managed auth endpoint above. |
| `FULLVIEW_AUTH_MODE` | `validation` |
| `FULLVIEW_AUTH_TEST_EMAIL` | `hello@fvsignature.com` |
| `FULLVIEW_AUTH_ENABLED` | `false` |
| `FULLVIEW_OPERATIONS_ENABLED` | `false` |
| `FULLVIEW_EMAIL_FROM` | `hello@fvsignature.com` |

`FULLVIEW_DATABASE_URL`, `FULLVIEW_RESEND_API_KEY` and `FULLVIEW_RETENTION_DAYS` are not yet configured. Do not invent a retention value to make availability checks pass. Credentials belong in protected server-side configuration, never `NEXT_PUBLIC` variables, source control, browser storage, logs or this document. Flags alone neither apply migrations nor verify a provider. The application uses one canonical origin; a www route must redirect before forms/auth or receive an explicitly reviewed origin change.

## Database execution and minimum runtime access

The approved isolated rehearsal uses branch `br-plain-king-ba2eycp9`, compute minimum/maximum `0.25/0.25`, and the provider's default timeout. A requested timeout of 300 was rejected on the Free plan; no paid compute upgrade is recorded.

All five files from `migrations/operations/001-core.sql` through `005-invoices.sql` were applied with their hashes on that branch; all 12 application/ledger tables are in `public`. The SQL-created `fullview_runtime` role is `NOLOGIN`; it is a privilege-test role, not a usable application credential. Finite grants passed positive synthetic fixtures and 19 negative remote checks with SQLSTATE `42501`. Fixture writes were rolled back, no managed-auth data was read and no external request was made. A real runtime login/TLS connection was not tested. Evidence: `work/verification/fullview-activation-progress-2026-10-31.json`. These results establish the tested grant boundary on the rehearsal branch, not production readiness or backup restoration.

A separate API-created rehearsal role named `fullview_app` is unused. The provider reports `authentication_method=no_login` with no password, while SQL inspection shows administrative role flags. An attempted hardening `ALTER` failed and was rolled back. Do not bind or treat this role as the restricted runtime credential. It remains unbound; no cleanup is recorded.

Production subsequently completed all seven approved transactions: creation of `fullview_runtime` with `NOLOGIN` and negative administrative attributes, the five migration/hash pairs, and the finite grants. Read-only postflight passed all 13 checks with 12 tables and empty table, column and ledger mismatch arrays. The provider's production-to-rehearsal schema comparison returned an empty diff. Production verification made zero synthetic writes and read no managed-auth data. It did not initialize or test a runtime login, retrieve a runtime credential, or enable an application flag.

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

The production execution used a separate approved administrative identity. `npm run operations:migrate` prints the plan and hashes without contacting a database; `--apply --confirm-database=verighana` performs migrations against the explicitly selected connection. The runner checks the database name and applied hashes, locks execution and records each migration transaction. It does not alter the auth schema. The completed production schema/grant verification does not establish application login, client authorization or backup restoration.

## Authentication validation and owner identities

The provider now trusts both the existing https://verighana.vercel.app origin and https://fvsignature.com. Read-back confirms `require_email_verification=true`, method `otp`, and the UI's Verify at Sign-up setting. The separate `verify_email_on_sign_up` and `verify_email_on_sign_in` fields were last observed as false; this record does not claim they changed. Evidence: `work/verification/fullview-auth-verification-enabled.png`.

The application requires an explicit `FULLVIEW_AUTH_MODE` of `validation` or `public`; missing or invalid mode fails closed. Validation mode also requires a valid `FULLVIEW_AUTH_TEST_EMAIL`. It limits application signup/sign-in/OTP actions and restored-session access to the normalized configured address, currently hello@fvsignature.com. Email-bearing POST actions for other addresses are rejected before provider calls. Restored sessions are checked with the provider, bypassing the cookie cache, then disallowed identities are masked rather than forwarded. Token-only link recovery routes are unavailable in validation mode; sign-out remains available. Same-origin checks and bounded request bodies remain enforced. This is an application boundary, not a claim that the underlying provider itself has the same address allow-list.

Runtime auth is currently disabled. The provider's shared `auth@mail.myneon.app` SMTP sender remains suitable for the approved bounded validation tests; Neon production-launch guidance calls for custom SMTP and disabling localhost. Neither production setting has been changed, and `allow_localhost` remains `true`. Before public mode, complete real verification/recovery and owner-controlled access-separation tests as well as those readiness settings. The office Resend adapter does not configure authentication mail. A second controlled mailbox is still needed for the two-client test; do not infer ownership of another address or send to it without authorization.

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

All ten current `verify:operations` suites passed in this activation phase, including the new validation-mode suite. Local fixtures cover consent/idempotency, notification recovery, verified sessions and wrong-user/project/role boundaries, immutable commercial terms, expiration, document rejection, retention queues, message history, saved-price truthfulness and disabled checkout. Auth and email adapters are mocked in these suites. The remote rehearsal and production postflight established the separate database checks above. These results do not prove live email, account recovery, runtime login, storage, scanning or restore behavior.

The current production build passed. Independent review of the validation gate and its boundaries found no code blocker; this is a bounded code review, not a production security certification or completed live-provider test. Earlier implementation checks also passed TypeScript, targeted ESLint, catalogue/bundle/estimate/desk/handoff/PWA checks and whitespace validation. Those earlier results should not be substituted for verification of a later change.

The public HTTP package PDF was downloaded through the supported browser tool to its exact returned path. The saved file was 151,064 bytes, two pages, titled Package estimate, with GHS 10,850 and the 14-calendar-day revision scope. Evidence copy: `work/verification/public-http-package-download.pdf`. Package-PDF validation covered 82 valid and 37 rejected configurations. This proves the public package output only. The separate private-brief Blob save remains unverified; the denied `chrome://downloads` route must not be retried indirectly or bypassed.

Earlier desktop/mobile checks covered honest unavailable contact/account/project/staff states, no-store responses, disabled legacy brief submission, rejection of private data on the public PDF route and rejection of old identity-header impersonation. They did not submit real inquiries, accounts, accepted quotes, invoices, payments or private documents. The current authorized synthetic email/account tests still require their own recorded results.

Remaining activation work includes the restricted runtime credential, actual login/TLS verification and protected binding; the restricted email key/binding; the retention and administrator decisions; and authorized controlled tests. Keep public auth, inquiry/operations availability, uploads and checkout gated according to their independent prerequisites. Both production enablement flags remain `false`. No Resend key or email send is recorded. Record the resulting deployment and application checks when they occur; the completed schema checks and staged configuration do not establish live-feature completion.
