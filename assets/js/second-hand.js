(function () {
  'use strict';
  const PATH = 'data/second-hand-items.csv';
  const safe = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const money = value => value ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value)) : 'Price on request';
  const image = item => item.image_path || 'assets/icons/icon-512.png';
  const detailUrl = item => 'second-hand-item.html?id=' + encodeURIComponent(item.id);

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
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Second Hand Items in Jaipur', numberOfItems: items.length, itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.title, url: new URL(detailUrl(item), location.href).href })) });
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
    render();
  }

  async function detailPage() {
    const mount = document.getElementById('secondHandDetail');
    if (!mount) return;
    const id = new URLSearchParams(location.search).get('id');
    const item = (await load()).find(entry => entry.id === id);
    if (!item) { mount.innerHTML = '<p class="empty-map">Item not found or no longer available.</p>'; return; }
    const canonical = new URL(detailUrl(item), location.href).href;
    const description = `${item.title}, ${item.condition || 'used'} condition, available in ${item.city || 'Jaipur'} for ${money(item.price)}.`;
    document.title = `${item.title} Second Hand in ${item.city || 'Jaipur'} | Call4All`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('meta[name="robots"]')?.setAttribute('content', 'index,follow,max-image-preview:large');
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) { canonicalLink = document.createElement('link'); canonicalLink.rel = 'canonical'; document.head.appendChild(canonicalLink); }
    canonicalLink.href = canonical;
    mount.innerHTML = `<article class="market-detail"><img src="${safe(image(item))}" alt="${safe(item.title)} second-hand item"><div class="market-detail-content"><a href="second-hand-items.html">← Back to all items</a><span class="market-badge">${safe(item.category)}</span><h1>${safe(item.title)}</h1><div class="market-detail-price">${money(item.price)}</div><dl class="market-specs"><div><dt>Brand</dt><dd>${safe(item.brand || 'Not specified')}</dd></div><div><dt>Condition</dt><dd>${safe(item.condition || 'Not specified')}</dd></div><div><dt>Location</dt><dd>${safe([item.area, item.city].filter(Boolean).join(', ') || 'Jaipur')}</dd></div><div><dt>Listing ID</dt><dd>${safe(item.id)}</dd></div></dl><p>${safe(item.description || 'Contact Call4All for complete item details.')}</p><a class="btn btn-whatsapp btn-lg" href="${whatsappUrl(item)}" target="_blank" rel="noopener">Book on WhatsApp</a></div></article>`;
    const schema = document.createElement('script'); schema.type = 'application/ld+json'; schema.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: item.title, image: new URL(image(item), location.href).href, description: item.description || description, brand: item.brand ? { '@type': 'Brand', name: item.brand } : undefined, itemCondition: 'https://schema.org/UsedCondition', offers: { '@type': 'Offer', price: item.price, priceCurrency: 'INR', availability: 'https://schema.org/InStock', url: canonical } }); document.head.appendChild(schema);
  }

  window.SecondHandCatalog = { load, card, whatsappUrl };
  document.addEventListener('DOMContentLoaded', () => { listingPage(); detailPage(); });
})();
