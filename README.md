# ActAI Compliance

Static blog for actaicompliance.com. No dependencies.

- Articles live in `content/posts/*.md`, standalone pages in `content/pages/*.md`.
- Build: `node build.js` (output goes to `dist/`).
- Deploys automatically: every push to `main` is built and published by Cloudflare (build command `npm run build`, deploy command `npx wrangler deploy`).
- Cloudflare's GitHub app must stay installed on this repository for auto-deploys to work.

Every article needs front matter: title, slug, region, date, updated, description, and `eu: true` if the Attestly callout should show.
