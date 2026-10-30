# Fullview Zoho Mail public DNS audit

Verified 30 October 2026 following the user's explicit direction to set up Zoho for `fvsignature.com`. The official application contact is `hello@fvsignature.com`.

## Completed domain and DNS setup

Setup used the existing authenticated Zoho account and the authorized Vercel DNS service. Zoho accepted domain ownership, the domain list shows **Completed**, and the DNS verification modal shows green checks for all MX, SPF and DKIM records. Independent authoritative DNS queries confirmed the exact published values. Evidence: `work/verification/fullview-zoho-dns-verified.png`.

The Vercel record count increased from **5 to 11**. The original apex ALIAS, wildcard ALIAS and three CAA records were preserved: the before/after comparison confirmed their exact IDs and values were unchanged. No existing website record was replaced. The earlier empty MX/TXT answers describe the pre-setup state.

All six added records have TTL **300 seconds**. `@` means the apex `fvsignature.com`.

| Name | Type | Priority | Public value |
|---|---|---|---|
| `@` | TXT | — | `zoho-verification=zb01087056.zmverify.zohocloud.ca` |
| `@` | MX | 10 | `mx.zohocloud.ca` |
| `@` | MX | 20 | `mx2.zohocloud.ca` |
| `@` | MX | 50 | `mx3.zohocloud.ca` |
| `@` | TXT | — | `v=spf1 include:zohocloud.ca ~all` |
| `zmail._domainkey` | TXT | — | Exact public DKIM value below |

The DKIM TXT record is a public verification key, not a private key or runtime credential:

```text
v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDAhAYTovl091ub8s0T6jhWDOtqaqv0770n4DMWnBfz5uoXuvBeQprTZ7rtk9NeKwz8hD7SsqJWIwTBnYax/WGfxiOc14scSRswtmytZ4po9aI9hVots8Hvng/rMPPpgviSNfh7EijjmOHx6lpdp0ZjgxD4+oCYobVIOw6VmNjGsQIDAQAB
```

## Approved alias created and verified

The owner answered **"Add hello@fvsignature.com as an alias of the existing mailbox"** in input panel `call_8299c233bd5e44758e484218733b8fce`, item 0. The alias **Fullview Signature <hello@fvsignature.com>** was added to the existing `hello@veridanth.com` mailbox in Zoho. The alias row was visually verified, and the primary mailbox is unchanged. Evidence: `work/verification/fullview-zoho-alias-created.png`.

No separate mailbox, licence or credential was created. No test message was created or sent. Alias provisioning and DNS verification are complete, but actual receiving/sending delivery has not been tested. Any delivery test remains a separate authorized step.

## Application and sender boundaries

The user instruction **Keep Resend unchanged** remains in force. No Resend domain, key, setting or DNS record was added or changed. The Resend list still contains four unrelated domains and no `fvsignature.com`. The application's Resend adapter remains disabled. Zoho receiving-domain verification does not configure the application's transactional sender.

The old `veridanth.com` sender/DNS conflict is historical and superseded by the new Fullview address. No ownership claim, migration or DNS change on that domain is needed for this setup.

The existing Neon Auth canonical origin and required verification have already been applied and verified, as recorded in [operations-activation.md](operations-activation.md). The consolidated application-only database credential/schema/auth-cookie/Vercel approval, first administrator and retention decisions remain pending. A safe public release may proceed with inactive features gated; all integrations do not need to activate together. The private-brief browser PDF-save check remains unverified and has not been waived or marked passed. Completed DNS/alias setup does not change that result or activate the unfinished application features.
