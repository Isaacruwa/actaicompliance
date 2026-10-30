const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const SITE = { name: 'ActAI Compliance', url: 'https://actaicompliance.com', tagline: 'AI regulation, made clear' };
const ATTESTLY = 'https://attestly.online/?utm_source=actaicompliance';
const DIST = path.join(__dirname, 'dist');
const FLAGS = { 'European Union': '🇪🇺', 'United Kingdom': '🇬🇧', 'United States': '🇺🇸', 'Canada': '🇨🇦', 'Global overview': '🌍' };
const ORDER = ['eu-ai-act-explained', 'us-ai-regulation', 'us-state-ai-laws', 'uk-ai-regulation', 'canada-ai-regulation', 'which-ai-laws-apply-to-you'];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const fmtDate = s => new Date(s + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function inline(s) {
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => `<a href='${u}'>${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return s;
}

function md(src) {
  const lines = src.split(/\r?\n/);
  const out = [];
  const headings = [];
  let para = [];
  let list = null;
  const flushP = () => { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } };
  const flushL = () => { if (list) { out.push('<' + list.t + '>' + list.items.map(i => '<li>' + inline(i) + '</li>').join('') + '</' + list.t + '>'); list = null; } };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (!l.trim()) { flushP(); flushL(); continue; }
    let m;
    if ((m = l.match(/^(#{2,3})\s+(.*)$/))) {
      flushP(); flushL();
      const n = m[1].length;
      const id = slug(m[2]);
      if (n === 2) headings.push({ id, text: m[2] });
      out.push('<h' + n + " id='" + id + "'>" + inline(m[2]) + '</h' + n + '>');
      continue;
    }
    if ((m = l.match(/^[-*]\s+(.*)$/))) { flushP(); if (!list || list.t !== 'ul') { flushL(); list = { t: 'ul', items: [] }; } list.items.push(m[1]); continue; }
    if ((m = l.match(/^\d+\.\s+(.*)$/))) { flushP(); if (!list || list.t !== 'ol') { flushL(); list = { t: 'ol', items: [] }; } list.items.push(m[1]); continue; }
    if (l.startsWith('> ')) { flushP(); flushL(); out.push('<blockquote>' + inline(l.slice(2)) + '</blockquote>'); continue; }
    flushL();
    para.push(l.trim());
  }
  flushP();
  flushL();
  return { html: out.join(''), headings };
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

/* ---------- App icons (generated, no dependencies) ---------- */
const crcTable = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function renderIcon(size, rounded) {
  const buf = Buffer.alloc(size * size * 4);
  const SS = 3;
  const shield = [[0.5, 0.2], [0.78, 0.3], [0.78, 0.52], [0.5, 0.8], [0.22, 0.52], [0.22, 0.3]];
  const check = [[0.38, 0.5], [0.47, 0.59], [0.64, 0.4]];
  const inPoly = (x, y, p) => { let inside = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const xi = p[i][0], yi = p[i][1], xj = p[j][0], yj = p[j][1]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside; } return inside; };
  const segDist = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1]; let t = ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy); t = Math.max(0, Math.min(1, t)); return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy)); };
  const inRound = (x, y, r) => { const cx = Math.min(Math.max(x, r), 1 - r), cy = Math.min(Math.max(y, r), 1 - r); return Math.hypot(x - cx, y - cy) <= r; };
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const c1 = [79, 70, 229], c2 = [6, 182, 212];
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, hits = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / size, y = (py + (sy + 0.5) / SS) / size;
          if (rounded && !inRound(x, y, 0.22)) continue;
          let col = mix(c1, c2, (x + y) / 2);
          if (inPoly(x, y, shield)) {
            col = [255, 255, 255];
            if (segDist(x, y, check[0], check[1]) <= 0.03 || segDist(x, y, check[1], check[2]) <= 0.03) col = mix(c1, c2, 0.25);
          }
          r += col[0]; g += col[1]; b += col[2]; hits++;
        }
      }
      const i = (py * size + px) * 4;
      if (hits) { buf[i] = Math.round(r / hits); buf[i + 1] = Math.round(g / hits); buf[i + 2] = Math.round(b / hits); buf[i + 3] = Math.round(255 * hits / (SS * SS)); }
    }
  }
  return png(size, size, buf);
}

const MARK = `<svg viewBox='0 0 64 64' aria-hidden='true'><defs><linearGradient id='mk' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#4f46e5'/><stop offset='1' stop-color='#06b6d4'/></linearGradient></defs><rect width='64' height='64' rx='14' fill='url(#mk)'/><path d='M32 12.8 49.9 19.2V33.3L32 51.2 14.1 33.3V19.2Z' fill='#fff'/><path d='M24.3 32l5.8 5.8 10.9-12.2' fill='none' stroke='#4f46e5' stroke-width='3.8' stroke-linecap='round' stroke-linejoin='round'/></svg>`;

const CSS = `:root{--ink:#0b1220;--text:#1f2937;--muted:#5b6578;--brand:#4f46e5;--brand2:#06b6d4;--soft:#f6f7fb;--line:#e6e9f2;--radius:16px}
*{box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;font:16px/1.65 ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:var(--text);background:#fff;-webkit-font-smoothing:antialiased}
a{color:var(--brand)}
svg{max-width:100%}
.container{max-width:1120px;margin:0 auto;padding:0 20px}
.site-header{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.86);backdrop-filter:saturate(180%) blur(12px);-webkit-backdrop-filter:saturate(180%) blur(12px);border-bottom:1px solid var(--line)}
.site-header .container{display:flex;align-items:center;justify-content:space-between;height:64px}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);font-weight:800;font-size:19px;letter-spacing:-.02em}
.brand span{font-weight:500;color:var(--muted)}
.brand svg{width:30px;height:30px;flex:none}
.nav{display:flex;align-items:center;gap:4px}
.nav a{padding:8px 12px;border-radius:10px;text-decoration:none;color:var(--text);font-weight:600;font-size:15px}
.nav a:hover{background:var(--soft)}
.nav .cta{background:var(--ink);color:#fff;margin-left:6px}
.nav .cta:hover{background:#1c2740}
@media(max-width:600px){.nav .hide-sm{display:none}}
.hero{position:relative;overflow:hidden;color:#fff;background:radial-gradient(900px 420px at 15% -10%,rgba(79,70,229,.55),transparent 60%),radial-gradient(800px 400px at 95% 10%,rgba(6,182,212,.35),transparent 55%),linear-gradient(180deg,#0b1220 0%,#111a33 100%)}
.hero:after{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);background-size:44px 44px;-webkit-mask-image:linear-gradient(180deg,#000 30%,transparent 100%);mask-image:linear-gradient(180deg,#000 30%,transparent 100%);pointer-events:none}
.hero .container{position:relative;z-index:1;padding-top:72px;padding-bottom:84px;max-width:880px;text-align:center}
.pill{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(255,255,255,.07);font-size:13px;font-weight:600;color:#dbe4ff}
.pill i{width:7px;height:7px;border-radius:50%;background:#34d399;display:inline-block}
.hero h1{font-size:clamp(38px,7.5vw,64px);line-height:1.06;letter-spacing:-.035em;margin:20px 0 16px;font-weight:800}
.hero h1 em{font-style:normal;background:linear-gradient(90deg,#a5b4fc,#67e8f9);-webkit-background-clip:text;background-clip:text;color:transparent}
.hero p.lead{font-size:clamp(17px,2.4vw,20px);color:#c7d2ee;max-width:640px;margin:0 auto 30px}
.btns{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
.btn{display:inline-flex;align-items:center;gap:8px;padding:14px 22px;border-radius:12px;font-weight:700;font-size:16px;text-decoration:none;transition:transform .15s,box-shadow .15s}
.btn:hover{transform:translateY(-1px)}
.btn-primary{background:linear-gradient(135deg,#4f46e5,#06b6d4);color:#fff;box-shadow:0 10px 30px -10px rgba(79,70,229,.8)}
.btn-ghost{background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.22)}
.checks{display:flex;flex-wrap:wrap;gap:10px 22px;justify-content:center;margin-top:34px;color:#b7c4e6;font-size:14px;font-weight:600}
.checks span:before{content:'✓';color:#34d399;margin-right:7px}
.section{padding:72px 0}
.section.soft{background:var(--soft)}
.eyebrow{font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--brand)}
.section h2.title{font-size:clamp(28px,4.5vw,40px);line-height:1.15;letter-spacing:-.03em;margin:8px 0 12px;color:var(--ink);font-weight:800}
.section p.sub{color:var(--muted);max-width:620px;margin:0 0 36px;font-size:18px}
.grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}
.card{display:flex;flex-direction:column;gap:10px;padding:24px;border:1px solid var(--line);border-radius:var(--radius);background:#fff;text-decoration:none;color:inherit;transition:transform .2s,box-shadow .2s,border-color .2s}
.card:hover{transform:translateY(-3px);box-shadow:0 18px 40px -22px rgba(15,23,60,.35);border-color:#cfd6ee}
.card .flag{font-size:30px;line-height:1}
.card .region{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--brand)}
.card h3{margin:0;font-size:20px;line-height:1.3;color:var(--ink);letter-spacing:-.015em}
.card p{margin:0;color:var(--muted);font-size:15px}
.card .meta{font-size:13px;color:#8a93a7}
.card .more{margin-top:auto;padding-top:6px;font-weight:700;color:var(--brand);font-size:15px}
.features{display:grid;gap:28px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.feature .ico{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(79,70,229,.12),rgba(6,182,212,.14));color:var(--brand);margin-bottom:14px}
.feature h3{margin:0 0 6px;font-size:18px;color:var(--ink)}
.feature p{margin:0;color:var(--muted);font-size:15px}
.team-strip{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin-bottom:10px;font-size:12px;color:rgba(255,255,255,.62)}
.team-strip a{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;color:inherit;text-decoration:none;opacity:.85}
.team-strip a:hover{opacity:1;text-decoration:underline}
.team-strip img,.team-strip .pi svg{width:14px;height:14px;display:block;border-radius:3px}
.team-strip .pi{display:inline-flex}
.page-hero{background:linear-gradient(180deg,#f6f7fb,#fff);border-bottom:1px solid var(--line)}
.page-hero .container{max-width:820px;padding-top:44px;padding-bottom:36px}
.crumbs{font-size:14px;color:var(--muted);margin-bottom:14px}
.crumbs a{color:var(--muted);text-decoration:none}
.crumbs a:hover{color:var(--brand)}
.page-hero h1{font-size:clamp(30px,5.5vw,46px);line-height:1.12;letter-spacing:-.03em;margin:12px 0 14px;color:var(--ink);font-weight:800}
.page-hero .lead{font-size:19px;color:var(--muted);margin:0 0 18px}
.badges{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;font-size:14px;color:var(--muted)}
.badge{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;background:#eef0ff;color:#3730a3;font-weight:700;font-size:13px}
.prose{max-width:720px;margin:0 auto;padding:36px 20px 8px;font-size:18px;line-height:1.78}
.prose h2{font-size:28px;line-height:1.25;letter-spacing:-.02em;margin:44px 0 10px;color:var(--ink);scroll-margin-top:84px}
.prose h3{font-size:21px;margin:30px 0 6px;color:var(--ink)}
.prose p{margin:0 0 18px}
.prose ul,.prose ol{margin:0 0 20px;padding-left:22px}
.prose li{margin:8px 0}
.prose li::marker{color:var(--brand);font-weight:700}
.prose a{text-underline-offset:3px}
.prose blockquote{margin:20px 0;padding:12px 18px;border-left:4px solid var(--brand);background:var(--soft);border-radius:0 12px 12px 0}
.toc{border:1px solid var(--line);background:var(--soft);border-radius:var(--radius);padding:18px 22px;margin:0 0 8px;font-size:16px;line-height:1.6}
.toc strong{display:block;color:var(--ink);margin-bottom:6px;font-size:13px;letter-spacing:.1em;text-transform:uppercase}
.toc ol{margin:0;padding-left:20px}
.toc li{margin:4px 0}
.toc a{text-decoration:none;color:var(--text)}
.toc a:hover{color:var(--brand)}
.callout{margin:40px 0 8px;padding:26px;border-radius:var(--radius);color:#fff;background:linear-gradient(135deg,#312e81,#4f46e5 55%,#0891b2)}
.callout strong{font-size:20px;display:block;margin-bottom:6px}
.callout p{margin:0 0 16px;color:#e0e7ff;font-size:16px;line-height:1.6}
.callout .btn{background:#fff;color:#312e81;padding:12px 18px;font-size:15px}
.note{max-width:720px;margin:28px auto 0;padding:18px 20px 0;border-top:1px solid var(--line);font-size:14px;color:var(--muted)}
.site-footer{background:#0b1220;color:#9aa6c4;padding:56px 0 28px;font-size:15px}
.footer-grid{display:grid;gap:32px;grid-template-columns:1.4fr 1fr 1fr}
@media(max-width:720px){.footer-grid{grid-template-columns:1fr}}
.site-footer h4{color:#fff;margin:0 0 12px;font-size:13px;letter-spacing:.1em;text-transform:uppercase}
.site-footer a{color:#9aa6c4;text-decoration:none;display:block;padding:4px 0}
.site-footer a:hover{color:#fff}
.site-footer .brand{color:#fff;margin-bottom:12px}
.site-footer .brand span{color:#9aa6c4}
.site-footer p{margin:0;max-width:340px}
.footer-bottom{border-top:1px solid rgba(255,255,255,.1);margin-top:36px;padding-top:20px;font-size:13px}
@media(prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}
`;

const cssUrl = '/assets/style.css?v=' + crypto.createHash('md5').update(CSS).digest('hex').slice(0, 8);

const IC = (d) => `<svg viewBox='0 0 24 24' width='22' height='22' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'>${d}</svg>`;
const FEATURES = [
  { icon: IC("<path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/><path d='M22 4 12 14.01l-3-3'/>"), title: 'Built from official sources', text: 'Each guide points you to the official texts and regulator pages to check for yourself.' },
  { icon: IC("<rect x='3' y='4' width='18' height='18' rx='2'/><path d='M16 2v4M8 2v4M3 10h18'/>"), title: 'Dated and re-reviewed', text: 'Every guide shows when it was last reviewed, because AI rules change fast.' },
  { icon: IC("<path d='M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z'/><path d='M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'/>"), title: 'Written for humans', text: 'No walls of legal jargon. Clear explanations for founders, developers and compliance teams.' }
];

const PARTNER_MARK = `<svg viewBox='0 0 64 64' aria-hidden='true'><rect width='64' height='64' rx='14' fill='#4f46e5'/><path d='M32 12.8 49.9 19.2V33.3L32 51.2 14.1 33.3V19.2Z' fill='#fff'/><path d='M24.3 32l5.8 5.8 10.9-12.2' fill='none' stroke='#4f46e5' stroke-width='3.8' stroke-linecap='round' stroke-linejoin='round'/></svg>`;
const fav = (d) => `<img src='https://www.google.com/s2/favicons?domain=${d}&sz=32' width='16' height='16' alt='' loading='lazy' decoding='async' referrerpolicy='no-referrer'>`;
const PARTNERS = [
  { href: ATTESTLY, name: 'Attestly', icon: `<span class='pi'>${PARTNER_MARK}</span>` },
  { href: 'https://getkiver.com', name: 'Kiver', icon: fav('getkiver.com') },
  { href: 'https://eobcheck.online', name: 'EOBCheck', icon: fav('eobcheck.online') }
];

const partnersStrip = `<div class='team-strip'><span>From our team:</span>${PARTNERS.map(p => `<a href='${p.href}' target='_blank' rel='noopener'><span>${p.name}</span>${p.icon}</a>`).join('')}</div>`;

function layout({ title, description, route, body, type = 'website', extraHead = '', guides = [] }) {
  const fullTitle = route === '/' ? SITE.name + ' | ' + SITE.tagline : title + ' | ' + SITE.name;
  const url = SITE.url + route;
  const footerGuides = guides.map(g => `<a href='/guides/${g.meta.slug}/'>${esc(g.meta.title.split(':')[0])}</a>`).join('');
  return `<!doctype html>
<html lang='en'>
<head>
<meta charset='utf-8'>
<meta name='viewport' content='width=device-width, initial-scale=1, viewport-fit=cover'>
<title>${esc(fullTitle)}</title>
<meta name='description' content='${esc(description)}'>
<link rel='canonical' href='${url}'>
<meta name='theme-color' content='#0b1220'>
<meta property='og:site_name' content='${SITE.name}'>
<meta property='og:title' content='${esc(fullTitle)}'>
<meta property='og:description' content='${esc(description)}'>
<meta property='og:type' content='${type}'>
<meta property='og:url' content='${url}'>
<meta name='twitter:card' content='summary'>
<link rel='manifest' href='/manifest.webmanifest'>
<link rel='icon' href='/favicon.svg' type='image/svg+xml'>
<link rel='icon' href='/icons/icon-192.png' sizes='192x192' type='image/png'>
<link rel='apple-touch-icon' href='/icons/apple-touch-icon.png'>
<meta name='mobile-web-app-capable' content='yes'>
<meta name='apple-mobile-web-app-capable' content='yes'>
<meta name='apple-mobile-web-app-title' content='ActAI'>
<meta name='apple-mobile-web-app-status-bar-style' content='black-translucent'>
<link rel='stylesheet' href='${cssUrl}'>
${extraHead}
</head>
<body>
<header class='site-header'><div class='container'><a class='brand' href='/'>${MARK}ActAI <span>Compliance</span></a><nav class='nav'><a href='/#guides'>Guides</a><a href='/about/'>About</a><a class='cta hide-sm' href='/guides/which-ai-laws-apply-to-you/'>Which laws apply to me?</a></nav></div></header>
<main>
${body}
</main>
<footer class='site-footer'><div class='container'><div class='footer-grid'><div><a class='brand' href='/'>${MARK}ActAI <span>Compliance</span></a><p>Plain-English guides to AI regulation around the world.</p></div><div><h4>Guides</h4>${footerGuides}</div><div><h4>Site</h4><a href='/about/'>About</a><a href='/disclaimer/'>Disclaimer</a><a href='/sitemap.xml'>Sitemap</a></div></div><div class='footer-bottom'>${partnersStrip}&copy; ${new Date().getFullYear()} ${SITE.name}. General information only, not legal advice. Laws change, so check current rules or speak to a qualified lawyer.</div></div></footer>
<script src='/webmcp.js' defer></script>
<script>if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}</script>
</body>
</html>
`;
}

const callout = `<aside class='callout'><strong>Need EU AI Act documentation?</strong><p>Attestly turns your AI agent traces into draft Annex IV technical documentation, with human review before anything is final. Attestly is built by the same team that runs this site.</p><a class='btn' href='${ATTESTLY}'>See how Attestly works &rarr;</a></aside>`;

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

const readTime = body => Math.max(1, Math.round(body.split(/\s+/).length / 200));

function guideCard(p) {
  const m = p.meta;
  return `<a class='card' href='/guides/${m.slug}/'><span class='flag'>${FLAGS[m.region] || '🌐'}</span><span class='region'>${esc(m.region || '')}</span><h3>${esc(m.title)}</h3><p>${esc(m.description)}</p><span class='meta'>Reviewed ${fmtDate(m.updated || m.date)} &middot; ${readTime(p.body)} min read</span><span class='more'>Read guide &rarr;</span></a>`;
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
write('assets/style.css', CSS);
write('favicon.svg', MARK.replace("aria-hidden='true'", "xmlns='http://www.w3.org/2000/svg'"));
write('icons/icon-192.png', renderIcon(192, true));
write('icons/icon-512.png', renderIcon(512, true));
write('icons/icon-maskable-512.png', renderIcon(512, false));
write('icons/apple-touch-icon.png', renderIcon(180, false));

const posts = readDir('posts').sort((a, b) => {
  const ia = ORDER.indexOf(a.meta.slug), ib = ORDER.indexOf(b.meta.slug);
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
});
const urls = ['/'];
const precache = ['/', '/offline/', '/about/', cssUrl, '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png'];

for (const p of posts) {
  const m = p.meta;
  const route = '/guides/' + m.slug + '/';
  const { html, headings } = md(p.body);
  const ld = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: m.title, description: m.description, datePublished: m.date, dateModified: m.updated || m.date, mainEntityOfPage: SITE.url + route, publisher: { '@type': 'Organization', name: SITE.name } });
  const toc = headings.length >= 3 ? `<nav class='toc'><strong>In this guide</strong><ol>${headings.map(h => `<li><a href='#${h.id}'>${esc(h.text)}</a></li>`).join('')}</ol></nav>` : '';
  const related = posts.filter(x => x.meta.slug !== m.slug).slice(0, 3).map(guideCard).join('');
  const body = `<div class='page-hero'><div class='container'><div class='crumbs'><a href='/'>Home</a> / <a href='/#guides'>Guides</a></div><span class='badge'>${FLAGS[m.region] || '🌐'} ${esc(m.region || '')}</span><h1>${esc(m.title)}</h1><p class='lead'>${esc(m.description)}</p><div class='badges'><span>Reviewed ${fmtDate(m.updated || m.date)}</span><span>&middot;</span><span>${readTime(p.body)} min read</span></div></div></div><article class='prose'>${toc}${html}${m.eu === 'true' ? callout : ''}</article><div class='note'>This article is general information, not legal advice. Rules change often, so check official sources before you rely on it.</div><section class='section'><div class='container'><div class='eyebrow'>Keep reading</div><h2 class='title'>More guides</h2><div class='grid'>${related}</div></div></section>`;
  write('guides/' + m.slug + '/index.html', layout({ title: m.title, description: m.description, route, body, type: 'article', extraHead: `<script type='application/ld+json'>${ld}</script>`, guides: posts }));
  urls.push(route);
  precache.push(route);
}

const home = `<section class='hero'><div class='container'><span class='pill'><i></i>Free guides, reviewed regularly</span><h1>AI regulation, <em>made clear.</em></h1><p class='lead'>Plain-English guides for founders, developers and compliance teams building or using AI anywhere in the world.</p><div class='btns'><a class='btn btn-primary' href='#guides'>Explore the guides &rarr;</a><a class='btn btn-ghost' href='/guides/which-ai-laws-apply-to-you/'>Which laws apply to me?</a></div><div class='checks'><span>Plain English</span><span>Dated on every guide</span><span>EU, UK, US, Canada and more</span></div></div></section><section class='section' id='guides'><div class='container'><div class='eyebrow'>Guides</div><h2 class='title'>Start with your region</h2><p class='sub'>Pick the place you operate in, or begin with the overview if you are not sure which rules apply.</p><div class='grid'>${posts.map(guideCard).join('')}</div></div></section><section class='section soft'><div class='container'><div class='eyebrow'>Why trust us</div><h2 class='title'>Clear, current, careful</h2><p class='sub'>AI law is new and changing quickly. Here is how we try to keep these guides useful.</p><div class='features'>${FEATURES.map(f => `<div class='feature'><div class='ico'>${f.icon}</div><h3>${f.title}</h3><p>${f.text}</p></div>`).join('')}</div></div></section>`;
write('index.html', layout({ title: SITE.name, description: 'Plain-English guides to AI regulation and compliance around the world: EU, UK, US, Canada and beyond.', route: '/', body: home, guides: posts }));

for (const pg of readDir('pages')) {
  const route = '/' + pg.meta.slug + '/';
  const { html } = md(pg.body);
  const body = `<div class='page-hero'><div class='container'><h1>${esc(pg.meta.title)}</h1><p class='lead'>${esc(pg.meta.description)}</p></div></div><article class='prose'>${html}</article>`;
  write(pg.meta.slug + '/index.html', layout({ title: pg.meta.title, description: pg.meta.description, route, body, guides: posts }));
  urls.push(route);
}


{
  const toolHtml = fs.readFileSync(path.join(__dirname, 'content', 'tools', 'eu-ai-act-checker.html'), 'utf8');
  const route = '/tools/eu-ai-act-checker/';
  const title = 'Do I Need to Comply with the EU AI Act?';
  const description = 'A free seven-question check that shows whether the EU AI Act applies to you, your likely role, key obligations, dates and official sources. Educational, not legal advice.';
  const body = `<div class='page-hero'><div class='container'><h1>${esc(title)}</h1><p class='lead'>${esc(description)}</p></div></div>` + toolHtml;
  write('tools/eu-ai-act-checker/index.html', layout({ title, description, route, body, guides: posts }));
  urls.push(route);
}
write('offline/index.html', layout({ title: 'You are offline', description: 'You are offline.', route: '/offline/', body: `<div class='page-hero'><div class='container'><h1>You are offline</h1><p class='lead'>This page is not saved on your device yet. Reconnect and try again, or open a guide you have already visited.</p><a class='btn btn-primary' href='/'>Back to home</a></div></div>`, guides: posts }));
write('404.html', layout({ title: 'Page not found', description: 'Page not found', route: '/404', body: `<div class='page-hero'><div class='container'><h1>Page not found</h1><p class='lead'>That page does not exist. Try the guides instead.</p><a class='btn btn-primary' href='/'>Back to all guides</a></div></div>`, guides: posts }));

write('manifest.webmanifest', JSON.stringify({
  name: SITE.name, short_name: 'ActAI', description: 'Plain-English guides to AI regulation around the world.',
  start_url: '/', scope: '/', display: 'standalone', background_color: '#0b1220', theme_color: '#0b1220', lang: 'en',
  categories: ['education', 'business'],
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
}, null, 2));

const SW = `const VERSION = 'actai-__V__';
const CORE = __CORE__;
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; }).catch(() => caches.match(req).then(r => r || caches.match('/offline/'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
`;
write('sw.js', SW.replace('__V__', Date.now().toString(36)).replace('__CORE__', JSON.stringify(precache)));

write('_headers', `/sw.js\n  Cache-Control: no-cache\n/manifest.webmanifest\n  Content-Type: application/manifest+json\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n`);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`);
write('sitemap.xml', `<?xml version='1.0' encoding='UTF-8'?>\n<urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9'>${urls.map(u => `<url><loc>${SITE.url}${u}</loc></url>`).join('')}</urlset>\n`);
console.log('Built ' + posts.length + ' posts and ' + urls.length + ' URLs');
