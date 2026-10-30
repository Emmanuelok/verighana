# Fullview Signature — by Veridanth

The complete website source imported from ChatGPT Sites, with the public frontend adapted to native Next.js on Vercel.

## Included

- Home, services, pricing, institutions, research insights, approach and research desk entry.
- 100 services and 100 distinct service photographs; nine client groups and Ghana cedi estimates.
- Original images, local fonts, video, styles, responsive layouts and downloadable estimates.
- Original Site source, images and server implementation, with the repository's initial commit preserved.

## Hosting

- Repository: https://github.com/Emmanuelok/verighana
- Vercel project: `verighana`, under `emmanueloks-projects`.
- Production branch: `main`.
- Build: `npm ci` then `npm run build`.
- Node.js: 22.x.

The public website runs on Vercel. ChatGPT sign-in and saved research briefs continue at https://veridanth-research-ghana.elkings.chatgpt.site/workspace with their existing access settings. The research desk entry explains the handoff. Selected services transfer through a validated URL fragment; personal data, account credentials and research text are never included. The Vercel API does not accept caller-supplied identity headers.

This is a frontend hosting migration, not a standalone authentication or database migration. Original server files are retained in `sites-runtime/`; the source Site revision is `23cc834317b9251d21fe8872f5a7f706fac32e34`. A standalone research desk requires a separately configured identity provider, database and migration of existing private records. Keep the original ChatGPT Sites project active while it hosts the research desk.

## Development

```sh
npm ci
npm run dev
```

The development server listens on port 5173.

```sh
npm run typecheck
npm run verify:catalogue
npm run verify:handoff
npm run build
```

No production secrets are required for the public frontend. Do not commit `.env` or `.vercel` files.
