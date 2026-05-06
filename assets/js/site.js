/* ===== Call4All - Site-wide JavaScript ===== */

window.SITE_CONFIG = {
  businessName: 'Call4All',
  phone: '+918387930687',
  phoneDisplay: '+91 8387930687',
  whatsappNumber: '918387930687',
  email: 'info@call4all.co.in',
  website: 'www.call4all.co.in',
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

/* ===== Site Components: Header, Footer, Floating buttons ===== */

function renderHeader(activePage) {
  const cfg = window.SITE_CONFIG;
  const links = [
    { href: 'index.html', label: 'Home', key: 'home' },
    { href: 'index.html#services', label: 'Services', key: 'services' },
    { href: 'about.html', label: 'About Us', key: 'about' },
    { href: 'contact.html', label: 'Contact Us', key: 'contact' }
  ];
  const linkHtml = links.map(l =>
    `<li><a href="${l.href}" ${activePage === l.key ? 'class="active"' : ''}>${l.label}</a></li>`
  ).join('');
  return `
    <header class="site-header">
      <div class="logo"><a href="index.html"><img src="Imagelogo.png" alt="${cfg.businessName} Logo"></a></div>
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
          <p>Your one-call solution for every need. From rental cars and rooms to construction labor, home tutors, and event services - we connect you to trusted providers.</p>
        </div>
        <div class="footer-section">
          <h3>Quick Links</h3>
          <ul>
            <li><a href="index.html">Home</a></li>
            <li><a href="index.html#services">All Services</a></li>
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
  const activePage = document.body.getAttribute('data-page') || '';

  const headerSlot = document.getElementById('site-header');
  if (headerSlot) headerSlot.outerHTML = renderHeader(activePage);

  const footerSlot = document.getElementById('site-footer');
  if (footerSlot) footerSlot.outerHTML = renderFooter();

  const floatSlot = document.getElementById('site-floating');
  if (floatSlot) floatSlot.outerHTML = renderFloatingButtons();

  if (typeof initBookingForm === 'function') initBookingForm();

  setupPwaInstall();
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
