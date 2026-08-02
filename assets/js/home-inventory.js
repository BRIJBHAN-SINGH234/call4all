(function () {
  'use strict';
  function visibleCount(variant) {
    if (window.matchMedia('(max-width: 640px)').matches) return variant === 'property' ? 4 : 2;
    if (window.matchMedia('(max-width: 1100px)').matches) return 2;
    return 4;
  }
  function createSlider(grid, items, card, emptyMessage, variant) {
    if (!items.length) { grid.innerHTML = `<p class="inventory-empty">${emptyMessage}</p>`; return; }
    const shell = grid.closest('[data-catalog-slider]');
    shell.dataset.catalogVariant = variant || 'default';
    let start = 0;
    const render = () => {
      const count = Math.min(visibleCount(variant), items.length);
      const columns = variant === 'property' && window.matchMedia('(max-width: 640px)').matches ? Math.min(2, count) : count;
      grid.style.setProperty('--slider-columns', columns);
      grid.innerHTML = Array.from({ length:count }, (_, offset) => card(items[(start + offset) % items.length])).join('');
    };
    shell.querySelector('[data-slider-prev]').addEventListener('click', () => {
      start = (start - 1 + items.length) % items.length;
      render();
    });
    shell.querySelector('[data-slider-next]').addEventListener('click', () => {
      start = (start + 1) % items.length;
      render();
    });
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(render, 120);
    });
    render();
  }
  async function render() {
    const propertyGrid = document.getElementById('homePropertyGrid');
    const handmadeGrid = document.getElementById('homeHandmadeGrid');
    if (propertyGrid && window.PropertyCatalog) {
      const items = (await window.PropertyCatalog.load())
        .filter(item => item.property_type === 'Lease/Rent' && String(item.image_path || '').trim())
        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
      createSlider(propertyGrid, items, window.PropertyCatalog.card, 'New rental property listings with photos coming soon.', 'property');
    }
    if (handmadeGrid && window.HandmadeCatalog) {
      const items = (await window.HandmadeCatalog.load()).slice().reverse();
      createSlider(handmadeGrid, items, window.HandmadeCatalog.card, 'New handmade items coming soon.', 'handmade');
    }
  }
  document.addEventListener('DOMContentLoaded', render);
})();
