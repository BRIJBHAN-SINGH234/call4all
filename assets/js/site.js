/* ===== Call4All - Site-wide JavaScript ===== */

/* SITE_CONFIG holds runtime branding/contact/theme.
   Defaults below are used until `data/site-config.json` is loaded. */
window.SITE_CONFIG = {
  businessName: 'Call4All',
  tagline: 'One Call. Every Service. Done.',
  logoUrl: 'Imagelogo.png',
  logoHeight: 55,
  phone: '+918387930687',
  phoneDisplay: '+91 8387930687',
  whatsappNumber: '918387930687',
  email: 'info@call4all.co.in',
  website: 'www.call4all.co.in',
  address: 'India',
  aboutText: 'Your one-call solution for every need. From rental cars and rooms to construction labor, home tutors, and event services - we connect you to trusted providers.',
  theme: {
    preset: 'default',
    primary: '#1e3c72',
    primary_dark: '#142850',
    accent: '#ffcc00',
    accent_dark: '#e6b800',
    background: '#ffffff',
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
    { id: 'rental-cars', name: 'Rental Cars', icon: '🚗', desc: 'Premium & budget car rental for events and travel.', page: 'rental-cars.html' },
    { id: 'rooms-flats', name: 'Rooms & Flats', icon: '🏠', desc: 'Rent rooms, flats and properties easily.', page: 'rooms-flats.html' },
    { id: 'manpower-supply', name: 'Manpower Supply', icon: '👷', desc: 'Skilled & unskilled manpower for any requirement.', page: 'manpower-supply.html' },
    { id: 'construction', name: 'Construction Labor / Thekedar', icon: '🧱', desc: 'Construction labor, contractors and thekedar for your project.', page: 'construction.html' },
    { id: 'home-tutor', name: 'Home Tutor', icon: '📚', desc: 'Qualified home tutors for all classes and subjects.', page: 'home-tutor.html' },
    { id: 'marriage-services', name: 'Marriage Services', icon: '💍', desc: 'Complete wedding planning, decoration & rental items.', page: 'marriage-services.html' },
    { id: 'flower-bouquet', name: 'Hotel Flower Bouquet', icon: '🌸', desc: 'Luxury flower decoration & bouquet service.', page: 'flower-bouquet.html' },
    { id: 'car-decoration', name: 'Car Decoration', icon: '🎀', desc: 'Luxury car decoration for weddings & events.', page: 'car-decoration.html' },
    { id: 'other', name: 'Other / Custom Service', icon: '🛎️', desc: 'Need something else? Just tell us, we will arrange it.', page: 'index.html#book' }
  ]
};

/* ===== Festival Theme Presets ===== */
window.FESTIVAL_PRESETS = {
  default: {
    label: 'Default (Navy + Gold)',
    emoji: '🏷️',
    primary: '#1e3c72',
    primary_dark: '#142850',
    accent: '#ffcc00',
    accent_dark: '#e6b800',
    background: '#ffffff',
    festival_overlay: 'none',
    festival_banner: ''
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
    festival_banner: '🪔 Wishing you a Happy & Prosperous Diwali 🪔'
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
    festival_banner: '🎨 Happy Holi - Colourful greetings to all! 🎨'
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
    festival_banner: '🎄 Merry Christmas & Happy New Year 🎄'
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
    festival_banner: '🌙 Eid Mubarak to all our customers ⭐'
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
    festival_banner: '🇮🇳 Jai Hind! Happy Independence Day 🇮🇳'
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
    festival_banner: ''
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
}

/* ===== Apply Branding (logo + names in header/footer) ===== */
function applyBranding() {
  const cfg = window.SITE_CONFIG;
  // Logos
  document.querySelectorAll('[data-brand-logo]').forEach(img => {
    img.src = cfg.logoUrl || 'Imagelogo.png';
    img.alt = (cfg.businessName || 'Call4All') + ' Logo';
    if (cfg.logoHeight) img.style.height = cfg.logoHeight + 'px';
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
  // Update document title prefix if a placeholder is present
  if (document.title.includes('{{brand}}')) {
    document.title = document.title.replace('{{brand}}', cfg.businessName || 'Call4All');
  }
}

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
    const url = `https://raw.githubusercontent.com/${cfg.github.owner}/${cfg.github.repo}/${cfg.github.branch}/data/site-config.json?t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return;
    const json = await res.json();
    applyConfigToWindow(json);
    applyTheme(window.SITE_CONFIG.theme);
    applyBranding();
    // Re-render header/footer if already rendered (use latest config)
    rerenderSiteShell();
    try { localStorage.setItem(SITE_CONFIG_CACHE_KEY, JSON.stringify(json)); } catch (e) {}
  } catch (e) {
    // Network failure - keep cached / defaults
    console.warn('[Site] site-config load failed:', e.message);
  }
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
}

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
    { href: 'index.html#gallery', label: 'Gallery', key: 'gallery' },
    { href: 'about.html', label: 'About Us', key: 'about' },
    { href: 'contact.html', label: 'Contact Us', key: 'contact' }
  ];
  const linkHtml = links.map(l =>
    `<li><a href="${l.href}" ${activePage === l.key ? 'class="active"' : ''}>${l.label}</a></li>`
  ).join('');
  const logoStyle = cfg.logoHeight ? `style="height:${cfg.logoHeight}px"` : '';
  return `
    <header class="site-header">
      <div class="logo"><a href="index.html"><img src="${cfg.logoUrl || 'Imagelogo.png'}" alt="${cfg.businessName} Logo" ${logoStyle}></a></div>
      <button class="menu-toggle" aria-label="Toggle menu" onclick="toggleMenu()">☰</button>
      <nav class="site-nav" id="siteNav">
        <ul>${linkHtml}</ul>
      </nav>
    </header>
  `;
}

function renderFooter() {
  const cfg = window.SITE_CONFIG;
  const serviceLinks = cfg.services
    .filter(s => s.id !== 'other')
    .map(s => `<li><a href="${s.page}">${s.name}</a></li>`)
    .join('');
  return `
    <footer class="site-footer">
      <div class="footer-content">
        <div class="footer-section">
          <h3>About ${cfg.businessName}</h3>
          <p>${cfg.aboutText || ''}</p>
        </div>
        <div class="footer-section">
          <h3>Quick Links</h3>
          <ul>
            <li><a href="index.html">Home</a></li>
            <li><a href="index.html#services">All Services</a></li>
            <li><a href="index.html#gallery">Gallery</a></li>
            <li><a href="about.html">About Us</a></li>
            <li><a href="contact.html">Contact Us</a></li>
            <li><a href="index.html#book">Book a Service</a></li>
          </ul>
        </div>
        <div class="footer-section">
          <h3>Our Services</h3>
          <ul>${serviceLinks}</ul>
        </div>
        <div class="footer-section">
          <h3>Contact Info</h3>
          <ul>
            <li>📞 <a href="tel:${cfg.phone}">${cfg.phoneDisplay}</a></li>
            <li>💬 <a href="https://wa.me/${cfg.whatsappNumber}" target="_blank">WhatsApp Chat</a></li>
            <li>✉️ <a href="mailto:${cfg.email}">${cfg.email}</a></li>
            <li>🌐 ${cfg.website}</li>
            <li>🕒 24/7 Available</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© ${new Date().getFullYear()} ${cfg.website} | All Rights Reserved &nbsp;|&nbsp; <a href="admin.html">Admin Panel</a> &nbsp;|&nbsp; <a href="staff.html">Staff Portal</a></p>
      </div>
    </footer>
  `;
}

function renderFloatingButtons() {
  const cfg = window.SITE_CONFIG;
  const waMsg = encodeURIComponent('Hello, I want to enquire about your services.');
  return `
    <div class="floating-buttons">
      <button class="float-btn install" id="installAppBtn" aria-label="Install App" title="Install App" style="display:none;background:#ffcc00;color:#1e3c72;border:none;font-size:24px;">📲</button>
      <a class="float-btn whatsapp" href="https://wa.me/${cfg.whatsappNumber}?text=${waMsg}" target="_blank" aria-label="Chat on WhatsApp" title="Chat on WhatsApp">💬</a>
      <a class="float-btn call" href="tel:${cfg.phone}" aria-label="Call Now" title="Call Now">📞</a>
    </div>
  `;
}

function toggleMenu() {
  const nav = document.getElementById('siteNav');
  if (nav) nav.classList.toggle('open');
}

/* ===== Auto-render on DOMContentLoaded ===== */
document.addEventListener('DOMContentLoaded', function () {
  // Apply theme/branding from cached config first (instant)
  applyTheme(window.SITE_CONFIG.theme);
  applyBranding();
  insertFestivalBannerIfNeeded();

  const activePage = document.body.getAttribute('data-page') || '';

  const headerSlot = document.getElementById('site-header');
  if (headerSlot) headerSlot.outerHTML = renderHeader(activePage);

  const footerSlot = document.getElementById('site-footer');
  if (footerSlot) footerSlot.outerHTML = renderFooter();

  const floatSlot = document.getElementById('site-floating');
  if (floatSlot) floatSlot.outerHTML = renderFloatingButtons();

  if (typeof initBookingForm === 'function') initBookingForm();

  // Render gallery section if present (homepage / service pages)
  if (typeof renderGallerySection === 'function') {
    renderGallerySection().catch(err => console.warn('[Gallery] init failed:', err));
  }

  setupPwaInstall();

  // Fetch latest config in background and re-render shell
  fetchAndApplySiteConfig();
});

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
     <div id="galleryMount" data-category="rental-cars"></div>   (filtered)
     <div id="galleryMount"></div>                                (all featured)
*/
async function renderGallerySection() {
  const mount = document.getElementById('galleryMount');
  if (!mount) return;
  const filterCat = (mount.getAttribute('data-category') || '').trim();
  const limit = parseInt(mount.getAttribute('data-limit') || '0', 10);
  const featuredOnly = mount.hasAttribute('data-featured');

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

  let items = rows.filter(r => (r.status || 'Active').toLowerCase() === 'active' && r.image_path);
  if (filterCat) items = items.filter(r => (r.category || '').toLowerCase() === filterCat.toLowerCase());
  if (featuredOnly) items = items.filter(r => String(r.featured || '').toLowerCase() === 'true');
  items.sort((a,b) => (parseInt(a.sort_order||'0',10) - parseInt(b.sort_order||'0',10)) || (a.timestamp < b.timestamp ? 1 : -1));
  if (limit > 0) items = items.slice(0, limit);

  if (!items.length) {
    mount.innerHTML = '';
    return;
  }

  const cards = items.map(it => {
    const imgUrl = absoluteAssetUrl(it.image_path);
    return `
      <div class="gallery-card">
        ${it.category ? `<span class="cat-pill">${escapeHtml(it.category)}</span>` : ''}
        <a href="${imgUrl}" target="_blank" rel="noopener">
          <img class="thumb" src="${imgUrl}" alt="${escapeHtml(it.title || it.category || 'Gallery')}" loading="lazy" onerror="this.style.opacity=0.3;this.alt='Image unavailable';">
        </a>
        <div class="info">
          <h4>${escapeHtml(it.title || '')}</h4>
          ${it.description ? `<p>${escapeHtml(it.description)}</p>` : ''}
        </div>
      </div>
    `;
  }).join('');

  mount.innerHTML = `<div class="gallery-grid">${cards}</div>`;
}

function absoluteAssetUrl(relPath) {
  // If full URL already, return as-is
  if (/^https?:\/\//i.test(relPath)) return relPath;
  // For uploaded files, fetch via raw.githubusercontent so they show up immediately
  // (avoids GH Pages caching delay after a fresh upload)
  const cfg = window.SITE_CONFIG;
  if (relPath.startsWith('assets/uploads/')) {
    return `https://raw.githubusercontent.com/${cfg.github.owner}/${cfg.github.repo}/${cfg.github.branch}/${relPath}`;
  }
  return relPath;
}

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

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[m]);
}
