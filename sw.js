/* ===== Call4All - Service Worker =====
 * Strategies:
 *   - HTML pages:        network-first, fallback to cache (so updates show)
 *   - Static assets:     cache-first (CSS, JS, icons, logo)
 *   - Data CSVs:         network-only (always fresh; will fail offline)
 *   - GitHub API calls:  network-only (sensitive operations, never cache)
 *   - raw.githubusercontent: network-first with cache fallback for staff login etc.
 */

const CACHE_VERSION = 'v3-2026-05-06';
const STATIC_CACHE = 'c4a-static-' + CACHE_VERSION;
const RUNTIME_CACHE = 'c4a-runtime-' + CACHE_VERSION;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/about.html',
  '/contact.html',
  '/rental-cars.html',
  '/rooms-flats.html',
  '/construction.html',
  '/home-tutor.html',
  '/manpower-supply.html',
  '/marriage-services.html',
  '/flower-bouquet.html',
  '/car-decoration.html',
  '/assets/css/style.css',
  '/assets/js/site.js',
  '/assets/js/booking.js',
  '/Imagelogo.png',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS).catch(err => {
        console.warn('[SW] Precache error (some files may be missing):', err);
      }))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET requests
  if (req.method !== 'GET') return;

  // Never cache the GitHub API or admin/staff pages (sensitive)
  if (url.host === 'api.github.com') return;
  if (url.pathname.endsWith('/admin.html') || url.pathname.endsWith('/staff.html')) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // For data CSVs (raw.githubusercontent or local /data/), prefer network
  if (url.pathname.startsWith('/data/') || url.host === 'raw.githubusercontent.com') {
    event.respondWith(networkFirst(req));
    return;
  }

  // For HTML pages — network-first so users see updates
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Static assets — cache-first
  event.respondWith(cacheFirst(req));
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) {
      const clone = res.clone();
      caches.open(RUNTIME_CACHE).then(c => c.put(req, clone));
    }
    return res;
  } catch (err) {
    return cached || new Response('Offline', { status: 503 });
  }
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const clone = res.clone();
      caches.open(RUNTIME_CACHE).then(c => c.put(req, clone));
    }
    return res;
  } catch (err) {
    const cached = await caches.match(req);
    if (cached) return cached;
    // Final fallback for navigation
    if (req.mode === 'navigate') {
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline. Please connect to the internet.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Listen for skip waiting message (so we can update without reload)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
