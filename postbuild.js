const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://actaicompliance.com';
const NAME = 'ActAI Compliance';
const EMAIL = 'isaac@actaicompliance.com';
const KEY = '69a9a34a62654421992f41db833ac23a';
const VERIFIED = '2026-10-11';
const ORDER = ['eu-ai-act-explained', 'us-ai-regulation', 'us-state-ai-laws', 'uk-ai-regulation', 'canada-ai-regulation', 'which-ai-laws-apply-to-you'];

const DIAGRAMS = {
  'eu-ai-act-explained': [
    { file: 'eu-risk-tiers.svg', w: 640, h: 418, before: 'what-changed-in-2026', alt: 'Diagram of the four EU AI Act risk tiers: unacceptable risk is banned, high risk has strict duties, transparency risk requires disclosure, and minimal risk has no specific duties.', caption: 'The four EU AI Act risk tiers, from banned uses to minimal risk.' },
    { file: 'eu-timeline.svg', w: 640, h: 500, before: 'what-high-risk-providers-must-prepare', alt: 'Timeline of EU AI Act dates: 1 August 2024 entry into force, 2 February 2025 bans, 2 August 2025 general-purpose AI rules, 2 August 2026 transparency duties, 2 December 2027 Annex III high-risk rules and 2 August 2028 Annex I high-risk rules.', caption: 'Key EU AI Act dates after the 2026 AI Omnibus.' }
  ],
  'eu-ai-act-annex-iv-technical-documentation': [
    { file: 'annex-iv-sections.svg', w: 640, h: 548, before: 'how-long-to-keep-it', alt: 'The nine sections of Annex IV technical documentation, from the general description of the system to the post-market monitoring plan.', caption: 'The nine sections of Annex IV technical documentation.' }
  ],
  'eu-ai-act-conformity-assessment': [
    { file: 'conformity-routes.svg', w: 640, h: 584, before: 'which-route-applies-to-you', alt: 'Flow showing the two conformity assessment routes, internal control under Annex VI or a notified body under Annex VII, followed by the EU declaration of conformity, CE marking and registration.', caption: 'From conformity assessment to market: the two routes and the steps after them.' }
  ],
  'eu-ai-act-annex-iii-high-risk-ai': [
    { file: 'annex-iii-areas.svg', w: 640, h: 458, before: 'not-everything-in-these-areas-is-high-risk', alt: 'The eight Annex III areas: biometrics, critical infrastructure, education and training, employment and worker management, essential services and benefits, law enforcement, migration, asylum and border control, and justice and democratic processes.', caption: 'The eight Annex III areas where AI use is treated as high-risk.' }
  ],
  'is-my-ai-system-high-risk': [
    { file: 'high-risk-check.svg', w: 640, h: 590, alt: 'Six questions for the EU AI Act risk check: is it an AI system, is the use prohibited, is it an Annex I product, is it in an Annex III area, does the Article 6(3) exception apply, and do transparency duties apply.', caption: 'A quick path through the EU AI Act risk check.' }
  ],
  'which-ai-laws-apply-to-you': [
    { file: 'four-questions.svg', w: 640, h: 340, alt: 'Four questions that decide which AI laws apply: where your users are, what the AI does, your role as provider or deployer, and what data is involved.', caption: 'Four questions that narrow down which AI laws apply to you.' }
  ]
};

const xesc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const hesc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\x22/g, '&quot;').replace(/'/g, '&#39;');
const write = (rel, data) => { const f = path.join(DIST, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, data); };

function parse(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/\r/g, '');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('Missing front matter in ' + file);
  const meta = {};
  m[1].split('\n').forEach(l => { const i = l.indexOf(':'); if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
  return { meta, body: m[2].trim() };
}
const dirPosts = path.join(ROOT, 'content', 'posts');
const posts = fs.readdirSync(dirPosts).filter(f => f.endsWith('.md')).map(f => parse(path.join(dirPosts, f)));
posts.sort((a, b) => { const ia = ORDER.indexOf(a.meta.slug), ib = ORDER.indexOf(b.meta.slug); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
const words = t => t.split(/\s+/).filter(Boolean).length;
const absLinks = t => t.replace(/\]\(\//g, '](' + SITE + '/');
const urlOf = p => SITE + '/guides/' + p.meta.slug + '/';
const mdUrl = p => SITE + '/guides/' + p.meta.slug + '.md';
const ogOf = p => SITE + '/og/' + p.meta.slug + '.jpg';
const latest = posts.map(p => p.meta.updated || p.meta.date).sort().pop();

/* ---- static assets (images, icons) ---- */
const pub = path.join(ROOT, 'public');
if (fs.existsSync(pub)) fs.cpSync(pub, DIST, { recursive: true });

/* ---- robots.txt: everyone welcome, named crawlers listed explicitly ---- */
const BOTS = ['Googlebot', 'Google-Extended', 'GoogleOther', 'Google-CloudVertexBot', 'bingbot', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'Claude-Web', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Applebot', 'Applebot-Extended', 'meta-externalagent', 'meta-externalfetcher', 'FacebookBot', 'Amazonbot', 'Amzn-SearchBot', 'Amzn-User', 'Bytespider', 'DuckDuckBot', 'DuckAssistBot', 'CCBot', 'cohere-ai', 'MistralAI-User', 'YouBot', 'Diffbot', 'AI2Bot', 'YandexBot', 'Baiduspider', 'PetalBot', 'SeznamBot', 'Yeti', 'Timpibot', 'PanguBot'];
write('robots.txt', ['# ActAI Compliance: search engines and AI crawlers are welcome.', '# LLM-friendly summary: ' + SITE + '/llms.txt', '# Open data: ' + SITE + '/open-data/', '', 'User-agent: *', 'Allow: /', 'Content-Signal: search=yes, ai-input=yes, ai-train=yes', '', '# Named crawlers, explicitly allowed', ...BOTS.map(b => 'User-agent: ' + b), 'Allow: /', '', 'Sitemap: ' + SITE + '/sitemap.xml', ''].join('\n'));

/* ---- llms.txt, llms-full.txt and Markdown copies of every guide ---- */
const FACTS = [
  'The EU AI Act is Regulation (EU) 2024/1689 and entered into force on 1 August 2024.',
  'Prohibited AI practices (Article 5) have applied since 2 February 2025.',
  'Obligations for general-purpose AI models have applied since 2 August 2025.',
  'The Digital Omnibus on AI, Regulation (EU) 2026/1744, entered into force on 27 July 2026.',
  'After the Omnibus, high-risk obligations for stand-alone Annex III systems apply from 2 December 2027 (previously 2 August 2026).',
  'High-risk obligations for AI built into regulated products (Annex I) apply from 2 August 2028.',
  'Article 50 transparency duties applied from 2 August 2026; systems already on the market had until 2 December 2026 to add machine-readable marking to AI-generated content.',
  'Annex III systems judged not high-risk under Article 6(3) must still be registered, with simplified information; systems that profile people are always high-risk.',
  'The United States has no comprehensive federal AI law; state and local laws such as Texas TRAIGA (effective 1 January 2026) and New York City Local Law 144 apply.',
  'Canada has no federal AI statute in force: the proposed AIDA lapsed in January 2025, and privacy laws (PIPEDA, Quebec Law 25) apply to AI that uses personal data.',
  'The United Kingdom has no single AI law and relies on existing regulators and laws such as UK GDPR.'
];
write('llms.txt', [
  '# ' + NAME, '',
  '> Plain-English guides to AI regulation around the world: the EU AI Act, the UK, the US, Canada and more. Every guide shows a last-reviewed date and points to official sources. Free to read, cite and reuse with attribution (CC BY 4.0). General information, not legal advice.', '',
  'Publisher note: ActAI Compliance is run by the team behind Attestly (https://attestly.online), a tool for EU AI Act documentation. Attestly is mentioned only where relevant and is always labelled as our product.', '',
  '## Key facts (verified ' + VERIFIED + ')', '', ...FACTS.map(f => '- ' + f), '',
  '## Guides', '', ...posts.map(p => '- [' + p.meta.title + '](' + mdUrl(p) + '): ' + p.meta.description), '',
  '## Open data', '',
  '- [Guides index (JSON)](' + SITE + '/data/guides.json): metadata for every guide',
  '- [EU AI Act timeline (JSON)](' + SITE + '/data/eu-ai-act-timeline.json): key dates with notes',
  '- [EU AI Act timeline (CSV)](' + SITE + '/data/eu-ai-act-timeline.csv): the same dates as a spreadsheet', '',
  '## Optional', '',
  '- [Full text of all guides](' + SITE + '/llms-full.txt)',
  '- [About](' + SITE + '/about/)',
  '- [Disclaimer](' + SITE + '/disclaimer/)',
  '- [RSS feed](' + SITE + '/feed.xml)',
  '- [Sitemap](' + SITE + '/sitemap.xml)', ''
].join('\n'));
const mdDoc = p => ['# ' + p.meta.title, '', '> ' + p.meta.description, '', '- Source: ' + urlOf(p), '- Region: ' + p.meta.region, '- Published: ' + p.meta.date, '- Last reviewed: ' + (p.meta.updated || p.meta.date), '- Publisher: ' + NAME + ' (' + SITE + ')', '- Licence: CC BY 4.0 (please attribute and link to the source URL)', '- General information, not legal advice', '', absLinks(p.body), ''].join('\n');
posts.forEach(p => write('guides/' + p.meta.slug + '.md', mdDoc(p)));
write('llms-full.txt', ['# ' + NAME + ': full text of all guides', '', '> Verified ' + VERIFIED + '. Licence CC BY 4.0. Not legal advice.', '', ...posts.map(p => mdDoc(p) + '\n---\n')].join('\n'));

/* ---- RSS feed ---- */
const rfc = d => new Date(d + 'T09:00:00Z').toUTCString();
write('feed.xml', `<?xml version='1.0' encoding='UTF-8'?>\n<rss version='2.0' xmlns:atom='http://www.w3.org/2005/Atom'><channel><title>${xesc(NAME)}</title><link>${SITE}/</link><description>Plain-English guides to AI regulation around the world.</description><language>en</language><lastBuildDate>${rfc(latest)}</lastBuildDate><atom:link href='${SITE}/feed.xml' rel='self' type='application/rss+xml'/>${posts.map(p => `<item><title>${xesc(p.meta.title)}</title><link>${urlOf(p)}</link><guid isPermaLink='true'>${urlOf(p)}</guid><pubDate>${rfc(p.meta.date)}</pubDate><category>${xesc(p.meta.region)}</category><description>${xesc(p.meta.description)}</description></item>`).join('')}</channel></rss>\n`);

/* ---- open data ---- */
const TIMELINE = [
  { date: '2024-08-01', event: 'EU AI Act (Regulation (EU) 2024/1689) enters into force', applies_to: 'All', note: '' },
  { date: '2025-02-02', event: 'Prohibited AI practices (Article 5) and AI literacy provisions (Article 4) start to apply', applies_to: 'All', note: '' },
  { date: '2025-08-02', event: 'Obligations for general-purpose AI models apply', applies_to: 'General-purpose AI model providers', note: '' },
  { date: '2026-07-27', event: 'Digital Omnibus on AI (Regulation (EU) 2026/1744) enters into force', applies_to: 'All', note: 'Moves the high-risk dates below.' },
  { date: '2026-08-02', event: 'Article 50 transparency obligations apply', applies_to: 'Providers and deployers of chatbots and AI-generated content', note: 'Systems already on the market before this date have until 2026-12-02 for machine-readable marking of AI-generated content (Article 50(2)).' },
  { date: '2026-12-02', event: 'Grace period ends for Article 50(2) marking of AI-generated content (systems already on the market)', applies_to: 'Providers of generative AI systems', note: '' },
  { date: '2027-12-02', event: 'High-risk obligations apply to stand-alone Annex III systems', applies_to: 'Providers and deployers of Annex III high-risk systems', note: 'Previously 2026-08-02.' },
  { date: '2028-08-02', event: 'High-risk obligations apply to AI built into regulated products (Annex I)', applies_to: 'Providers of AI in Annex I regulated products', note: 'Previously 2027-08-02.' }
];
const nowIso = new Date().toISOString().slice(0, 10);
const rows = TIMELINE.map(t => Object.assign({}, t, { status: t.date <= nowIso ? 'in effect' : 'upcoming' }));
write('data/eu-ai-act-timeline.json', JSON.stringify({ title: 'EU AI Act key dates (after the 2026 AI Omnibus)', publisher: NAME, url: SITE + '/guides/eu-ai-act-explained/', license: 'CC BY 4.0', license_url: 'https://creativecommons.org/licenses/by/4.0/', last_verified: VERIFIED, disclaimer: 'General information, not legal advice. Check the official texts on EUR-Lex.', dates: rows }, null, 2));
const q = v => '\x22' + String(v).replace(/\x22/g, '\x22\x22') + '\x22';
write('data/eu-ai-act-timeline.csv', ['date,event,applies_to,status,note', ...rows.map(r => [r.date, r.event, r.applies_to, r.status, r.note].map(q).join(','))].join('\n') + '\n');
write('data/guides.json', JSON.stringify({ publisher: NAME, url: SITE + '/', license: 'CC BY 4.0', license_url: 'https://creativecommons.org/licenses/by/4.0/', last_verified: VERIFIED, guides: posts.map(p => ({ slug: p.meta.slug, title: p.meta.title, region: p.meta.region, description: p.meta.description, url: urlOf(p), markdown_url: mdUrl(p), image: ogOf(p), published: p.meta.date, last_reviewed: p.meta.updated || p.meta.date, word_count: words(p.body) })) }, null, 2));

/* ---- sitemap with lastmod and images ---- */
const entries = [
  { loc: SITE + '/', lastmod: latest, priority: '1.0', images: [SITE + '/og/default.jpg'] },
  ...posts.map(p => ({ loc: urlOf(p), lastmod: p.meta.updated || p.meta.date, priority: '0.9', images: [ogOf(p), SITE + '/img/' + p.meta.slug + '.jpg'] })),
  { loc: SITE + '/open-data/', lastmod: VERIFIED, priority: '0.6', images: [] },
  { loc: SITE + '/about/', lastmod: VERIFIED, priority: '0.5', images: [] },
  { loc: SITE + '/disclaimer/', lastmod: VERIFIED, priority: '0.3', images: [] }
];
write('sitemap.xml', `<?xml version='1.0' encoding='UTF-8'?>\n<urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9' xmlns:image='http://www.google.com/schemas/sitemap-image/1.1'>${entries.map(e => `<url><loc>${e.loc}</loc><lastmod>${e.lastmod}</lastmod><priority>${e.priority}</priority>${e.images.map(i => `<image:image><image:loc>${i}</image:loc></image:image>`).join('')}</url>`).join('')}</urlset>\n`);
write(KEY + '.txt', KEY);

/* ---- extra CSS, served under a new hashed filename ---- */
const EXTRA_CSS = `.cover{max-width:920px;margin:28px auto 0;padding:0 20px}
.cover img{display:block;width:100%;height:auto;border-radius:18px;border:1px solid var(--line)}
.diagram{margin:30px 0}
.diagram img{display:block;width:100%;height:auto;border-radius:16px}
.diagram figcaption{font-size:14px;color:var(--muted);margin-top:8px;line-height:1.5}
.card .thumb{display:block;width:calc(100% + 48px);max-width:none;height:150px;object-fit:cover;margin:-24px -24px 8px;border-radius:16px 16px 0 0}
`;
const baseCss = fs.readFileSync(path.join(DIST, 'assets', 'style.css'), 'utf8') + '\n' + EXTRA_CSS;
const cssHash = crypto.createHash('md5').update(baseCss).digest('hex').slice(0, 8);
const NEW_CSS = '/assets/style.' + cssHash + '.css';
write(NEW_CSS.slice(1), baseCss);
const CSS_RE = /\/assets\/style\.css\?v=[0-9a-f]+/g;

/* ---- HTML enrichment: rich previews, structured data, images ---- */
const org = { '@type': 'Organization', '@id': SITE + '/#org', name: NAME, url: SITE + '/', email: EMAIL, logo: { '@type': 'ImageObject', url: SITE + '/icons/icon-512.png', width: 512, height: 512 } };
const website = { '@type': 'WebSite', '@id': SITE + '/#website', url: SITE + '/', name: NAME, description: 'Plain-English guides to AI regulation around the world.', inLanguage: 'en', publisher: { '@id': SITE + '/#org' } };
const ldTag = graph => `<script type='application/ld+json'>${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`;
const FOOT_OLD = `<a href='/sitemap.xml'>Sitemap</a>`;
const FOOT_NEW = `<a href='/open-data/'>Open data</a><a href='/feed.xml'>RSS feed</a><a href='/llms.txt'>llms.txt</a><a href='/sitemap.xml'>Sitemap</a>`;
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);

for (const file of walk(DIST).filter(f => f.endsWith('.html'))) {
  let html = fs.readFileSync(file, 'utf8');
  const rel = path.relative(DIST, file).split(path.sep).join('/');
  let route = '/' + rel.replace(/index\.html$/, '');
  if (rel === '404.html') route = '/404';
  const noindex = route === '/404' || route === '/offline/';
  const gm = route.match(/^\/guides\/([a-z0-9-]+)\/$/);
  const post = gm ? posts.find(p => p.meta.slug === gm[1]) : null;
  const img = post ? ogOf(post) : SITE + '/og/default.jpg';
  const alt = hesc(post ? post.meta.title : NAME + ': AI regulation, made clear');
  const pageUrl = SITE + route;

  let extra = `<meta name='robots' content='${noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'}'>
<meta name='author' content='${NAME}'>
<meta property='og:locale' content='en'>
<meta property='og:image' content='${img}'>
<meta property='og:image:secure_url' content='${img}'>
<meta property='og:image:type' content='image/jpeg'>
<meta property='og:image:width' content='1200'>
<meta property='og:image:height' content='630'>
<meta property='og:image:alt' content='${alt}'>
<meta name='twitter:image' content='${img}'>
<meta name='twitter:image:alt' content='${alt}'>
<link rel='icon' href='/favicon.ico' sizes='48x48'>
<link rel='alternate' type='application/rss+xml' title='${NAME}' href='/feed.xml'>
<link rel='sitemap' type='application/xml' href='/sitemap.xml'>
`;
  let graph = [org, website];
  if (post) {
    const m = post.meta;
    extra += `<meta property='article:published_time' content='${m.date}'>
<meta property='article:modified_time' content='${m.updated || m.date}'>
<meta property='article:section' content='${hesc(m.region)}'>
<link rel='alternate' type='text/markdown' href='/guides/${m.slug}.md'>
`;
    html = html.replace(/<script type='application\/ld\+json'>[\s\S]*?<\/script>/, '');
    graph.push({ '@type': 'Article', '@id': pageUrl + '#article', headline: m.title, description: m.description, image: [{ '@type': 'ImageObject', url: img, width: 1200, height: 630 }], datePublished: m.date, dateModified: m.updated || m.date, inLanguage: 'en', isAccessibleForFree: true, articleSection: m.region, wordCount: words(post.body), author: { '@id': SITE + '/#org' }, publisher: { '@id': SITE + '/#org' }, isPartOf: { '@id': SITE + '/#website' }, mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl }, license: 'https://creativecommons.org/licenses/by/4.0/' });
    graph.push({ '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: 'Guides', item: SITE + '/#guides' }, { '@type': 'ListItem', position: 3, name: m.title, item: pageUrl }] });
  } else if (route === '/') {
    graph.push({ '@type': 'ItemList', name: 'Guides', itemListElement: posts.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: urlOf(p), name: p.meta.title })) });
  } else if (route === '/about/') {
    graph.push({ '@type': 'AboutPage', '@id': pageUrl + '#page', url: pageUrl, name: 'About ' + NAME, isPartOf: { '@id': SITE + '/#website' }, about: { '@id': SITE + '/#org' } });
  }
  html = html.replace(`<meta name='twitter:card' content='summary'>`, `<meta name='twitter:card' content='summary_large_image'>`);
  html = html.replace('</head>', extra + (noindex ? '' : ldTag(graph)) + '\n</head>');
  html = html.replace(FOOT_OLD, FOOT_NEW);
  html = html.replace(/<a class='card' href='\/guides\/([a-z0-9-]+)\/'>/g, `<a class='card' href='/guides/$1/'><img class='thumb' src='/img/thumbs/$1.jpg' alt='' width='800' height='320' loading='lazy' decoding='async'>`);

  if (post) {
    const cover = `<figure class='cover'><img src='/img/${post.meta.slug}.jpg' alt='${hesc(post.meta.region)} AI regulation guide cover' width='1600' height='640' fetchpriority='high' decoding='async'></figure>`;
    html = html.replace(`<article class='prose'>`, cover + `<article class='prose'>`);
    for (const d of (DIAGRAMS[post.meta.slug] || [])) {
      const fig = `<figure class='diagram'><img src='/img/diagrams/${d.file}' alt='${hesc(d.alt)}' width='${d.w}' height='${d.h}' loading='lazy' decoding='async'><figcaption>${hesc(d.caption)}</figcaption></figure>`;
      if (d.before) {
        const k = `<h2 id='${d.before}'>`;
        if (html.includes(k)) html = html.replace(k, fig + k);
      } else {
        const start = html.indexOf(`<article class='prose'>`);
        const at = html.indexOf('</p>', start);
        if (start >= 0 && at >= 0) html = html.slice(0, at + 4) + fig + html.slice(at + 4);
      }
    }
  }
  html = html.replace(CSS_RE, NEW_CSS);
  fs.writeFileSync(file, html);
}

/* ---- service worker: point at the new stylesheet ---- */
const swPath = path.join(DIST, 'sw.js');
if (fs.existsSync(swPath)) fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8').replace(CSS_RE, NEW_CSS));

/* ---- API catalog (RFC 9727) and OpenAPI description of the open-data endpoints ---- */
const strProp = { type: 'string' };
const jsonResp = ref => ({ description: 'OK', content: { 'application/json': { schema: { $ref: ref } } } });
const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'ActAI Compliance Open Data',
    version: '1.0.0',
    summary: 'Read-only static JSON, CSV and Markdown endpoints with ActAI Compliance guides and the EU AI Act timeline.',
    description: 'No authentication and no rate-limit keys are needed. Data is licensed CC BY 4.0, please attribute ActAI Compliance and link to the page you used. General information, not legal advice.',
    license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
    contact: { name: NAME, email: EMAIL, url: SITE + '/about/' }
  },
  servers: [{ url: SITE }],
  security: [],
  externalDocs: { description: 'Open data documentation', url: SITE + '/open-data/' },
  paths: {
    '/data/guides.json': { get: { operationId: 'getGuidesIndex', summary: 'Index of all guides with metadata', responses: { '200': jsonResp('#/components/schemas/GuidesIndex') } } },
    '/data/eu-ai-act-timeline.json': { get: { operationId: 'getEuAiActTimelineJson', summary: 'EU AI Act key dates as JSON', responses: { '200': jsonResp('#/components/schemas/Timeline') } } },
    '/data/eu-ai-act-timeline.csv': { get: { operationId: 'getEuAiActTimelineCsv', summary: 'EU AI Act key dates as CSV', responses: { '200': { description: 'OK', content: { 'text/csv': { schema: strProp } } } } } },
    '/guides/{slug}.md': { get: { operationId: 'getGuideMarkdown', summary: 'Markdown copy of a guide', parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string', enum: posts.map(p => p.meta.slug) } }], responses: { '200': { description: 'OK', content: { 'text/markdown': { schema: strProp } } }, '404': { description: 'Guide not found' } } } },
    '/llms.txt': { get: { operationId: 'getLlmsTxt', summary: 'Short LLM-friendly site summary with key facts', responses: { '200': { description: 'OK', content: { 'text/plain': { schema: strProp } } } } } },
    '/llms-full.txt': { get: { operationId: 'getLlmsFullTxt', summary: 'Full text of every guide in Markdown', responses: { '200': { description: 'OK', content: { 'text/plain': { schema: strProp } } } } } },
    '/feed.xml': { get: { operationId: 'getRssFeed', summary: 'RSS feed of guides', responses: { '200': { description: 'OK', content: { 'application/rss+xml': { schema: strProp } } } } } }
  },
  components: {
    schemas: {
      Guide: { type: 'object', required: ['slug', 'title', 'region', 'url'], properties: { slug: strProp, title: strProp, region: strProp, description: strProp, url: { type: 'string', format: 'uri' }, markdown_url: { type: 'string', format: 'uri' }, image: { type: 'string', format: 'uri' }, published: { type: 'string', format: 'date' }, last_reviewed: { type: 'string', format: 'date' }, word_count: { type: 'integer' } } },
      GuidesIndex: { type: 'object', properties: { publisher: strProp, url: { type: 'string', format: 'uri' }, license: strProp, license_url: { type: 'string', format: 'uri' }, last_verified: { type: 'string', format: 'date' }, guides: { type: 'array', items: { $ref: '#/components/schemas/Guide' } } } },
      TimelineEntry: { type: 'object', required: ['date', 'event', 'status'], properties: { date: { type: 'string', format: 'date' }, event: strProp, applies_to: strProp, note: strProp, status: { type: 'string', enum: ['in effect', 'upcoming'] } } },
      Timeline: { type: 'object', properties: { title: strProp, publisher: strProp, url: { type: 'string', format: 'uri' }, license: strProp, license_url: { type: 'string', format: 'uri' }, last_verified: { type: 'string', format: 'date' }, disclaimer: strProp, dates: { type: 'array', items: { $ref: '#/components/schemas/TimelineEntry' } } } }
    }
  }
};
write('openapi.json', JSON.stringify(openapi, null, 2));
const apiCatalog = { linkset: [{ anchor: SITE + '/data/', 'service-desc': [{ href: SITE + '/openapi.json', type: 'application/json' }], 'service-doc': [{ href: SITE + '/open-data/', type: 'text/html' }] }] };
const agentCard = {
  name: 'ActAI Compliance',
  description: 'Independent, plain-English guides to AI regulation worldwide (EU AI Act, US, UK, Canada and more). Ask a question and get the most relevant guides, with links and Markdown copies. General information, not legal advice.',
  supportedInterfaces: [{ url: SITE + '/a2a', protocolBinding: 'JSONRPC', protocolVersion: '1.0' }],
  provider: { organization: 'ActAI Compliance', url: SITE + '/' },
  version: '1.0.0',
  documentationUrl: SITE + '/open-data/',
  iconUrl: SITE + '/icons/icon-192.png',
  capabilities: { streaming: false, pushNotifications: false },
  defaultInputModes: ['text/plain'],
  defaultOutputModes: ['text/plain'],
  skills: [
    { id: 'find-ai-regulation-guide', name: 'Find an AI regulation guide', description: 'Matches a question about AI law (EU AI Act, US, UK, Canada, high-risk classification, technical documentation, conformity assessment) to the most relevant guides on the site, with URLs.', tags: ['ai-regulation', 'eu-ai-act', 'compliance', 'guides'], examples: ['Is my CV-screening tool high-risk under the EU AI Act?', 'What AI laws apply in Canada?'], inputModes: ['text/plain'], outputModes: ['text/plain'] }
  ]
};
/* ---- Markdown representations for Accept: text/markdown (served by worker.js) ---- */
write('md/index.md', ['# ' + NAME, '', '> Plain-English guides to AI regulation around the world: the EU AI Act, the UK, the US, Canada and more. Not legal advice.', '', '- Source: ' + SITE + '/', '- Verified: ' + VERIFIED, '', '## Guides', '', ...posts.map(p => '- [' + p.meta.title + '](' + urlOf(p) + ') (' + p.meta.region + '): ' + p.meta.description), '', '## Key facts (verified ' + VERIFIED + ')', '', ...FACTS.map(f => '- ' + f), '', '## For agents and developers', '', '- [llms.txt](' + SITE + '/llms.txt)', '- [Open data](' + SITE + '/open-data/)', '- [API catalog](' + SITE + '/.well-known/api-catalog)', '- [MCP server](' + SITE + '/mcp)', '- [A2A agent card](' + SITE + '/.well-known/agent-card.json)', ''].join('\n'));
write('md/guides/index.md', ['# Guides', '', '> All AI regulation guides on ' + NAME + '.', '', '- Source: ' + SITE + '/guides/', '', ...posts.map(p => '- [' + p.meta.title + '](' + urlOf(p) + ') (' + p.meta.region + '): ' + p.meta.description), ''].join('\n'));
posts.forEach(p => write('md/guides/' + p.meta.slug + '.md', mdDoc(p)));
fs.readdirSync(path.join(ROOT, 'content', 'pages')).filter(f => f.endsWith('.md')).forEach(f => {
  const pg = parse(path.join(ROOT, 'content', 'pages', f));
  write('md/' + pg.meta.slug + '.md', ['# ' + pg.meta.title, '', '> ' + pg.meta.description, '', '- Source: ' + SITE + '/' + pg.meta.slug + '/', '', absLinks(pg.body), ''].join('\n'));
});
write('auth.md', ['# ' + NAME + ' auth.md', '', '> Agent access and registration for ' + SITE + '. Short version: no registration, account or credential is needed.', '', '## Audience', '', 'AI agents, crawlers and developers reading the AI regulation guides and open data published on ' + SITE + '.', '', '## Authentication', '', 'None. Every endpoint is public, read-only and anonymous. There is no sign-up, no login, no API key, no OAuth server and no tokens to request. For that reason this site publishes no OAuth protected resource or authorization server metadata: it would describe something that does not exist.', '', '## Registration and provisioning', '', 'There is no registration or provisioning endpoint. Do not send credentials; they are ignored.', '', '## Public endpoints', '', '- Guides and pages: ' + SITE + '/ (send `Accept: text/markdown` for Markdown)', '- Open data: ' + SITE + '/data/guides.json and ' + SITE + '/data/eu-ai-act-timeline.json', '- OpenAPI description: ' + SITE + '/openapi.json', '- API catalog: ' + SITE + '/.well-known/api-catalog', '- MCP server (Streamable HTTP): ' + SITE + '/mcp', '- A2A endpoint: ' + SITE + '/a2a (agent card at ' + SITE + '/.well-known/agent-card.json)', '- Agent skills: ' + SITE + '/.well-known/agent-skills/index.json', '', '## Usage', '', 'Content is licensed CC BY 4.0: attribute ' + NAME + ' and link to the source page. Please keep request rates reasonable. General information, not legal advice.', '', 'Contact: isaac@actaicompliance.com', ''].join('\n'));
const SKILLS = [
  { name: 'find-ai-regulation-guide', description: 'Answer questions about AI regulation (EU AI Act, US, UK, Canada) by finding the right guide on actaicompliance.com and reading its Markdown copy.', body: `# Find an AI regulation guide

Use this skill when a user asks which AI laws apply to them, or asks about a specific rule such as the EU AI Act, US federal or state AI policy, UK AI regulation or Canadian AI rules.

## Steps

1. Fetch ${SITE}/data/guides.json. It lists every guide with slug, title, region, description, url and markdown_url.
2. Pick the guides whose title, region or description match the question.
3. Fetch the markdown_url of each chosen guide (plain Markdown, no page chrome) and answer from it.
4. Quote the guide's last-verified date from guides.json when stating a legal position, and link to the guide url.
5. Alternatively, send the question to the A2A endpoint at ${SITE}/a2a (JSON-RPC method SendMessage) to get the closest guides back.

## Rules

- Treat the content as general information, not legal advice.
- If the guides do not cover the jurisdiction, say so instead of guessing.
- Content is licensed CC BY 4.0: attribute ActAI Compliance and link to the guide.
` },
  { name: 'eu-ai-act-deadlines', description: 'Report current EU AI Act application dates from the open timeline dataset on actaicompliance.com, including changes made by the 2026 AI Omnibus.', body: `# EU AI Act deadlines

Use this skill when a user asks when EU AI Act obligations start to apply (prohibited practices, general-purpose AI, transparency, high-risk systems).

## Steps

1. Fetch ${SITE}/data/eu-ai-act-timeline.json (CSV copy at ${SITE}/data/eu-ai-act-timeline.csv).
2. Find the entries relevant to the question and report the dates exactly as listed, with the source named in each entry.
3. State the last_verified date of the dataset so the user knows how fresh it is.
4. For the explanation behind a date, fetch ${SITE}/guides/eu-ai-act-explained.md.

## Rules

- Do not infer dates that are not in the dataset.
- Dates changed in 2026; never rely on pre-2026 timelines from memory.
- General information, not legal advice.
` }
];
const skillEntries = SKILLS.map(function (k) {
  const content = '---\nname: ' + k.name + '\ndescription: ' + k.description + '\n---\n\n' + k.body;
  write('.well-known/agent-skills/' + k.name + '/SKILL.md', content);
  return { name: k.name, type: 'skill-md', description: k.description, url: SITE + '/.well-known/agent-skills/' + k.name + '/SKILL.md', digest: 'sha256:' + crypto.createHash('sha256').update(content, 'utf8').digest('hex') };
});
write('.well-known/agent-skills/index.json', JSON.stringify({ $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json', skills: skillEntries }, null, 2) + '\n');
const mcpCard = {
  serverInfo: { name: 'actaicompliance', title: 'ActAI Compliance', version: '1.0.0' },
  name: 'com.actaicompliance/guides',
  title: 'ActAI Compliance',
  description: 'Read-only MCP server for plain-English guides to AI regulation worldwide (EU AI Act, US, UK, Canada). General information, not legal advice.',
  version: '1.0.0',
  websiteUrl: SITE + '/',
  documentationUrl: SITE + '/open-data/',
  protocolVersion: '2025-06-18',
  supportedProtocolVersions: ['2025-06-18', '2025-03-26', '2024-11-05'],
  transport: { type: 'streamable-http', endpoint: SITE + '/mcp' },
  endpoint: SITE + '/mcp',
  remotes: [{ type: 'streamable-http', url: SITE + '/mcp' }],
  authentication: { required: false },
  capabilities: { tools: { listChanged: false }, resources: null, prompts: null },
  tools: [{ name: 'search_guides', description: 'Find guides that match a question about AI regulation.' }, { name: 'get_guide', description: 'Return the full Markdown of one guide by slug.' }, { name: 'get_eu_ai_act_timeline', description: 'Return the EU AI Act key dates dataset.' }]
};
write('.well-known/mcp/server-card.json', JSON.stringify(mcpCard, null, 2) + '\n');
write('.well-known/agent-card.json', JSON.stringify(agentCard, null, 2) + '\n');
write('.well-known/api-catalog', JSON.stringify(apiCatalog, null, 2) + '\n');

/* ---- response headers ---- */
fs.appendFileSync(path.join(DIST, '_headers'), ['/data/*', '  Access-Control-Allow-Origin: *', '/data/*.json', '  Content-Type: application/json; charset=utf-8', '/data/*.csv', '  Content-Type: text/csv; charset=utf-8', '/llms.txt', '  Content-Type: text/plain; charset=utf-8', '/llms-full.txt', '  Content-Type: text/plain; charset=utf-8', '/guides/*.md', '  Content-Type: text/markdown; charset=utf-8', '/feed.xml', '  Content-Type: application/rss+xml; charset=utf-8', '/sitemap.xml', '  Content-Type: application/xml; charset=utf-8', '/.well-known/agent-skills/index.json', '  Content-Type: application/json; charset=utf-8', '  Access-Control-Allow-Origin: *', '/.well-known/agent-skills/find-ai-regulation-guide/SKILL.md', '  Content-Type: text/markdown; charset=utf-8', '  Access-Control-Allow-Origin: *', '/.well-known/agent-skills/eu-ai-act-deadlines/SKILL.md', '  Content-Type: text/markdown; charset=utf-8', '  Access-Control-Allow-Origin: *', '/auth.md', '  Content-Type: text/markdown; charset=utf-8', '  Access-Control-Allow-Origin: *', '/.well-known/mcp/server-card.json', '  Content-Type: application/json; charset=utf-8', '  Access-Control-Allow-Origin: *', '/.well-known/agent-card.json', '  Content-Type: application/json; charset=utf-8', '  Access-Control-Allow-Origin: *', '/', '  Link: </.well-known/api-catalog>; rel=\x22api-catalog\x22, </openapi.json>; rel=\x22service-desc\x22; type=\x22application/json\x22, </open-data/>; rel=\x22service-doc\x22; type=\x22text/html\x22, </llms.txt>; rel=\x22describedby\x22; type=\x22text/plain\x22, </sitemap.xml>; rel=\x22sitemap\x22; type=\x22application/xml\x22', '/.well-known/api-catalog', '  Content-Type: application/linkset+json; profile=\x22https://www.rfc-editor.org/info/rfc9727\x22', '  Access-Control-Allow-Origin: *', '/openapi.json', '  Content-Type: application/json; charset=utf-8', '  Access-Control-Allow-Origin: *', ''].join('\n'));
console.log('Post-build done: ' + posts.length + ' guides, css ' + NEW_CSS);
