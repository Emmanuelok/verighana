# Platform audit — 30 October 2026

Baseline: `b12f31975654dea4236f82a436c580acb5935a88` in `Emmanuelok/verighana`, the production deployment observed when this local review began. This document records source findings; desktop/mobile acceptance is recorded separately. No publication, production pricing changes, external communications or paid integrations were performed by this audit.

## Existing capabilities to preserve

The baseline already includes the latest Fullview Signature by Veridanth Group identity, 100 specialist services, audience and category filters, search, sorting, pagination, GHS estimates, PDF estimates and briefs, mobile navigation, a PWA/offline catalogue, and an anonymous device-local research desk with draft recovery and input/storage error handling.

## Verified gaps at baseline

| Priority | Finding | Source | Recommended outcome |
| --- | --- | --- | --- |
| High | The conversion journey ends at a device-local brief, without a verified inquiry destination. | `components/workspace.tsx`; the page always passes `viewer={null}`. | Clear user-controlled copy/download/share handoff. Direct inquiry delivery needs an owner-verified destination and release approval; never imply that saving sends a brief. |
| High | Quantity controls accept fractions that PDF and brief validators reject. | `components/research-context.tsx` | Shared finite-integer validation for on-screen totals, storage, PDFs and briefs. |
| High | The detail dialog closes and opens the estimate even if adding a service fails. | `components/research-context.tsx` | Keep the dialog open on failure and explain pathway/selection limits. |
| Medium | Changing pathway silently removes incompatible services. | `components/research-context.tsx` | Explain changes and offer a reversible transition. |
| Medium | Estimate-storage failures are swallowed, so full-page navigation can lose selections. | `components/research-context.tsx` | Display a warning and preserve scope through a validated fragment handoff. |
| Medium | Saved briefs discard prices and recompute totals from the latest catalogue. | `lib/local-briefs.ts`, `lib/brief-pdf.ts` | Preserve dated price and scope snapshots; label legacy estimates as refreshed. |
| Medium | FAQ and installation copy still describe account submission or online-only saving. | `components/research-pages.tsx`, `components/pwa-experience.tsx` | Align wording with the actual public local-desk workflow. |
| Medium | Desk tabs lack arrow/Home/End key handling and roving focus. Form step changes do not move focus. | `components/workspace.tsx` | Accessible tab navigation and deliberate step/error focus. |

## Saved-estimate consistency implementation

New local briefs now contain a versioned GHS price snapshot with a timestamp, service identifiers, titles, units, unit prices, quantities and deliverables. The snapshot is created from the current catalogue after validation; caller-supplied prices are ignored. Reopening and exporting use the same snapshot. Retired services remain readable when a valid snapshot is present.

Legacy records remain unchanged and explicitly disclose that the estimate uses refreshed current catalogue rates. Saves and deletes do not silently stamp legacy records with new prices. Invalid or mismatched snapshots fail clearly without overwriting existing stored records. These remain indicative planning estimates, not confirmed quotes.

Run `node scripts/verify-brief-snapshot.mjs` for regression coverage of catalogue-price/scope changes, service retirement, legacy disclosure, snapshot preservation, malformed records, custom scopes and PDF generation. Existing desk checks remain in `scripts/verify-public-desk.mjs`.

## Release boundary

This branch is for local review and testing. Exact bundle prices, service delivery capacity and the release itself require owner review before publication. Telephone contact is now verified; direct electronic brief delivery still needs an authoritative destination and scope approval. Payments, direct inquiry delivery and other external integrations are outside this implementation.

## Superseding contact verification and reconciliation

Read-only production/source follow-up confirmed main `dcdad9722c385f478745a758063a33db01ea7de7`, following header commit `a640bca51e90c2ab0a3c72d72c9e6c42f6078430`. The isolated branch is rebased on this main, preserving both changes. Current footer publishes +233 20 940 9668 as a telephone link and 24 Nii Kodia Road, Adenta, GhanaPost GPS GM-052-8745. This supersedes the initial absence of a phone contact. It does not establish email, WhatsApp, booking or message submission.

The contact block was hidden on mobile/tablet by inherited `footer-principle` media rules. The isolated fix uses a dedicated responsive contact block. The desk handoff now links only to the verified telephone number and retains local notes/PDF preparation without sending anything.
