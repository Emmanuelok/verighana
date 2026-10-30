# Fullview Signature — by Veridanth

The identity uses one original FV monogram: a sturdy F and a rising gold V that also suggests the finishing stroke of a signature. The wordmark pairs DM Sans with Libre Caslon Display. Aligned architectural frames express perspective in the social image.

## Masters and exports

- `public/brand/logo-dark.svg`: primary vector lockup for light backgrounds; lettering is outlined.
- `public/brand/logo-light.svg`: reversed vector lockup for dark backgrounds.
- PNG versions of both lockups support documents and social use.
- `public/brand/monogram.svg`: standalone symbol.
- `public/brand/og-master.svg` and `og-fullview-signature.png`: social card at 1200 × 630.
- `public/favicon.svg` and `favicon.ico`: browser icons.
- `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, and `apple-touch-icon.png`: home-screen icons.

Use the full endorsement “by Veridanth” with the primary wordmark. Keep clear space around the mark at least equal to the width of its vertical F stem. Use emerald `#073d35`, ivory `#fff9ec`, and gold `#e2bc73`. Do not stretch the logo or put it over a busy image without a clear, contrasting field.

The vector masters are original code-native artwork. Their lettering is drawn from the typefaces already used in this user-owned platform. The architectural background was generated with OpenAI ImageGen for this task on 2026-10-30; it is an illustrative brand image, not a photograph of company premises. No trademark clearance is asserted.

## PWA behaviour

The public Vercel site has a web app manifest, install guidance, versioned service worker, offline fallback and a generated 100-service catalogue. It caches public static assets and provides the offline catalogue when navigation cannot reach the network. Authentication, the research desk, APIs and private records are excluded. Estimates keep the existing browser-storage key so the rebrand does not erase them. The original authenticated Sites service carries the same branding without creating a second installable app.

Rebuild the identity with `python scripts/build-brand-assets.py` and `node scripts/render-brand-assets.mjs`; the Python step needs fontTools and the renderer uses Sharp. `npm run build` regenerates the offline catalogue and service-worker version automatically. Verify with `npm run verify:brand`.
