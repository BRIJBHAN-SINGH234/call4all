(function () {
  'use strict';
  const PATH = 'data/second-hand-items.csv';
  const safe = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const money = value => value ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value)) : 'Price on request';
  const image = item => item.image_path || 'assets/icons/icon-512.png';
  const detailUrl = item => 'second-hand-item.html?id=' + encodeURIComponent(String(item.id || ''));
  const absolute = path => new URL(path, location.href).href;
  function setMeta(selector, content, property) { let tag=document.querySelector(selector);if(!tag){tag=document.createElement('meta');tag.setAttribute(property?'property':'name',selector.match(/["']([^"']+)/)?.[1]||'description');document.head.appendChild(tag)}tag.content=content; }

  async function load() {
    try {
      const result = await window.CsvAPI.loadAllPublic(PATH);
      return result.items.filter(item => String(item.status).toLowerCase() === 'active' && String(item.approval_status).toLowerCase() === 'approved');
    } catch (error) {
      console.warn('Second-hand items could not be loaded', error);
      return [];
    }
  }

  function whatsappUrl(item) {
    const number = (window.SITE_CONFIG && window.SITE_CONFIG.whatsappNumber) || '917737353588';
    const message = [
      'Hello Call4All, mujhe yeh second-hand item book karna hai:',
      '',
      'Item: ' + item.title,
      'Category: ' + (item.category || 'Other'),
      'Brand: ' + (item.brand || 'Not specified'),
      'Condition: ' + (item.condition || 'Not specified'),
      'Price: ' + money(item.price),
      'Location: ' + [item.area, item.city].filter(Boolean).join(', '),
      'Listing ID: ' + item.id,
      'Link: ' + new URL(detailUrl(item), location.href).href
    ].join('\n');
    return 'https://wa.me/' + number + '?text=' + encodeURIComponent(message);
  }

  function card(item) {
    return `<article class="market-card"><a href="${detailUrl(item)}"><img src="${safe(image(item))}" alt="${safe(item.title)} second-hand ${safe(item.category)}" loading="lazy"></a><div class="market-card-body"><span class="market-badge">${safe(item.category || 'Second Hand')}</span><h3><a href="${detailUrl(item)}">${safe(item.title)}</a></h3><p class="market-meta">${safe(item.brand)}${item.brand && item.condition ? ' · ' : ''}${safe(item.condition)}</p><strong>${money(item.price)}</strong><p class="market-location">📍 ${safe([item.area, item.city].filter(Boolean).join(', ') || 'Jaipur')}</p><div class="market-actions"><a class="btn btn-outline-dark btn-sm" href="${detailUrl(item)}">View Details</a><a class="btn btn-whatsapp btn-sm" href="${whatsappUrl(item)}" target="_blank" rel="noopener">Book on WhatsApp</a></div></div></article>`;
  }

  function addListSchema(items) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Second Hand Items in Jaipur', numberOfItems: items.length, itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, item:{'@type':'Product',name:item.title,image:[absolute(image(item))],description:item.description,sku:item.id,category:item.category,itemCondition:'https://schema.org/UsedCondition',url:absolute(detailUrl(item)),offers:{'@type':'Offer',price:String(item.price),priceCurrency:'INR',availability:'https://schema.org/InStock',url:absolute(detailUrl(item)),seller:{'@id':'https://call4all.co.in/#localbusiness'}}} })) });
    document.head.appendChild(script);
  }

  async function listingPage() {
    const grid = document.getElementById('secondHandGrid');
    if (!grid) return;
    const items = await load();
    const search = document.getElementById('secondHandSearch');
    const category = document.getElementById('secondHandCategory');
    [...new Set(items.map(item => item.category).filter(Boolean))].sort().forEach(name => category.insertAdjacentHTML('beforeend', `<option value="${safe(name)}">${safe(name)}</option>`));
    const render = () => {
      const query = (search.value || '').toLowerCase();
      const selected = category.value;
      const shown = items.filter(item => (!selected || item.category === selected) && (!query || Object.values(item).join(' ').toLowerCase().includes(query)));
      grid.innerHTML = shown.length ? shown.map(card).join('') : '<p class="empty-map">No matching item available right now.</p>';
      document.getElementById('secondHandCount').textContent = shown.length + ' items available';
    };
    search.addEventListener('input', render);
    category.addEventListener('change', render);
    addListSchema(items);
    if(items.length){const social=absolute(image(items[0]));setMeta('meta[property="og:image"]',social,true);setMeta('meta[property="og:image:secure_url"]',social,true);setMeta('meta[name="twitter:image"]',social);}
    render();
  }

  async function detailPage() {
    const mount = document.getElementById('secondHandDetail');
    if (!mount) return;
    const id = mount.dataset.catalogId || new URLSearchParams(location.search).get('id');
    const item = (await load()).find(entry => entry.id === id);
    if (!item) { document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex,follow'); mount.innerHTML = '<p class="empty-map">Item not found or no longer available.</p>'; return; }
    const canonical = new URL(detailUrl(item), location.href).href;
    const description = `${item.title}, ${item.condition || 'used'} condition, available in ${item.city || 'Jaipur'} for ${money(item.price)}.`;
    document.title = `${item.title} Second Hand in ${item.city || 'Jaipur'} | Call4All`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('meta[name="robots"]')?.setAttribute('content', 'index,follow,max-image-preview:large');
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) { canonicalLink = document.createElement('link'); canonicalLink.rel = 'canonical'; document.head.appendChild(canonicalLink); }
    canonicalLink.href = canonical;
    const socialTitle=item.og_title||document.title,socialDescription=item.og_description||description,socialImage=absolute(item.og_image||image(item)),imageAlt=item.image_alt||`${item.title} second-hand ${item.category||'item'} in ${item.city||'Jaipur'}`;
    [['og:type','product'],['og:site_name','Call4All'],['og:locale','en_IN'],['og:title',socialTitle],['og:description',socialDescription],['og:url',canonical],['og:image',socialImage],['og:image:secure_url',socialImage],['og:image:alt',imageAlt],['product:price:amount',String(item.price||'')],['product:price:currency','INR']].forEach(([key,value])=>setMeta(`meta[property="${key}"]`,value,true));
    [['twitter:card','summary_large_image'],['twitter:title',socialTitle],['twitter:description',socialDescription],['twitter:image',socialImage],['twitter:image:alt',imageAlt]].forEach(([key,value])=>setMeta(`meta[name="${key}"]`,value));
    mount.innerHTML = `<article class="market-detail"><img src="${safe(image(item))}" alt="${safe(item.title)} second-hand item"><div class="market-detail-content"><a href="second-hand-items.html">← Back to all items</a><span class="market-badge">${safe(item.category)}</span><h1>${safe(item.title)}</h1><div class="market-detail-price">${money(item.price)}</div><dl class="market-specs"><div><dt>Brand</dt><dd>${safe(item.brand || 'Not specified')}</dd></div><div><dt>Condition</dt><dd>${safe(item.condition || 'Not specified')}</dd></div><div><dt>Location</dt><dd>${safe([item.area, item.city].filter(Boolean).join(', ') || 'Jaipur')}</dd></div><div><dt>Listing ID</dt><dd>${safe(item.id)}</dd></div></dl><p>${safe(item.description || 'Contact Call4All for complete item details.')}</p><a class="btn btn-whatsapp btn-lg" href="${whatsappUrl(item)}" target="_blank" rel="noopener">Book on WhatsApp</a></div></article>`;
    const schema = document.createElement('script'); schema.type = 'application/ld+json'; schema.textContent = JSON.stringify({ '@context':'https://schema.org','@graph':[{ '@type': 'Product','@id':canonical+'#product',name:item.title,image:[socialImage],description:item.description || description,sku:item.id,category:item.category,brand:item.brand ? { '@type': 'Brand', name: item.brand } : undefined,itemCondition:'https://schema.org/UsedCondition',offers:{'@type':'Offer',price:String(item.price),priceCurrency:'INR',availability:'https://schema.org/InStock',url:canonical,seller:{'@id':'https://call4all.co.in/#localbusiness'},availableAtOrFrom:{'@type':'Place',name:[item.area,item.city].filter(Boolean).join(', ')||'Jaipur'}}},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:'https://call4all.co.in/'},{'@type':'ListItem',position:2,name:'Second-Hand Items',item:'https://call4all.co.in/second-hand-items.html'},{'@type':'ListItem',position:3,name:item.title,item:canonical}]},{'@type':'LocalBusiness','@id':'https://call4all.co.in/#localbusiness',name:'Call4All',url:'https://call4all.co.in/',telephone:'+91-7737353588'}]}); document.head.appendChild(schema);
  }

  window.SecondHandCatalog = { load, card, whatsappUrl };
  document.addEventListener('DOMContentLoaded', () => { listingPage(); detailPage(); });
})();
