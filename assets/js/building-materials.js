(function () {
  'use strict';
  const DATA_PATH = 'data/building-materials.csv';
  const PAGE_URL = 'https://call4all.co.in/building-materials-jaipur.html';
  const safe = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const price = value => new Intl.NumberFormat('en-IN', {style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(value || 0));
  const active = item => String(item.status || '').trim().toLowerCase() === 'active';
  const locationOf = item => [item.area, item.city].filter((value, index, list) => value && list.indexOf(value) === index).join(', ');
  const tone = category => String(category).toLowerCase().includes('sand') ? 'sand' : 'stone';
  const imageOf = item => window.assetUrl ? window.assetUrl(item.image_path || 'assets/uploads/call4all-c4-logo.png') : (item.image_path || 'assets/uploads/call4all-c4-logo.png');
  const absolute = value => new URL(value, location.href).href;
  function setMeta(selector, content, property) { let tag=document.querySelector(selector); if(!tag){tag=document.createElement('meta');tag.setAttribute(property?'property':'name',selector.match(/["']([^"']+)/)?.[1]||'description');document.head.appendChild(tag)}tag.content=content; }

  function enquiryUrl(item) {
    const phone = (window.SITE_CONFIG && window.SITE_CONFIG.whatsappNumber) || '917737353588';
    const message = [`Hello Call4All, mujhe building material ka live quote chahiye:`, '', `Material: ${item.name}`, `Listed rate: ${price(item.price)} / ${item.unit}`, `Supply location: ${locationOf(item)}`, `Product ID: ${item.id}`, `Page: ${PAGE_URL}`, '', 'Required quantity and delivery location: '].join('\n');
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  function card(item, index) {
    return `<article class="bm-card" id="${safe(item.id)}" style="--delay:${Math.min(index, 8) * 55}ms"><div class="bm-card-visual ${tone(item.category)}"><img src="${safe(imageOf(item))}" alt="${safe(item.image_alt || item.name + ' building material in Jaipur')}" loading="lazy" decoding="async" width="640" height="480"><span class="bm-card-index">${String(index + 1).padStart(2, '0')}</span><span class="bm-live-dot">Available</span></div><div class="bm-card-body"><p class="bm-category">${safe(item.category || 'Building Material')}</p><h3>${safe(item.name)}</h3><p class="bm-description">${safe(item.description)}</p><div class="bm-card-foot"><div><strong>${price(item.price)}</strong><span> / ${safe(item.unit)}</span><small>${safe(locationOf(item))}</small></div><a href="${enquiryUrl(item)}" target="_blank" rel="noopener" aria-label="Get live quote for ${safe(item.name)}">Get live quote <span>↗</span></a></div></div></article>`;
  }

  function addProductSchema(items) {
    const old = document.getElementById('building-material-products-schema');
    if (old) old.remove();
    if (!items.length) return;
    const script = document.createElement('script');
    script.id = 'building-material-products-schema'; script.type = 'application/ld+json';
    script.textContent = JSON.stringify({'@context':'https://schema.org','@type':'ItemList',name:'Building Materials Available in Jaipur',numberOfItems:items.length,itemListElement:items.map((item, index) => ({'@type':'ListItem',position:index + 1,item:{'@type':'Product','@id':`${PAGE_URL}#${encodeURIComponent(item.id)}`,name:item.name,image:[absolute(imageOf(item))],description:item.description,category:item.category,sku:item.id,offers:{'@type':'Offer',price:String(item.price),priceCurrency:'INR',priceValidUntil:new Date(new Date().setFullYear(new Date().getFullYear()+1)).toISOString().slice(0,10),availability:'https://schema.org/InStock',itemCondition:'https://schema.org/NewCondition',url:`${PAGE_URL}#${encodeURIComponent(item.id)}`,seller:{'@id':'https://call4all.co.in/#localbusiness'},availableAtOrFrom:{'@type':'Place',name:locationOf(item)}}}}))});
    document.head.appendChild(script);
  }

  async function init() {
    const grid = document.getElementById('materialGrid');
    if (!grid || !window.CsvAPI) return;
    try {
      const result = await window.CsvAPI.loadAllPublic(DATA_PATH);
      const items = result.items.filter(active);
      if(items.length){const hero=absolute(imageOf(items[0]));['meta[property="og:image"]','meta[property="og:image:secure_url"]'].forEach(s=>setMeta(s,hero,true));setMeta('meta[name="twitter:image"]',hero);}
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
