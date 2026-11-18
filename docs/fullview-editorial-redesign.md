# Fullview Signature — A fuller view

## Creative brief
Rebuild the public platform and operational pages as a distinctive research studio: cinematic, vibrant, welcoming and legible. The primary journey is to discover relevant expertise, understand its scope and cost, and prepare a brief.

## Direction
The selected direction pairs editorial serif typography and generous photographic compositions with deep evergreen, warm ivory, acid lime and orange. It carries the existing Fullview emblem, wordmark, local fonts, illustrative service imagery and film forward. The alternatives considered were a conventional academic journal (too restrained for this brief) and a technology dashboard (poor fit for research services).

The visual sequence moves from an immersive film through an interactive audience selector, expertise index, integrity statement, process accordion and journal. Inner pages receive distinct compositions within the same design system. Avoid repetitive rounded cards, decorative dashboards and unsupported performance claims.

## Implementation map
- `components/home-editorial.tsx`: film, audience tabs, expertise, process and journal.
- `app/signature.css`: shared tokens, navigation, homepage, footer, responsive rules.
- `app/research-editorial.css`: services, packages, pricing, institutions, approach and insights.
- `app/desk-editorial.css`: account, contact, research desk, project/staff workspace and recovery states.
- `public/offline.css`: offline catalogue visual alignment.

The legacy CSS remains for workflow structures. New page-specific classes isolate the redesigned compositions; explicit header resets remove the former two-row navigation.

## Functional continuity
Service IDs, rates, scope, bundle math, downloads, auth gates, inquiry readiness and project permissions remain unchanged. Device-local drafts still require a separate explicit action to submit. Media remain labelled illustrative. No new customer, staff, outcome or affiliation claims were added.

## Quality evidence
Passed catalogue, bundle, estimate, package PDF, account, desk, operations, contact readiness and PWA verification. Production compilation and TypeScript checks completed. Browser review covers desktop and 360/390/1024-pixel framed viewports, navigation, tabs, service search, estimate drawer, package comparison and process controls. A mobile overflow and inherited header collision were found and corrected. Escape now returns menu focus to its visible trigger.

Real authenticated project mutations and external inquiry submission were not performed during visual QA. Their existing synthetic regression suites were used instead.
