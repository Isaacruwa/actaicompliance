// Personal report: start an order, check its status, view a finished report, and deliver it once Paddle confirms payment.
import { validateAnswers, buildReport, renderReportHtml, renderReportText } from './report.js';

const SITE = 'https://actaicompliance.com';
const NO_STORE = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...NO_STORE } });
const page = (body, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', ...NO_STORE } });
const ID_RE = /^[0-9a-f]{32}$/;

function newId() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function viewPage(innerHtml) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Your personal AI law report</title></head><body style="margin:0;background:#f6f7fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif"><div style="max-width:720px;margin:0 auto;padding:20px 16px"><p style="margin:0 0 12px"><a href="' + SITE + '/" style="color:#4f46e5;text-decoration:none;font-weight:700">&larr; ActAI Compliance</a></p><div style="background:#fff;border-radius:14px;padding:22px 20px">' + innerHtml + '</div></div></body></html>';
}

async function sendReportEmail(env, to, report, id) {
  if (!env.RESEND_API_KEY) return false;
  const from = env.FROM_EMAIL || 'ActAI Compliance <briefing@actaicompliance.com>';
  const link = SITE + '/report/r/' + id;
  const inner = '<p style="margin:0 0 14px">Thank you for your order. Your report is below. You can also open it any time at <a href="' + link + '" style="color:#4f46e5">' + link + '</a>.</p>' + renderReportHtml(report, to);
  const html = '<!doctype html><html><body style="margin:0;background:#f6f7fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif"><div style="max-width:660px;margin:0 auto;padding:24px 16px"><div style="padding:18px 22px;background:#0b1220;border-radius:14px 14px 0 0;color:#fff;font-weight:700;font-size:18px">ActAI Compliance</div><div style="background:#fff;padding:24px 22px;border-radius:0 0 14px 14px">' + inner + '</div><p style="font-size:12px;color:#6b7280;text-align:center;margin:16px 0 0">You received this because you bought a personal AI law report at actaicompliance.com. Questions? Reply to this email.</p></div></body></html>';
  const text = 'Thank you for your order. You can also open your report at ' + link + '\n\n' + renderReportText(report);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject: 'Your personal AI law report', html, text, reply_to: 'isaac@actaicompliance.com' })
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Called from the Paddle webhook when a transaction completes. Returns false if delivery should be retried. */
export async function onReportPaid(env, reportId, txnId) {
  if (!env.DB || !ID_RE.test(String(reportId || ''))) return true;
  const row = await env.DB.prepare('SELECT id, email, answers, emailed_at FROM reports WHERE id = ?').bind(reportId).first();
  if (!row) return true;
  if (row.emailed_at) return true;
  const now = new Date().toISOString();
  let answers;
  try { answers = JSON.parse(row.answers); } catch { return true; }
  const report = buildReport(answers);
  await env.DB.prepare("UPDATE reports SET report = ?, status = 'ready', txn = ?, paid_at = COALESCE(paid_at, ?) WHERE id = ?").bind(JSON.stringify(report), String(txnId || ''), now, reportId).run();
  const ok = await sendReportEmail(env, row.email, report, reportId);
  if (ok) await env.DB.prepare('UPDATE reports SET emailed_at = ? WHERE id = ?').bind(now, reportId).run();
  return ok;
}

export async function handleReportApi(request, env, url) {
  const p = url.pathname.replace(/\/+$/, '');
  if (!p.startsWith('/report/')) return null;
  if (!env.DB) return json({ error: 'Not available yet.' }, 503);

  if (p === '/report/api/start') {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) return json({ error: 'Bad origin' }, 403);
    const raw = await request.text();
    if (raw.length > 20000) return json({ error: 'Request too large' }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: 'Bad request' }, 400); }
    const v = validateAnswers(body && body.answers);
    if (v.error) return json({ error: v.error }, 400);
    const since = new Date(Date.now() - 3600e3).toISOString();
    const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM reports WHERE email = ? AND created_at > ?').bind(v.answers.email, since).first();
    if (recent && recent.n >= 6) return json({ error: 'Too many attempts. Please try again later.' }, 429);
    const id = newId();
    await env.DB.prepare("INSERT INTO reports (id, email, answers, status, created_at) VALUES (?, ?, ?, 'draft', ?)").bind(id, v.answers.email, JSON.stringify(v.answers), new Date().toISOString()).run();
    return json({ id });
  }

  if (p === '/report/api/status') {
    const id = url.searchParams.get('id') || '';
    if (!ID_RE.test(id)) return json({ error: 'Not found' }, 404);
    const row = await env.DB.prepare('SELECT email, report, status FROM reports WHERE id = ?').bind(id).first();
    if (!row) return json({ error: 'Not found' }, 404);
    if (row.status !== 'ready' || !row.report) return json({ status: 'pending' });
    return json({ status: 'ready', html: renderReportHtml(JSON.parse(row.report), row.email) });
  }

  const m = p.match(/^\/report\/r\/([0-9a-f]{32})$/);
  if (m) {
    const row = await env.DB.prepare('SELECT email, report, status FROM reports WHERE id = ?').bind(m[1]).first();
    if (!row || row.status !== 'ready' || !row.report) return page(viewPage('<h1 style="font-size:22px">Report not found</h1><p>This link is not valid, or the report is not ready yet. If you paid and cannot see it, write to isaac@actaicompliance.com.</p>'), 404);
    return page(viewPage(renderReportHtml(JSON.parse(row.report), row.email)));
  }
  return null;
}
