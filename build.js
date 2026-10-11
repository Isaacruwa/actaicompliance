const fs = require('fs');
const path = require('path');

const SITE = { name: 'ActAI Compliance', url: 'https://actaicompliance.com', tagline: 'AI regulation explained, country by country' };
const ATTESTLY = 'https://attestly.online/?utm_source=actaicompliance';
const DIST = path.join(__dirname, 'dist');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function inline(s) {
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => `<a href='${u}'>${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return s;
}

function md(src) {
  const lines = src.split(/\r?\n/);
  const out = [];
  let para = [];
  let list = null;
  const flushP = () => { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } };
  const flushL = () => { if (list) { out.push('<' + list.t + '>' + list.items.map(i => '<li>' + inline(i) + '</li>').join('') + '</' + list.t + '>'); list = null; } };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (!l.trim()) { flushP(); flushL(); continue; }
    let m;
    if ((m = l.match(/^(#{2,3})\s+(.*)$/))) { flushP(); flushL(); out.push('<h' + m[1].length + '>' + inline(m[2]) + '</h' + m[1].length + '>'); continue; }
    if ((m = l.match(/^[-*]\s+(.*)$/))) { flushP(); if (!list || list.t !== 'ul') { flushL(); list = { t: 'ul', items: [] }; } list.items.push(m[1]); continue; }
    if ((m = l.match(/^\d+\.\s+(.*)$/))) { flushP(); if (!list || list.t !== 'ol') { flushL(); list = { t: 'ol', items: [] }; } list.items.push(m[1]); continue; }
    if (l.startsWith('> ')) { flushP(); flushL(); out.push('<blockquote>' + inline(l.slice(2)) + '</blockquote>'); continue; }
    flushL();
    para.push(l.trim());
  }
  flushP();
  flushL();
  return out.join('');
}

function parse(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/\r/g, '');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('Missing front matter in ' + file);
  const meta = {};
  m[1].split('\n').forEach(line => {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  });
  return { meta, body: m[2] };
}

const CSS = `:root{--ink:#14213d;--muted:#5c677d;--bg:#fff;--soft:#f4f6fb;--accent:#1d4ed8;--line:#e3e8f0}
*{box-sizing:border-box}
body{margin:0;font:18px/1.7 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--ink);background:var(--bg)}
.wrap{max-width:760px;margin:0 auto;padding:0 20px}
.site-header{border-bottom:1px solid var(--line)}
.site-header .wrap{display:flex;justify-content:space-between;align-items:center;padding-top:16px;padding-bottom:16px}
.brand{font-weight:700;font-size:20px;color:var(--ink);text-decoration:none}
nav a{margin-left:18px;color:var(--muted);text-decoration:none;font-size:16px}
a{color:var(--accent)}
.hero{padding:40px 0 8px}
.hero h1{font-size:34px;line-height:1.2;margin:0 0 12px}
.hero p{color:var(--muted);margin:0}
.cards{list-style:none;padding:0;margin:24px 0;display:grid;gap:16px}
.card{border:1px solid var(--line);border-radius:12px;padding:18px 20px;background:var(--soft)}
.card h2{font-size:21px;margin:6px 0}
.card h2 a{color:var(--ink);text-decoration:none}
.card p{margin:0;color:var(--muted);font-size:16px}
.tag,.meta{font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
.post h1{font-size:32px;line-height:1.25;margin:6px 0 18px}
.post h2{font-size:24px;margin:32px 0 8px}
.post h3{font-size:20px;margin:24px 0 6px}
.post blockquote{margin:16px 0;padding:8px 16px;border-left:4px solid var(--accent);background:var(--soft)}
.callout{margin:32px 0;padding:18px 20px;border:1px solid var(--accent);border-radius:12px;background:#eef3ff}
.callout p{margin:8px 0}
.button{display:inline-block;background:var(--accent);color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-size:16px}
.note{font-size:15px;color:var(--muted);border-top:1px solid var(--line);padding-top:16px;margin-top:32px}
.site-footer{margin-top:56px;border-top:1px solid var(--line);padding:24px 0;color:var(--muted);font-size:14px}
`;

function layout({ title, description, route, body, type = 'website', extraHead = '' }) {
  const fullTitle = route === '/' ? SITE.name + ' | ' + SITE.tagline : title + ' | ' + SITE.name;
  const url = SITE.url + route;
  return `<!doctype html>
<html lang='en'>
<head>
<meta charset='utf-8'>
<meta name='viewport' content='width=device-width, initial-scale=1'>
<title>${esc(fullTitle)}</title>
<meta name='description' content='${esc(description)}'>
<link rel='canonical' href='${url}'>
<meta property='og:title' content='${esc(fullTitle)}'>
<meta property='og:description' content='${esc(description)}'>
<meta property='og:type' content='${type}'>
<meta property='og:url' content='${url}'>
<link rel='stylesheet' href='/assets/style.css'>
${extraHead}
</head>
<body>
<header class='site-header'><div class='wrap'><a class='brand' href='/'>${SITE.name}</a><nav><a href='/'>Guides</a><a href='/about/'>About</a><a href='${ATTESTLY}'>Attestly</a></nav></div></header>
<main class='wrap'>
${body}
</main>
<footer class='site-footer'><div class='wrap'><p>General information only, not legal advice. Laws change, so check current rules or speak to a qualified lawyer. <a href='/disclaimer/'>Read the full disclaimer</a>.</p><p>ActAI Compliance is run by the team behind <a href='${ATTESTLY}'>Attestly</a>. &copy; ${new Date().getFullYear()}</p></div></footer>
</body>
</html>
`;
}

const callout = `<aside class='callout'><strong>Need EU AI Act documentation?</strong><p>Attestly turns your AI agent traces into draft Annex IV technical documentation, with human review before anything is final. Attestly is built by the same team that runs this site.</p><p><a class='button' href='${ATTESTLY}'>See how Attestly works</a></p></aside>`;

function write(rel, content) {
  const f = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
}

function readDir(dir) {
  const d = path.join(__dirname, 'content', dir);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter(f => f.endsWith('.md')).map(f => parse(path.join(d, f)));
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
write('assets/style.css', CSS);

const posts = readDir('posts').sort((a, b) => (b.meta.date || '').localeCompare(a.meta.date || ''));
const urls = ['/'];

for (const p of posts) {
  const m = p.meta;
  const route = '/guides/' + m.slug + '/';
  const ld = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: m.title, description: m.description, datePublished: m.date, dateModified: m.updated || m.date, mainEntityOfPage: SITE.url + route, publisher: { '@type': 'Organization', name: SITE.name } });
  const body = `<article class='post'><p class='meta'>${esc(m.region || '')} &middot; Last reviewed ${esc(m.updated || m.date)}</p><h1>${esc(m.title)}</h1>${md(p.body)}${m.eu === 'true' ? callout : ''}<p class='note'>This article is general information, not legal advice. Rules change often, so check official sources before you rely on it.</p></article>`;
  write('guides/' + m.slug + '/index.html', layout({ title: m.title, description: m.description, route, body, type: 'article', extraHead: `<script type='application/ld+json'>${ld}</script>` }));
  urls.push(route);
}

const list = posts.map(p => `<li class='card'><span class='tag'>${esc(p.meta.region || '')}</span><h2><a href='/guides/${p.meta.slug}/'>${esc(p.meta.title)}</a></h2><p>${esc(p.meta.description)}</p></li>`).join('');
write('index.html', layout({ title: SITE.name, description: 'Plain-English guides to AI regulation and compliance around the world: EU, UK, US, Canada and beyond.', route: '/', body: `<section class='hero'><h1>AI regulation, explained country by country</h1><p>Plain-English guides for founders, developers and compliance teams building or using AI anywhere in the world.</p></section><ul class='cards'>${list}</ul>` }));

for (const pg of readDir('pages')) {
  const route = '/' + pg.meta.slug + '/';
  write(pg.meta.slug + '/index.html', layout({ title: pg.meta.title, description: pg.meta.description, route, body: `<article class='post'><h1>${esc(pg.meta.title)}</h1>${md(pg.body)}</article>` }));
  urls.push(route);
}

write('404.html', layout({ title: 'Page not found', description: 'Page not found', route: '/404', body: `<article class='post'><h1>Page not found</h1><p><a href='/'>Back to all guides</a></p></article>` }));
write('robots.txt', `User-agent: *
Allow: /
Sitemap: ${SITE.url}/sitemap.xml
`);
write('sitemap.xml', `<?xml version='1.0' encoding='UTF-8'?>
<urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9'>${urls.map(u => `<url><loc>${SITE.url}${u}</loc></url>`).join('')}</urlset>
`);
console.log('Built ' + posts.length + ' posts and ' + urls.length + ' URLs');
