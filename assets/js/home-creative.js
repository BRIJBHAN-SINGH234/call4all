/* ===== Call4All — Creative homepage (Le Mugs section6 scroll-scrub) ===== */
(function () {
  'use strict';

  /* Scene layout — positions mirror Le Mugs vertical table journey */
  const S6_SCENE = [
    { type: 'deco', id: 'menu-card', top: 40, left: 'calc(50% + 180px)', html: '<div class="lm-s6-deco-card"><strong>Call4All</strong><small>Service Menu</small></div>', p0: 0, p1: 0.06, from: { x: 30, y: -20, r: 8 } },
    { type: 'deco', id: 'phone-icon', top: 30, left: 'calc(50% - 420px)', icon: 'phone', size: 56, p0: 0, p1: 0.05, from: { x: -15, y: 0, r: -12 } },
    { type: 'cat', label: 'Rental & Travel', top: 280, p0: 0.04, p1: 0.10 },
    { type: 'service', sid: 'rental-cars',      top: 340, left: 'calc(50% - 480px)', size: 340, wide: true,  p0: 0.06, p1: 0.16, from: { x: -25, y: 0, r: -15 } },
    { type: 'service', sid: 'car-decoration',   top: 520, left: 'calc(50% + 80px)',  size: 260, wide: false, p0: 0.10, p1: 0.20, from: { x: 20, y: -10, r: 15 } },
    { type: 'cat', label: 'Home & Property', top: 780, p0: 0.18, p1: 0.24 },
    { type: 'service', sid: 'rooms-flats',      top: 860, left: 'calc(50% - 60px)',   size: 380, wide: true,  p0: 0.20, p1: 0.30, from: { x: 20, y: 0, r: 12 } },
    { type: 'cat', label: 'Work & Labor', top: 1180, p0: 0.30, p1: 0.36 },
    { type: 'service', sid: 'construction',     top: 1260, left: 'calc(50% - 460px)', size: 300, wide: true,  p0: 0.32, p1: 0.42, from: { x: -20, y: -30, r: -15 } },
    { type: 'service', sid: 'manpower-supply',  top: 1420, left: 'calc(50% + 100px)', size: 320, wide: true,  p0: 0.36, p1: 0.46, from: { x: 25, y: 0, r: 15 } },
    { type: 'cat', label: 'Education', top: 1780, p0: 0.44, p1: 0.50 },
    { type: 'service', sid: 'home-tutor',       top: 1860, left: 'calc(50% - 200px)', size: 290, wide: false, p0: 0.46, p1: 0.56, from: { x: -15, y: 20, r: -10 } },
    { type: 'cat', label: 'Events & Celebrations', top: 2180, p0: 0.54, p1: 0.60 },
    { type: 'service', sid: 'marriage-services', top: 2260, left: 'calc(50% - 470px)', size: 350, wide: true, p0: 0.56, p1: 0.66, from: { x: -30, y: 0, r: -12 } },
    { type: 'service', sid: 'flower-bouquet',   top: 2480, left: 'calc(50% + 60px)',  size: 270, wide: false, p0: 0.62, p1: 0.72, from: { x: 20, y: 10, r: 14 } },
    { type: 'cat', label: 'Anything Else?', top: 2820, p0: 0.70, p1: 0.76 },
    { type: 'service', sid: 'other',            top: 2900, left: 'calc(50% - 180px)', size: 260, wide: false, p0: 0.72, p1: 0.82, from: { x: 0, y: 30, r: -8 } },
    { type: 'deco', id: 'shield-icon', top: 3100, left: 'calc(50% + 320px)', icon: 'check-shield', size: 64, p0: 0.78, p1: 0.88, from: { x: 15, y: 0, r: 10 } }
  ];

  function escapeAttr(s) {
    return String(s || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 2.5);
  }

  function initPreloader() {
    const el = document.getElementById('lmPreloader');
    const pctEl = document.getElementById('lmPreloaderPct');
    if (!el || !pctEl) return;

    const skip = sessionStorage.getItem('c4a_preloader_done') === '1'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (skip) {
      el.classList.add('done');
      document.body.classList.add('loaded');
      return;
    }

    let pct = 0;
    const tick = () => {
      pct += Math.random() * 12 + 4;
      if (pct >= 100) {
        pctEl.textContent = '100%';
        sessionStorage.setItem('c4a_preloader_done', '1');
        setTimeout(() => { el.classList.add('done'); document.body.classList.add('loaded'); }, 400);
        return;
      }
      pctEl.textContent = Math.floor(pct) + '%';
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function getService(sid) {
    const list = (window.SITE_CONFIG && window.SITE_CONFIG.services) || [];
    return list.find((s) => s.id === sid) || null;
  }

  function buildSection6Scene() {
    const stage = document.getElementById('lmSection6Stage');
    if (!stage || stage.children.length) return;

    S6_SCENE.forEach((node) => {
      const el = document.createElement('div');
      el.className = 'lm-s6-node';
      el.style.top = node.top + 'px';
      if (node.left) el.style.left = node.left;
      el.dataset.p0 = node.p0;
      el.dataset.p1 = node.p1;
      el.dataset.fx = (node.from && node.from.x) || 0;
      el.dataset.fy = (node.from && node.from.y) || 0;
      el.dataset.fr = (node.from && node.from.r) || 0;

      if (node.type === 'cat') {
        el.className = 'lm-s6-cat';
        el.textContent = node.label;
      } else if (node.type === 'deco') {
        el.className = 'lm-s6-deco';
        if (node.html) {
          el.innerHTML = node.html;
        } else if (node.icon) {
          el.className += ' lm-s6-deco-icon';
          el.innerHTML = `<span data-c4a-icon="${node.icon}" data-icon-size="${node.size || 48}"></span>`;
        }
      } else if (node.type === 'service') {
        const svc = getService(node.sid);
        if (!svc) return;
        const img = svc.image || '';
        el.className = 'lm-s6-item' + (node.wide ? ' lm-s6-wide' : '');
        el.style.width = node.size + 'px';
        el.innerHTML = `
          <div class="lm-s6-item-inner" style="width:${node.size}px;height:${node.size}px">
            <img src="${escapeAttr(img)}" alt="${escapeAttr(svc.name)}" loading="lazy" width="${node.size}" height="${node.size}">
            <div class="lm-s6-rollover">
              <a href="${escapeAttr(svc.page)}" class="lm-s6-roundbtn" aria-label="Discover ${escapeAttr(svc.name)}">
                <span>Discover</span>
              </a>
            </div>
          </div>`;
      }

      stage.appendChild(el);
    });

    if (typeof window.c4aHydrateIcons === 'function') {
      window.c4aHydrateIcons(stage);
    }
  }

  function initSection6Lazy() {
    const section = document.querySelector('.lm-section6');
    if (!section) return;

    let built = false;
    const boot = () => {
      if (built) return;
      built = true;
      buildSection6Scene();
      initSection6ScrollScrub();
    };

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          boot();
          io.disconnect();
        }
      }, { rootMargin: '600px 0px' });
      io.observe(section);
    } else {
      boot();
    }
  }

  function initSection6ScrollScrub() {
    const section = document.querySelector('.lm-section6');
    const nodes = section ? section.querySelectorAll('.lm-s6-cat, .lm-s6-deco, .lm-s6-item') : [];
    if (!section || !nodes.length) return;

    let ticking = false;

    const update = () => {
      const rect = section.getBoundingClientRect();
      const scrollable = section.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;

      const progress = Math.max(0, Math.min(1, -rect.top / scrollable));

      nodes.forEach((node) => {
        const p0 = parseFloat(node.dataset.p0 || 0);
        const p1 = parseFloat(node.dataset.p1 || 1);
        const fx = parseFloat(node.dataset.fx || 0);
        const fy = parseFloat(node.dataset.fy || 0);
        const fr = parseFloat(node.dataset.fr || 0);

        let local = (progress - p0) / (p1 - p0);
        local = Math.max(0, Math.min(1, local));
        const eased = easeOut(local);

        const tx = fx * (1 - eased);
        const ty = fy * (1 - eased);
        const rot = fr * (1 - eased);

        node.style.opacity = String(eased);

        if (node.classList.contains('lm-s6-cat')) {
          node.style.transform = `translate(calc(-50% + ${tx}px), ${ty}px) rotate(${rot}deg)`;
        } else {
          node.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
        }

        if (node.classList.contains('lm-s6-cat') && eased > 0.6) {
          node.classList.add('lm-s6-visible');
        }
      });

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  function initScrollReveal() {
    const targets = document.querySelectorAll('.lm-split-item, .lm-story-content, .lm-kukas');
    if (!targets.length) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('visible');
        if (e.target.classList.contains('lm-kukas')) e.target.classList.add('in-view');
        const story = e.target.closest('.lm-story');
        if (story) story.classList.add('in-view');
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });

    targets.forEach((t) => io.observe(t));
    document.querySelectorAll('.lm-story').forEach((s) => {
      io.observe(s.querySelector('.lm-story-content') || s);
    });
  }

  function initHeaderScroll() {
    const header = document.querySelector('.home-creative .site-header');
    if (!header) return;
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initParallax() {
    const stories = document.querySelectorAll('.lm-story-bg');
    if (!stories.length) return;
    window.addEventListener('scroll', () => {
      stories.forEach((bg) => {
        const parent = bg.closest('.lm-story');
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        const offset = (rect.top / window.innerHeight) * 30;
        bg.style.transform = `scale(1.05) translateY(${offset}px)`;
      });
    }, { passive: true });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.body.classList.contains('home-creative')) return;
    initPreloader();
    initSection6Lazy();
    initScrollReveal();
    initParallax();

    let tries = 0;
    const waitHeader = setInterval(() => {
      initHeaderScroll();
      if (document.querySelector('.home-creative .site-header') || ++tries > 20) {
        clearInterval(waitHeader);
      }
    }, 100);
  });
})();
