/* ===== Call4All — Creative homepage (Le Mugs section6 scroll-scrub) ===== */
(function () {
  'use strict';

  const S6_VIEW_H = 3544;
  const S6_REVEAL_BAND = 0.07;
  const S6_MOBILE_MQ = '(max-width: 900px)';

  const S6_SCENE_DESKTOP = [
    { type: 'deco', top: 20, left: 'calc(50% + 140px)', html: '<div class="lm-s6-deco-card"><strong>Call4All</strong><small>Service Menu</small></div>', from: { x: 24, y: -16, r: 8 } },
    { type: 'deco', top: 8, left: 'calc(50% - 360px)', icon: 'phone', size: 52, from: { x: -14, y: 0, r: -10 } },
    { type: 'cat', label: 'Rental & Travel', top: 250, left: 'calc(50% - 115px)' },
    { type: 'service', sid: 'rental-cars', top: 310, left: '5%', size: 300, wide: true, from: { x: -28, y: 0, r: -12 } },
    { type: 'service', sid: 'car-decoration', top: 310, right: '5%', size: 240, from: { x: 22, y: 0, r: 12 } },
    { type: 'cat', label: 'Home & Property', top: 680, left: 'calc(50% - 130px)' },
    { type: 'service', sid: 'rooms-flats', top: 750, left: 'calc(50% - 180px)', size: 340, wide: true, from: { x: 18, y: 14, r: 9 } },
    { type: 'cat', label: 'Work & Labor', top: 1060, left: 'calc(50% - 95px)' },
    { type: 'service', sid: 'construction', top: 1130, left: '5%', size: 270, wide: true, from: { x: -24, y: -12, r: -11 } },
    { type: 'service', sid: 'manpower-supply', top: 1130, right: '5%', size: 270, wide: true, from: { x: 26, y: 0, r: 12 } },
    { type: 'cat', label: 'Education', top: 1440, left: 'calc(50% - 72px)' },
    { type: 'service', sid: 'home-tutor', top: 1510, left: 'calc(50% - 132px)', size: 265, from: { x: -12, y: 18, r: -8 } },
    { type: 'cat', label: 'Events & Celebrations', top: 1800, left: 'calc(50% - 168px)' },
    { type: 'service', sid: 'marriage-services', top: 1870, left: '5%', size: 310, wide: true, from: { x: -30, y: 0, r: -11 } },
    { type: 'service', sid: 'flower-bouquet', top: 1870, right: '5%', size: 240, from: { x: 20, y: 10, r: 13 } },
    { type: 'cat', label: 'Anything Else?', top: 2180, left: 'calc(50% - 108px)' },
    { type: 'service', sid: 'other', top: 2250, left: 'calc(50% - 127px)', size: 255, from: { x: 0, y: 22, r: -6 } }
  ];

  const S6_SCENE_MOBILE_ROWS = [
    { type: 'cat', label: 'Rental & Travel' },
    { type: 'row', services: [
      { sid: 'rental-cars', left: '4%', size: 148, wide: true, from: { x: -8, y: 0, r: -6 } },
      { sid: 'car-decoration', right: '4%', size: 138, from: { x: 8, y: 0, r: 6 } }
    ]},
    { type: 'cat', label: 'Home & Property' },
    { type: 'row', services: [
      { sid: 'rooms-flats', center: true, size: 188, wide: true, from: { x: 0, y: 10, r: 5 } }
    ]},
    { type: 'cat', label: 'Work & Labor' },
    { type: 'row', services: [
      { sid: 'construction', left: '4%', size: 138, wide: true, from: { x: -8, y: 0, r: -6 } },
      { sid: 'manpower-supply', right: '4%', size: 138, wide: true, from: { x: 8, y: 0, r: 6 } }
    ]},
    { type: 'cat', label: 'Education' },
    { type: 'row', services: [
      { sid: 'home-tutor', center: true, size: 168, from: { x: 0, y: 8, r: -4 } }
    ]},
    { type: 'cat', label: 'Events & Celebrations' },
    { type: 'row', services: [
      { sid: 'marriage-services', left: '4%', size: 142, wide: true, from: { x: -8, y: 0, r: -5 } },
      { sid: 'flower-bouquet', right: '4%', size: 132, from: { x: 8, y: 0, r: 5 } }
    ]},
    { type: 'cat', label: 'Anything Else?' },
    { type: 'row', services: [
      { sid: 'other', center: true, size: 162, from: { x: 0, y: 8, r: -3 } }
    ]}
  ];

  function isMobileLayout() {
    return window.matchMedia(S6_MOBILE_MQ).matches;
  }

  function getScene() {
    return S6_SCENE_DESKTOP;
  }

  function createSceneNode(node, rowIndex) {
    const el = document.createElement('div');
    el.dataset.row = String(rowIndex);
    applyNodePosition(el, node);
    el.dataset.fx = (node.from && node.from.x) || 0;
    el.dataset.fy = (node.from && node.from.y) || 0;
    el.dataset.fr = (node.from && node.from.r) || 0;

    if (node.type === 'cat') {
      el.className = 'lm-s6-cat';
      el.textContent = node.label;
      if (isMobileLayout()) el.dataset.center = '1';
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
      if (!svc) return null;
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
        </div>
        <p class="lm-s6-item-caption">${escapeAttr(svc.name)}</p>`;
    } else {
      return null;
    }
    return el;
  }

  function reflowMobileStage() {
    const stage = document.getElementById('lmSection6Stage');
    if (!stage) return;

    const rowGap = 20;
    const sectionGap = 32;
    let y = 0;
    let rowIndex = 0;

    while (stage.querySelector(`[data-row="${rowIndex}"]`)) {
      const rowEls = [...stage.querySelectorAll(`[data-row="${rowIndex}"]`)];
      let rowH = 0;
      rowEls.forEach((el) => {
        el.style.top = y + 'px';
        el.dataset.top = y;
        rowH = Math.max(rowH, el.offsetHeight);
      });
      const isCatRow = rowEls.some((el) => el.classList.contains('lm-s6-cat'));
      y += rowH + (isCatRow ? rowGap : sectionGap);
      rowIndex += 1;
    }
  }

  function topToProgress(top, stageHeight) {
    const p = top / stageHeight;
    return {
      p0: Math.max(0, p - 0.015),
      p1: Math.min(1, p + S6_REVEAL_BAND)
    };
  }

  function getStageProgress(section, stage) {
    if (!section || !stage) return 0;
    const triggerY = window.innerHeight * 0.42;
    const stageRect = stage.getBoundingClientRect();
    const scrolled = triggerY - stageRect.top;
    const range = stageRect.height + window.innerHeight * 0.25;
    return Math.max(0, Math.min(1, scrolled / range));
  }

  function applyRevealTiming(el, top, stageHeight) {
    const { p0, p1 } = topToProgress(top, stageHeight);
    el.dataset.p0 = p0;
    el.dataset.p1 = p1;
  }

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

    const finish = () => {
      el.classList.add('done');
      document.body.classList.add('loaded');
      sessionStorage.setItem('c4a_preloader_done', '1');
    };

    const skip = sessionStorage.getItem('c4a_preloader_done') === '1'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (skip) {
      finish();
      return;
    }

    let pct = 0;
    let done = false;
    const safeDone = () => {
      if (done) return;
      done = true;
      pctEl.textContent = '100%';
      setTimeout(finish, 350);
    };

    /* Always dismiss — never block the page */
    setTimeout(safeDone, 3200);
    window.addEventListener('load', safeDone, { once: true });

    const tick = () => {
      if (done) return;
      pct += Math.random() * 12 + 4;
      if (pct >= 100) {
        safeDone();
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
    el.style.top = (node.top != null ? node.top : 0) + 'px';
    el.style.left = '';
    el.style.right = '';
    delete el.dataset.center;

    if (node.center) {
      el.style.left = '50%';
      el.dataset.center = '1';
    } else if (node.right) {
      el.style.right = node.right;
      el.style.left = 'auto';
    } else if (node.left) {
      el.style.left = node.left;
    }
  }

  function mobileNodeOpacity(node) {
    const rect = node.getBoundingClientRect();
    const vh = window.innerHeight;
    if (rect.bottom < 8 || rect.top > vh - 8) return 0;
    return easeOut(Math.max(0, Math.min(1, (vh * 0.82 - rect.top) / 90)));
  }

  function nodeOpacity(node, progress, scrollEased) {
    if (progress >= parseFloat(node.dataset.p1 || 1)) return 1;
    if (isMobileLayout()) return scrollEased;

    const rect = node.getBoundingClientRect();
    const vh = window.innerHeight;
    const inView = rect.top < vh * 0.9 && rect.bottom > vh * 0.1;
    if (inView) {
      const enter = easeOut(Math.max(0, Math.min(1, (vh * 0.7 - rect.top) / (rect.height + 50))));
      return Math.max(scrollEased, enter);
    }
    return scrollEased;
  }

  function buildSection6Scene() {
    const stage = document.getElementById('lmSection6Stage');
    const section = document.querySelector('.lm-section6');
    if (!stage) return;

    stage.innerHTML = '';
    stage.classList.toggle('lm-s6-stage--mobile', isMobileLayout());
    if (section) section.classList.toggle('lm-section6--mobile', isMobileLayout());

    let rowIndex = 0;

    if (isMobileLayout()) {
      S6_SCENE_MOBILE_ROWS.forEach((block) => {
        if (block.type === 'cat') {
          const el = createSceneNode({ type: 'cat', label: block.label, center: true }, rowIndex);
          if (el) stage.appendChild(el);
          rowIndex += 1;
        } else if (block.type === 'row') {
          block.services.forEach((svc) => {
            const el = createSceneNode({ type: 'service', ...svc }, rowIndex);
            if (el) stage.appendChild(el);
          });
          rowIndex += 1;
        }
      });
      reflowMobileStage();
    } else {
      getScene().forEach((node) => {
        const el = createSceneNode(node, rowIndex);
        if (!el) return;
        el.dataset.top = node.top;
        el.style.top = node.top + 'px';
        stage.appendChild(el);
        rowIndex += 1;
      });
    }

    if (typeof window.c4aHydrateIcons === 'function') {
      window.c4aHydrateIcons(stage);
    }

    retimeSection6Nodes();
    resizeSection6Height();
  }

  function resizeSection6Height() {
    const section = document.querySelector('.lm-section6');
    const stage = document.getElementById('lmSection6Stage');
    if (!section || !stage) return;

    let maxBottom = 0;
    stage.querySelectorAll('[data-top]').forEach((el) => {
      const top = parseFloat(el.dataset.top) || 0;
      maxBottom = Math.max(maxBottom, top + el.offsetHeight);
    });

    const stageH = maxBottom + (isMobileLayout() ? 24 : 80);
    stage.style.height = stageH + 'px';

    if (isMobileLayout()) {
      section.style.height = 'auto';
      section.style.removeProperty('--s6-height');
      return;
    }

    const stageTop = stage.offsetTop || 280;
    section.style.setProperty('--s6-height', (stageTop + stageH + 160) + 'px');
  }

  function retimeSection6Nodes() {
    const stage = document.getElementById('lmSection6Stage');
    if (!stage) return;
    const h = stage.offsetHeight || 3200;
    stage.querySelectorAll('[data-top]').forEach((el) => {
      applyRevealTiming(el, parseFloat(el.dataset.top), h);
    });
  }

  function initTracePaths() {
    const section = document.querySelector('.lm-section6');
    if (!section) return [];

    const paths = section.querySelectorAll('.lm-s6-trace-path');
    const meta = [];

    paths.forEach((path) => {
      const len = path.getTotalLength();
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);

      const box = path.getBBox();
      const p0 = Math.max(0, (box.y - 30) / S6_VIEW_H);
      const p1 = Math.min(1, (box.y + box.height + 30) / S6_VIEW_H);

      meta.push({ el: path, len, p0, p1 });
    });

    return meta;
  }

  function nodeTransform(el, tx, ty, rot) {
    if (el.dataset.center === '1') {
      return `translate(calc(-50% + ${tx}px), ${ty}px) rotate(${rot}deg)`;
    }
    return `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
  }

  let s6ScrollBound = false;
  let s6WasMobile = null;

  function initSection6ScrollScrub() {
    const section = document.querySelector('.lm-section6');
    const stage = document.getElementById('lmSection6Stage');
    const traceMeta = initTracePaths();
    if (!section || !stage) return;

    const update = () => {
      const nodes = section.querySelectorAll('.lm-s6-cat, .lm-s6-deco, .lm-s6-item');

      if (isMobileLayout()) {
        nodes.forEach((node) => {
          const opacity = mobileNodeOpacity(node);
          node.style.opacity = String(opacity);
          node.style.transform = nodeTransform(node, 0, 0, 0);
          if (node.classList.contains('lm-s6-cat')) {
            node.classList.toggle('lm-s6-visible', opacity > 0.5);
          }
        });
        return;
      }

      const progress = getStageProgress(section, stage);

      nodes.forEach((node) => {
        const p0 = parseFloat(node.dataset.p0 || 0);
        const p1 = parseFloat(node.dataset.p1 || 1);
        const fx = parseFloat(node.dataset.fx || 0);
        const fy = parseFloat(node.dataset.fy || 0);
        const fr = parseFloat(node.dataset.fr || 0);

        let local = (p1 - p0) > 0 ? (progress - p0) / (p1 - p0) : 0;
        local = Math.max(0, Math.min(1, local));
        const scrollEased = easeOut(local);
        const opacity = nodeOpacity(node, progress, scrollEased);
        const anim = progress >= p1 ? 1 : scrollEased;
        const tx = fx * (1 - anim);
        const ty = fy * (1 - anim);
        const rot = fr * (1 - anim);

        node.style.opacity = String(opacity);
        node.style.transform = nodeTransform(node, tx, ty, rot);

        if (node.classList.contains('lm-s6-cat')) {
          node.classList.toggle('lm-s6-visible', opacity > 0.65);
        }
      });

      traceMeta.forEach(({ el, len, p0, p1 }) => {
        if (isMobileLayout()) return;
        let local = (p1 - p0) > 0 ? (progress - p0) / (p1 - p0) : 0;
        local = Math.max(0, Math.min(1, local));
        el.style.strokeDashoffset = String(len * (1 - easeOut(local)));
      });
    };

    if (!s6ScrollBound) {
      s6ScrollBound = true;
      let ticking = false;
      const onScroll = () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(() => { update(); ticking = false; });
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', () => {
        const mobile = isMobileLayout();
        if (s6WasMobile !== null && s6WasMobile !== mobile) {
          buildSection6Scene();
        } else if (mobile) {
          reflowMobileStage();
          resizeSection6Height();
          retimeSection6Nodes();
        }
        s6WasMobile = mobile;
        resizeSection6Height();
        retimeSection6Nodes();
        onScroll();
      }, { passive: true });
      s6WasMobile = isMobileLayout();
    }

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
