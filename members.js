import { onReportPaid } from './reportapi.js';
import { WELCOME_SUBJECT, WELCOME_BODY } from './welcome.js';
// Subscriber storage (Paddle webhooks), password-protected admin page and briefing sending (Resend).
// Secure by default: every admin route returns 503 until ADMIN_PASSWORD (12+ chars) and the DB binding are configured.

const NO_STORE = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
const SITE = 'https://actaicompliance.com';
const ACTIVE = ['active', 'trialing'];

const html = (body, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', ...NO_STORE } });
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...NO_STORE } });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const enc = new TextEncoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/* ---------- Paddle webhook ---------- */
export async function verifyPaddleSignature(rawBody, header, secret, nowSec = Math.floor(Date.now() / 1000)) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(';').map((p) => p.split('=')).filter((p) => p.length === 2));
  const ts = parts.ts, h1 = parts.h1;
  if (!ts || !h1) return false;
  if (Math.abs(nowSec - Number(ts)) > 300) return false;
  const expected = await hmacHex(secret, ts + ':' + rawBody);
  return safeEqual(expected, h1);
}

async function handlePaddleWebhook(request, env) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!env.PADDLE_WEBHOOK_SECRET || !env.DB) return new Response('Not configured', { status: 503 });
  const raw = await request.text();
  const ok = await verifyPaddleSignature(raw, request.headers.get('Paddle-Signature'), env.PADDLE_WEBHOOK_SECRET);
  if (!ok) return new Response('Invalid signature', { status: 401 });
  let evt;
  try { evt = JSON.parse(raw); } catch { return new Response('Bad JSON', { status: 400 }); }
  const id = evt.event_id, type = evt.event_type, d = evt.data || {};
  if (!id || !type) return new Response('Ignored', { status: 200 });
  const seen = await env.DB.prepare('SELECT id FROM events WHERE id = ?').bind(id).first();
  if (seen) return new Response('OK', { status: 200 });
  const now = new Date().toISOString();
  if (type === 'customer.created' || type === 'customer.updated') {
    if (d.id) {
      await env.DB.prepare('INSERT INTO customers (id, email, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4) ON CONFLICT(id) DO UPDATE SET email = ?2, name = ?3, updated_at = ?4')
        .bind(d.id, (d.email || '').toLowerCase(), d.name || '', now).run();
    }
  } else if (type.startsWith('subscription.')) {
    if (d.id) {
      await env.DB.prepare('INSERT INTO subscriptions (id, customer_id, status, started_at, canceled_at, next_billed_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ON CONFLICT(id) DO UPDATE SET customer_id = ?2, status = ?3, started_at = COALESCE(?4, started_at), canceled_at = ?5, next_billed_at = ?6, updated_at = ?7')
        .bind(d.id, d.customer_id || '', d.status || '', d.started_at || d.created_at || null, d.canceled_at || null, d.next_billed_at || null, now).run();
    }
  }
  if (type === 'transaction.completed' && d.custom_data && d.custom_data.report_id) {
    let delivered = false;
    try { delivered = await onReportPaid(env, d.custom_data.report_id, d.id); } catch { delivered = false; }
    if (!delivered) return new Response('Report delivery failed, retry', { status: 500 });
  }
  let welcomed = true;
  try { welcomed = await maybeWelcome(env, type.startsWith('customer.') ? d.id : (type.startsWith('subscription.') ? d.customer_id : '')); } catch { welcomed = false; }
  if (!welcomed) return new Response('Welcome email failed, retry', { status: 500 });
  await env.DB.prepare('INSERT OR IGNORE INTO events (id, type, at) VALUES (?, ?, ?)').bind(id, type, now).run();
  return new Response('OK', { status: 200 });
}

/* ---------- Cloudflare Access ---------- */
let jwksCache = { at: 0, keys: null };
function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
async function getJwks(team) {
  if (jwksCache.keys && Date.now() - jwksCache.at < 3600e3) return jwksCache.keys;
  const res = await fetch('https://' + team + '/cdn-cgi/access/certs');
  if (!res.ok) throw new Error('certs');
  const j = await res.json();
  jwksCache = { at: Date.now(), keys: j.keys || [] };
  return jwksCache.keys;
}
export async function verifyAccessJwt(token, env, nowSec = Math.floor(Date.now() / 1000), keysOverride = null) {
  const [h, p, s] = String(token || '').split('.');
  if (!h || !p || !s) return null;
  const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(h)));
  const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(p)));
  if (header.alg !== 'RS256') return null;
  const keys = keysOverride || (await getJwks(env.ACCESS_TEAM_DOMAIN));
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(s), enc.encode(h + '.' + p));
  if (!valid) return null;
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.ACCESS_AUD)) return null;
  if (payload.iss !== 'https://' + env.ACCESS_TEAM_DOMAIN) return null;
  if (!payload.exp || payload.exp < nowSec) return null;
  if (!payload.email) return null;
  return payload;
}
const ADMIN_EMAIL_DEFAULT = 'isaac@actaicompliance.com';
const SESSION_SECONDS = 8 * 3600;
function getCookie(request, name) {
  const m = (request.headers.get('Cookie') || '').split(/;\s*/).find((c) => c.startsWith(name + '='));
  return m ? m.slice(name.length + 1) : '';
}
async function makeSession(env) {
  const exp = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  return exp + '.' + (await hmacHex('session:' + env.ADMIN_PASSWORD, exp));
}
async function sessionValid(request, env) {
  const v = getCookie(request, 'actai_admin');
  const i = v.indexOf('.');
  if (i < 1) return false;
  const exp = v.slice(0, i);
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(await hmacHex('session:' + env.ADMIN_PASSWORD, exp), v.slice(i + 1));
}
function loginPage(msg) {
  return html('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Admin login</title><body style="font:16px system-ui;max-width:360px;margin:15vh auto;padding:0 20px"><h1 style="font-size:22px">ActAI admin</h1>' + (msg ? '<p style="color:#b00020">' + msg + '</p>' : '') + '<form method="post" action="/admin/login"><input id="pw" type="password" name="password" placeholder="Password" autofocus required style="width:100%;padding:10px;font-size:16px;box-sizing:border-box"><label style="display:block;margin-top:10px;font-size:15px"><input type="checkbox" onchange="document.getElementById(&quot;pw&quot;).type=this.checked?&quot;text&quot;:&quot;password&quot;"> Show password</label><button style="margin-top:12px;padding:10px 18px;font-size:16px">Log in</button></form></body>', msg ? 401 : 200);
}
async function requireAdmin(request, env) {
  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 12 || !env.DB) return { error: html('<h1>Admin is not configured yet</h1>', 503) };
  if (!(await sessionValid(request, env))) return { login: true };
  return { user: { email: env.ADMIN_EMAIL || ADMIN_EMAIL_DEFAULT } };
}

/* ---------- email content ---------- */
export function bodyToHtml(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const inline = (s) => esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" style="color:#4f46e5">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" style="color:#4f46e5">$2</a>');
  const out = [];
  let list = false, para = [];
  const flush = () => { if (para.length) { out.push('<p style="margin:0 0 16px;line-height:1.65">' + para.join('<br>') + '</p>'); para = []; } };
  const closeList = () => { if (list) { out.push('</ul>'); list = false; } };
  for (const line of lines) {
    if (/^##\s+/.test(line)) { flush(); closeList(); out.push('<h2 style="margin:24px 0 8px;font-size:19px;color:#0b1220">' + inline(line.replace(/^##\s+/, '')) + '</h2>'); }
    else if (/^[-*]\s+/.test(line)) { flush(); if (!list) { out.push('<ul style="margin:0 0 16px;padding-left:20px;line-height:1.65">'); list = true; } out.push('<li style="margin:0 0 6px">' + inline(line.replace(/^[-*]\s+/, '')) + '</li>'); }
    else if (!line.trim()) { flush(); closeList(); }
    else { closeList(); para.push(inline(line)); }
  }
  flush(); closeList();
  return out.join('');
}
function wrapEmail(inner, unsubUrl) {
  return '<!doctype html><html><body style="margin:0;background:#f6f7fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937"><div style="max-width:620px;margin:0 auto;padding:24px 16px"><div style="padding:18px 22px;background:#0b1220;border-radius:14px 14px 0 0;color:#fff;font-weight:700;font-size:18px">ActAI Compliance <span style="font-weight:400;color:#c7d2fe">AI Regulation Tracker</span></div><div style="background:#fff;padding:26px 22px;border-radius:0 0 14px 14px;font-size:16px">' + inner + '</div><p style="font-size:12px;color:#6b7280;text-align:center;line-height:1.6;margin:18px 0 0">General information, not legal advice. You are receiving this because you subscribed to the AI Regulation Tracker at actaicompliance.com.<br><a href="' + unsubUrl + '" style="color:#6b7280">Unsubscribe</a> &middot; <a href="' + SITE + '/privacy/" style="color:#6b7280">Privacy</a></p></div></body></html>';
}
function stripToText(text, unsubUrl) {
  return String(text || '').replace(/\r\n/g, '\n') + '\n\n--\nGeneral information, not legal advice.\nUnsubscribe: ' + unsubUrl + '\n';
}
async function unsubUrlFor(env, email) {
  const t = (await hmacHex(env.PADDLE_WEBHOOK_SECRET || 'x', 'unsub:' + email)).slice(0, 32);
  return SITE + '/unsubscribe?e=' + encodeURIComponent(email) + '&t=' + t;
}

async function sendBatch(env, messages) {
  const res = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(messages)
  });
  return res.ok;
}
async function sendBriefing(env, subject, bodyText, recipients) {
  const from = env.FROM_EMAIL || 'ActAI Compliance <briefing@actaicompliance.com>';
  const inner = bodyToHtml(bodyText);
  let failed = 0;
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100);
    const msgs = [];
    for (const to of chunk) {
      const u = await unsubUrlFor(env, to);
      msgs.push({ from, to: [to], subject, html: wrapEmail(inner, u), text: stripToText(bodyText, u), reply_to: 'isaac@actaicompliance.com', headers: { 'List-Unsubscribe': '<' + u + '>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } });
    }
    const ok = await sendBatch(env, msgs);
    if (!ok) failed += chunk.length;
  }
  return failed;
}

/* ---------- automatic first briefing ---------- */
async function maybeWelcome(env, customerId) {
  if (!customerId || !env.RESEND_API_KEY) return true;
  const row = await env.DB.prepare("SELECT c.email AS email FROM customers c WHERE c.id = ?1 AND c.email != '' AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.customer_id = c.id AND s.status IN ('active','trialing')) AND c.email NOT IN (SELECT email FROM unsubscribed) AND c.email NOT IN (SELECT email FROM welcomed)").bind(customerId).first();
  if (!row) return true;
  const claim = await env.DB.prepare('INSERT OR IGNORE INTO welcomed (email, at) VALUES (?, ?)').bind(row.email, new Date().toISOString()).run();
  if (!claim.meta || !claim.meta.changes) return true;
  let failed = 1;
  try { failed = await sendBriefing(env, WELCOME_SUBJECT, WELCOME_BODY, [row.email]); } catch { failed = 1; }
  if (failed) {
    await env.DB.prepare('DELETE FROM welcomed WHERE email = ?').bind(row.email).run();
    return false;
  }
  await env.DB.prepare('INSERT INTO sends (subject, recipients, failed, test, at) VALUES (?, 1, 0, 2, ?)').bind(WELCOME_SUBJECT, new Date().toISOString()).run();
  return true;
}

/* ---------- data ---------- */
async function loadData(env) {
  const subs = await env.DB.prepare('SELECT s.id, s.status, s.started_at, s.canceled_at, s.next_billed_at, c.email, c.name, (SELECT 1 FROM unsubscribed u WHERE u.email = c.email) AS unsub FROM subscriptions s LEFT JOIN customers c ON c.id = s.customer_id ORDER BY s.started_at DESC').all();
  const sends = await env.DB.prepare('SELECT subject, recipients, failed, test, at FROM sends ORDER BY id DESC LIMIT 20').all();
  const rows = subs.results || [];
  const since = new Date(Date.now() - 30 * 86400e3).toISOString();
  const active = rows.filter((r) => ACTIVE.includes(r.status));
  return {
    stats: {
      active: active.length,
      reachable: active.filter((r) => r.email && !r.unsub).length,
      canceled: rows.filter((r) => r.status === 'canceled').length,
      pastDue: rows.filter((r) => r.status === 'past_due').length,
      newLast30: rows.filter((r) => r.started_at && r.started_at >= since).length,
      briefingsSent: (sends.results || []).filter((s) => !s.test).length
    },
    subscribers: rows.map((r) => ({ email: r.email || '(email not received yet)', name: r.name || '', status: r.status, started: r.started_at, nextBilled: r.next_billed_at, unsubscribed: !!r.unsub })),
    sends: sends.results || []
  };
}
async function activeEmails(env) {
  const q = await env.DB.prepare("SELECT DISTINCT c.email FROM subscriptions s JOIN customers c ON c.id = s.customer_id WHERE s.status IN ('active','trialing') AND c.email != '' AND c.email NOT IN (SELECT email FROM unsubscribed)").all();
  return (q.results || []).map((r) => r.email);
}

/* ---------- admin page ---------- */
const ADMIN_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Admin | ActAI Compliance</title>
<style>
:root{--ink:#0b1220;--muted:#5b6578;--line:#e6e9f2;--brand:#4f46e5;--soft:#f6f7fb}
*{box-sizing:border-box}body{margin:0;font:15px/1.55 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;background:var(--soft)}
header{background:var(--ink);color:#fff;padding:16px 20px;font-weight:700}header span{font-weight:400;color:#c7d2fe}
main{max-width:980px;margin:0 auto;padding:20px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px}.card b{display:block;font-size:28px;color:var(--ink)}.card small{color:var(--muted)}
section{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px;margin-bottom:20px}h2{margin:0 0 12px;font-size:18px;color:var(--ink)}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--line)}th{color:var(--muted);font-weight:600}
.tag{display:inline-block;padding:2px 8px;border-radius:99px;background:#eef2ff;color:#3730a3;font-size:12px;font-weight:700}.tag.bad{background:#fee2e2;color:#991b1b}.tag.ok{background:#dcfce7;color:#166534}
input,textarea{width:100%;font:inherit;padding:10px;border:1px solid var(--line);border-radius:10px;margin-bottom:10px}textarea{min-height:280px;resize:vertical}
button{font:inherit;font-weight:700;border:0;border-radius:10px;padding:11px 18px;cursor:pointer;background:var(--brand);color:#fff;margin-right:8px}button.alt{background:#fff;color:var(--ink);border:1px solid var(--line)}button:disabled{opacity:.5}
#msg{margin-top:10px;font-weight:600}.hint{color:var(--muted);font-size:13px;margin:0 0 10px}.scroll{overflow-x:auto}
</style></head><body><header>ActAI Compliance <span>Admin</span></header><main>
<div class="cards" id="cards"></div>
<section><h2>Write and send a briefing</h2>
<p class="hint">Plain text. Use ## for a heading, - for bullets, **bold**, and links like [name](https://...). Every email gets an unsubscribe link automatically.</p>
<input id="subj" placeholder="Subject, e.g. AI Regulation Tracker, November 2026">
<textarea id="body" placeholder="Write your briefing here..."></textarea>
<button id="test" class="alt">Send a test to me</button><button id="send">Send to all active subscribers</button>
<button id="welcometest" class="alt" style="margin-top:8px">Send me the welcome email (test)</button>
<div id="msg"></div></section>
<section><h2>Subscribers</h2><div class="scroll"><table><thead><tr><th>Email</th><th>Status</th><th>Started</th><th>Next payment</th></tr></thead><tbody id="subs"></tbody></table></div></section>
<section><h2>Briefings sent</h2><div class="scroll"><table><thead><tr><th>When</th><th>Subject</th><th>Sent to</th><th>Failed</th><th>Type</th></tr></thead><tbody id="sends"></tbody></table></div></section>
</main><script>
var D=null;
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e}
function d(s){return s?new Date(s).toLocaleDateString():''}
function load(){fetch('/admin/api/data',{credentials:'same-origin'}).then(function(r){return r.json()}).then(function(j){D=j;
 var c=document.getElementById('cards');c.textContent='';
 [['Active subscribers',j.stats.active],['Can receive email',j.stats.reachable],['New, last 30 days',j.stats.newLast30],['Cancelled',j.stats.canceled],['Payment overdue',j.stats.pastDue],['Briefings sent',j.stats.briefingsSent]].forEach(function(x){var k=el('div','card');k.appendChild(el('b',0,x[1]));k.appendChild(el('small',0,x[0]));c.appendChild(k)});
 var s=document.getElementById('subs');s.textContent='';
 if(!j.subscribers.length){var tr=el('tr');var td=el('td',0,'No subscribers yet.');td.colSpan=4;tr.appendChild(td);s.appendChild(tr)}
 j.subscribers.forEach(function(r){var tr=el('tr');tr.appendChild(el('td',0,r.email+(r.unsubscribed?' (unsubscribed)':'')));var td=el('td');td.appendChild(el('span','tag '+(r.status==='active'?'ok':(r.status==='canceled'?'bad':'')),r.status));tr.appendChild(td);tr.appendChild(el('td',0,d(r.started)));tr.appendChild(el('td',0,d(r.nextBilled)));s.appendChild(tr)});
 var h=document.getElementById('sends');h.textContent='';
 j.sends.forEach(function(r){var tr=el('tr');tr.appendChild(el('td',0,d(r.at)));tr.appendChild(el('td',0,r.subject));tr.appendChild(el('td',0,r.recipients));tr.appendChild(el('td',0,r.failed));tr.appendChild(el('td',0,r.test?'Test':'Briefing'));h.appendChild(tr)});
})}
function send(test){
 var subj=document.getElementById('subj').value.trim(),body=document.getElementById('body').value.trim(),m=document.getElementById('msg');
 if(!subj||!body){m.textContent='Add a subject and a message first.';return}
 var n=D?D.stats.reachable:0;
 if(!test&&!confirm('Send this briefing to '+n+' subscriber(s)? This cannot be undone.'))return;
 m.textContent='Sending...';document.getElementById('send').disabled=true;document.getElementById('test').disabled=true;
 fetch('/admin/api/send',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({subject:subj,body:body,test:test})}).then(function(r){return r.json()}).then(function(j){
  m.textContent=j.error?('Error: '+j.error):(test?'Test sent to you.':('Sent to '+j.sent+' subscriber(s)'+(j.failed?(', '+j.failed+' failed'):'')+'.'));
  document.getElementById('send').disabled=false;document.getElementById('test').disabled=false;load()
 }).catch(function(){m.textContent='Something went wrong. Nothing was confirmed as sent.';document.getElementById('send').disabled=false;document.getElementById('test').disabled=false});
}
document.getElementById('test').onclick=function(){send(true)};
document.getElementById('send').onclick=function(){send(false)};
document.getElementById('welcometest').onclick=function(){var m=document.getElementById('msg');m.textContent='Sending...';fetch('/admin/api/send',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({welcome:true})}).then(function(r){return r.json()}).then(function(j){m.textContent=j.error?('Error: '+j.error):'Welcome email sent to you.';load()}).catch(function(){m.textContent='Something went wrong.'})};
load();
</script></body></html>`;

/* ---------- router ---------- */
export async function handleMembers(request, env, url) {
  const p = url.pathname.replace(/\/+$/, '') || '/';
  if (p === '/paddle/webhook') return handlePaddleWebhook(request, env);

  if (p === '/unsubscribe') {
    const email = (url.searchParams.get('e') || '').toLowerCase();
    const token = url.searchParams.get('t') || '';
    if (!env.DB || !env.PADDLE_WEBHOOK_SECRET || !email) return html('<h1>Link not valid</h1>', 400);
    const expected = (await hmacHex(env.PADDLE_WEBHOOK_SECRET, 'unsub:' + email)).slice(0, 32);
    if (!safeEqual(expected, token)) return html('<h1>Link not valid</h1>', 400);
    await env.DB.prepare('INSERT OR IGNORE INTO unsubscribed (email, at) VALUES (?, ?)').bind(email, new Date().toISOString()).run();
    return html('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font:16px system-ui;max-width:520px;margin:15vh auto;padding:0 20px"><h1>You are unsubscribed</h1><p>You will no longer receive the AI Regulation Tracker emails. If you also want to stop billing, cancel through the link in your Paddle receipt, or email isaac@actaicompliance.com.</p><p><a href="' + SITE + '/">Back to ActAI Compliance</a></p></body>');
  }

  if (p === '/admin' || p.startsWith('/admin/')) {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    if (p === '/admin/login' && request.method === 'POST') {
      if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 12) return html('<h1>Admin is not configured yet</h1>', 503);
      const origin = request.headers.get('Origin');
      if (origin && origin !== url.origin) return html('<h1>Forbidden</h1>', 403);
      let pw = '';
      try { pw = String((await request.formData()).get('password') || ''); } catch {}
      if (!safeEqual(await hmacHex('login', pw), await hmacHex('login', env.ADMIN_PASSWORD))) {
        await new Promise((r) => setTimeout(r, 1500));
        return loginPage('Wrong password.');
      }
      return new Response(null, { status: 303, headers: { Location: '/admin', 'Set-Cookie': 'actai_admin=' + (await makeSession(env)) + '; HttpOnly; Secure; SameSite=Strict; Path=/admin; Max-Age=' + SESSION_SECONDS, 'Cache-Control': 'no-store' } });
    }
    if (p === '/admin/logout') return new Response(null, { status: 303, headers: { Location: '/admin', 'Set-Cookie': 'actai_admin=; HttpOnly; Secure; SameSite=Strict; Path=/admin; Max-Age=0' } });
    if (auth.login) return p === '/admin' && request.method === 'GET' ? loginPage('') : json({ error: 'Not logged in' }, 401);
    if (p === '/admin' && request.method === 'GET') return html(ADMIN_PAGE);
    if (p === '/admin/api/data' && request.method === 'GET') return json(await loadData(env));
    if (p === '/admin/api/send' && request.method === 'POST') {
      const origin = request.headers.get('Origin');
      if (origin && origin !== url.origin) return json({ error: 'Bad origin' }, 403);
      if (!env.RESEND_API_KEY) return json({ error: 'Email sending is not set up yet (missing RESEND_API_KEY).' }, 503);
      let b;
      try { b = await request.json(); } catch { return json({ error: 'Bad request' }, 400); }
      if (b.welcome) {
        const to = auth.user.email.toLowerCase();
        const failedW = await sendBriefing(env, '[TEST] ' + WELCOME_SUBJECT, WELCOME_BODY, [to]);
        await env.DB.prepare('INSERT INTO sends (subject, recipients, failed, test, at) VALUES (?, 1, ?, 1, ?)').bind(WELCOME_SUBJECT, failedW, new Date().toISOString()).run();
        return failedW ? json({ error: 'Sending failed. Check the Resend key and domain.' }, 502) : json({ sent: 1, failed: 0 });
      }
      const subject = String(b.subject || '').trim().slice(0, 200), body = String(b.body || '').trim();
      if (!subject || !body) return json({ error: 'Subject and message are required.' }, 400);
      const recipients = b.test ? [auth.user.email.toLowerCase()] : await activeEmails(env);
      if (!recipients.length) return json({ error: 'No active subscribers to send to.' }, 400);
      const failed = await sendBriefing(env, b.test ? '[TEST] ' + subject : subject, body, recipients);
      await env.DB.prepare('INSERT INTO sends (subject, recipients, failed, test, at) VALUES (?, ?, ?, ?, ?)').bind(subject, recipients.length, failed, b.test ? 1 : 0, new Date().toISOString()).run();
      return json({ sent: recipients.length - failed, failed });
    }
    return html('<h1>Not found</h1>', 404);
  }
  return null;
}
