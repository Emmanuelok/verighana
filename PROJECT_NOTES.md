# Veridanth Research Ghana

An original editorial research service platform, with seven main pages, 100 scoped services, 13 research pathways, nine client groups, indicative GHS rates, a project estimator, research resources and a persistent signed-in research desk.

## Product behaviour

- `/`: editorial homepage with audience pathways and a service finder.
- `/services`: photographic, searchable, filterable and sortable catalogue with a dedicated realistic image for each of 100 services; scope and deliverable dialogs.
- `/pricing`: level-specific rate guide and downloadable text rate sheet.
- `/institutions`: business, government, public and private institutional research pathways.
- `/approach`: methodology and integrity standards.
- `/insights`: four original practical articles and an interactive readiness checklist.
- `/workspace`: Sign in with ChatGPT, create and review a brief, download receipts, retrieve and delete your own saved briefs.
- `/api/briefs`: authenticated list, create and owner-scoped deletion. Prices are calculated on the server. Validation covers service eligibility, quantities, dates and scope fields.

Estimate selections are browser-local preferences. Submitted briefs are stored in the Site's D1 database and scoped to the authenticated account. The hosted Site starts owner-private. No payment processing, email notification, consultation scheduling or staff assignment integration has been configured. The interface explicitly distinguishes saved briefs from confirmed engagements. No invented staff, university affiliations, customers, testimonials or performance claims are included.

## Proposed prices

All catalogue rates, turnaround ranges and academic-level factors are authored launch proposals, rather than an approved business tariff or verified market averages. Approve these, staffing and engagement terms before opening to real clients. Prices define their starting units and exclude applicable taxes and external costs unless expressly included.

## Verification

TypeScript check and Sites production build passed. Browser checks cover desktop/mobile presentation, navigation, catalogue search, academic rate changes, quantity totals, signing in locally, multi-step brief submission and persistence after reload. The production Worker was tested locally with `node scripts/verify-api.mjs`: missing identity, invalid inputs, impossible dates, missing consent, incompatible services and cross-origin writes are rejected; server prices, saved retrieval, account isolation and deletion passed. The script uses synthetic local data and cleans its own API record.

## Original visual asset

- Final image: `public/courtyard.jpg`.
- Created with the built-in image generation tool; converted to a web-sized JPEG for delivery.
- The image is an illustrative Ghana-inspired academic scene, not a claimed photograph of a real Veridanth office or university affiliation.
- Prompt: “Use case: photorealistic-natural. Asset type: premium university research website hero photograph. Create a highly refined editorial architectural photograph inspired by a scholarly courtyard in Ghana, West Africa. Tall elegant cream sandstone colonnades with a repeating rhythmic sequence of arches on the right, warm terracotta walkway, tropical palms and a mature spreading rain tree in a lush central courtyard on the left, a few small Ghanaian postgraduate students walking with notebooks in the mid-distance. Quiet, intellectual, authentic contemporary African academic atmosphere. Late afternoon slanting warm sunlight, deep natural green foliage, cream warm white architecture, beautiful sophisticated architectural magazine photography. Portrait-ish landscape 4:3 framing, shot from a shaded colonnade looking into the courtyard, straight architectural lines, rich depth and natural texture. No text, no lettering, no signs, no logos, no watermark, no superimposed interface. This is an illustrative scene, do not reproduce a specific real university building.”

Typography is self-hosted DM Sans and Libre Caslon Display. The Veridanth monogram is an original vector asset.

## Cinematic redesign — 30 October 2026

Rebuilt the homepage and shared presentation system with a full-width cinematic motion hero, large sans-serif headlines, warm gold accents, deep forest greens, editorial audience pathways and clearer typography across the seven pages. Preserved the service catalogue, indicative prices, estimate persistence, authentication, D1 binding and owner-scoped briefs API.

The silent 8.04-second, three-scene hero film is an original Higgsfield Kling v3.0 standard generation (job `d4eb3114-052c-4eee-a4e1-b3be2893fe37`, 12 credits). It depicts illustrative Ghana-inspired coastal, research and landscape scenes. The film and extracted stills do not document actual Veridanth staff, offices or partnerships. The footer and film dialog disclose their illustrative origin. The film is served as a local 1280×720 H.264 MP4, optimized to about 1.99 MB with fast-start metadata. Includes a poster fallback, pause/play controls, a larger film viewer and reduced-motion behaviour.

Design decisions, provenance and verification status are recorded in `design/production-manifest.json`, `design/brand-system.json` and `design/design-tokens.json`. An editable, code-composed social card is included in `design/social-card.svg` with a 1200×630 JPEG for Open Graph metadata.

Validation: TypeScript and production build passed. Semantic structure, keyboard-operated service tabs, native modal focus management and four declared contrast pairs were checked. Local managed browser preview reported a running server but refused connections, including after a supported stop/start; interactive visual QA is pending an accessible deployed page. No full accessibility conformance claim is made.

## Service catalogue expansion and people-free imagery — 30 October 2026

Expanded the catalogue from 47 to 100 scoped services. Nine client groups distinguish students, academics, government, public institutions, private institutions, schools, universities, businesses and NGOs/development organisations. Thirteen expertise areas provide a second layer of filtering. Government-only and public-institution-specific offerings are separately eligible; shared foundational services remain available to relevant groups. The API, estimates, rate guide and brief form use one shared 13-pathway audience definition. All newly authored prices remain proposed launch rates requiring a written engagement and availability confirmation.

Every service now has a relevant image from a 25-image family of original, realistic, people-free research settings. Following the user's explicit preference, all service cards and details use unoccupied workspaces, books, documents, analytical displays, classrooms, architecture, landscapes and equipment. No people, hands, silhouettes, reflected faces or portraits are included in selected service imagery. The people-containing exploratory versions were superseded before publication. Related services share thematic photographs. Generation prompts, selected source paths, dimensions and checksums are recorded in the service-photo JSON files in `design/`.

Readability changes set ordinary copy to 17px, form inputs to at least 16px, and functional labels to at least 14px. The brand subline is 12px. The new layout includes large photo cards, readable service detail dialogs, clear client filters, expertise filters, search, sorting and 12-item pagination. Mobile client groups collapse behind an explicit browse control and service cards become a single column.

Checks: TypeScript, production build and `scripts/verify-catalogue.mjs` passed. All 100 services have unique identifiers, valid audiences and categories, clear scopes, positive proposed prices and valid photo files. Existing PhD quantitative pricing remains GHS 5,040 for two units. Browser checks covered desktop and 390px mobile layouts, readable font sizes, school-specific filtering, service dialogs and a school curriculum estimate (two units at GHS 7,500 total GHS 15,000). The complete 25-photo contact sheet was reviewed for the no-people requirement. Existing account-scoped database permissions are unchanged.


## Original artwork gallery — 30 October 2026

Replaced the shared service photography with 100 separately generated, people-free conceptual artworks. Every service has one unique path and image file, enforced by catalogue and artwork checks; no thematic fallback remains. The gallery hero has a further exclusive image. Original generation prompts, source paths, alt text and checksums are in `design/artwork-register.json`. Files are 1200×800 WebP, delivered under `public/services/artworks/`.

The services page now uses a vivid sculptural introduction, compact sector filters and large editorial artwork cards. Mobile places the hero artwork first, collapses the client filters, and retains 17px body copy. Tablet switches to horizontal expertise filters. Search, sorting, pagination, service details and estimates retain their existing behaviour and prices. The homepage film remains in place.

Verification: 100 unique artwork URLs, source generation files and byte hashes; all 100 images decode at 1200×800. Every image was reviewed, including the final two replacement concepts. Desktop, 390px mobile and 768px tablet presentation and service filtering were checked. Production build and publication are handled by the Sites source workflow.


## Realistic service photography — 30 October 2026

The current image direction uses service-specific editorial photographic illustrations of practical research materials, equipment and settings. Every service has its own separately generated photo; the hero uses a further dedicated research-library scene. People, hands, portraits, silhouettes, human reflections, abstract sculptures and fantasy objects are excluded.

The service catalogue, client categories, pricing and interactions are retained. Selected files live under `public/services/photography/`; current prompts and sources are assembled into `design/photography-register.json`. The previous conceptual-art direction is archived in `design/archive/v4/`, and its public image files are removed from the current website.

Verification is performed with `scripts/verify-service-photos.py`, `scripts/verify-catalogue.mjs`, the TypeScript check, browser review and production build. A narrow 320px viewport was checked for reflow and a client-heading overflow was corrected.
