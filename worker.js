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

function rank(question, guides, limit) {
  const terms = question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t.length > 1 && t !== 'ai' && !STOP.has(t));
  const has = (txt, t) => (t.length > 2 ? txt.includes(t) : new RegExp('\\b' + t + '\\b').test(txt));
  return guides.map((g) => {
    const hay = (g.title + ' ' + g.description + ' ' + g.slug.replace(/-/g, ' ') + ' ' + (g.region || '')).toLowerCase();
    let score = 0;
    for (const t of terms) if (has(hay, t)) score += has(g.title.toLowerCase(), t) ? 3 : 1;
    return { g, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit || 3);
}

function answer(question, guides) {
  const scored = rank(question, guides, 3);
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


// ---- MCP server (Streamable HTTP, stateless, JSON responses, read-only public data) ----
const MCP_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const TOOLS = [
  { name: 'search_guides', title: 'Search AI regulation guides', description: 'Find guides on AI regulation (EU AI Act, US, UK, Canada) that match a question. Returns titles, regions, descriptions and URLs.', inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'The question or keywords' }, limit: { type: 'integer', minimum: 1, maximum: 9, description: 'Max results (default 3)' } }, required: ['query'] }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: 'get_guide', title: 'Get a guide as Markdown', description: 'Return the full Markdown text of one guide by slug (slugs come from search_guides).', inputSchema: { type: 'object', properties: { slug: { type: 'string', description: 'Guide slug, e.g. eu-ai-act-explained' } }, required: ['slug'] }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: 'get_eu_ai_act_timeline', title: 'EU AI Act key dates', description: 'Return the EU AI Act application dates dataset (JSON) including changes from the 2026 AI Omnibus, with its last-verified date.', inputSchema: { type: 'object', properties: {} }, annotations: { readOnlyHint: true, openWorldHint: false } }
];
const textResult = (t, isError) => ({ content: [{ type: 'text', text: t }], isError: !!isError });

async function loadGuides(request, env) {
  const res = await env.ASSETS.fetch(new URL('/data/guides.json', request.url));
  return (await res.json()).guides || [];
}

async function callTool(name, args, request, env) {
  args = args || {};
  if (name === 'search_guides') {
    const q = String(args.query || '').trim();
    if (!q) return textResult('query is required', true);
    const guides = await loadGuides(request, env);
    const limit = Math.max(1, Math.min(9, parseInt(args.limit, 10) || 3));
    const hits = rank(q, guides, limit).map((x) => x.g);
    if (!hits.length) return textResult('No close match. Available guides: ' + guides.map((g) => g.slug).join(', '));
    return textResult(JSON.stringify(hits.map((g) => ({ slug: g.slug, title: g.title, region: g.region, description: g.description, url: g.url, markdown_url: g.markdown_url })), null, 2));
  }
  if (name === 'get_guide') {
    const slug = String(args.slug || '');
    const guides = await loadGuides(request, env);
    if (!/^[a-z0-9-]+$/.test(slug) || !guides.some((g) => g.slug === slug)) return textResult('Unknown slug. Available: ' + guides.map((g) => g.slug).join(', '), true);
    const res = await env.ASSETS.fetch(new URL('/guides/' + slug + '.md', request.url));
    return textResult(await res.text());
  }
  if (name === 'get_eu_ai_act_timeline') {
    const res = await env.ASSETS.fetch(new URL('/data/eu-ai-act-timeline.json', request.url));
    return textResult(await res.text());
  }
  return null;
}

async function mcpOne(msg, request, env) {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return { jsonrpc: '2.0', id: msg && msg.id !== undefined ? msg.id : null, error: { code: -32600, message: 'Invalid Request' } };
  const hasId = msg.id !== undefined && msg.id !== null;
  const ok = (result) => ({ jsonrpc: '2.0', id: msg.id, result });
  const err = (code, message) => ({ jsonrpc: '2.0', id: msg.id, error: { code, message } });
  if (!hasId) return null; // notification, e.g. notifications/initialized
  switch (msg.method) {
    case 'initialize': {
      const asked = msg.params && msg.params.protocolVersion;
      return ok({
        protocolVersion: MCP_VERSIONS.includes(asked) ? asked : MCP_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'actaicompliance', title: 'ActAI Compliance', version: '1.0.0' },
        instructions: 'Read-only access to ActAI Compliance guides on worldwide AI regulation. General information, not legal advice. Content is CC BY 4.0.'
      });
    }
    case 'ping': return ok({});
    case 'tools/list': return ok({ tools: TOOLS });
    case 'tools/call': {
      const p = msg.params || {};
      try {
        const r = await callTool(p.name, p.arguments, request, env);
        return r ? ok(r) : err(-32602, 'Unknown tool: ' + p.name);
      } catch (e) { return ok(textResult('Tool failed', true)); }
    }
    default: return err(-32601, 'Method not found');
  }
}

async function handleMcp(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version' } });
  if (request.method !== 'POST') return new Response('This MCP server supports POST only (Streamable HTTP, JSON responses).', { status: 405, headers: { Allow: 'POST, OPTIONS', ...CORS } });
  let body;
  try { body = await request.json(); } catch (e) { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400); }
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map((m) => mcpOne(m, request, env)))).filter(Boolean);
    return out.length ? json(out) : new Response(null, { status: 202, headers: CORS });
  }
  const out = await mcpOne(body, request, env);
  return out ? json(out) : new Response(null, { status: 202, headers: CORS });
}


const HTML_ROUTES = /^\/(?:|guides\/(?:[a-z0-9-]+\/)?|about\/|disclaimer\/|open-data\/)$/;
// ---- Markdown for agents: Accept: text/markdown returns a Markdown version of an HTML page ----
function wantsMarkdown(accept) {
  const q = {};
  String(accept || '').split(',').forEach((part) => {
    const bits = part.trim().split(';');
    const type = bits[0].trim().toLowerCase();
    let v = 1;
    bits.slice(1).forEach((b) => { const m = b.trim().match(/^q=([0-9.]+)$/i); if (m) v = parseFloat(m[1]); });
    if (type) q[type] = v;
  });
  const md = q['text/markdown'] || 0;
  if (md <= 0) return false;
  const html = q['text/html'] === undefined ? 0 : q['text/html'];
  return md >= html;
}
function markdownPath(pathname) {
  if (pathname === '/') return '/md/index.md';
  const p = pathname.replace(/\/+$/, '');
  return '/md' + p + (p === '/guides' ? '/index' : '') + '.md';
}
async function serveHtmlOrMarkdown(request, env, url) {
  if ((request.method === 'GET' || request.method === 'HEAD') && wantsMarkdown(request.headers.get('Accept'))) {
    const res = await env.ASSETS.fetch(new URL(markdownPath(url.pathname), request.url));
    if (res.ok) {
      const body = await res.text();
      return new Response(request.method === 'HEAD' ? null : body, { status: 200, headers: {
        'Content-Type': 'text/markdown; charset=utf-8', 'Vary': 'Accept', 'x-markdown-tokens': String(Math.ceil(body.length / 4)),
        'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff' } });
    }
  }
  const res = await env.ASSETS.fetch(request);
  const out = new Response(res.body, res);
  out.headers.append('Vary', 'Accept');
  return out;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/a2a' || url.pathname === '/a2a/') return handle(request, env);
    if (url.pathname === '/mcp' || url.pathname === '/mcp/') return handleMcp(request, env);
    if (HTML_ROUTES.test(url.pathname)) return serveHtmlOrMarkdown(request, env, url);
    return env.ASSETS.fetch(request);
  }
};
