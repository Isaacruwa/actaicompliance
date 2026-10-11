# ActAI Compliance

Static blog for actaicompliance.com. No dependencies.

- Articles live in `content/posts/*.md`, standalone pages in `content/pages/*.md`.
- Build: `node build.js` (output goes to `dist/`).
- Cloudflare Pages settings: build command `node build.js`, output directory `dist`.

Every article needs front matter: title, slug, region, date, updated, description, and `eu: true` if the Attestly callout should show.
