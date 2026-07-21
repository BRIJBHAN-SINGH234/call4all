(function () {
  'use strict';
  async function render() {
    const propertyGrid = document.getElementById('homePropertyGrid');
    const usedGrid = document.getElementById('homeSecondHandGrid');
    if (propertyGrid && window.PropertyCatalog) {
      const items = (await window.PropertyCatalog.load()).slice().reverse().slice(0, 4);
      propertyGrid.innerHTML = items.length ? items.map(window.PropertyCatalog.card).join('') : '<p class="inventory-empty">New property listings coming soon.</p>';
    }
    if (usedGrid && window.SecondHandCatalog) {
      const items = (await window.SecondHandCatalog.load()).slice().reverse().slice(0, 4);
      usedGrid.innerHTML = items.length ? items.map(window.SecondHandCatalog.card).join('') : '<p class="inventory-empty">New second-hand items coming soon.</p>';
    }
  }
  document.addEventListener('DOMContentLoaded', render);
})();
