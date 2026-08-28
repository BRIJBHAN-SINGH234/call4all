(function () {
  'use strict';
  const DATA_PATH = 'data/building-materials.csv';
  const PAGE_URL = 'https://call4all.co.in/building-materials-jaipur.html';
  const safe = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const price = value => new Intl.NumberFormat('en-IN', {style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(value || 0));
  const active = item => String(item.status || '').trim().toLowerCase() === 'active';
  const locationOf = item => [item.area, item.city].filter((value, index, list) => value && list.indexOf(value) === index).join(', ');
  const tone = category => String(category).toLowerCase().includes('sand') ? 'sand' : 'stone';

  function enquiryUrl(item) {
    const phone = (window.SITE_CONFIG && window.SITE_CONFIG.whatsappNumber) || '917737353588';
    const message = [`Hello Call4All, mujhe building material ka live quote chahiye:`, '', `Material: ${item.name}`, `Listed rate: ${price(item.price)} / ${item.unit}`, `Supply location: ${locationOf(item)}`, `Product ID: ${item.id}`, `Page: ${PAGE_URL}`, '', 'Required quantity and delivery location: '].join('\n');
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  function card(item, index) {
    return `<article class="bm-card" style="--delay:${Math.min(index, 8) * 55}ms"><div class="bm-card-visual ${tone(item.category)}"><span class="bm-card-index">${String(index + 1).padStart(2, '0')}</span><div class="bm-material-mark" aria-hidden="true"><i></i><i></i><i></i></div><span class="bm-live-dot">Available</span></div><div class="bm-card-body"><p class="bm-category">${safe(item.category || 'Building Material')}</p><h3>${safe(item.name)}</h3><p class="bm-description">${safe(item.description)}</p><div class="bm-card-foot"><div><strong>${price(item.price)}</strong><span> / ${safe(item.unit)}</span><small>${safe(locationOf(item))}</small></div><a href="${enquiryUrl(item)}" target="_blank" rel="noopener" aria-label="Get live quote for ${safe(item.name)}">Get live quote <span>↗</span></a></div></div></article>`;
  }

  function addProductSchema(items) {
    const old = document.getElementById('building-material-products-schema');
    if (old) old.remove();
    if (!items.length) return;
    const script = document.createElement('script');
    script.id = 'building-material-products-schema'; script.type = 'application/ld+json';
    script.textContent = JSON.stringify({'@context':'https://schema.org','@type':'ItemList',name:'Building Materials Available in Jaipur',numberOfItems:items.length,itemListElement:items.map((item, index) => ({'@type':'ListItem',position:index + 1,item:{'@type':'Product',name:item.name,description:item.description,category:item.category,sku:item.id,offers:{'@type':'Offer',price:String(item.price),priceCurrency:'INR',availability:'https://schema.org/InStock',url:`${PAGE_URL}#${encodeURIComponent(item.id)}`,areaServed:[item.city,item.area].filter(Boolean)}}}))});
    document.head.appendChild(script);
  }

  async function init() {
    const grid = document.getElementById('materialGrid');
    if (!grid || !window.CsvAPI) return;
    try {
      const result = await window.CsvAPI.loadAllPublic(DATA_PATH);
      const items = result.items.filter(active);
      const search = document.getElementById('materialSearch'), category = document.getElementById('materialCategory'), sort = document.getElementById('materialSort');
      [...new Set(items.map(item => item.category).filter(Boolean))].sort().forEach(name => category.insertAdjacentHTML('beforeend', `<option value="${safe(name)}">${safe(name)}</option>`));
      const render = () => {
        const query = search.value.trim().toLowerCase();
        const shown = items.filter(item => (!category.value || item.category === category.value) && (!query || Object.values(item).join(' ').toLowerCase().includes(query)));
        shown.sort((a, b) => sort.value === 'low' ? Number(a.price) - Number(b.price) : sort.value === 'high' ? Number(b.price) - Number(a.price) : Number(String(b.featured).toLowerCase() === 'yes') - Number(String(a.featured).toLowerCase() === 'yes'));
        grid.innerHTML = shown.length ? shown.map(card).join('') : '<div class="bm-empty"><strong>No matching active material found.</strong><span>Try another search or contact us for a custom requirement.</span></div>';
        document.getElementById('materialSummary').textContent = `${shown.length} active material${shown.length === 1 ? '' : 's'} · Live database prices`;
      };
      [search, category, sort].forEach(control => control.addEventListener(control === search ? 'input' : 'change', render));
      addProductSchema(items); render();
    } catch (error) {
      console.error('Building materials database could not be loaded', error);
      grid.innerHTML = '<div class="bm-empty"><strong>Live inventory is temporarily unavailable.</strong><span>Please call or WhatsApp +91 7737353588 for today’s rates.</span></div>';
      document.getElementById('materialSummary').textContent = 'Contact us for today’s availability';
    }
  }
  document.addEventListener('DOMContentLoaded', init);
})();
