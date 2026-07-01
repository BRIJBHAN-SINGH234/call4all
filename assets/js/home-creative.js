/* ===== Call4All — Creative homepage (Le Mugs section6 scroll-scrub) ===== */
(function () {
  'use strict';

  const S6_HEIGHT = 3800;

  /* Scattered table layout — mirrors Le Mugs vertical journey */
  const S6_SCENE = [
    { type: 'deco', top: 20, left: 'calc(50% + 160px)', html: '<div class="lm-s6-deco-card"><strong>Call4All</strong><small>Service Menu</small></div>', p0: 0, p1: 0.06, from: { x: 24, y: -16, r: 8 } },
    { type: 'deco', top: 8, left: 'calc(50% - 400px)', icon: 'phone', size: 52, p0: 0, p1: 0.05, from: { x: -14, y: 0, r: -10 } },
    { type: 'cat', label: 'Rental & Travel', top: 250, left: 'calc(50% - 115px)', p0: 0.04, p1: 0.10 },
    { type: 'service', sid: 'rental-cars', top: 310, left: 'calc(50% - 440px)', size: 320, wide: true, p0: 0.06, p1: 0.14, from: { x: -28, y: 0, r: -12 } },
    { type: 'deco', top: 400, left: 'calc(50% + 300px)', icon: 'car', size: 44, p0: 0.09, p1: 0.13, from: { x: 10, y: -6, r: 6 } },
    { type: 'service', sid: 'car-decoration', top: 490, left: 'calc(50% + 55px)', size: 255, p0: 0.10, p1: 0.17, from: { x: 22, y: -10, r: 14 } },
    { type: 'cat', label: 'Home & Property', top: 730, left: 'calc(50% - 130px)', p0: 0.16, p1: 0.21 },
    { type: 'service', sid: 'rooms-flats', top: 800, left: 'calc(50% - 180px)', size: 360, wide: true, p0: 0.18, p1: 0.25, from: { x: 18, y: 14, r: 9 } },
    { type: 'deco', top: 770, left: 'calc(50% - 430px)', icon: 'home', size: 42, p0: 0.17, p1: 0.22, from: { x: -8, y: 4, r: -5 } },
    { type: 'cat', label: 'Work & Labor', top: 1130, left: 'calc(50% - 95px)', p0: 0.26, p1: 0.31 },
    { type: 'service', sid: 'construction', top: 1200, left: 'calc(50% - 435px)', size: 285, wide: true, p0: 0.28, p1: 0.35, from: { x: -24, y: -12, r: -11 } },
    { type: 'service', sid: 'manpower-supply', top: 1360, left: 'calc(50% + 75px)', size: 295, wide: true, p0: 0.32, p1: 0.39, from: { x: 26, y: 0, r: 12 } },
    { type: 'cat', label: 'Education', top: 1690, left: 'calc(50% - 72px)', p0: 0.40, p1: 0.45 },
    { type: 'service', sid: 'home-tutor', top: 1760, left: 'calc(50% - 130px)', size: 265, p0: 0.42, p1: 0.49, from: { x: -12, y: 18, r: -8 } },
    { type: 'cat', label: 'Events & Celebrations', top: 2090, left: 'calc(50% - 168px)', p0: 0.50, p1: 0.55 },
    { type: 'service', sid: 'marriage-services', top: 2160, left: 'calc(50% - 455px)', size: 335, wide: true, p0: 0.52, p1: 0.59, from: { x: -30, y: 0, r: -11 } },
    { type: 'service', sid: 'flower-bouquet', top: 2350, left: 'calc(50% + 48px)', size: 260, p0: 0.56, p1: 0.63, from: { x: 20, y: 10, r: 13 } },
    { type: 'deco', top: 2290, left: 'calc(50% + 310px)', icon: 'flower', size: 40, p0: 0.55, p1: 0.60, from: { x: 8, y: 0, r: 5 } },
    { type: 'cat', label: 'Anything Else?', top: 2690, left: 'calc(50% - 108px)', p0: 0.64, p1: 0.69 },
    { type: 'service', sid: 'other', top: 2760, left: 'calc(50% - 125px)', size: 255, p0: 0.66, p1: 0.73, from: { x: 0, y: 22, r: -6 } },
    { type: 'deco', top: 2910, left: 'calc(50% + 270px)', icon: 'check-shield', size: 58, p0: 0.70, p1: 0.76, from: { x: 14, y: 0, r: 9 } }
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
    el.style.left = node.left || '';
    el.style.right = '';
    delete el.dataset.center;

    if (node.center) {
      el.style.left = '50%';
      el.dataset.center = '1';
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
        const size = node.size || 240;
        const img = svc.image || '';
        el.className = 'lm-s6-item' + (node.wide ? ' lm-s6-wide' : '');
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

    if (typeof window.c4aHydrateIcons === 'function') {
      window.c4aHydrateIcons(stage);
    }
  }

  function initTracePaths() {
    const section = document.querySelector('.lm-section6');
    if (!section) return [];

    const paths = section.querySelectorAll('.lm-s6-trace-path');
    const meta = [];

    paths.forEach((path, i) => {
      const len = path.getTotalLength();
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);
      meta.push({
        el: path,
        len,
        p0: i * 0.12,
        p1: Math.min(1, (i + 1) * 0.14 + 0.02)
      });
    });

    return meta;
  }

  function nodeTransform(el, tx, ty, rot) {
    if (el.dataset.center === '1') {
      return `translate(calc(-50% + ${tx}px), ${ty}px) rotate(${rot}deg)`;
    }
    return `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
  }

  function initSection6ScrollScrub() {
    const section = document.querySelector('.lm-section6');
    const nodes = section ? section.querySelectorAll('.lm-s6-cat, .lm-s6-deco, .lm-s6-item') : [];
    const traceMeta = initTracePaths();
    if (!section || !nodes.length) return;

    section.style.setProperty('--s6-height', S6_HEIGHT + 'px');

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

        if (progress >= p1) node.dataset.revealed = '1';

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

      traceMeta.forEach(({ el, len, p0, p1 }) => {
        let local = (p1 - p0) > 0 ? (progress - p0) / (p1 - p0) : 1;
        local = Math.max(0, Math.min(1, local));
        el.style.strokeDashoffset = String(len * (1 - easeOut(local)));
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
      }, { rootMargin: '500px 0px' });
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
