// IndexNow: tells Bing, Yandex and other participating search engines when a page is new or changed.
// Runs on a schedule. Reads our own sitemap, compares it with what was already sent, and submits the difference.
const HOST = 'actaicompliance.com';
const KEY = '69a9a34a62654421992f41db833ac23a';
const ENDPOINT = 'https://api.indexnow.org/indexnow';

export function parseSitemap(xml) {
  const out = [];
  const re = /<url>([\s\S]*?)<\/url>/g;
  let m;
  while ((m = re.exec(xml))) {
    const loc = (m[1].match(/<loc>([^<]+)<\/loc>/) || [])[1];
    const lastmod = (m[1].match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1] || '';
    if (loc && loc.startsWith('https://' + HOST + '/')) out.push({ url: loc.trim(), lastmod: lastmod.trim() });
  }
  return out;
}

export async function runIndexNow(env, fetchImpl) {
  const doFetch = fetchImpl || fetch;
  if (!env.DB || !env.ASSETS) return { skipped: 'not configured' };
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS indexnow_urls (url TEXT PRIMARY KEY, lastmod TEXT, submitted_at TEXT)').run();
  const res = await env.ASSETS.fetch(new Request('https://' + HOST + '/sitemap.xml'));
  if (!res.ok) return { error: 'sitemap ' + res.status };
  const entries = parseSitemap(await res.text());
  if (!entries.length) return { error: 'empty sitemap' };
  const { results } = await env.DB.prepare('SELECT url, lastmod FROM indexnow_urls').all();
  const known = new Map((results || []).map((r) => [r.url, r.lastmod]));
  const todo = entries.filter((e) => known.get(e.url) !== e.lastmod);
  if (!todo.length) return { submitted: 0 };
  const r = await doFetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: 'https://' + HOST + '/' + KEY + '.txt', urlList: todo.map((e) => e.url).slice(0, 10000) })
  });
  if (r.status !== 200 && r.status !== 202) return { error: 'indexnow ' + r.status };
  const now = new Date().toISOString();
  await env.DB.batch(todo.map((e) => env.DB.prepare('INSERT INTO indexnow_urls (url, lastmod, submitted_at) VALUES (?, ?, ?) ON CONFLICT(url) DO UPDATE SET lastmod = excluded.lastmod, submitted_at = excluded.submitted_at').bind(e.url, e.lastmod, now)));
  return { submitted: todo.length };
}
