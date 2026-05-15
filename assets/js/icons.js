/* =====================================================================
   Call4All — SVG Icon Library
   ---------------------------------------------------------------------
   A lightweight, Lucide-inspired stroke-icon set used everywhere on the
   site instead of Unicode emojis. Pair with the .c4a-icon-3d badge style
   in style.css to get the embossed / 3D look.

   Usage:
     // Inline string (server-style)
     element.innerHTML = c4aIcon('phone');                 // 24px, no badge
     element.innerHTML = c4aIcon('phone', { size: 28 });
     element.innerHTML = c4aIcon('phone', { badge: '3d' }); // gold 3D badge
     element.innerHTML = c4aIcon('phone', { badge: '3d-dark' }); // dark 3D badge

     // Auto-replace any element with [data-c4a-icon="name"]
     c4aHydrateIcons();   // called automatically on DOMContentLoaded
   ===================================================================== */

(function () {
  'use strict';

  /* ---------- icon paths (24x24 viewBox, currentColor stroke) ---------- */
  const ICONS = {
    /* Communication */
    phone:
      '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/>',
    'phone-headset':
      '<path d="M3 12a9 9 0 0 1 18 0v5a3 3 0 0 1-3 3h-1v-7h4"/><path d="M3 12v5a3 3 0 0 0 3 3h1v-7H3"/>',
    whatsapp:
      '<path d="M16.7 13.4c-.3-.1-1.6-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.6.1-.3-.2-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.5-.8-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2 0 1.3.9 2.5 1.1 2.7.1.2 1.9 2.9 4.6 4 .6.3 1.1.5 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.6-.6 1.8-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3Z"/><path d="M20.5 12a8.5 8.5 0 0 1-13 7.2L3 21l1.8-4.4A8.5 8.5 0 1 1 20.5 12Z"/>',
    mail:
      '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    globe:
      '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/>',
    clock:
      '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    chat:
      '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',

    /* Navigation / UI */
    menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    'arrow-left': '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    'chevron-right': '<path d="m9 6 6 6-6 6"/>',
    'chevron-left': '<path d="m15 6-6 6 6 6"/>',
    install:
      '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',

    /* Trust / quality */
    check:
      '<path d="m5 13 4 4L19 7"/>',
    'check-shield':
      '<path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6Z"/><path d="m9 12 2 2 4-4"/>',
    shield:
      '<path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6Z"/>',
    bolt:
      '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
    money:
      '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9v.01"/><path d="M18 15v.01"/>',
    pin:
      '<path d="M12 22s7-7.58 7-13a7 7 0 1 0-14 0c0 5.42 7 13 7 13Z"/><circle cx="12" cy="9" r="2.5"/>',
    star:
      '<path d="m12 3 2.7 5.5 6 .9-4.4 4.2 1 6-5.4-2.8-5.3 2.8 1-6L3.3 9.4l6-.9Z"/>',

    /* Service icons */
    car:
      '<path d="M3 13.5 5 8c.4-1.2 1.5-2 2.8-2h8.4c1.3 0 2.4.8 2.8 2l2 5.5"/><path d="M5 13.5h14a2 2 0 0 1 2 2V19a1 1 0 0 1-1 1h-1a2 2 0 0 1-2-2v-1H7v1a2 2 0 0 1-2 2H4a1 1 0 0 1-1-1v-3.5a2 2 0 0 1 2-2Z"/><circle cx="7.5" cy="16.5" r="1"/><circle cx="16.5" cy="16.5" r="1"/>',
    home:
      '<path d="m3 11 9-7 9 7"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/>',
    'hard-hat':
      '<path d="M3 17h18v3H3z"/><path d="M5 17v-2a7 7 0 0 1 14 0v2"/><path d="M10 7V5a2 2 0 0 1 4 0v2"/>',
    bricks:
      '<path d="M3 7h6v5H3z"/><path d="M9 12h6v5H9z"/><path d="M15 7h6v5h-6z"/><path d="M3 17h6v5H3z"/><path d="M15 17h6v5h-6z"/>',
    book:
      '<path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3Z"/><path d="M4 17h15"/><path d="M9 8h6"/>',
    ring:
      '<circle cx="12" cy="15" r="6"/><path d="m9 7 1.5-3h3L15 7"/><path d="m12 4-1 3"/><path d="m12 4 1 3"/>',
    flower:
      '<circle cx="12" cy="12" r="2.5"/><path d="M12 9.5V5a2.5 2.5 0 1 0-2.5 2.5"/><path d="M12 14.5V19a2.5 2.5 0 1 0 2.5-2.5"/><path d="M14.5 12H19a2.5 2.5 0 1 0-2.5-2.5"/><path d="M9.5 12H5a2.5 2.5 0 1 0 2.5 2.5"/>',
    bow:
      '<path d="M4 8c4 0 8 2 8 4 0-2 4-4 8-4-2 4-2 8 0 12-4 0-8-2-8-4 0 2-4 4-8 4 2-4 2-8 0-12Z"/><circle cx="12" cy="12" r="2"/>',
    bell:
      '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/>',

    /* Misc */
    image:
      '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="9" r="1.8"/><path d="m21 15-5-5L5 21"/>',
    document:
      '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/>',
    clipboard:
      '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9z"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    sparkle:
      '<path d="M12 3v3"/><path d="M12 18v3"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="m5.6 5.6 2.1 2.1"/><path d="m16.3 16.3 2.1 2.1"/><path d="m5.6 18.4 2.1-2.1"/><path d="m16.3 7.7 2.1-2.1"/>',
    heart:
      '<path d="M20.8 6.6a5.5 5.5 0 0 0-9-1.7 5.5 5.5 0 0 0-9 1.7c-1 3.5 1.6 7 5 9.4l4 3.4 4-3.4c3.4-2.4 6-5.9 5-9.4Z"/>'
  };

  /* ---------- helpers ---------- */
  function svg(name, opts) {
    const path = ICONS[name];
    if (!path) return '';
    const stroke = opts && opts.stroke ? opts.stroke : 2;
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="' + stroke + '" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' + path + '</svg>'
    );
  }

  /**
   * c4aIcon(name, opts)
   *   opts.size  — pixel size (default 24)
   *   opts.badge — '', '3d', '3d-dark', '3d-gold', '3d-glass'
   *   opts.class — extra classes
   *   opts.label — accessible label (adds aria-label)
   */
  function c4aIcon(name, opts) {
    opts = opts || {};
    const size = opts.size || 24;
    const badge = opts.badge ? ' c4a-icon-' + opts.badge : '';
    const extra = opts.class ? ' ' + opts.class : '';
    const aria = opts.label
      ? ' role="img" aria-label="' + String(opts.label).replace(/"/g, '&quot;') + '"'
      : ' aria-hidden="true"';
    const inner = svg(name, opts);
    if (!inner) return '';
    return (
      '<span class="c4a-icon' + badge + extra + '" ' +
      'style="--c4a-icon-size:' + size + 'px"' + aria + '>' + inner + '</span>'
    );
  }

  /**
   * Auto-hydrate all elements with `data-c4a-icon="name"` attribute.
   *   <span data-c4a-icon="phone" data-icon-size="28" data-icon-badge="3d"></span>
   *   <span data-c4a-icon="phone" data-icon-replace></span>  // replaces the host
   */
  function c4aHydrateIcons(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-c4a-icon]').forEach((el) => {
      if (el.dataset.c4aIconReady === '1') return;
      const name = el.getAttribute('data-c4a-icon');
      const size = parseInt(el.getAttribute('data-icon-size') || '0', 10) || undefined;
      const badge = el.getAttribute('data-icon-badge') || '';
      const label = el.getAttribute('data-icon-label') || '';
      const html = c4aIcon(name, { size, badge, label });
      if (el.hasAttribute('data-icon-replace')) {
        el.outerHTML = html;
      } else {
        el.innerHTML = html;
        el.dataset.c4aIconReady = '1';
      }
    });
  }

  /* ---------- emoji → icon auto-swap (for un-touched legacy markup) ----------
     Pages we haven't manually edited will still display the right icon.
     Only swaps emojis we know about; leaves everything else alone. */
  const EMOJI_MAP = {
    '📞': 'phone',
    '💬': 'whatsapp',
    '✉️': 'mail',
    '✉': 'mail',
    '🌐': 'globe',
    '🕒': 'clock',
    '⏰': 'clock',
    '📍': 'pin',
    '⭐': 'star',
    '✨': 'sparkle',
    '⚡': 'bolt',
    '✅': 'check-shield',
    '🛡️': 'shield',
    '🛡': 'shield',
    '💰': 'money',
    '📋': 'clipboard',
    '📸': 'image',
    '🖼️': 'image',
    '🖼': 'image',
    '📄': 'document',
    '📲': 'install',
    '☎️': 'phone',
    '🚗': 'car',
    '🏠': 'home',
    '👷': 'hard-hat',
    '🧱': 'bricks',
    '📚': 'book',
    '💍': 'ring',
    '🌸': 'flower',
    '🎀': 'bow',
    '🛎️': 'bell',
    '🛎': 'bell',
    '❤️': 'heart',
    '❤': 'heart'
  };
  // single regex that matches any of our known emoji keys
  const EMOJI_REGEX = new RegExp(
    '(' +
      Object.keys(EMOJI_MAP)
        .sort((a, b) => b.length - a.length)
        .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|') +
      ')',
    'g'
  );

  // walk only safe text nodes, but skip <script>/<style>/SVG and any node
  // already marked data-keep-emoji
  function walkAndSwap(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentNode;
        if (!p) return NodeFilter.FILTER_REJECT;
        const tag = (p.tagName || '').toUpperCase();
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'SVG') return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest('[data-keep-emoji]')) return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest('.c4a-icon')) return NodeFilter.FILTER_REJECT;
        if (!EMOJI_REGEX.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        EMOJI_REGEX.lastIndex = 0;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const targets = [];
    while (walker.nextNode()) targets.push(walker.currentNode);

    targets.forEach((textNode) => {
      const text = textNode.nodeValue;
      EMOJI_REGEX.lastIndex = 0;
      let html = '';
      let lastIdx = 0;
      let m;
      while ((m = EMOJI_REGEX.exec(text)) !== null) {
        html += escapeForHtml(text.slice(lastIdx, m.index));
        const iconName = EMOJI_MAP[m[0]];
        html += c4aIcon(iconName, { size: 18, class: 'c4a-icon-inline' });
        lastIdx = m.index + m[0].length;
      }
      html += escapeForHtml(text.slice(lastIdx));
      const tpl = document.createElement('span');
      tpl.className = 'c4a-emoji-swap';
      tpl.innerHTML = html;
      textNode.parentNode.replaceChild(tpl, textNode);
    });
  }

  function escapeForHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function c4aSwapEmojis(root) {
    walkAndSwap(root || document.body);
  }

  /* ---------- expose globals ---------- */
  window.c4aIcon = c4aIcon;
  window.c4aHydrateIcons = c4aHydrateIcons;
  window.c4aSwapEmojis = c4aSwapEmojis;
  window.C4A_ICONS = ICONS;

  /* ---------- auto-hydrate on DOMContentLoaded ---------- */
  function init() {
    try { c4aHydrateIcons(); } catch (e) { console.warn('[c4a-icons] hydrate failed', e); }
    try { c4aSwapEmojis(document.body); } catch (e) { /* non-fatal */ }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
