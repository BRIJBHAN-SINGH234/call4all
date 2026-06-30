/* ===== Call4All — Creative homepage (Le Mugs section6 scroll-scrub) ===== */
(function () {
  'use strict';

  const S6_STAGE_TOP_FALLBACK = 360;

  function getS6StageTop() {
    const stage = document.getElementById('lmSection6Stage');
    return stage ? stage.offsetTop : S6_STAGE_TOP_FALLBACK;
  }

  /* Tighter layout — pairs side-by-side, fits in ~2600px scroll */
  const S6_SCENE = [
    { type: 'cat', label: 'Rental & Travel', top: 0, p0: 0.02, p1: 0.10 },
    { type: 'service', sid: 'rental-cars', top: 48, left: '6%', size: 240, p0: 0.04, p1: 0.14, from: { x: -18, y: 0, r: -10 } },
    { type: 'service', sid: 'car-decoration', top: 48, right: '6%', size: 220, p0: 0.04, p1: 0.14, from: { x: 18, y: 0, r: 10 } },
    { type: 'cat', label: 'Home & Property', top: 340, p0: 0.12, p1: 0.20 },
    { type: 'service', sid: 'rooms-flats', top: 390, center: true, size: 260, p0: 0.14, p1: 0.24, from: { x: 0, y: 16, r: 8 } },
    { type: 'cat', label: 'Work & Labor', top: 680, p0: 0.22, p1: 0.30 },
    { type: 'service', sid: 'construction', top: 728, left: '6%', size: 220, p0: 0.24, p1: 0.34, from: { x: -16, y: 0, r: -10 } },
    { type: 'service', sid: 'manpower-supply', top: 728, right: '6%', size: 220, p0: 0.24, p1: 0.34, from: { x: 16, y: 0, r: 10 } },
    { type: 'cat', label: 'Education', top: 980, p0: 0.32, p1: 0.40 },
    { type: 'service', sid: 'home-tutor', top: 1028, center: true, size: 220, p0: 0.34, p1: 0.44, from: { x: 0, y: 14, r: -6 } },
    { type: 'cat', label: 'Events & Celebrations', top: 1280, p0: 0.42, p1: 0.50 },
    { type: 'service', sid: 'marriage-services', top: 1328, left: '6%', size: 230, p0: 0.44, p1: 0.54, from: { x: -18, y: 0, r: -8 } },
    { type: 'service', sid: 'flower-bouquet', top: 1328, right: '6%', size: 210, p0: 0.44, p1: 0.54, from: { x: 18, y: 0, r: 8 } },
    { type: 'cat', label: 'Anything Else?', top: 1580, p0: 0.52, p1: 0.60 },
    { type: 'service', sid: 'other', top: 1628, center: true, size: 210, p0: 0.54, p1: 0.64, from: { x: 0, y: 12, r: -5 } }
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

  function applyNodePosition(el, node) {
    el.style.top = node.top + 'px';
    el.style.left = '';
    el.style.right = '';
    delete el.dataset.center;

    if (node.center) {
      el.style.left = '50%';
      el.dataset.center = '1';
    } else if (node.left) {
      el.style.left = node.left;
    } else if (node.right) {
      el.style.right = node.right;
      el.style.left = 'auto';
    }
  }

  function buildSection6Scene() {
    const stage = document.getElementById('lmSection6Stage');
    if (!stage || stage.children.length) return;

    S6_SCENE.forEach((node) => {
      const el = document.createElement('div');
      applyNodePosition(el, node);
      el.dataset.p0 = node.p0;
      el.dataset.p1 = node.p1;
      el.dataset.fx = (node.from && node.from.x) || 0;
      el.dataset.fy = (node.from && node.from.y) || 0;
      el.dataset.fr = (node.from && node.from.r) || 0;

      if (node.type === 'cat') {
        el.className = 'lm-s6-cat';
        el.textContent = node.label;
      } else if (node.type === 'service') {
        const svc = getService(node.sid);
        if (!svc) return;
        const size = node.size || 220;
        const img = svc.image || '';
        el.className = 'lm-s6-item';
        el.style.width = size + 'px';
        el.innerHTML = `
          <div class="lm-s6-item-inner" style="width:${size}px;height:${size}px">
            <img src="${escapeAttr(img)}" alt="${escapeAttr(svc.name)}" loading="lazy" decoding="async" width="${size}" height="${size}">
            <div class="lm-s6-rollover">
              <a href="${escapeAttr(svc.page)}" class="lm-s6-roundbtn" aria-label="Discover ${escapeAttr(svc.name)}">
                <span>Discover</span>
              </a>
            </div>
          </div>`;
      } else {
        return;
      }

      stage.appendChild(el);
    });

    resizeSection6Height();
  }

  function resizeSection6Height() {
    const section = document.querySelector('.lm-section6');
    const stage = document.getElementById('lmSection6Stage');
    if (!section || !stage) return;

    let maxBottom = 0;
    stage.querySelectorAll('.lm-s6-item, .lm-s6-cat').forEach((el) => {
      const top = parseFloat(el.style.top) || 0;
      const h = el.offsetHeight || 240;
      maxBottom = Math.max(maxBottom, top + h);
    });

    const total = getS6StageTop() + maxBottom + 160;
    section.style.setProperty('--s6-height', total + 'px');
  }

  function nodeTransform(el, tx, ty, rot) {
    if (el.dataset.center === '1' || el.classList.contains('lm-s6-cat')) {
      return `translate(calc(-50% + ${tx}px), ${ty}px) rotate(${rot}deg)`;
    }
    return `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
  }

  function initSection6ScrollScrub() {
    const section = document.querySelector('.lm-section6');
    const nodes = section ? section.querySelectorAll('.lm-s6-cat, .lm-s6-item') : [];
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

        let local = (p1 - p0) > 0 ? (progress - p0) / (p1 - p0) : 1;
        local = Math.max(0, Math.min(1, local));
        const eased = easeOut(local);

        if (progress >= p1) {
          node.dataset.revealed = '1';
        }

        const opacity = node.dataset.revealed === '1' ? 1 : eased;
        const tx = progress >= p1 ? 0 : fx * (1 - eased);
        const ty = progress >= p1 ? 0 : fy * (1 - eased);
        const rot = progress >= p1 ? 0 : fr * (1 - eased);

        node.style.opacity = String(opacity);
        node.style.transform = nodeTransform(node, tx, ty, rot);

        if (node.classList.contains('lm-s6-cat') && opacity > 0.5) {
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
    window.addEventListener('resize', () => {
      resizeSection6Height();
      onScroll();
    }, { passive: true });
    update();
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
      }, { rootMargin: '400px 0px' });
      io.observe(section);
    } else {
      boot();
    }
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
