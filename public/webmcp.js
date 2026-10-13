/* WebMCP: exposes read-only site tools to in-browser AI agents via navigator.modelContext. */
(function () {
  'use strict';
  var mc = navigator.modelContext;
  if (!mc || typeof mc.registerTool !== 'function') return;

  var STOP = 'the a an and or of to in on for is are was be by with what how do does can i my we our you your it this that about from as at not which who when where why should must need will'.split(' ');
  var controller = new AbortController();
  var guidesCache = null;

  function text(t) { return { content: [{ type: 'text', text: t }] }; }
  function getJson(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }); }
  function getText(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }); }
  function guides() {
    if (!guidesCache) guidesCache = getJson('/data/guides.json').then(function (d) { return d.guides || []; });
    return guidesCache;
  }
  function rank(q, list) {
    var terms = String(q).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(function (t) { return t.length > 1 && STOP.indexOf(t) < 0; });
    return list.map(function (g) {
      var title = g.title.toLowerCase();
      var hay = (title + ' ' + g.description + ' ' + g.slug.replace(/-/g, ' ') + ' ' + (g.region || '')).toLowerCase();
      var score = 0;
      terms.forEach(function (t) { if (hay.indexOf(t) >= 0) score += title.indexOf(t) >= 0 ? 3 : 1; });
      return { g: g, score: score };
    }).filter(function (x) { return x.score > 0; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 5).map(function (x) { return x.g; });
  }
  function find(slug) {
    return guides().then(function (list) { return list.filter(function (g) { return g.slug === slug; })[0]; });
  }

  var tools = [
    {
      name: 'search_guides',
      description: 'Search the AI regulation guides on this site (EU AI Act, US, UK, Canada). Returns titles, regions, descriptions and URLs of the best matches.',
      inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Question or topic, e.g. "is my hiring AI high-risk under the EU AI Act"' } }, required: ['query'] },
      annotations: { readOnlyHint: true },
      execute: function (args) {
        return guides().then(function (list) {
          var hits = rank((args && args.query) || '', list);
          if (!hits.length) hits = list.slice(0, 3);
          return text(JSON.stringify(hits.map(function (g) { return { slug: g.slug, title: g.title, region: g.region, description: g.description, url: g.url }; }), null, 2));
        });
      }
    },
    {
      name: 'get_guide',
      description: 'Return the full Markdown text of one guide by its slug (slugs come from search_guides).',
      inputSchema: { type: 'object', properties: { slug: { type: 'string', description: 'Guide slug, e.g. eu-ai-act-explained' } }, required: ['slug'] },
      annotations: { readOnlyHint: true },
      execute: function (args) {
        return find(args && args.slug).then(function (g) {
          if (!g) return text('Unknown slug.');
          return getText('/guides/' + g.slug + '.md').then(text);
        });
      }
    },
    {
      name: 'get_eu_ai_act_timeline',
      description: 'Return the EU AI Act key dates dataset (JSON), including the date it was last verified.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: function () { return getText('/data/eu-ai-act-timeline.json').then(text); }
    },
    {
      name: 'open_guide',
      description: 'Navigate the browser to a guide so the user can read it.',
      inputSchema: { type: 'object', properties: { slug: { type: 'string', description: 'Guide slug' } }, required: ['slug'] },
      execute: function (args) {
        return find(args && args.slug).then(function (g) {
          if (!g) return text('Unknown slug.');
          window.location.assign('/guides/' + g.slug + '/');
          return text('Opening ' + g.title);
        });
      }
    }
  ];

  tools.forEach(function (t) {
    try { mc.registerTool(t, { signal: controller.signal }); } catch (e) { /* already registered or unsupported */ }
  });

  // Unregister when the page goes away.
  window.addEventListener('pagehide', function () { controller.abort(); });
})();
