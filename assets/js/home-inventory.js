(function () {
  'use strict';
  function visibleCount() {
    if (window.matchMedia('(max-width: 640px)').matches) return 1;
    if (window.matchMedia('(max-width: 1100px)').matches) return 2;
    return 4;
  }
  function createSlider(grid, items, card, emptyMessage) {
    if (!items.length) { grid.innerHTML = `<p class="inventory-empty">${emptyMessage}</p>`; return; }
    const shell = grid.closest('[data-catalog-slider]');
    let start = 0;
    const render = () => {
      const count = Math.min(visibleCount(), items.length);
      grid.style.setProperty('--slider-columns', count);
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
      const items = (await window.PropertyCatalog.load()).slice().reverse();
      createSlider(propertyGrid, items, window.PropertyCatalog.card, 'New property listings coming soon.');
    }
    if (handmadeGrid && window.HandmadeCatalog) {
      const items = (await window.HandmadeCatalog.load()).slice().reverse();
      createSlider(handmadeGrid, items, window.HandmadeCatalog.card, 'New handmade items coming soon.');
    }
  }
  document.addEventListener('DOMContentLoaded', render);
})();
