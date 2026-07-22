#!/usr/bin/env node
/**
 * Auto-generate sitemap.xml from public HTML files + site-config.json pages.
 * Run locally: node scripts/generate-sitemap.mjs
 * Also runs via GitHub Actions on every push to main.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

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

function isNoindexHtml(content) {
  return /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(content);
}

function buildEntries(config, htmlFiles, dynamicPages, properties, secondHandItems) {
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

  add(base + '/', today, config.home || { priority: 1.0, changefreq: 'daily' });

  for (const file of htmlFiles) {
    const name = path.basename(file);
    if (!name.endsWith('.html')) continue;
    if (exclude.has(name)) continue;
    if (name === 'index.html') continue;

    const full = path.join(ROOT, name);
    if (!fs.existsSync(full)) continue;
    const html = fs.readFileSync(full, 'utf8');
    if (isNoindexHtml(html)) continue;

    add(base + '/' + name, today, metaForFile(name, config));
  }

  for (const p of config.extraPaths || []) {
    add(base + '/' + p.path, today, { priority: p.priority, changefreq: p.changefreq });
  }

  const dynDefaults = config.dynamicPageDefaults || { priority: 0.75, changefreq: 'weekly' };
  if (config.includeDynamicPages !== false) {
    for (const p of dynamicPages || []) {
      if (p.enabled === false || !p.slug) continue;
      const lm = (p.updated_at || p.created_at || '').slice(0, 10) || today;
      add(base + '/page.html?slug=' + encodeURIComponent(p.slug), lm, dynDefaults);
    }
  }

  for (const p of properties || []) {
    if (!p.id || String(p.status).toLowerCase() !== 'active' || String(p.approval_status).toLowerCase() !== 'approved') continue;
    const lm = (p.reviewed_at || p.timestamp || '').slice(0, 10) || today;
    add(base + '/property.html?id=' + encodeURIComponent(p.id), lm, { priority: 0.9, changefreq: 'daily' });
  }

  for (const item of secondHandItems || []) {
    if (!item.id || String(item.status).toLowerCase() !== 'active' || String(item.approval_status).toLowerCase() !== 'approved') continue;
    const lm = (item.reviewed_at || item.timestamp || '').slice(0, 10) || today;
    add(base + '/second-hand-item.html?id=' + encodeURIComponent(item.id), lm, { priority: 0.85, changefreq: 'daily' });
  }

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

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function parseCsv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted && ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
    else if (ch === '"') quoted = !quoted;
    else if (ch === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((ch === '\n' || ch === '\r') && !quoted) { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); if (row.some(Boolean)) rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const headers = rows.shift() || [];
  return rows.map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] || ''])));
}

function listRootHtmlFiles() {
  return fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
}

function main() {
  const config = loadJson('data/sitemap-config.json');
  let siteConfig = { pages: [] };
  try {
    siteConfig = loadJson('data/site-config.json');
  } catch (_) { /* optional */ }

  const htmlFiles = listRootHtmlFiles();
  const pages = (siteConfig.pages || []).filter((p) => p.enabled !== false && p.slug);
  let properties = [];
  try { properties = parseCsv(fs.readFileSync(path.join(ROOT, 'data/properties.csv'), 'utf8')); } catch (_) { /* optional */ }
  let secondHandItems = [];
  try { secondHandItems = parseCsv(fs.readFileSync(path.join(ROOT, 'data/second-hand-items.csv'), 'utf8')); } catch (_) { /* optional */ }
  const entries = buildEntries(config, htmlFiles, pages, properties, secondHandItems);
  const xml = toXml(entries);
  const outPath = path.join(ROOT, 'sitemap.xml');

  fs.writeFileSync(outPath, xml, 'utf8');
  console.log('✅ sitemap.xml generated — ' + entries.length + ' URLs');
  entries.forEach((e) => console.log('  • ' + e.loc));
}

main();
