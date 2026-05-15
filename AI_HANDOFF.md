# Call4All — AI Handoff & Continuation Guide

> **Purpose of this file**
> This document is written specifically so that **another AI assistant** (or a new
> developer) can pick up exactly where the previous session left off. It contains
> the full project context, the design system, the recent 3D + icon upgrade, the
> conventions, and a recipe-style guide for the most common follow-up tasks.
>
> Read this **first** before changing any file in `call4all/`.

---

## 1. Project at a glance

- **Name:** Call4All — Jaipur's local service aggregator (rental cars, rooms,
  construction labor, tutors, manpower, weddings, flowers, car decoration).
- **Live URL:** https://www.call4all.co.in
- **Tech stack:** **Pure static** HTML + CSS + vanilla JS. **No** build system,
  **no** bundler, **no** framework, **no** TypeScript. Just open `index.html` in
  a browser.
- **Hosting:** GitHub Pages (`BRIJBHAN-SINGH234/call4all`, `main` branch).
- **Backend = Git:** Admin / Staff panels write JSON & CSV directly into the
  GitHub repo via the **Contents API** with a personal access token stored in
  `localStorage`. Public visitors read the same files via
  `raw.githubusercontent.com` (CDN-cached ~5 min).
- **Service Worker:** `sw.js` provides offline shell + PWA install prompt.

> **There is no server-side code.** Anything that looks like a "backend" is
> actually a JavaScript call to GitHub's REST API.

---

## 2. File map (only the parts you'll touch)

```
call4all/
├── index.html                  Homepage (hero, services, features, gallery, FAQ, CTA, booking)
├── about.html                  About page
├── contact.html                Contact info + booking form
├── gallery.html                Full gallery page (filtered list)
├── page.html                   Renders dynamic admin-managed pages by ?slug=xyz
├── rental-cars.html            ┐
├── rooms-flats.html            │
├── construction.html           │
├── home-tutor.html             │ Service detail pages — same template,
├── manpower-supply.html        │ different copy. All use site.js + booking.js.
├── marriage-services.html      │
├── flower-bouquet.html         │
├── car-decoration.html         ┘
├── admin.html                  Admin panel (5 tabs) — DO NOT auto-emoji-swap here
├── staff.html                  Staff portal — DO NOT auto-emoji-swap here
│
├── assets/
│   ├── css/
│   │   └── style.css           SINGLE stylesheet for the whole site, including
│   │                           the "3D LOOK LAYER" appended at the bottom.
│   ├── js/
│   │   ├── icons.js            ★ NEW — SVG icon registry, c4aIcon(), auto-swap
│   │   ├── site.js             Header/Footer/Floating render, Slider, Areas,
│   │   │                        Gallery, Theme, JSON-LD, Branding, PWA install
│   │   ├── booking.js          Booking form render + WhatsApp submission
│   │   ├── admin.js            Admin panel logic (untouched by 3D layer)
│   │   └── staff.js            Staff portal logic (untouched by 3D layer)
│   ├── icons/                  PWA / favicons (raster — don't confuse with icons.js)
│   └── uploads/                Public images uploaded by admin (logo, gallery)
│
├── data/                       Editable data files (admin writes via GitHub API)
│   ├── site-config.json        Branding, contact, theme, slider, dynamic pages
│   ├── bookings.csv            Customer booking submissions
│   ├── sources.csv             Inventory / providers
│   ├── staff.csv               Staff accounts
│   ├── areas.csv               Active service cities/areas
│   └── gallery.csv             Public gallery images
│
├── manifest.json               PWA manifest
├── sw.js                       Service worker (cache-first shell)
├── robots.txt / sitemap.xml    SEO
├── llms.txt / llms-full.txt    LLM-friendly site summary (separate from this file)
├── ai.txt                      AI policy (allow/disallow paths)
├── README.md                   User-facing project README (admin / staff workflow)
└── AI_HANDOFF.md               ← THIS FILE
```

---

## 3. Design system (theme + tokens)

Defined in `assets/css/style.css` `:root` block. **Do not invent new colors** —
use these CSS variables.

| Token | Value | Use |
|---|---|---|
| `--primary`        | `#1f3a2e` | Forest green (headers, dark surfaces, primary buttons) |
| `--primary-dark`   | `#122318` | Even darker forest (hover state, footer) |
| `--accent`         | `#c9a36a` | Warm gold (CTAs, icon badges, accents) |
| `--accent-dark`    | `#a17f47` | Deeper gold (active hover) |
| `--success`        | `#25d366` | WhatsApp green |
| `--danger`         | `#b3261e` | Errors |
| `--text`           | `#2a2a2a` | Body |
| `--text-light`     | `#6b6b6b` | Secondary copy |
| `--bg-light`       | `#f7f3ec` | Page wash |
| `--bg-cream`       | `#faf6ef` | Section-light backgrounds |
| `--shadow`         | `0 6px 24px rgba(20,35,24,0.08)` | Default card shadow |
| `--shadow-lg`      | `0 18px 50px rgba(20,35,24,0.18)` | Hover shadow |
| `--radius`         | `14px` | Default corner radius |
| `--font-heading`   | `'Playfair Display'` | All h1–h5, brand name |
| `--font-body`      | `'Inter'` | Everything else |

The admin can override `--primary`, `--primary-dark`, `--accent`, `--accent-dark`,
`background` from the **Theme & Festival** tab. Any 3D rule that wants to follow
the brand color **must** use the variable, not the literal hex.

---

## 4. The 3D + SVG icon upgrade (most recent change)

### 4.1 What was added

| File | Change |
|---|---|
| `assets/js/icons.js` | **NEW.** SVG icon registry (36 Lucide-style icons), `c4aIcon()` helper, `c4aHydrateIcons()` markup hydrator, `c4aSwapEmojis()` text-node emoji→SVG auto-swap. Auto-runs on `DOMContentLoaded`. |
| `assets/css/style.css` | Appended a "3D LOOK LAYER" section (~470 lines) at the very bottom. Contains 3D icon badges, button depth, service-card perspective tilt, feature-box gold spheres, slider arrows, floating buttons, footer contact icons, areas chips, FAQ summary, etc. **Reduced-motion safe.** |
| `assets/js/site.js` | `services[]` and `slider.slides[]` got a new **`iconName`** field (icon name from `icons.js`) alongside the legacy `icon` (emoji) for backward compat. `renderSlider()`, `renderAreasServed()`, `renderFooter()`, `renderFloatingButtons()` now emit SVG icons. `rerenderSiteShell()` and the `DOMContentLoaded` hook re-run `c4aHydrateIcons()` + `c4aSwapEmojis()` so dynamically-injected chunks get icons too. |
| `index.html` | Loads `assets/js/icons.js` **before** `site.js`. All hero CTAs, "Why Choose Us" feature boxes, "How It Works" numbered coins (now `.feature-num`), gallery button, areas chip, CTA strip — converted from emojis to `data-c4a-icon="…"` hooks. Service card render uses `c4aIcon(s.iconName)`. |
| All other public `*.html` (rental-cars, rooms-flats, construction, home-tutor, manpower-supply, marriage-services, flower-bouquet, car-decoration, gallery, about, contact, page) | Added `<script src="assets/js/icons.js"></script>` **before** `site.js`. Their hero eyebrow / Call Now / Book Now emojis are converted **automatically at runtime** by `c4aSwapEmojis()`. No manual edits needed. |
| `admin.html`, `staff.html` | **Deliberately skipped.** They are internal tools; auto-emoji-swap could mess with their UI. |

### 4.2 Icon library — full available list

```
Communication: phone · phone-headset · whatsapp · mail · globe · clock · chat
Navigation:    menu · close · arrow-right · arrow-left · chevron-right · chevron-left · install
Trust:         check · check-shield · shield · bolt · money · pin · star
Services:      car · home · hard-hat · bricks · book · ring · flower · bow · bell
Misc:          image · document · clipboard · plus · sparkle · heart
```

To add a new icon: edit `assets/js/icons.js` → `ICONS` object →
`'icon-name': '<path d="..." />'` (24×24 viewBox, currentColor stroke, no fill).

### 4.3 Three ways to use an icon

```html
<!-- (1) HTML data-attribute hydrate (preferred for static markup) -->
<span data-c4a-icon="phone" data-icon-size="18"></span>
<span data-c4a-icon="whatsapp" data-icon-size="24" data-icon-badge="3d"></span>
<!-- supports: data-icon-size, data-icon-badge (3d|3d-dark|3d-glass), data-icon-label,
                data-icon-replace (replaces the host element instead of filling it) -->
```

```js
/* (2) JS string (preferred when rendering via template literals) */
const html = c4aIcon('phone', { size: 18 });                    // plain
const badge = c4aIcon('whatsapp', { size: 26, badge: '3d' });    // gold 3D badge
const dark  = c4aIcon('shield',   { size: 30, badge: '3d-dark' }); // dark 3D badge
const glass = c4aIcon('star',     { size: 24, badge: '3d-glass' });
```

```html
<!-- (3) Auto-swap (already running) — just write the emoji as text and the
     icon library converts it on DOMContentLoaded. Add data-keep-emoji on
     any element you want to OPT OUT of the swap. -->
<p>Call us at 📞 +91 …</p>     <!-- becomes phone SVG icon + text -->
<div data-keep-emoji>1</div>    <!-- left as plain text "1" -->
```

Emojis covered by auto-swap:
`📞 💬 ✉️ ✉ 🌐 🕒 ⏰ 📍 ⭐ ✨ ⚡ ✅ 🛡️ 🛡 💰 📋 📸 🖼️ 🖼 📄 📲 ☎️ 🚗 🏠 👷 🧱 📚 💍 🌸 🎀 🛎️ 🛎 ❤️ ❤`

### 4.4 The 3D look — CSS classes you can re-use

| Class | Purpose |
|---|---|
| `.c4a-icon`             | Base inline-flex SVG wrapper |
| `.c4a-icon-3d` / `.c4a-icon-3d-gold` | Gold embossed circular icon badge |
| `.c4a-icon-3d-dark`     | Dark forest embossed badge |
| `.c4a-icon-3d-glass`    | Frosted glass badge |
| `.feature-box`          | Already 3D (lifted card, gold sphere icon) |
| `.feature-icon`         | Gold sphere; child SVG renders inside |
| `.feature-icon.feature-num` | Dark embossed coin (used for step numbers) |
| `.service-card`         | 3D perspective tilt on hover, gold floating overlay |
| `.btn-accent` / `.btn-primary` / `.btn-outline` / `.btn-outline-dark` | All have 3D press effect built in |
| `.slide .slide-icon`    | Gold 3D badge for slider title row |
| `.float-btn.whatsapp` / `.float-btn.call` / `.float-btn.install` | 3D colored spheres |
| `.area-chip`            | 3D pill, lifts on hover |

If you create a **new section** and want it to feel consistent with the rest:
1. Wrap cards in `.feature-box` or `.service-card`.
2. Use `data-c4a-icon="..."` for icons (size 36–42 inside feature-icon, 18 inline).
3. Use `.btn-accent` (gold, primary CTA) or `.btn-outline-dark` (secondary).
4. Use `.section` (default) or `.section-light` (cream bg) wrappers.
5. Always include `<span class="section-eyebrow">…</span>` + `<h2 class="section-title">… <span class="accent">…</span></h2>` + `<div class="title-divider"></div>` for the heading rhythm.

### 4.5 Render lifecycle (critical to understand)

```
1. Browser parses HTML
2. icons.js loads, registers c4aIcon / c4aHydrateIcons / c4aSwapEmojis on window
3. site.js loads, applies cached theme + branding immediately
4. DOMContentLoaded fires:
    a. site.js: applies theme, renders header/footer/floating slots
    b. site.js: calls c4aHydrateIcons() + c4aSwapEmojis() ONCE on document.body
    c. page-specific inline <script>: renders sliders, service grids, booking form
    d. page-specific inline <script>: calls c4aHydrateIcons() / c4aSwapEmojis() again
5. Background: site.js fetches data/site-config.json from raw.githubusercontent.com
6. If the fetched config differs, rerenderSiteShell() runs:
    a. Replaces header / footer with fresh markup
    b. Re-renders slider, areas, JSON-LD
    c. Re-runs c4aHydrateIcons() + c4aSwapEmojis() so new markup gets icons
```

> **If you inject HTML dynamically and it has emojis or `data-c4a-icon` hooks,
> remember to call `c4aHydrateIcons(yourElement)` and/or `c4aSwapEmojis(yourElement)`
> after insertion** — otherwise icons won't render.

---

## 5. Data flow (admin → site)

```
[Admin in /admin.html]
   │ enters / edits in the UI
   ▼
[admin.js]
   │ commits the updated JSON / CSV via GitHub Contents API
   │ (token from localStorage 'c4a_admin_token')
   ▼
[GitHub repo: BRIJBHAN-SINGH234/call4all  on  main branch]
   │
   ├─ data/site-config.json   ─► public site reads via raw.githubusercontent.com
   ├─ data/bookings.csv          (CDN cache ~5 min)
   ├─ data/areas.csv
   ├─ data/gallery.csv          ─► gallery rendered from this on every page
   ├─ data/sources.csv
   └─ data/staff.csv
```

- **Public reads** never need a token.
- **Admin / staff writes** require a GitHub PAT (set up once via Admin Settings).
- After admin saves, the change goes live within **~5 minutes** (raw GitHub CDN
  TTL). Logged-in admins see it immediately because `site.js` calls the
  authenticated Contents API for them (no CDN delay).

---

## 6. Conventions you MUST follow

1. **No frameworks, no build step.** Plain HTML/CSS/JS only. Don't introduce
   React, Vue, Tailwind, npm packages, or a bundler.
2. **Single CSS file:** `assets/css/style.css`. Don't create `style-3d.css`,
   `theme.css`, etc. Append new rules to the existing file (use a section comment
   to organize).
3. **Icons:** Always use `c4aIcon('name')` or `data-c4a-icon="name"`. Never paste
   raw emojis into new HTML you write — they look inconsistent across OS/devices.
   If the icon you need doesn't exist, **add it** to `icons.js` first.
4. **Branding tokens:** Never hard-code `#1f3a2e`, `#c9a36a`, etc. Use
   `var(--primary)`, `var(--accent)`, etc., so the admin's theme override works.
5. **Responsive:** Test at ≥1024 px, 768 px, 480 px. Existing CSS already has
   `@media (max-width: 768px)` and `(max-width: 480px)` blocks — add new rules
   into those.
6. **Accessibility:**
   - All icons rendered by `c4aIcon` get `aria-hidden="true"` unless `label` is
     provided. If the icon is the only content inside a button/link, pass
     `{ label: 'Call now' }`.
   - Respect `prefers-reduced-motion` — the 3D layer already does (transitions
     and pulse animations are disabled). Keep this when adding new motion.
7. **JSON-LD SEO:** `index.html` has 5 `<script type="application/ld+json">`
   blocks (LocalBusiness, ItemList, WebSite, Organization, FAQPage). `site.js`
   regenerates LocalBusiness + ItemList at runtime via `injectStructuredData()`.
   When you add a new service, update **both** the JSON-LD baseline in
   `index.html` AND the `services[]` array in `site.js`.
8. **Page template:** Every public page has the same skeleton:
   ```html
   <head>… SEO meta + manifest + style.css …</head>
   <body data-page="<key>">
     <div id="site-header"></div>
     <!-- page content -->
     <div id="site-footer"></div>
     <div id="site-floating"></div>
     <script src="assets/js/icons.js"></script>
     <script src="assets/js/site.js"></script>
     <script src="assets/js/booking.js"></script>   <!-- if the page has a form -->
     <script>document.addEventListener('DOMContentLoaded', () => { … });</script>
   </body>
   ```
   `body[data-page="..."]` is what `renderHeader()` uses to mark the active nav
   link (`home`, `services`, `gallery`, `about`, `contact`, or `page-<slug>`).
9. **Don't auto-swap inside admin/staff pages.** They don't load `icons.js`. Keep
   it that way.

---

## 7. Recipes for common follow-up tasks

### 7.1 Add a new service

1. **`assets/js/site.js`** — append to `SITE_CONFIG.services[]`:
   ```js
   {
     id: 'photography',
     name: 'Photography',
     icon: '📷',                 // legacy, kept for back-compat
     iconName: 'image',          // must exist in icons.js (or add it)
     desc: 'Professional event & wedding photography.',
     page: 'photography.html',
     image: 'https://images.unsplash.com/...?w=900&q=80&auto=format&fit=crop'
   }
   ```
2. **Create `photography.html`** — copy `rental-cars.html`, change all the copy,
   FAQ entries, JSON-LD `serviceType` and the `renderBookingForm({ service: 'Photography' })`.
3. **`index.html`** — add a new `<ListItem>` entry to the `ldjson-services` JSON-LD
   block; add a matching service to `Organization.knowsAbout[]`.
4. (Optional) Add a slide for it in `SITE_CONFIG.slider.slides[]`.

### 7.2 Add a new icon

In `assets/js/icons.js`, inside the `ICONS` object:
```js
'camera': '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7l1.5-3h3L15 7"/><circle cx="12" cy="13" r="3.5"/>',
```
- viewBox is **always 24×24**.
- Use stroke paths (no `fill="..."`); the wrapper sets stroke + currentColor.
- Test by opening any page and running `c4aIcon('camera')` in the console.

### 7.3 Add a new 3D card variant

Append to the "3D LOOK LAYER" section at the bottom of `style.css`:
```css
.your-new-card {
  background: linear-gradient(180deg, #ffffff 0%, #faf6ef 100%);
  border-radius: 18px;
  border: 1px solid rgba(31,58,46,0.06);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.9) inset,
    0 4px 8px rgba(20,35,24,0.06),
    0 18px 30px -10px rgba(20,35,24,0.18),
    0 30px 60px -20px rgba(20,35,24,0.18);
  transition: transform .45s cubic-bezier(.2,.7,.2,1), box-shadow .35s ease;
}
.your-new-card:hover {
  transform: translateY(-8px);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.9) inset,
    0 24px 40px -10px rgba(20,35,24,0.24),
    0 50px 90px -30px rgba(20,35,24,0.30);
}
```
Match this layered-shadow recipe so the new card feels like the rest.

### 7.4 Add a new dynamic page (without coding)

The admin can add a custom page in **Admin → Pages** tab. The site renders it
via `page.html?slug=xxx` using `renderDynamicPage()` in `site.js` from
`SITE_CONFIG.pages[]`. No HTML file needs to be created.

### 7.5 Change the brand color

Either:
- **Permanently:** edit `:root` in `assets/css/style.css`.
- **Per-deploy:** admin → Theme & Festival → pick a preset or set custom hex.
  This writes `theme.*` to `data/site-config.json`; `applyTheme()` in `site.js`
  injects the new values as inline CSS variables on `:root`.

### 7.6 Add a festival overlay (Diwali / Holi / etc.)

Already supported. Edit `FESTIVAL_PRESETS` in `site.js`:
```js
navratri: {
  label: 'Navratri (Yellow + Red)', emoji: '🪕',
  primary: '#a01a1a', primary_dark: '#6e0e0e',
  accent: '#ffcc00', accent_dark: '#cca300',
  background: '#fff8e7',
  festival_overlay: 'navratri',
  festival_banner: 'Happy Navratri to all!'
}
```
Then add a matching `body.festival-navratri { background-image: ... }` rule in
`style.css` (near the other `body.festival-*` rules).

---

## 8. Common pitfalls (read before debugging)

1. **Slider shows nothing or only on home:** `renderSlider()` is only called from
   the inline `<script>` in `index.html`. Other pages don't have a `#sliderMount`
   div, so it's a no-op.
2. **Admin saves but public site doesn't update for 5 min:** That's the
   `raw.githubusercontent.com` CDN TTL. Logged-in admins bypass it via the
   authenticated Contents API call in `fetchAndApplySiteConfig()`.
3. **Emojis still showing on a page:** Either the page doesn't include
   `<script src="assets/js/icons.js"></script>`, OR the emoji isn't in the
   `EMOJI_MAP` (extend it), OR the host element has `data-keep-emoji`.
4. **New `data-c4a-icon` element renders blank:** You injected it after
   `DOMContentLoaded` and forgot to call `c4aHydrateIcons(yourElement)`.
5. **Theme color override doesn't apply:** You hard-coded `#1f3a2e` instead of
   `var(--primary)` in your CSS rule.
6. **GitHub Pages build delay (~1–2 min):** Newly committed file paths under
   `assets/uploads/` are routed through `raw.githubusercontent.com` by the
   `assetUrl()` helper specifically to bypass this delay.
7. **Don't add `icons.js` to admin.html / staff.html.** The auto-emoji-swap will
   transform admin-only emojis (status icons, tab labels, etc.) and break
   tooling layouts.
8. **JSON-LD must stay valid JSON.** When you edit one of the
   `<script type="application/ld+json">` blocks in any HTML file, validate with
   https://validator.schema.org or `node -e "JSON.parse(require('fs').readFileSync(0,'utf8'))"`.

---

## 9. How to run / preview locally

The site is fully static. Any HTTP server works:

```bash
cd call4all
python3 -m http.server 8000
# open http://127.0.0.1:8000/
```

Or, in VS Code, use the Live Server extension.

> Don't open `index.html` via `file://` — `fetch()` calls to `data/areas.csv`
> and `data/site-config.json` will be CORS-blocked and the slider/areas/theme
> won't load.

For admin testing, you'll need:
1. A GitHub PAT with `repo` scope.
2. Open `admin.html`, paste the token in **Settings → GitHub Token**, save.

---

## 10. Glossary of internal globals (set on `window`)

| Symbol | Defined in | Purpose |
|---|---|---|
| `SITE_CONFIG`           | `site.js`   | Runtime config (branding, theme, services, slider, pages) |
| `FESTIVAL_PRESETS`      | `site.js`   | Festival theme presets |
| `SITE_AREAS`            | `site.js`   | Loaded area list (after `renderAreasServed()`) |
| `applyTheme(theme)`     | `site.js`   | Sets CSS variables + festival overlay class |
| `applyBranding()`       | `site.js`   | Updates all `[data-brand-*]` elements + `[data-call-link]` / `[data-whatsapp-link]` |
| `assetUrl(path)`        | `site.js`   | Resolves uploads to raw.githubusercontent.com (bypass GH Pages build) |
| `renderHeader(active)`  | `site.js`   | Returns header HTML string |
| `renderFooter()`        | `site.js`   | Returns footer HTML string |
| `renderFloatingButtons()` | `site.js` | Returns floating-buttons HTML string |
| `renderSlider()`        | `site.js`   | Mounts the hero slider into `#sliderMount` |
| `renderAreasServed()`   | `site.js`   | Mounts area chips into `#areasMount` |
| `renderGallerySection()`| `site.js`   | Mounts gallery cards into `#galleryMount` |
| `renderDynamicPage(slug)` | `site.js` | Mounts a custom admin page into `#dynamicPageRoot` |
| `injectStructuredData()`| `site.js`   | Re-emits LocalBusiness + Service ItemList JSON-LD |
| `rerenderSiteShell()`   | `site.js`   | After config refresh: re-render header/footer/floating + re-hydrate icons |
| `c4aIcon(name, opts)`   | `icons.js`  | Returns `<span class="c4a-icon">...</span>` HTML string |
| `c4aHydrateIcons(root?)`| `icons.js`  | Replaces `[data-c4a-icon]` placeholders with real SVG |
| `c4aSwapEmojis(root?)`  | `icons.js`  | Replaces known emojis in text nodes with SVG icons |
| `C4A_ICONS`             | `icons.js`  | Raw SVG path map (read-only reference) |
| `renderBookingForm(opts)` | `booking.js` | Returns booking form HTML string |
| `initBookingForm()`     | `booking.js`| Wires submit handler → WhatsApp send |

---

## 11. What the previous AI session delivered (last commit set)

**User ask (Hinglish):**
> "Call4All ko frontend 3D look mein create kr skte ho jisse her section images
> 3D lage … yha icon ki jagh imoji use ho rhe hai yha imoji ki jagah icon hone
> chahiye sabhi imageg or section 3d look mein hone chahiye"

**What was done:**
1. Built `assets/js/icons.js` — 36 SVG icons + 3 helpers + automatic
   emoji-to-icon swap.
2. Appended a "3D LOOK LAYER" to `assets/css/style.css` covering:
   - Embossed gold / dark / glass icon badges
   - 3D press buttons (`btn-accent`, `btn-primary`, `btn-outline`, `btn-outline-dark`)
   - Service-card perspective tilt + floating gold icon overlay
   - Feature-box gold sphere icons + lift on hover
   - Slider arrows + slide depth + slide-icon badge
   - Floating buttons as 3D spheres (WhatsApp green / Call dark / Install gold)
   - Footer contact-list 3D gold-coin icons
   - Areas chips as 3D pills
   - FAQ summary toggle as 3D gold pill
   - About-image perspective frame
   - Reduced-motion override
3. Updated `assets/js/site.js`: added `iconName` to every service + slide,
   converted `renderSlider`, `renderAreasServed`, `renderFooter`,
   `renderFloatingButtons` to emit SVG icons, ensured re-hydration after every
   re-render.
4. Updated `index.html`: `icons.js` loaded before `site.js`; hero CTAs, all 6
   "Why Choose Us" feature boxes, "How It Works" numbered coins, gallery button,
   areas chip, CTA strip — all converted to `data-c4a-icon` hooks; service-card
   render uses `c4aIcon(s.iconName)`.
5. Added `<script src="assets/js/icons.js"></script>` to all 12 other public
   HTML files. Their inline emojis are swapped automatically at runtime.
6. **NOT** touched: `admin.html`, `staff.html` (intentional).

**Verification done:**
- `node --check` on both JS files (clean).
- ReadLints on all touched files (no errors).
- Local HTTP server smoke test (200s for index, rental-cars, icons.js, site.js, style.css).
- Standalone Node.js test of `c4aIcon('phone', { badge: '3d' })` confirmed
  proper SVG output.

**Nothing was committed to git — the user has the working tree changes ready
to review and commit when they're happy.**

---

## 12. Where to look first when you get a follow-up request

| Request type | Open this file first |
|---|---|
| "Add/change a service" | `assets/js/site.js` (services array) + create new `*.html` page |
| "Change copy on the homepage" | `index.html` |
| "Change footer / header layout" | `assets/js/site.js` → `renderHeader` / `renderFooter` |
| "Slider broken / change slides" | `assets/js/site.js` → `SITE_CONFIG.slider` + `renderSlider()` |
| "Booking form needs a new field" | `assets/js/booking.js` |
| "Admin panel issue" | `assets/js/admin.js` + `admin.html` |
| "Staff portal issue" | `assets/js/staff.js` + `staff.html` |
| "Add / restyle an icon" | `assets/js/icons.js` (registry + helpers) |
| "Tweak 3D look / shadows / colors" | bottom of `assets/css/style.css` ("3D LOOK LAYER") |
| "Festival theme" | `assets/js/site.js` → `FESTIVAL_PRESETS` + matching `body.festival-*` CSS |
| "PWA / offline" | `sw.js` + `manifest.json` + `setupPwaInstall()` in `site.js` |
| "SEO / structured data" | top JSON-LD blocks in each HTML + `injectStructuredData()` in `site.js` |

---

## 13. One-line summary for the next AI

> A vanilla static site (Call4All — Jaipur service aggregator) with a luxury
> forest-green + gold theme. Recently upgraded to a 3D look (embossed icon
> badges, perspective service cards, deep-shadow buttons) and switched all
> emojis to a Lucide-style SVG icon library (`icons.js`) with an automatic
> emoji→SVG swap so legacy markup also benefits. Use `c4aIcon('name')` or
> `data-c4a-icon="name"` for icons; use existing `.feature-box` / `.service-card`
> / `.btn-accent` etc. classes — they already carry the 3D treatment. CSS
> variables (`--primary`, `--accent`, …) drive the theme; never hard-code
> brand colors. Single CSS file, no build, no framework. Admin/Staff write to
> `data/*.{json,csv}` via the GitHub Contents API; the public site reads them
> via `raw.githubusercontent.com`. Don't add `icons.js` to `admin.html` /
> `staff.html`. Re-hydrate icons after any dynamic markup injection.
