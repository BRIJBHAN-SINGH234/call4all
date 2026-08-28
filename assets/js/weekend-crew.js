(function () {
  'use strict';

  const CONFIG = 'data/weekend-crew.json';
  const GALLERY = 'data/weekend-crew-gallery.csv';
  const safe = value => String(value == null ? '' : value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const asset = path => window.assetUrl ? window.assetUrl(path) : path;
  const driveId = url => {
    const match = String(url || '').match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : '';
  };
  const setMeta = (selector, value, property) => {
    let element = document.querySelector(selector);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(property ? 'property' : 'name', selector.match(/["']([^"']+)/)?.[1] || 'description');
      document.head.appendChild(element);
    }
    element.content = value;
  };
  const startVideos = () => {
    document.querySelectorAll('[data-weekend-video]').forEach(video => {
      video.muted = true;
      video.defaultMuted = true;
      const playback = video.play();
      if (playback && typeof playback.catch === 'function') playback.catch(error => {
        video.dataset.playError = error && error.name ? error.name : 'PlaybackError';
      });
    });
  };
  const setupVideoFallbacks = () => {
    document.querySelectorAll('[data-weekend-video]').forEach(video => {
      const container = video.parentElement;
      const button = container && container.querySelector('[data-video-start]');
      if (!button) return;
      const hide = () => {
        video.dataset.playing = 'true';
        button.classList.remove('is-visible');
      };
      const offerPlay = () => {
        video.dataset.playing = 'false';
        video.dataset.readyState = String(video.readyState);
        if (video.paused || video.readyState < 2) button.classList.add('is-visible');
      };
      video.addEventListener('playing', hide);
      video.addEventListener('error', offerPlay);
      video.addEventListener('canplay', () => {
        video.muted = true;
        video.play().then(hide).catch(() => {});
      }, { once: true });
      button.addEventListener('click', () => {
        video.muted = true;
        video.play().then(hide).catch(offerPlay);
      });
      setTimeout(offerPlay, 8000);
    });
  };

  async function init() {
    try {
      const [configResult, galleryResult] = await Promise.all([
        CsvAPI.loadJson(CONFIG),
        CsvAPI.loadAllPublic(GALLERY)
      ]);
      const config = configResult.json || {};
      const rows = (galleryResult.items || [])
        .filter(item => String(item.status).toLowerCase() === 'active')
        .sort((a, b) => Number(a.sort_order || 99) - Number(b.sort_order || 99));

      if (config.enabled === false) {
        location.href = 'index.html';
        return;
      }

      document.getElementById('weekendEyebrow').textContent = config.eyebrow || 'Jaipur-born · Rajasthan-bound';
      document.getElementById('weekendTitle').innerHTML = safe(config.hero_title || 'Find the trail no one is talking about.').replace(/\n/g, '<br>');
      document.getElementById('weekendSubtitle').textContent = config.hero_subtitle || '';
      document.getElementById('weekendAbout').textContent = config.about || '';

      const id = driveId(config.video_url);
      /* Drive's original 1440p/60fps file is intentionally not attached here:
         it is too heavy for reliable mobile autoplay. The optimized WebM/MP4
         sources in HTML are derived from that file. A custom non-Drive asset
         path can still be supplied from admin when needed. */
      const configuredVideo = !id && config.video_url && !/weekend-crew-film\.(?:mp4|webm)$/i.test(config.video_url)
        ? asset(config.video_url)
        : '';
      if (configuredVideo) {
        document.querySelectorAll('[data-weekend-video]').forEach(video => {
          video.src = configuredVideo;
          video.load();
          video.addEventListener('loadeddata', startVideos, { once: true });
        });
        startVideos();
      }
      setupVideoFallbacks();

      const message = encodeURIComponent('Hello Call4All, I want details about the next Weekend Crew trek/adventure in Rajasthan.');
      const whatsapp = `https://wa.me/${String(config.whatsapp || '917737353588').replace(/\D/g, '')}?text=${message}`;
      document.getElementById('weekendWhatsApp').href = whatsapp;
      document.getElementById('weekendFinalWhatsApp').href = whatsapp;

      if (rows.length) {
        const hero = asset(config.og_image || rows[0].image_path);
        const featured = rows.filter(item => String(item.featured).toLowerCase() === 'yes');
        document.getElementById('wcFeaturedOne').src = asset((featured[0] || rows[0]).image_path);
        document.getElementById('wcFeaturedTwo').src = asset((featured[1] || rows[1] || rows[0]).image_path);
        document.getElementById('weekendGallery').innerHTML = rows.map(item => `<figure><img src="${safe(asset(item.image_path))}" alt="${safe(item.alt_text || 'Weekend Crew adventure in Rajasthan')}" loading="lazy" decoding="async"><figcaption>${safe(item.caption)}</figcaption></figure>`).join('');
        setMeta('meta[property="og:image"]', new URL(hero, location.href).href, true);
        setMeta('meta[property="og:image:secure_url"]', new URL(hero, location.href).href, true);
        setMeta('meta[name="twitter:image"]', new URL(hero, location.href).href);
        const schema = document.createElement('script');
        schema.type = 'application/ld+json';
        schema.id = 'weekend-gallery-schema';
        schema.textContent = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ImageGallery',
          name: 'Weekend Crew Rajasthan Adventure Gallery',
          url: location.href,
          image: rows.map(item => ({
            '@type': 'ImageObject',
            contentUrl: new URL(asset(item.image_path), location.href).href,
            caption: item.caption,
            description: item.alt_text
          }))
        });
        document.head.appendChild(schema);
      }
      if (config.seo_title) document.title = config.seo_title;
      if (config.seo_description) setMeta('meta[name="description"]', config.seo_description);
    } catch (error) {
      console.warn('Weekend Crew content could not be loaded', error);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupVideoFallbacks();
    init();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) startVideos();
  });
  document.addEventListener('click', startVideos, { once: true });
})();
