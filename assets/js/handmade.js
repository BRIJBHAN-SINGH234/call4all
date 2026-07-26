(function () {
  'use strict';
  const PATH = 'data/handmade-items.csv';
  const BASE = 'https://call4all.co.in/';
  const safe = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money = value => new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 }).format(Number(value || 0));
  const image = item => item.image_path || 'assets/icons/icon-512.png';
  const detailUrl = item => 'handmade-item.html?id=' + encodeURIComponent(item.id);
  const absolute = path => new URL(path, location.href).href;
  const locationName = item => [item.area,item.city,item.state || (item.city === 'Jaipur' ? 'Rajasthan' : '')].filter((value,index,array) => value && array.indexOf(value) === index).join(', ');

  async function load() {
    try {
      const result = await window.CsvAPI.loadAllPublic(PATH);
      return result.items.filter(item => String(item.status).toLowerCase() === 'active' && String(item.approval_status).toLowerCase() === 'approved' && Number(item.stock || 0) > 0);
    } catch (error) { console.warn('Handmade items could not be loaded', error); return []; }
  }
  function whatsappUrl(item) {
    const number = (window.SITE_CONFIG && window.SITE_CONFIG.whatsappNumber) || '917737353588';
    const message = ['Hello Call4All, mujhe yeh handmade product order karna hai:','','Product: ' + item.title,'Category: ' + (item.category || 'Handmade'),'Artisan: ' + (item.artisan || 'Not specified'),'Material: ' + (item.materials || 'Not specified'),'Price: ' + money(item.price),'Location: ' + locationName(item),'Delivery: All India availability confirm karein','Product ID: ' + item.id,'Link: ' + absolute(detailUrl(item))].join('\n');
    return 'https://wa.me/' + number + '?text=' + encodeURIComponent(message);
  }
  function card(item) {
    return `<article class="market-card"><a href="${detailUrl(item)}"><img src="${safe(image(item))}" alt="${safe(item.title)} handmade by ${safe(item.artisan || 'local artisan')} in ${safe(locationName(item))}" loading="lazy" width="420" height="315"></a><div class="market-card-body"><span class="market-badge">${safe(item.category || 'Handmade')}</span><h3><a href="${detailUrl(item)}">${safe(item.title)}</a></h3><p class="market-meta">${safe(item.artisan || 'Local artisan')}${item.materials ? ' · ' + safe(item.materials) : ''}</p><strong>${money(item.price)}</strong><p class="market-location">📍 ${safe(locationName(item) || 'India')} · ${safe(item.stock)} in stock</p><div class="market-actions"><a class="btn btn-outline-dark btn-sm" href="${detailUrl(item)}">View Details</a><a class="btn btn-whatsapp btn-sm" href="${whatsappUrl(item)}" target="_blank" rel="noopener">Order on WhatsApp</a></div></div></article>`;
  }
  function addJsonLd(data, id) {
    document.getElementById(id)?.remove();
    const script = document.createElement('script'); script.id = id; script.type = 'application/ld+json'; script.textContent = JSON.stringify(data); document.head.appendChild(script);
  }
  function setMeta(selector, content, property) {
    let tag = document.querySelector(selector);
    if (!tag) { tag = document.createElement('meta'); tag.setAttribute(property ? 'property' : 'name', selector.match(/["']([^"']+)/)?.[1] || 'description'); document.head.appendChild(tag); }
    tag.setAttribute('content', content);
  }
  function updateListingSeo(items) {
    if (!items.length) return;
    const prices = items.map(item => Number(item.price)).filter(price => price > 0);
    const min = Math.min(...prices), max = Math.max(...prices);
    const range = min === max ? money(min) : `${money(min)}–${money(max)}`;
    document.title = `Buy Handmade Items Online Across India | ${range} | Call4All`;
    const description = `Shop ${items.length} handmade items from artisans across India. Live prices ${range}; compare gifts, decor, jewellery, pottery and crafts with WhatsApp ordering.`;
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', document.title, true);
    setMeta('meta[property="og:description"]', description, true);
    document.getElementById('handmadePriceRange').textContent = `Live prices: ${range} · Product inventory ke according automatically updated`;
    document.getElementById('handmadeHeroCopy').textContent = `Handmade products across India ${range} — maker, material, stock aur location ke saath.`;
    addJsonLd({
      '@context':'https://schema.org','@graph':[
        {'@type':'CollectionPage','@id':BASE+'handmade-items.html#page',name:document.title,url:BASE+'handmade-items.html',description},
        {'@type':'ItemList',name:'Handmade Items Across India',numberOfItems:items.length,itemListElement:items.map((item,index)=>({'@type':'ListItem',position:index+1,name:item.title,url:absolute(detailUrl(item))}))},
        {'@type':'OfferCatalog',name:'Local Handmade Products',numberOfItems:items.length,itemListElement:items.map(item=>({'@type':'Offer',price:item.price,priceCurrency:'INR',availability:'https://schema.org/InStock',url:absolute(detailUrl(item)),itemOffered:{'@type':'Product',name:item.title,image:absolute(image(item))}}))},
        {'@type':'Organization','@id':BASE+'#organization',name:'Call4All',url:BASE,telephone:'+91-7737353588',areaServed:{'@type':'Country','name':'India'}}
      ]
    }, 'handmade-list-schema');
  }
  async function listingPage() {
    const grid = document.getElementById('handmadeGrid'); if (!grid) return;
    const items = await load(), search = document.getElementById('handmadeSearch'), category = document.getElementById('handmadeCategory'), sort = document.getElementById('handmadeSort');
    [...new Set(items.map(item => item.category).filter(Boolean))].sort().forEach(name => category.insertAdjacentHTML('beforeend', `<option value="${safe(name)}">${safe(name)}</option>`));
    const render = () => {
      const query = search.value.trim().toLowerCase(), selected = category.value;
      const shown = items.filter(item => (!selected || item.category === selected) && (!query || Object.values(item).join(' ').toLowerCase().includes(query)));
      if (sort.value === 'low') shown.sort((a,b) => Number(a.price)-Number(b.price));
      if (sort.value === 'high') shown.sort((a,b) => Number(b.price)-Number(a.price));
      grid.innerHTML = shown.length ? shown.map(card).join('') : '<p class="empty-map">No matching handmade product available right now.</p>';
      document.getElementById('handmadeCount').textContent = shown.length + ' handmade products available';
    };
    [search,category,sort].forEach(control => control.addEventListener(control === search ? 'input' : 'change', render));
    updateListingSeo(items); render();
  }
  async function detailPage() {
    const mount = document.getElementById('handmadeDetail'); if (!mount) return;
    const items = await load(), id = new URLSearchParams(location.search).get('id'), item = items.find(entry => entry.id === id);
    if (!item) { document.title = 'Handmade Product Not Found | Call4All'; document.querySelector('meta[name="robots"]').content = 'noindex,follow'; mount.innerHTML = '<p class="empty-map">Product not found or currently out of stock. <a href="handmade-items.html">See available handmade items</a>.</p>'; return; }
    const city = item.city || 'Jaipur', area = item.area || city, canonical = absolute(detailUrl(item));
    const title = item.meta_title || `${item.title} in ${area} ${city} | ${money(item.price)} | Call4All`;
    const description = item.meta_description || `${item.title}, handmade by ${item.artisan || 'a local artisan'}, available in ${area}, ${city} for ${money(item.price)}. View material, stock and order details.`;
    document.title = title.slice(0, 65);
    document.querySelector('meta[name="robots"]').content = 'index,follow,max-image-preview:large,max-snippet:-1';
    setMeta('meta[name="description"]', description.slice(0, 170)); setMeta('meta[name="keywords"]', item.keywords || `${item.title}, handmade items near me, handmade products ${city}`);
    setMeta('meta[property="og:title"]', title, true); setMeta('meta[property="og:description"]', description, true); setMeta('meta[property="og:url"]', canonical, true); setMeta('meta[property="og:image"]', absolute(image(item)), true);
    setMeta('meta[name="twitter:title"]', title); setMeta('meta[name="twitter:description"]', description); setMeta('meta[name="twitter:image"]', absolute(image(item)));
    document.querySelector('link[rel="canonical"]').href = canonical;
    mount.innerHTML = `<article class="market-detail"><img src="${safe(image(item))}" alt="${safe(item.title)} handmade ${safe(item.category)} by ${safe(item.artisan || 'local artisan')}"><div class="market-detail-content"><a href="handmade-items.html">← Back to handmade items</a><span class="market-badge">${safe(item.category)}</span><h1>${safe(item.title)}</h1><div class="market-detail-price">${money(item.price)}</div><dl class="market-specs"><div><dt>Artisan / Maker</dt><dd>${safe(item.artisan || 'Local artisan')}</dd></div><div><dt>Material</dt><dd>${safe(item.materials || 'Ask seller')}</dd></div><div><dt>Available stock</dt><dd>${safe(item.stock)}</dd></div><div><dt>Location</dt><dd>${safe([area,city].filter((v,i,a)=>a.indexOf(v)===i).join(', '))}</dd></div><div><dt>Product ID</dt><dd>${safe(item.id)}</dd></div><div><dt>Category</dt><dd>${safe(item.category)}</dd></div></dl><h2>Product details</h2><p class="product-description">${safe(item.description).replace(/\n/g,'<br>')}</p><p><strong>Near you:</strong> Pickup/delivery aur customisation ke liye WhatsApp par apna location share karein.</p><a class="btn btn-whatsapp btn-lg" href="${whatsappUrl(item)}" target="_blank" rel="noopener">Order on WhatsApp</a></div></article>`;
    addJsonLd({'@context':'https://schema.org','@graph':[
      {'@type':'Product','@id':canonical+'#product',name:item.title,image:[absolute(image(item))],description,sku:item.id,category:item.category,material:item.materials,brand:{'@type':'Brand',name:item.artisan || 'Local Artisan'},offers:{'@type':'Offer',url:canonical,price:String(item.price),priceCurrency:'INR',priceValidUntil:new Date(new Date().setFullYear(new Date().getFullYear()+1)).toISOString().slice(0,10),availability:'https://schema.org/InStock',itemCondition:'https://schema.org/NewCondition',seller:{'@id':BASE+'#localbusiness'},availableAtOrFrom:{'@type':'Place',name:`${area}, ${city}`}}},
      {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:BASE},{'@type':'ListItem',position:2,name:'Handmade Items',item:BASE+'handmade-items.html'},{'@type':'ListItem',position:3,name:item.title,item:canonical}]},
      {'@type':'LocalBusiness','@id':BASE+'#localbusiness',name:'Call4All',telephone:'+91-7737353588',url:BASE,address:{'@type':'PostalAddress',addressLocality:'Kukas, Jaipur',addressRegion:'Rajasthan',addressCountry:'IN'}}
    ]}, 'handmade-product-schema');
    const related = items.filter(entry => entry.id !== item.id).sort((a,b) => Number(b.category === item.category)-Number(a.category === item.category)).slice(0,8);
    document.getElementById('handmadeRelated').innerHTML = related.length ? related.map(card).join('') : '<p>More products will be added soon.</p>';
  }
  window.HandmadeCatalog = { load, card, whatsappUrl };
  document.addEventListener('DOMContentLoaded', () => { listingPage(); detailPage(); });
})();
