/* ===== Call4All - Site-wide JavaScript ===== */

/* SITE_CONFIG holds runtime branding/contact/theme.
   Defaults below are used until `data/site-config.json` is loaded. */
window.SITE_CONFIG = {
  businessName: 'Call4All',
  tagline: 'One Call. Every Service. Done.',
  logoUrl: 'Imagelogo.png',
  logoHeight: 55,
  phone: '+917737353588',
  phoneDisplay: '+91 7737353588',
  whatsappNumber: '917737353588',
  email: 'info@call4all.co.in',
  website: 'www.call4all.co.in',
  address: 'India',
  aboutText: 'Your one-call solution for every need. From rental cars and rooms to construction labor, home tutors, and event services - we connect you to trusted providers.',
  theme: {
    preset: 'resort',
    primary: '#1f3a2e',
    primary_dark: '#122318',
    accent: '#c9a36a',
    accent_dark: '#a17f47',
    background: '#faf6ef',
    festival_overlay: 'none',
    festival_banner: ''
  },
  github: {
    owner: 'BRIJBHAN-SINGH234',
    repo: 'call4all',
    csvPath: 'data/bookings.csv',
    branch: 'main'
  },
  services: [
    { id: 'rental-cars',      name: 'Rental Cars',                 icon: '🚗', iconName: 'car',       desc: 'Premium & budget car rental for events and travel.',                 page: 'rental-cars.html',       image: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=900&q=80&auto=format&fit=crop' },
    { id: 'rooms-flats',      name: 'Rooms & Flats',               icon: '🏠', iconName: 'home',      desc: 'Rent rooms, flats and properties easily.',                            page: 'rooms-flats.html',       image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&q=80&auto=format&fit=crop' },
    { id: 'manpower-supply',  name: 'Manpower Supply',             icon: '👷', iconName: 'hard-hat',  desc: 'Skilled & unskilled manpower for any requirement.',                  page: 'manpower-supply.html',   image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=900&q=80&auto=format&fit=crop' },
    { id: 'construction',     name: 'Construction Labor / Thekedar', icon: '🧱', iconName: 'bricks',  desc: 'Construction labor, contractors and thekedar for your project.',     page: 'construction.html',      image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=900&q=80&auto=format&fit=crop' },
    { id: 'home-tutor',       name: 'Home Tutor',                  icon: '📚', iconName: 'book',      desc: 'Qualified home tutors for all classes and subjects.',                page: 'home-tutor.html',        image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900&q=80&auto=format&fit=crop' },
    { id: 'marriage-services',name: 'Marriage Services',           icon: '💍', iconName: 'ring',      desc: 'Complete wedding planning, decoration & rental items.',              page: 'marriage-services.html', image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=900&q=80&auto=format&fit=crop' },
    { id: 'flower-bouquet',   name: 'Hotel Flower Bouquet',        icon: '🌸', iconName: 'flower',    desc: 'Luxury flower decoration & bouquet service.',                        page: 'flower-bouquet.html',    image: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=900&q=80&auto=format&fit=crop' },
    { id: 'car-decoration',   name: 'Car Decoration',              icon: '🎀', iconName: 'bow',       desc: 'Luxury car decoration for weddings & events.',                       page: 'car-decoration.html',    image: 'https://images.unsplash.com/photo-1606013519235-f4f8b3ee5ae5?w=900&q=80&auto=format&fit=crop' },
    { id: 'other',            name: 'Other / Custom Service',      icon: '🛎️', iconName: 'bell',      desc: 'Need something else? Just tell us, we will arrange it.',             page: 'index.html#book',        image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=900&q=80&auto=format&fit=crop' }
  ],
  slider: {
    enabled: true,
    interval_ms: 5000,
    slides: [
      { id: 's1', enabled: true, icon: '🚗', iconName: 'car',      title: 'Rental Cars',           subtitle: 'Premium & budget cars for travel and events',        background_url: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1900&q=80&auto=format&fit=crop', link: 'rental-cars.html',       order: 1 },
      { id: 's2', enabled: true, icon: '🏠', iconName: 'home',     title: 'Rooms & Flats',         subtitle: 'Quick rentals — rooms, flats, PG, properties',       background_url: 'https://images.unsplash.com/photo-1501183638710-841dd1904471?w=1900&q=80&auto=format&fit=crop', link: 'rooms-flats.html',       order: 2 },
      { id: 's3', enabled: true, icon: '🧱', iconName: 'bricks',   title: 'Construction Labor',    subtitle: 'Mistri, mazdoor, thekedar — all just one call away', background_url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1900&q=80&auto=format&fit=crop', link: 'construction.html',      order: 3 },
      { id: 's4', enabled: true, icon: '📚', iconName: 'book',     title: 'Home Tutors',           subtitle: 'Qualified tutors for every class & subject',         background_url: 'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=1900&q=80&auto=format&fit=crop', link: 'home-tutor.html',        order: 4 },
      { id: 's5', enabled: true, icon: '👷', iconName: 'hard-hat', title: 'Manpower Supply',       subtitle: 'Skilled & unskilled manpower on demand',             background_url: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1900&q=80&auto=format&fit=crop', link: 'manpower-supply.html',   order: 5 },
      { id: 's6', enabled: true, icon: '💍', iconName: 'ring',     title: 'Marriage Services',     subtitle: 'Decoration, catering, rentals — A to Z',             background_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1900&q=80&auto=format&fit=crop', link: 'marriage-services.html', order: 6 },
      { id: 's7', enabled: true, icon: '🌸', iconName: 'flower',   title: 'Hotel Flower Bouquet',  subtitle: 'Luxury floral arrangements for hotels & events',     background_url: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=1900&q=80&auto=format&fit=crop', link: 'flower-bouquet.html',    order: 7 },
      { id: 's8', enabled: true, icon: '🎀', iconName: 'bow',      title: 'Car Decoration',        subtitle: 'Wedding & event car decoration',                     background_url: 'https://images.unsplash.com/photo-1606013519235-f4f8b3ee5ae5?w=1900&q=80&auto=format&fit=crop', link: 'car-decoration.html',    order: 8 }
    ]
  },
  pages: []
};

/* ===== Festival Theme Presets =====
   Each preset can optionally include a `logo` URL — when the admin picks the
   preset (or the theme is applied), the site logo is swapped to match the
   theme. Use the special value 'auto-3d' to render the auto-themed inline SVG
   that follows --primary / --accent CSS variables in real time. */
window.FESTIVAL_PRESETS = {
  resort: {
    label: 'Luxury Resort (Forest + Gold) — RECOMMENDED',
    emoji: '🌿',
    primary: '#1f3a2e',
    primary_dark: '#122318',
    accent: '#c9a36a',
    accent_dark: '#a17f47',
    background: '#faf6ef',
    festival_overlay: 'none',
    festival_banner: '',
    logo: 'assets/icons/themed-logos/logo-3d-resort.svg'
  },
  default: {
    label: 'Classic (Navy + Gold)',
    emoji: '🏷️',
    primary: '#1e3c72',
    primary_dark: '#142850',
    accent: '#ffcc00',
    accent_dark: '#e6b800',
    background: '#ffffff',
    festival_overlay: 'none',
    festival_banner: '',
    logo: 'assets/icons/themed-logos/logo-3d-default.svg'
  },
  diwali: {
    label: 'Diwali (Maroon + Gold)',
    emoji: '🪔',
    primary: '#8b0000',
    primary_dark: '#5e0000',
    accent: '#ffd700',
    accent_dark: '#daa520',
    background: '#fff8e7',
    festival_overlay: 'diwali',
    festival_banner: '🪔 Wishing you a Happy & Prosperous Diwali 🪔',
    logo: 'assets/icons/themed-logos/logo-3d-diwali.svg'
  },
  holi: {
    label: 'Holi (Pink + Yellow)',
    emoji: '🎨',
    primary: '#c2185b',
    primary_dark: '#880e4f',
    accent: '#ffeb3b',
    accent_dark: '#fbc02d',
    background: '#fff5f8',
    festival_overlay: 'holi',
    festival_banner: '🎨 Happy Holi - Colourful greetings to all! 🎨',
    logo: 'assets/icons/themed-logos/logo-3d-holi.svg'
  },
  christmas: {
    label: 'Christmas (Green + Red)',
    emoji: '🎄',
    primary: '#0a5d2c',
    primary_dark: '#063d1d',
    accent: '#d32f2f',
    accent_dark: '#a01a1a',
    background: '#f6fff6',
    festival_overlay: 'christmas',
    festival_banner: '🎄 Merry Christmas & Happy New Year 🎄',
    logo: 'assets/icons/themed-logos/logo-3d-christmas.svg'
  },
  eid: {
    label: 'Eid (Green + Gold)',
    emoji: '🌙',
    primary: '#0e7c5a',
    primary_dark: '#0a5a40',
    accent: '#ffd54f',
    accent_dark: '#ffb300',
    background: '#f3fbf7',
    festival_overlay: 'eid',
    festival_banner: '🌙 Eid Mubarak to all our customers ⭐',
    logo: 'assets/icons/themed-logos/logo-3d-eid.svg'
  },
  independence: {
    label: 'Independence Day (Tricolor)',
    emoji: '🇮🇳',
    primary: '#138808',
    primary_dark: '#0c5a05',
    accent: '#ff9933',
    accent_dark: '#cc7a29',
    background: '#ffffff',
    festival_overlay: 'independence',
    festival_banner: '🇮🇳 Jai Hind! Happy Independence Day 🇮🇳',
    logo: 'assets/icons/themed-logos/logo-3d-independence.svg'
  },
  summer: {
    label: 'Summer (Orange + Cream)',
    emoji: '☀️',
    primary: '#e65100',
    primary_dark: '#a83b00',
    accent: '#ffd180',
    accent_dark: '#e6b366',
    background: '#fffaf0',
    festival_overlay: 'none',
    festival_banner: '',
    logo: 'assets/icons/themed-logos/logo-3d-summer.svg'
  },
  /* Special "auto-themed" entry — the logo follows --primary / --accent in
     real time via inline SVG. Pick this if the admin wants ONE logo that
     re-colors itself whenever the theme changes. */
  auto: {
    label: 'Auto 3D (follows current theme color)',
    emoji: '✨',
    primary: '#1f3a2e',
    primary_dark: '#122318',
    accent: '#c9a36a',
    accent_dark: '#a17f47',
    background: '#faf6ef',
    festival_overlay: 'none',
    festival_banner: '',
    logo: 'auto-3d'
  }
};

/* ===== Apply Theme to CSS Variables (call early) ===== */
function applyTheme(theme) {
  if (!theme) return;
  const r = document.documentElement.style;
  if (theme.primary) r.setProperty('--primary', theme.primary);
  if (theme.primary_dark) r.setProperty('--primary-dark', theme.primary_dark);
  if (theme.accent) r.setProperty('--accent', theme.accent);
  if (theme.accent_dark) r.setProperty('--accent-dark', theme.accent_dark);
  if (theme.background) document.documentElement.style.setProperty('--page-bg', theme.background);

  // Body class for festival overlay
  if (document.body) {
    const cls = ['festival-default','festival-diwali','festival-holi','festival-christmas','festival-eid','festival-independence'];
    cls.forEach(c => document.body.classList.remove(c));
    if (theme.festival_overlay && theme.festival_overlay !== 'none') {
      document.body.classList.add('festival-' + theme.festival_overlay);
    }
    if (theme.background) document.body.style.background = theme.background;
  }

  // Optional: theme can carry a `logo` URL (or the special 'auto-3d' value).
  // When present, swap the active site logo so it matches the theme color.
  if (theme.logo && window.SITE_CONFIG) {
    window.SITE_CONFIG.logoUrl = theme.logo;
  }
}

/* ===== Auto-themed 3D logo (inline SVG)  =====
   Returns an inline SVG string for the auto-themed 3D Call4All monogram.
   The ring + letters use currentColor / CSS variables, so the logo
   automatically re-colors whenever the theme's --accent / --accent-dark
   change (e.g. when the admin picks a different festival preset).
   Public: window.renderAutoLogoSvg(opts)
     opts.size  — pixel height (default 55) */
function renderAutoLogoSvg(opts) {
  const size = (opts && opts.size) || 55;
  // Unique IDs per render so multiple logos on the same page (admin preview
  // + header + grid card thumbnail) don't share / collide on gradients.
  const u = 'a' + Math.random().toString(36).slice(2, 9);
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" ' +
    'role="img" aria-label="Call4All Logo" class="c4a-auto-logo c4a-brand-logo" ' +
    'style="height:' + size + 'px;width:auto;display:block;color:var(--accent,#c9a36a);">' +
      '<defs>' +
        '<linearGradient id="' + u + '_ring" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%"   stop-color="#ffffff" stop-opacity="0.7"/>' +
          '<stop offset="50%"  stop-color="currentColor"/>' +
          '<stop offset="100%" stop-color="var(--accent-dark,#7a5e2e)"/>' +
        '</linearGradient>' +
        '<linearGradient id="' + u + '_c" x1="0.1" y1="0" x2="0.9" y2="1">' +
          '<stop offset="0%"   stop-color="#ffffff" stop-opacity="0.7"/>' +
          '<stop offset="45%"  stop-color="currentColor"/>' +
          '<stop offset="100%" stop-color="var(--accent-dark,#7a5e2e)"/>' +
        '</linearGradient>' +
        '<linearGradient id="' + u + '_4" x1="0" y1="0" x2="0.4" y2="1">' +
          '<stop offset="0%"   stop-color="#ffffff" stop-opacity="0.7"/>' +
          '<stop offset="50%"  stop-color="currentColor"/>' +
          '<stop offset="100%" stop-color="var(--accent-dark,#7a5e2e)"/>' +
        '</linearGradient>' +
        '<filter id="' + u + '_emb" x="-20%" y="-20%" width="140%" height="140%">' +
          '<feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-color="#000000" flood-opacity="0.45"/>' +
        '</filter>' +
      '</defs>' +
      '<g filter="url(#' + u + '_emb)">' +
        '<circle cx="100" cy="100" r="89" fill="none" stroke="url(#' + u + '_ring)" stroke-width="9"/>' +
        '<circle cx="100" cy="100" r="93.5" fill="none" stroke="var(--accent-dark,#7a5e2e)" stroke-width="0.6" opacity="0.55"/>' +
        '<circle cx="100" cy="100" r="84.5" fill="none" stroke="var(--accent-dark,#7a5e2e)" stroke-width="0.6" opacity="0.55"/>' +
      '</g>' +
      '<g filter="url(#' + u + '_emb)">' +
        '<text x="74" y="155" font-family="Georgia, \'Times New Roman\', \'Liberation Serif\', serif" ' +
        'font-weight="700" font-size="195" text-anchor="middle" ' +
        'fill="url(#' + u + '_c)">C</text>' +
      '</g>' +
      '<g filter="url(#' + u + '_emb)">' +
        '<text x="125" y="143" font-family="Georgia, \'Times New Roman\', \'Liberation Serif\', serif" ' +
        'font-weight="700" font-size="118" text-anchor="middle" ' +
        'fill="url(#' + u + '_4)">4</text>' +
      '</g>' +
    '</svg>'
  );
}
window.renderAutoLogoSvg = renderAutoLogoSvg;

/* Resolve any asset path so it loads correctly from anywhere on the site.
 * Newly-uploaded files inside `assets/uploads/` are served via
 * raw.githubusercontent.com — that bypasses GitHub Pages' build delay so
 * a freshly-uploaded logo/image works *immediately* (no `/` workaround
 * and no waiting for Pages to rebuild). */
function assetUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return optimizeImageUrl(path);
  if (/^data:/i.test(path)) return path;
  if (path.startsWith('assets/uploads/') || path.startsWith('/assets/uploads/')) {
    const cfg = window.SITE_CONFIG;
    const clean = path.replace(/^\//, '');
    return `https://raw.githubusercontent.com/${cfg.github.owner}/${cfg.github.repo}/${cfg.github.branch}/${clean}`;
  }
  return path;
}

/** Shrink Unsplash/CDN URLs on mobile to cut payload (major Lighthouse mobile win). */
function optimizeImageUrl(url, kind) {
  if (!url || !/^https?:\/\//i.test(url)) return url;
  if (!/images\.unsplash\.com/i.test(url)) return url;
  const narrow = window.matchMedia('(max-width: 768px)').matches;
  const w = kind === 'slide'
    ? (narrow ? 640 : 960)
    : kind === 'thumb'
      ? (narrow ? 320 : 560)
      : (narrow ? 400 : 800);
  const q = narrow ? 65 : 75;
  let out = url;
  if (/[?&]w=\d+/.test(out)) out = out.replace(/([?&])w=\d+/, `$1w=${w}`);
  else out += (out.includes('?') ? '&' : '?') + `w=${w}`;
  if (/[?&]q=\d+/.test(out)) out = out.replace(/([?&])q=\d+/, `$1q=${q}`);
  else out += `&q=${q}`;
  if (!/auto=format/.test(out)) out += '&auto=format&fit=crop';
  return out;
}
window.assetUrl = assetUrl;
window.optimizeImageUrl = optimizeImageUrl;

/* ===== Hero Slider (admin-managed via site-config.json) ===== */
let _sliderState = { idx: 0, timer: null, slides: [] };

function applySlideBackground(el, url) {
  if (!el || !url) return;
  const u = optimizeImageUrl(assetUrl(url), 'slide');
  el.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)),url('${u}')`;
  el.style.backgroundSize = 'cover';
  el.style.backgroundPosition = 'center';
  el.style.color = '#fff';
  el.classList.remove('slide-lazy');
  el.removeAttribute('data-bg');
}

function renderSlider() {
  const mount = document.getElementById('sliderMount');
  if (!mount) return;
  const cfg = window.SITE_CONFIG.slider || { enabled: true, interval_ms: 4500, slides: [] };
  if (cfg.enabled === false) { mount.innerHTML = ''; return; }

  const slides = (cfg.slides || [])
    .filter(s => s.enabled !== false)
    .slice()
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

  if (!slides.length) { mount.innerHTML = ''; return; }
  _sliderState.slides = slides;
  _sliderState.idx = 0;

  const ico = (name) => (typeof window.c4aIcon === 'function' && name) ? window.c4aIcon(name, { size: 30 }) : '';
  const html = `
    <div class="slider">
      <button class="arrow left" type="button" aria-label="Previous" onclick="moveSlide(-1)">&#10094;</button>
      <div class="slides" id="slides">
        ${slides.map((s, i) => {
          const iconHtml = s.iconName ? `<span class="slide-icon">${ico(s.iconName)}</span>` : '';
          const inner = `${iconHtml}<div>${escapeHtml(s.title || '')}</div><div class="slide-sub">${escapeHtml(s.subtitle || '')}</div>`;
          const bgUrl = s.background_url || '';
          const lazyClass = (i > 0 && bgUrl) ? ' slide-lazy' : '';
          const dataBg = bgUrl ? ` data-bg="${escapeAttr(bgUrl)}"` : '';
          let style = i === 0 && bgUrl ? '' : '';
          if (s.link) style += 'text-decoration:none;';
          const styleAttr = style ? ` style="${style}"` : '';
          return s.link
            ? `<a class="slide${lazyClass}" href="${escapeAttr(s.link)}"${dataBg}${styleAttr}>${inner}</a>`
            : `<div class="slide${lazyClass}"${dataBg}${styleAttr}>${inner}</div>`;
        }).join('')}
      </div>
      <button class="arrow right" type="button" aria-label="Next" onclick="moveSlide(1)">&#10095;</button>
      <div class="dots" id="dots">${slides.map((_, i) => `<span class="dot${i === 0 ? ' active' : ''}" onclick="currentSlide(${i})"></span>`).join('')}</div>
    </div>
  `;
  mount.innerHTML = html;

  const firstSlide = mount.querySelector('.slide');
  const firstBg = slides[0] && slides[0].background_url;
  if (firstSlide && firstBg) applySlideBackground(firstSlide, firstBg);

  if (_sliderState.timer) clearInterval(_sliderState.timer);
  const interval = Math.max(2000, Number(cfg.interval_ms) || 4500);
  _sliderState.timer = setInterval(() => moveSlide(1), interval);
}

function showSlide(n) {
  const slidesEl = document.getElementById('slides');
  if (!slidesEl) return;
  const total = _sliderState.slides.length;
  if (!total) return;
  if (n >= total) _sliderState.idx = 0;
  else if (n < 0) _sliderState.idx = total - 1;
  else _sliderState.idx = n;
  slidesEl.style.transform = `translateX(-${_sliderState.idx * 100}%)`;
  document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === _sliderState.idx));
  const slideEls = slidesEl.querySelectorAll('.slide');
  const cur = slideEls[_sliderState.idx];
  if (cur) applySlideBackground(cur, cur.getAttribute('data-bg'));
  const next = slideEls[(_sliderState.idx + 1) % total];
  if (next && next.classList.contains('slide-lazy')) applySlideBackground(next, next.getAttribute('data-bg'));
}
function moveSlide(delta) {
  showSlide(_sliderState.idx + delta);
  // restart timer so manual navigation gets full interval
  const cfg = window.SITE_CONFIG.slider || {};
  if (_sliderState.timer) clearInterval(_sliderState.timer);
  _sliderState.timer = setInterval(() => moveSlide(1), Math.max(2000, Number(cfg.interval_ms) || 4500));
}
function currentSlide(n) { showSlide(n); }

window.renderSlider = renderSlider;
window.moveSlide = moveSlide;
window.currentSlide = currentSlide;

/* ===== Dynamic Page Renderer (admin-managed pages) =====
 * Used by `page.html?slug=xyz` to render the matching custom page from
 * window.SITE_CONFIG.pages. Falls back to a friendly 404 if not found. */
async function renderDynamicPage(slug) {
  const root = document.getElementById('dynamicPageRoot');
  if (!root) return;

  const findAndPaint = () => {
    const cfg = window.SITE_CONFIG;
    const pages = cfg.pages || [];
    const page = pages.find(p => p.slug === slug && p.enabled !== false);
    if (!page) {
      document.title = 'Page not found - ' + (cfg.businessName || 'Call4All');
      root.innerHTML = `
        <div class="page-not-found">
          <div class="icon">📄</div>
          <h1>Page Not Found</h1>
          <p style="color:#666;">The page you're looking for doesn't exist or has been disabled.</p>
          <p style="margin-top:30px;"><a href="index.html" class="btn btn-primary">← Go to Home</a></p>
        </div>
      `;
      return false;
    }
    document.title = `${page.title} - ${cfg.businessName || 'Call4All'}`;
    const metaEl = document.getElementById('metaDescription');
    if (metaEl && page.meta_description) metaEl.setAttribute('content', page.meta_description);
    document.body.setAttribute('data-page', 'page-' + page.slug);

    root.innerHTML = `<div class="dynamic-page-wrap">${page.html_content || ''}</div>`;
    // Re-apply branding so any data-brand-* inside the rendered HTML resolves
    if (typeof applyBranding === 'function') applyBranding();
    return true;
  };

  // Paint immediately with whatever config we have, then re-paint after the
  // background fetch finishes (so visitors don't see "loading" if config is
  // already cached).
  const found = findAndPaint();
  if (!found) {
    // Wait briefly for fetchAndApplySiteConfig (kicked off by site.js init)
    // and try again — needed when this is the user's first visit and config
    // wasn't in localStorage.
    setTimeout(findAndPaint, 1500);
    setTimeout(findAndPaint, 3500);
  }
}
window.renderDynamicPage = renderDynamicPage;

function escapeAttr(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[m]);
}

/* ===== Areas We Serve (loads from data/areas.csv) =====
 * Renders a list of active service areas as clickable chips, and feeds
 * the data into JSON-LD LocalBusiness schema via injectStructuredData().
 * Public: window.renderAreasServed */
window.SITE_AREAS = []; // populated after load
function parseCsvLine(line) {
  // Simple CSV parser (no quoted commas in our area data, but handle quotes anyway)
  const out = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && line[i+1] === '"') { cur += '"'; i++; continue; }
    if (c === '"') { inQ = !inQ; continue; }
    if (c === ',' && !inQ) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}
async function loadAreasCsv() {
  try {
    const url = 'data/areas.csv?t=' + Date.now();
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('areas.csv ' + res.status);
    const text = (await res.text()).trim();
    if (!text) return [];
    const lines = text.split(/\r?\n/);
    const header = parseCsvLine(lines.shift()).map(h => h.trim().toLowerCase());
    const idx = {
      id: header.indexOf('id'),
      city: header.indexOf('city'),
      area: header.indexOf('area'),
      status: header.indexOf('status')
    };
    const rows = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      const cols = parseCsvLine(line);
      const status = (cols[idx.status] || '').trim().toLowerCase();
      if (status && status !== 'active') continue; // only active areas
      rows.push({
        id: (cols[idx.id] || '').trim(),
        city: (cols[idx.city] || '').trim(),
        area: (cols[idx.area] || '').trim()
      });
    }
    return rows;
  } catch (e) {
    console.warn('[Call4All] loadAreasCsv failed:', e);
    return [];
  }
}

async function renderAreasServed() {
  const mount = document.getElementById('areasMount');
  if (!mount) return;
  const areas = await loadAreasCsv();
  window.SITE_AREAS = areas;
  if (!areas.length) return; // keep fallback static chip in HTML
  // Group by city → list of areas
  const byCity = {};
  areas.forEach(a => {
    if (!a.city) return;
    if (!byCity[a.city]) byCity[a.city] = [];
    if (a.area) byCity[a.city].push(a.area);
  });
  const cities = Object.keys(byCity).sort();
  const pinIcon = (typeof window.c4aIcon === 'function') ? window.c4aIcon('pin', { size: 16 }) : '📍';
  const chips = [];
  cities.forEach(city => {
    const subs = byCity[city];
    if (!subs.length) {
      chips.push(`<a href="#book" class="area-chip" title="Service available in ${escapeAttr(city)}"><span class="area-pin">${pinIcon}</span><span class="area-city">${city}</span></a>`);
    } else {
      subs.forEach(sub => {
        chips.push(`<a href="#book" class="area-chip" title="Service in ${escapeAttr(sub)}, ${escapeAttr(city)}"><span class="area-pin">${pinIcon}</span><span class="area-city">${city}</span> · ${sub}</a>`);
      });
    }
  });
  mount.innerHTML = chips.join('');
  // Re-inject structured data with live area list
  if (typeof window.injectStructuredData === 'function') window.injectStructuredData();
}
window.renderAreasServed = renderAreasServed;

/* ===== SEO: JSON-LD Structured Data (LocalBusiness + Service) =====
 * Replaces the baseline schema in index.html with a live version
 * that includes real phone, address, services and serviced areas
 * pulled from SITE_CONFIG and data/areas.csv.
 * Public: window.injectStructuredData */
function injectStructuredData() {
  const cfg = window.SITE_CONFIG || {};
  const origin = (location.protocol === 'http:' || location.protocol === 'https:')
    ? (location.origin || 'https://call4all.co.in')
    : 'https://call4all.co.in';
  const areas = Array.isArray(window.SITE_AREAS) ? window.SITE_AREAS : [];

  // Build unique city list + sub-area list for areaServed
  const cities = Array.from(new Set(areas.map(a => a.city).filter(Boolean)));
  const areaServed = (cities.length ? cities : ['Jaipur']).map(c => ({
    '@type': 'City', name: c
  }));
  // Also add specific localities for hyper-local SEO
  areas.forEach(a => {
    if (a.area && a.city) areaServed.push({ '@type': 'AdministrativeArea', name: `${a.area}, ${a.city}` });
  });

  const phone = cfg.phone || '+91-7737353588';
  const email = cfg.email || 'call4all.info@gmail.com';
  const brand = cfg.businessName || 'Call4All';
  const desc  = cfg.aboutText || "Call4All is Jaipur's trusted service aggregator offering rental cars, rooms & flats, construction labor, home tutors, manpower supply, marriage services, flower bouquets and car decoration — one call for every service.";

  const localBusiness = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': origin + '/#business',
    name: brand,
    image: origin + '/assets/icons/icon-512.png',
    url: origin + '/',
    telephone: phone,
    email: email,
    description: desc,
    priceRange: '₹₹',
    address: {
      '@type': 'PostalAddress',
      addressLocality: cities[0] || 'Jaipur',
      addressRegion: 'Rajasthan',
      addressCountry: 'IN'
    },
    areaServed: areaServed,
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
      opens: '00:00',
      closes: '23:59'
    }
  };

  // Service catalog
  const services = Array.isArray(cfg.services) ? cfg.services : [];
  const serviceItems = services
    .filter(s => s.id !== 'other')
    .map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Service',
        name: `${s.name} in ${cities[0] || 'Jaipur'}`,
        description: s.desc || '',
        url: origin + '/' + (s.page || ''),
        provider: { '@id': origin + '/#business' },
        areaServed: areaServed
      }
    }));
  const serviceList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Services offered by ' + brand,
    itemListElement: serviceItems
  };

  function setOrCreate(id, obj) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(obj);
  }
  setOrCreate('ldjson-localbusiness', localBusiness);
  if (serviceItems.length) setOrCreate('ldjson-services', serviceList);
}
window.injectStructuredData = injectStructuredData;

/* ===== Apply Branding (logo + names + phone/email links) =====
 * Public: window.applyBranding — call after injecting any HTML that
 * contains data-brand-* attributes so values stay in sync with config. */
function applyBranding() {
  const cfg = window.SITE_CONFIG;
  // Logos (uploaded ones are routed via raw.github so they work instantly)
  document.querySelectorAll('[data-brand-logo]').forEach(el => {
    if (cfg.logoUrl === 'auto-3d') {
      // Replace <img> with inline SVG so it can follow CSS variables
      const wrapper = document.createElement('span');
      wrapper.innerHTML = renderAutoLogoSvg({ size: cfg.logoHeight || 55 });
      const svg = wrapper.firstElementChild;
      if (svg) {
        // Preserve any data-attributes the original element had
        Array.from(el.attributes).forEach(a => {
          if (a.name.startsWith('data-')) svg.setAttribute(a.name, a.value);
        });
        el.replaceWith(svg);
      }
    } else if (el.tagName === 'IMG') {
      el.src = assetUrl(cfg.logoUrl || 'Imagelogo.png');
      el.alt = (cfg.businessName || 'Call4All') + ' Logo';
      if (cfg.logoHeight) el.style.height = cfg.logoHeight + 'px';
    }
  });
  document.querySelectorAll('[data-brand-name]').forEach(el => {
    el.textContent = cfg.businessName || 'Call4All';
  });
  document.querySelectorAll('[data-brand-tagline]').forEach(el => {
    el.textContent = cfg.tagline || '';
  });
  document.querySelectorAll('[data-brand-phone]').forEach(el => {
    el.textContent = cfg.phoneDisplay || cfg.phone || '';
  });
  // Auto-update any <a data-call-link> → href becomes tel:<current-phone>
  // (Pages can place this on buttons / inline phone CTAs to stay in sync
  // with admin-side phone changes.)
  document.querySelectorAll('a[data-call-link]').forEach(a => {
    a.href = `tel:${cfg.phone || ''}`;
  });
  document.querySelectorAll('a[data-whatsapp-link]').forEach(a => {
    const wa = (cfg.whatsappNumber || '').replace(/[^0-9]/g, '');
    const txt = a.getAttribute('data-message') || `Hi ${cfg.businessName || ''}, I need a service.`;
    a.href = `https://wa.me/${wa}?text=${encodeURIComponent(txt)}`;
  });
  document.querySelectorAll('[data-brand-email]').forEach(el => {
    if (el.tagName === 'A') el.href = `mailto:${cfg.email || ''}`;
    else el.textContent = cfg.email || '';
  });
  document.querySelectorAll('[data-brand-address]').forEach(el => {
    el.textContent = cfg.address || '';
  });
  // Update document title prefix if a placeholder is present
  if (document.title.includes('{{brand}}')) {
    document.title = document.title.replace('{{brand}}', cfg.businessName || 'Call4All');
  }
}
window.applyBranding = applyBranding;

/* ===== Load site-config.json from public source ===== */
const SITE_CONFIG_CACHE_KEY = 'c4a_site_config_v1';

function applyConfigToWindow(json) {
  if (!json || typeof json !== 'object') return;
  const cfg = window.SITE_CONFIG;
  if (json.branding) {
    if (json.branding.site_name) cfg.businessName = json.branding.site_name;
    if (json.branding.tagline) cfg.tagline = json.branding.tagline;
    if (json.branding.logo_url) cfg.logoUrl = json.branding.logo_url;
    if (json.branding.logo_height) cfg.logoHeight = Number(json.branding.logo_height) || cfg.logoHeight;
  }
  if (json.contact) {
    if (json.contact.phone) cfg.phone = json.contact.phone;
    if (json.contact.phone_display) cfg.phoneDisplay = json.contact.phone_display;
    if (json.contact.whatsapp) cfg.whatsappNumber = json.contact.whatsapp;
    if (json.contact.email) cfg.email = json.contact.email;
    if (json.contact.website) cfg.website = json.contact.website;
    if (json.contact.address) cfg.address = json.contact.address;
  }
  if (json.footer && json.footer.about_text) cfg.aboutText = json.footer.about_text;
  if (json.theme) {
    Object.assign(cfg.theme, json.theme);
  }
  if (json.slider && Array.isArray(json.slider.slides)) {
    cfg.slider = {
      enabled: json.slider.enabled !== false,
      interval_ms: Number(json.slider.interval_ms) || 4500,
      slides: json.slider.slides
    };
  }
  if (Array.isArray(json.pages)) {
    cfg.pages = json.pages;
  }
  // Public booking-form auto-save token. When present, the public booking
  // form will silently append the row to data/bookings.csv via GitHub
  // Contents API (in addition to opening the WhatsApp share window). This
  // token is intentionally public — it is fetched from raw GitHub by every
  // visitor — so it MUST be a fine-grained PAT scoped to "Contents:
  // Read & Write" on THIS repo only. Anyone with the token can write to
  // these CSVs, so rotate it immediately if abuse is observed.
  if (typeof json.public_form_token === 'string') {
    cfg.publicFormToken = json.public_form_token.trim();
  }
}

function loadCachedConfig() {
  try {
    const raw = localStorage.getItem(SITE_CONFIG_CACHE_KEY);
    if (!raw) return;
    const json = JSON.parse(raw);
    applyConfigToWindow(json);
    applyTheme(window.SITE_CONFIG.theme);
  } catch (e) { /* ignore */ }
}

async function fetchAndApplySiteConfig() {
  try {
    const cfg = window.SITE_CONFIG;
    let json = null;

    // If admin/staff is logged in (token in localStorage), prefer the
    // authenticated GitHub Contents API. It returns the latest commit
    // immediately and bypasses raw.githubusercontent.com's ~5min CDN cache.
    const token = localStorage.getItem('c4a_admin_token') || localStorage.getItem('c4a_staff_token');
    if (token) {
      try {
        const apiUrl = `https://api.github.com/repos/${cfg.github.owner}/${cfg.github.repo}/contents/data/site-config.json?ref=${cfg.github.branch}&t=${Date.now()}`;
        const res = await fetch(apiUrl, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' },
          cache: 'no-store'
        });
        if (res.ok) {
          const apiJson = await res.json();
          if (apiJson && apiJson.content) {
            const decoded = decodeURIComponent(escape(atob(String(apiJson.content).replace(/\s/g, ''))));
            json = JSON.parse(decoded);
          }
        }
      } catch (e) { /* fall back to raw below */ }
    }

    // Public path: raw.githubusercontent.com (CDN-cached for ~5 min)
    if (!json) {
      const url = `https://raw.githubusercontent.com/${cfg.github.owner}/${cfg.github.repo}/${cfg.github.branch}/data/site-config.json?t=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return;
      json = await res.json();
    }

    // CDN race protection: if our cached config has a NEWER updated_at than
    // what came from the network, keep the cached version. This stops the
    // stale CDN response from reverting an admin's just-saved change.
    try {
      const cachedRaw = localStorage.getItem(SITE_CONFIG_CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (cached && cached.updated_at && json.updated_at && cached.updated_at > json.updated_at) {
          console.log('[Site] Cached site-config is newer than network — keeping cached.');
          applyConfigToWindow(cached);
          applyTheme(window.SITE_CONFIG.theme);
          applyBranding();
          rerenderSiteShellIfNeeded();
          return;
        }
      }
    } catch (e) {}

    applyConfigToWindow(json);
    applyTheme(window.SITE_CONFIG.theme);
    applyBranding();
    rerenderSiteShellIfNeeded();
    try { localStorage.setItem(SITE_CONFIG_CACHE_KEY, JSON.stringify(json)); } catch (e) {}
  } catch (e) {
    console.warn('[Site] site-config load failed:', e.message);
  }
}

function configShellSignature() {
  const cfg = window.SITE_CONFIG || {};
  return JSON.stringify({
    businessName: cfg.businessName,
    phone: cfg.phone,
    logoUrl: cfg.logoUrl,
    themePreset: cfg.theme && cfg.theme.preset,
    slideCount: (cfg.slider && cfg.slider.slides) ? cfg.slider.slides.length : 0,
    festivalBanner: cfg.theme && cfg.theme.festival_banner
  });
}
let _lastShellSig = '';

function rerenderSiteShellIfNeeded() {
  const sig = configShellSignature();
  if (sig === _lastShellSig) return;
  _lastShellSig = sig;
  rerenderSiteShell();
}

function rerenderSiteShell() {
  const activePage = document.body ? (document.body.getAttribute('data-page') || '') : '';
  const headerEl = document.querySelector('header.site-header');
  if (headerEl) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderHeader(activePage);
    headerEl.replaceWith(wrapper.firstElementChild);
  }
  const footerEl = document.querySelector('footer.site-footer');
  if (footerEl) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderFooter();
    footerEl.replaceWith(wrapper.firstElementChild);
  }
  // Festival banner above header
  insertFestivalBannerIfNeeded();
  // Re-paint slider if the home page is showing one
  if (document.getElementById('sliderMount') && typeof renderSlider === 'function') renderSlider();
  // Re-paint Areas Served (chips + JSON-LD schema)
  if (document.getElementById('areasMount') && typeof renderAreasServed === 'function') renderAreasServed();
  // Re-inject JSON-LD with latest config (phone/email/services)
  if (typeof injectStructuredData === 'function') injectStructuredData();
  // Re-paint dynamic page if we're on page.html (fresh config may now contain it)
  if (document.getElementById('dynamicPageRoot') && typeof renderDynamicPage === 'function') {
    const slug = new URLSearchParams(window.location.search).get('slug') || '';
    renderDynamicPage(slug);
  }
  // Re-apply branding so phone/email links pick up updated values
  if (typeof applyBranding === 'function') applyBranding();
  // Re-run icon hydrate + emoji swap on freshly-injected nodes
  if (typeof window.c4aHydrateIcons === 'function') window.c4aHydrateIcons();
  if (typeof window.c4aSwapEmojis === 'function') window.c4aSwapEmojis(document.body);
}
window.rerenderSiteShell = rerenderSiteShell;

function insertFestivalBannerIfNeeded() {
  const existing = document.getElementById('festivalBanner');
  if (existing) existing.remove();
  const text = window.SITE_CONFIG.theme && window.SITE_CONFIG.theme.festival_banner;
  if (!text) return;
  const bar = document.createElement('div');
  bar.id = 'festivalBanner';
  bar.className = 'festival-banner';
  bar.textContent = text;
  document.body.insertBefore(bar, document.body.firstChild);
}

// Apply cached config IMMEDIATELY (before DOMContentLoaded) so theme appears instantly
loadCachedConfig();

/* ===== Site Components: Header, Footer, Floating buttons ===== */

function renderHeader(activePage) {
  const cfg = window.SITE_CONFIG;
  const links = [
    { href: 'index.html', label: 'Home', key: 'home' },
    { href: 'index.html#services', label: 'Services', key: 'services' },
    { href: 'gallery.html', label: 'Gallery', key: 'gallery' },
    { href: 'about.html', label: 'About Us', key: 'about' },
    { href: 'contact.html', label: 'Contact Us', key: 'contact' }
  ];
  // Append admin-managed dynamic pages flagged "show_in_menu"
  const dynamicPages = (cfg.pages || [])
    .filter(p => p.enabled !== false && p.show_in_menu === true && p.slug)
    .slice()
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  dynamicPages.forEach(p => {
    links.push({
      href: `page.html?slug=${encodeURIComponent(p.slug)}`,
      label: p.nav_label || p.title || p.slug,
      key: 'page-' + p.slug
    });
  });
  const linkHtml = links.map(l =>
    `<li><a href="${l.href}" ${activePage === l.key ? 'class="active"' : ''}>${escapeHtml(l.label)}</a></li>`
  ).join('');
  const logoHeight = cfg.logoHeight || 55;
  const brandName = escapeHtml(cfg.businessName || 'Call4All');
  const tagline = cfg.tagline ? `<span class="brand-tagline">${escapeHtml(cfg.tagline)}</span>` : '';
  // Special sentinel: 'auto-3d' renders the auto-themed inline SVG instead of an <img>
  const logoMarkup = (cfg.logoUrl === 'auto-3d')
    ? renderAutoLogoSvg({ size: logoHeight })
    : `<img src="${assetUrl(cfg.logoUrl || 'Imagelogo.png')}" alt="${brandName} Logo" style="height:${logoHeight}px">`;
  return `
    <header class="site-header">
      <a class="logo" href="index.html" aria-label="${brandName} Home">
        ${logoMarkup}
        <span class="brand-text">
          <span class="brand-name">${brandName}</span>
          ${tagline}
        </span>
      </a>
      <button class="menu-toggle" aria-label="Toggle menu" onclick="toggleMenu()">☰</button>
      <nav class="site-nav" id="siteNav">
        <ul>${linkHtml}</ul>
      </nav>
    </header>
  `;
}

function renderFooter() {
  const cfg = window.SITE_CONFIG;
  const ico = (name, size) => (typeof window.c4aIcon === 'function')
    ? window.c4aIcon(name, { size: size || 16 })
    : '';
  const serviceLinks = cfg.services
    .filter(s => s.id !== 'other')
    .map(s => `<li><a href="${s.page}">${s.name}</a></li>`)
    .join('');
  return `
    <footer class="site-footer">
      <div class="footer-content">
        <div class="footer-section no-icon-list">
          <h3>About ${cfg.businessName}</h3>
          <p>${cfg.aboutText || ''}</p>
        </div>
        <div class="footer-section no-icon-list">
          <h3>Quick Links</h3>
          <ul class="flat">
            <li><a href="index.html">Home</a></li>
            <li><a href="index.html#services">All Services</a></li>
            <li><a href="index.html#gallery">Gallery</a></li>
            <li><a href="about.html">About Us</a></li>
            <li><a href="contact.html">Contact Us</a></li>
            <li><a href="index.html#book">Book a Service</a></li>
          </ul>
        </div>
        <div class="footer-section no-icon-list">
          <h3>Our Services</h3>
          <ul class="flat">${serviceLinks}</ul>
        </div>
        <div class="footer-section">
          <h3>Contact Info</h3>
          <ul>
            <li>${ico('phone')}<a href="tel:${cfg.phone}">${cfg.phoneDisplay}</a></li>
            <li>${ico('whatsapp')}<a href="https://wa.me/${cfg.whatsappNumber}" target="_blank">WhatsApp Chat</a></li>
            <li>${ico('mail')}<a href="mailto:${cfg.email}">${cfg.email}</a></li>
            <li>${ico('globe')}<span>${cfg.website}</span></li>
            <li>${ico('clock')}<span>24/7 Available</span></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© ${new Date().getFullYear()} ${cfg.website} | All Rights Reserved</p>
      </div>
    </footer>
  `;
}

function renderFloatingButtons() {
  const cfg = window.SITE_CONFIG;
  const waMsg = encodeURIComponent('Hello, I want to enquire about your services.');
  const ico = (name, size) => (typeof window.c4aIcon === 'function')
    ? window.c4aIcon(name, { size: size || 26 })
    : '';
  return `
    <div class="floating-buttons">
      <button class="float-btn install" id="installAppBtn" aria-label="Install App" title="Install App" style="display:none;">${ico('install')}</button>
      <a class="float-btn whatsapp" href="https://wa.me/${cfg.whatsappNumber}?text=${waMsg}" target="_blank" aria-label="Chat on WhatsApp" title="Chat on WhatsApp">${ico('whatsapp')}</a>
      <a class="float-btn call" href="tel:${cfg.phone}" aria-label="Call Now" title="Call Now">${ico('phone')}</a>
    </div>
  `;
}

function toggleMenu() {
  const nav = document.getElementById('siteNav');
  if (nav) nav.classList.toggle('open');
}

function renderHomeServiceGrid() {
  const grid = document.getElementById('serviceGrid');
  if (!grid || grid.children.length) return;
  const ico = (name) => (typeof window.c4aIcon === 'function' && name)
    ? window.c4aIcon(name, { size: 30 })
    : '';
  grid.innerHTML = window.SITE_CONFIG.services.map(s => {
    const img = optimizeImageUrl(s.image || '', 'service');
    return `
    <div class="service-card">
      <div class="service-image" style="background-image:url('${img}');">
        <div class="service-icon-overlay">${ico(s.iconName) || s.icon || ''}</div>
      </div>
      <div class="service-body">
        <h3>${escapeHtml(s.name)}</h3>
        <p>${escapeHtml(s.desc)}</p>
        <a href="${escapeAttr(s.page)}" class="btn btn-outline-dark btn-sm" style="align-self:center;">Learn More <span data-c4a-icon="arrow-right" data-icon-size="14"></span></a>
      </div>
    </div>
  `;
  }).join('');
  if (typeof window.c4aHydrateIcons === 'function') window.c4aHydrateIcons(grid);
}

function paintSiteShellOnce() {
  if (window._c4aShellPainted) return;
  window._c4aShellPainted = true;

  applyTheme(window.SITE_CONFIG.theme);
  applyBranding();

  const activePage = document.body ? (document.body.getAttribute('data-page') || '') : '';
  const headerSlot = document.getElementById('site-header');
  if (headerSlot && !headerSlot.querySelector('header')) {
    headerSlot.outerHTML = renderHeader(activePage);
  }
  const footerSlot = document.getElementById('site-footer');
  if (footerSlot && !footerSlot.querySelector('footer')) {
    footerSlot.outerHTML = renderFooter();
  }
  const floatSlot = document.getElementById('site-floating');
  if (floatSlot && !floatSlot.querySelector('.floating-buttons')) {
    floatSlot.outerHTML = renderFloatingButtons();
  }

  insertFestivalBannerIfNeeded();
  if (typeof renderSlider === 'function') renderSlider();
  renderHomeServiceGrid();

  _lastShellSig = configShellSignature();

  if (typeof window.c4aHydrateIcons === 'function') window.c4aHydrateIcons(document.body);
  if (typeof window.c4aSwapEmojis === 'function') window.c4aSwapEmojis(document.body);
}

/* ===== Auto-render on DOMContentLoaded ===== */
document.addEventListener('DOMContentLoaded', function () {
  paintSiteShellOnce();

  if (typeof initBookingForm === 'function') initBookingForm();

  // Icons already hydrated in paintSiteShellOnce; refresh after async gallery

  // Render gallery when scrolled near (homepage) — saves mobile bandwidth
  if (typeof renderGallerySection === 'function') {
    scheduleGalleryRender();
  }

  setupPwaInstall();

  // Fetch latest config in background and re-render shell
  fetchAndApplySiteConfig();
});

// Paint shell as early as possible (script is at end of <body>) to cut CLS
if (document.body) {
  paintSiteShellOnce();
}

/* ===== PWA: Service Worker + Install Prompt ===== */
let _deferredInstallPrompt = null;

function setupPwaInstall() {
  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('[PWA] Service worker registered:', reg.scope))
        .catch(err => console.warn('[PWA] Service worker registration failed:', err));
    });
  }

  // Capture the install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredInstallPrompt = e;
    const btn = document.getElementById('installAppBtn');
    if (btn) {
      btn.style.display = 'flex';
      btn.addEventListener('click', triggerInstall);
    }
  });

  // Hide install button after the app is installed
  window.addEventListener('appinstalled', () => {
    const btn = document.getElementById('installAppBtn');
    if (btn) btn.style.display = 'none';
    _deferredInstallPrompt = null;
    console.log('[PWA] App installed');
  });

  // For iOS users, show a one-time hint (since iOS doesn't support beforeinstallprompt)
  setTimeout(showIosInstallHintIfNeeded, 4000);
}

async function triggerInstall() {
  if (!_deferredInstallPrompt) return;
  _deferredInstallPrompt.prompt();
  const { outcome } = await _deferredInstallPrompt.userChoice;
  console.log('[PWA] Install choice:', outcome);
  _deferredInstallPrompt = null;
  const btn = document.getElementById('installAppBtn');
  if (btn) btn.style.display = 'none';
}

function showIosInstallHintIfNeeded() {
  const ua = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isStandalone = window.navigator.standalone === true ||
                       window.matchMedia('(display-mode: standalone)').matches;
  const dismissed = localStorage.getItem('c4a_ios_install_hint_dismissed');

  if (!isIos || isStandalone || dismissed) return;

  const hint = document.createElement('div');
  hint.id = 'iosInstallHint';
  hint.style.cssText = `
    position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 9999;
    background: #1e3c72; color: white; padding: 14px 16px; border-radius: 12px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.25); font-size: 14px; line-height: 1.5;
  `;
  hint.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:10px;">
      <div style="font-size:24px;">📲</div>
      <div style="flex:1;">
        <strong>Install Call4All on your iPhone</strong><br>
        Tap the <strong>Share</strong> icon ⎋ in Safari, then tap <strong>"Add to Home Screen"</strong>.
      </div>
      <button aria-label="Dismiss" style="background:transparent;border:none;color:white;font-size:22px;cursor:pointer;line-height:1;" onclick="this.closest('#iosInstallHint').remove();localStorage.setItem('c4a_ios_install_hint_dismissed','1');">×</button>
    </div>
  `;
  document.body.appendChild(hint);
}

/* ===== Public Gallery (reads gallery.csv from raw github) =====
   A page can opt-in by adding:
     <div id="galleryMount" data-category="Rental Cars"></div>   (filtered)
     <div id="galleryMount"></div>                                (all)
     <div id="galleryMount" data-featured></div>                  (featured only)
   Optional: data-limit="12" caps the result count. */
let _galleryAllItems = [];   // cached full set for the dedicated gallery page

function scheduleGalleryRender() {
  const mount = document.getElementById('galleryMount');
  if (!mount) return;
  const run = () => renderGallerySection()
    .then(() => {
      if (typeof window.c4aSwapEmojis === 'function') window.c4aSwapEmojis(document.body);
    })
    .catch(err => console.warn('[Gallery] init failed:', err));

  const isDedicatedGallery = document.getElementById('galSearchInput') || document.getElementById('galCategorySelect');
  if (isDedicatedGallery || !('IntersectionObserver' in window)) {
    run();
    return;
  }
  const io = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    run();
  }, { rootMargin: '200px' });
  io.observe(mount);
}

async function renderGallerySection() {
  const mount = document.getElementById('galleryMount');
  if (!mount) return;

  const cfg = window.SITE_CONFIG;
  const url = `https://raw.githubusercontent.com/${cfg.github.owner}/${cfg.github.repo}/${cfg.github.branch}/data/gallery.csv?t=${Date.now()}`;

  let rows = [];
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Gallery CSV not found');
    const text = await res.text();
    rows = parseGalleryCsv(text);
  } catch (e) {
    mount.innerHTML = '';
    return;
  }

  _galleryAllItems = rows.filter(r => (r.status || 'Active').toLowerCase() === 'active' && r.image_path);

  // If the page provided a search input + category dropdown (the dedicated
  // gallery page), wire them up for live filtering.
  const searchInput = document.getElementById('galSearchInput');
  const catSelect = document.getElementById('galCategorySelect');
  if (searchInput || catSelect) {
    const apply = () => paintGalleryGrid(mount);
    if (searchInput) searchInput.addEventListener('input', apply);
    if (catSelect) {
      // Populate dynamic options if it has only the placeholder
      if (catSelect.options.length <= 1) {
        const cats = [...new Set(_galleryAllItems.map(r => r.category).filter(Boolean))].sort();
        catSelect.innerHTML = '<option value="">All Categories</option>' +
          cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
      }
      catSelect.addEventListener('change', apply);
    }
  }

  paintGalleryGrid(mount);
}

function paintGalleryGrid(mount) {
  const filterCat = (mount.getAttribute('data-category') || '').trim();
  const limit = parseInt(mount.getAttribute('data-limit') || '0', 10);
  const featuredOnly = mount.hasAttribute('data-featured');

  const searchInput = document.getElementById('galSearchInput');
  const catSelect = document.getElementById('galCategorySelect');
  const liveSearch = (searchInput ? searchInput.value : '').toLowerCase().trim();
  const liveCat = catSelect ? catSelect.value : '';

  let items = [..._galleryAllItems];
  if (filterCat) items = items.filter(r => (r.category || '').toLowerCase() === filterCat.toLowerCase());
  if (liveCat) items = items.filter(r => (r.category || '').toLowerCase() === liveCat.toLowerCase());
  if (featuredOnly) items = items.filter(r => String(r.featured || '').toLowerCase() === 'true');
  if (liveSearch) items = items.filter(r =>
    [r.title, r.description, r.category].some(v => String(v || '').toLowerCase().includes(liveSearch))
  );

  items.sort((a,b) => (parseInt(a.sort_order||'0',10) - parseInt(b.sort_order||'0',10)) || (a.timestamp < b.timestamp ? 1 : -1));
  if (limit > 0) items = items.slice(0, limit);

  if (!items.length) {
    // On the dedicated gallery page, show a friendly empty state.
    if (searchInput || catSelect) {
      mount.innerHTML = `<div class="empty-state" style="padding:60px 20px;text-align:center;color:var(--text-light);">
        <div style="font-size:48px;">🖼️</div>
        <p>No images match your filter. Clear the search or pick a different category.</p>
      </div>`;
    } else {
      mount.innerHTML = '';
    }
    return;
  }

  const cards = items.map((it, idx) => {
    const imgUrl = optimizeImageUrl(assetUrl(it.image_path), 'thumb');
    const title = escapeHtml(it.title || '');
    const desc = escapeHtml(it.description || '');
    const cat = escapeHtml(it.category || '');
    return `
      <div class="gallery-card">
        ${cat ? `<span class="cat-pill">${cat}</span>` : ''}
        <a href="${imgUrl}" class="gallery-thumb-link" data-lightbox-index="${idx}" aria-label="View ${title || cat || 'image'} in lightbox">
          <img class="thumb" src="${imgUrl}" alt="${title || cat || 'Gallery'}" loading="lazy" onerror="this.style.opacity=0.3;this.alt='Image unavailable';">
        </a>
        <div class="info">
          <h4>${title}</h4>
          ${desc ? `<p>${desc}</p>` : ''}
        </div>
      </div>
    `;
  }).join('');

  mount.innerHTML = `<div class="gallery-grid">${cards}</div>`;

  // Wire up lightbox — clicking any thumb opens an in-page modal with the
  // full image plus title/description (instead of leaving the page).
  // Keep the visible list in sync with the order we just rendered so
  // prev/next navigation matches what the user sees.
  _galleryVisibleItems = items.slice();
  bindGalleryLightbox(mount);
}

/* ===== Gallery Lightbox =====
 * Opens an in-page modal preview when a gallery thumb is clicked.
 * Closes on backdrop click, the × button, or the Esc key. Arrow keys
 * (and prev/next buttons) navigate through the currently visible items. */
let _galleryVisibleItems = [];

function bindGalleryLightbox(scope) {
  const root = scope || document;
  const links = root.querySelectorAll('a.gallery-thumb-link');
  links.forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const idx = parseInt(a.getAttribute('data-lightbox-index'), 10) || 0;
      openGalleryLightbox(idx);
    });
  });
}

function ensureLightboxMarkup() {
  let lb = document.getElementById('galleryLightbox');
  if (lb) return lb;
  lb = document.createElement('div');
  lb.id = 'galleryLightbox';
  lb.className = 'gallery-lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Image preview');
  lb.innerHTML = `
    <button class="lightbox-close" aria-label="Close preview" data-lb-close>&times;</button>
    <button class="lightbox-nav lightbox-prev" aria-label="Previous image" data-lb-prev>&#10094;</button>
    <button class="lightbox-nav lightbox-next" aria-label="Next image" data-lb-next>&#10095;</button>
    <figure class="lightbox-figure">
      <img class="lightbox-image" alt="">
      <figcaption class="lightbox-caption">
        <span class="lightbox-cat"></span>
        <h3 class="lightbox-title"></h3>
        <p class="lightbox-desc"></p>
      </figcaption>
    </figure>
  `;
  document.body.appendChild(lb);

  lb.addEventListener('click', (e) => {
    if (e.target === lb || e.target.matches('[data-lb-close]')) closeGalleryLightbox();
    if (e.target.matches('[data-lb-prev]')) navigateGalleryLightbox(-1);
    if (e.target.matches('[data-lb-next]')) navigateGalleryLightbox(1);
  });
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('show')) return;
    if (e.key === 'Escape') closeGalleryLightbox();
    if (e.key === 'ArrowLeft') navigateGalleryLightbox(-1);
    if (e.key === 'ArrowRight') navigateGalleryLightbox(1);
  });
  return lb;
}

function openGalleryLightbox(index) {
  const items = _galleryVisibleItems;
  if (!items || !items.length) return;
  const lb = ensureLightboxMarkup();
  lb.dataset.currentIndex = String(index);
  const it = items[index];
  if (!it) return;
  const imgUrl = assetUrl(it.image_path);
  lb.querySelector('.lightbox-image').src = imgUrl;
  lb.querySelector('.lightbox-image').alt = it.title || it.category || 'Gallery image';
  const catEl = lb.querySelector('.lightbox-cat');
  catEl.textContent = it.category || '';
  catEl.style.display = it.category ? 'inline-block' : 'none';
  lb.querySelector('.lightbox-title').textContent = it.title || '';
  const descEl = lb.querySelector('.lightbox-desc');
  descEl.textContent = it.description || '';
  descEl.style.display = it.description ? 'block' : 'none';
  // Hide nav buttons when there's only one image
  const navBtns = lb.querySelectorAll('.lightbox-nav');
  navBtns.forEach(b => b.style.display = items.length > 1 ? 'flex' : 'none');
  lb.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeGalleryLightbox() {
  const lb = document.getElementById('galleryLightbox');
  if (!lb) return;
  lb.classList.remove('show');
  document.body.style.overflow = '';
}

function navigateGalleryLightbox(direction) {
  const lb = document.getElementById('galleryLightbox');
  if (!lb) return;
  const items = _galleryVisibleItems;
  if (!items.length) return;
  let idx = (parseInt(lb.dataset.currentIndex, 10) || 0) + direction;
  if (idx < 0) idx = items.length - 1;
  if (idx >= items.length) idx = 0;
  openGalleryLightbox(idx);
}
window.openGalleryLightbox = openGalleryLightbox;
window.closeGalleryLightbox = closeGalleryLightbox;

function parseGalleryCsv(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter(l => l.length);
  if (!lines.length) return [];
  const headers = parseCsvLine(lines.shift());
  return lines.map(line => {
    const cols = parseCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = (cols[i] || '').trim(); });
    return obj;
  });
}

function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i+1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { cur += c; }
    } else {
      if (c === ',') { result.push(cur); cur = ''; }
      else if (c === '"') { inQuotes = true; }
      else { cur += c; }
    }
  }
  result.push(cur);
  return result;
}
