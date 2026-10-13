// Minimal A2A (Agent2Agent) JSON-RPC endpoint. Everything else is served as static files.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, A2A-Version, A2A-Extensions'
};
const STOP = new Set('the a an and or of to in on for is are was be by with what how do does can i my we our you your it this that about from as at not which who when where why should must need will'.split(' '));
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });
const rpcError = (id, code, message) => json({ jsonrpc: '2.0', id: id === undefined ? null : id, error: { code, message } });

function textOf(message) {
  return ((message && message.parts) || []).map((p) => (p && typeof p.text === 'string' ? p.text : '')).join(' ').trim();
}

function answer(question, guides) {
  const terms = question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t.length > 2 && !STOP.has(t));
  const scored = guides.map((g) => {
    const hay = (g.title + ' ' + g.description + ' ' + g.slug.replace(/-/g, ' ') + ' ' + (g.region || '')).toLowerCase();
    let score = 0;
    for (const t of terms) if (hay.includes(t)) score += g.title.toLowerCase().includes(t) ? 3 : 1;
    return { g, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  const list = scored.length ? scored.map((x) => x.g) : guides.slice(0, 3);
  const lead = scored.length
    ? 'These guides on ActAI Compliance are the closest match to your question:'
    : 'I could not find a close match, so here are our main guides to start with:';
  return lead + '\n\n' + list.map((g) => '- ' + g.title + ' (' + g.region + '): ' + g.description + '\n  ' + g.url + ' (Markdown: ' + g.markdown_url + ')').join('\n') +
    '\n\nThis is general information, not legal advice. Facts last verified on the date in https://actaicompliance.com/data/guides.json.';
}

async function handle(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method === 'GET') {
    return json({ name: 'ActAI Compliance A2A endpoint', protocol: 'A2A JSON-RPC', method: 'SendMessage', agent_card: 'https://actaicompliance.com/.well-known/agent-card.json' });
  }
  if (request.method !== 'POST') return rpcError(null, -32600, 'Use POST with a JSON-RPC 2.0 request.');
  let body;
  try { body = await request.json(); } catch (e) { return rpcError(null, -32700, 'Parse error'); }
  const id = body && body.id;
  if (!body || body.jsonrpc !== '2.0' || typeof body.method !== 'string') return rpcError(id, -32600, 'Invalid JSON-RPC request');
  if (body.method !== 'SendMessage' && body.method !== 'message/send') return rpcError(id, -32601, 'Method not found. Supported: SendMessage');
  const msg = body.params && body.params.message;
  const q = textOf(msg);
  if (!q) return rpcError(id, -32602, 'params.message.parts must contain a text part');
  let guides = [];
  try {
    const res = await env.ASSETS.fetch(new URL('/data/guides.json', request.url));
    guides = (await res.json()).guides || [];
  } catch (e) { return rpcError(id, -32603, 'Internal error'); }
  const reply = {
    messageId: crypto.randomUUID(),
    role: 'ROLE_AGENT',
    parts: [{ text: answer(q, guides), mediaType: 'text/plain' }]
  };
  if (msg.contextId) reply.contextId = msg.contextId;
  return json({ jsonrpc: '2.0', id, result: { message: reply } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/a2a' || url.pathname === '/a2a/') return handle(request, env);
    return env.ASSETS.fetch(request);
  }
};
