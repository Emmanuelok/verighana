# Fullview Signature — by Avalon Group

The Perspective identity pairs a compact one-line wordmark with an original FV ligature. “Fullview” is upright and “Signature” italic. A small, left-aligned endorsement avoids the former three-level stack. The header and footer use the wordmark; the complete lockup and standalone emblem are available for other applications.

## Masters

- `public/brand/wordmark-dark.svg` and `wordmark-light.svg`: compact wordmarks.
- `public/brand/logo-dark.svg` and `logo-light.svg`: full lockups with the FV symbol.
- `public/brand/monogram.svg`: standalone symbol.
- `public/brand/og-master.svg`: editable 1200 × 630 social card with outlined typography.
- `public/brand/og-fullview-signature.png`: social export.
- `public/favicon.svg`, `favicon.ico`, Apple and PWA icons: responsive icon family.

The lettering is outlined from Instrument Serif and DM Sans, supplied under the SIL Open Font License. Keep the endorsement subordinate; do not re-stack the brand name, stretch the artwork, or add a box behind the standalone symbol. Use green on light backgrounds, ivory on dark backgrounds, and retain clear space of at least one capital-F stem on all sides.

The original OpenAI ImageGen photograph is a conceptual editorial illustration of clarity and perspective, not a photograph of company premises. Its source is retained unchanged in `public/brand/perspective-v4-photograph.png`. The vector social card composes original typography over that background. Generation prompts, rationale and deliverables are recorded in `perspective-v4.json`.

Rebuild with `python scripts/build-brand-assets.py` and `node scripts/render-brand-assets.mjs`. The Vercel build regenerates the offline shell cache version. Existing catalogue, estimates, authentication and private-route cache exclusions remain intact.
