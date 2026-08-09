/* ===== Call4All — Sitemap auto-generator (browser) =====
 * Rules live in data/sitemap-config.json (single source of truth).
 * Used by admin panel + scripts/generate-sitemap.mjs (Node, same logic).
 */
(function (global) {
  'use strict';

  function escapeXml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function metaForFile(filename, config) {
    if (!filename || filename === 'index.html') return config.home || { priority: 1.0, changefreq: 'daily' };
    for (const rule of config.rules || []) {
      if (new RegExp(rule.pattern, 'i').test(filename)) {
        return { priority: rule.priority, changefreq: rule.changefreq };
      }
    }
    return config.default || { priority: 0.8, changefreq: 'weekly' };
  }

  function buildEntries(config, htmlFiles, dynamicPages, properties, secondHandItems, handmadeItems) {
    const base = (config.baseUrl || 'https://call4all.co.in').replace(/\/$/, '');
    const exclude = new Set(config.excludeHtml || []);
    const today = new Date().toISOString().slice(0, 10);
    const entries = [];
    const seen = new Set();

    function add(loc, lastmod, meta) {
      if (seen.has(loc)) return;
      seen.add(loc);
      entries.push({
        loc,
        lastmod: lastmod || today,
        priority: meta.priority,
        changefreq: meta.changefreq
      });
    }

    const homeMeta = config.home || { priority: 1.0, changefreq: 'daily' };
    add(base + '/', today, homeMeta);

    (htmlFiles || []).forEach((file) => {
      const name = String(file).replace(/^\//, '');
      if (!name.endsWith('.html')) return;
      if (exclude.has(name)) return;
      if (name === 'index.html') return;
      add(base + '/' + name, today, metaForFile(name, config));
    });

    (config.extraPaths || []).forEach((p) => {
      add(base + '/' + p.path, today, { priority: p.priority, changefreq: p.changefreq });
    });

    const dynDefaults = config.dynamicPageDefaults || { priority: 0.75, changefreq: 'weekly' };
    if (config.includeDynamicPages !== false) {
      (dynamicPages || []).forEach((p) => {
        if (p.enabled === false || !p.slug) return;
        const lm = (p.updated_at || p.created_at || '').slice(0, 10) || today;
        add(
          base + '/page.html?slug=' + encodeURIComponent(p.slug),
          lm,
          dynDefaults
        );
      });
    }

    (properties || []).forEach((p) => {
      if (!p.id || String(p.status).toLowerCase() !== 'active' || String(p.approval_status).toLowerCase() !== 'approved') return;
      const lm = (p.reviewed_at || p.timestamp || '').slice(0, 10) || today;
      // Match the generated, indexable property SEO-page path.
      add(base + '/property-' + encodeURIComponent(p.id) + '.html', lm, { priority: 0.9, changefreq: 'daily' });
    });

    (secondHandItems || []).forEach((item) => {
      if (!item.id || String(item.status).toLowerCase() !== 'active' || String(item.approval_status).toLowerCase() !== 'approved') return;
      const lm = (item.reviewed_at || item.timestamp || '').slice(0, 10) || today;
      add(base + '/second-hand-item.html?id=' + encodeURIComponent(item.id), lm, { priority: 0.85, changefreq: 'daily' });
    });

    (handmadeItems || []).forEach((item) => {
      if (!item.id || String(item.status).toLowerCase() !== 'active' || String(item.approval_status).toLowerCase() !== 'approved' || Number(item.stock || 0) < 1) return;
      const lm = (item.reviewed_at || item.timestamp || '').slice(0, 10) || today;
      add(base + '/handmade-item.html?id=' + encodeURIComponent(item.id), lm, { priority: 0.88, changefreq: 'daily' });
    });

    entries.sort((a, b) => b.priority - a.priority || a.loc.localeCompare(b.loc));
    return entries;
  }

  function toXml(entries) {
    const body = entries.map((e) =>
      '  <url>\n' +
      '    <loc>' + escapeXml(e.loc) + '</loc>\n' +
      '    <lastmod>' + escapeXml(e.lastmod) + '</lastmod>\n' +
      '    <changefreq>' + escapeXml(e.changefreq) + '</changefreq>\n' +
      '    <priority>' + Number(e.priority).toFixed(2) + '</priority>\n' +
      '  </url>'
    ).join('\n');

    return (
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      body + '\n' +
      '</urlset>\n'
    );
  }

  function generate(config, htmlFiles, dynamicPages, properties, secondHandItems, handmadeItems) {
    return toXml(buildEntries(config, htmlFiles, dynamicPages, properties, secondHandItems, handmadeItems));
  }

  async function loadConfig() {
    const res = await fetch('/data/sitemap-config.json?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('Could not load sitemap-config.json');
    return res.json();
  }

  global.C4aSitemapGen = {
    generate,
    buildEntries,
    loadConfig,
    metaForFile
  };
})(typeof window !== 'undefined' ? window : globalThis);
