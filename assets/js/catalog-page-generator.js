(function () {
  'use strict';
  const BASE = 'https://call4all.co.in/';
  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const slugId = value => String(value || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  const money = value => 'Rs ' + Number(value || 0).toLocaleString('en-IN');
  const absolute = value => { try { return new URL(value || 'assets/icons/icon-512.png', BASE).href; } catch (_) { return BASE + 'assets/icons/icon-512.png'; } };
  const pagePath = (kind, item) => `${kind}-${slugId(item.id)}.html`;
  const defaults = {
    property: item => {
      const place = item.location || [item.city || 'Kukas', item.state || 'Rajasthan'].filter(Boolean).join(', ');
      return { title:`${item.title} ${item.property_type === 'Sale' ? 'for Sale' : 'for Rent'} in ${place}, Jaipur | Call4All`, description:`${item.title} available in ${place}, Jaipur for ${money(item.price)}. View property photo, size, video, map and booking details.`, keywords:`${item.title}, property in ${place}, Kukas Jaipur property, property for ${item.property_type === 'Sale' ? 'sale' : 'rent'}`, imageAlt:`${item.title} property in ${place}, Jaipur` };
    },
    'second-hand': item => ({ title:`${item.title} Second Hand in ${item.city || 'Jaipur'} | Call4All`, description:`Buy ${item.title} in ${item.condition || 'used'} condition from ${[item.area,item.city].filter(Boolean).join(', ')} for ${money(item.price)}. View photo and booking details.`, keywords:`${item.title} second hand, used ${item.category}, second hand items ${item.city || 'Jaipur'}`, imageAlt:`${item.title} second-hand ${item.category || 'item'}` }),
    handmade: item => ({ title:`Buy ${item.title} Online with All India Delivery | Call4All`, description:`Buy ${item.title}, handmade by ${item.artisan || 'an Indian artisan'}, for ${money(item.price)} with delivery across India. View material and ordering details.`, keywords:`${item.title}, handmade ${item.category}, handmade products online India, all India delivery`, imageAlt:`${item.title} handmade by ${item.artisan || 'Indian artisan'}` })
  };
  function config(kind, item) {
    const fallback = defaults[kind](item), path = pagePath(kind, item), canonical = BASE + path;
    const title = item.meta_title || fallback.title, description = item.meta_description || fallback.description;
    return { path, canonical, title, description, keywords:item.seo_keywords || item.keywords || fallback.keywords, ogTitle:item.og_title || title, ogDescription:item.og_description || description, image:absolute(item.og_image || item.image_path), imageAlt:item.image_alt || fallback.imageAlt, robots:item.robots || 'index,follow', mount:kind === 'property' ? 'propertyDetail' : (kind === 'second-hand' ? 'secondHandDetail' : 'handmadeDetail'), script:kind === 'property' ? 'properties.js' : (kind === 'second-hand' ? 'second-hand.js' : 'handmade.js'), css:kind === 'property' ? '' : '<link rel="stylesheet" href="assets/css/marketplace.css">', heading:kind === 'property' ? 'Property Details' : (kind === 'second-hand' ? 'Second-Hand Item Details' : 'Handmade Product Details'), back:kind === 'property' ? 'properties.html' : (kind === 'second-hand' ? 'second-hand-items.html' : 'handmade-items.html') };
  }
  function html(kind, item) {
    const c = config(kind, item), product = {'@type':kind === 'property' ? 'RealEstateListing' : 'Product','@id':c.canonical+'#listing',name:item.title,description:c.description,image:[c.image],url:c.canonical,sku:item.id,offers:{'@type':'Offer',price:String(item.price || ''),priceCurrency:'INR',availability:'https://schema.org/InStock',url:c.canonical,seller:{'@id':BASE+'#localbusiness'}}};
    const schema={'@context':'https://schema.org','@graph':[product,{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:BASE},{'@type':'ListItem',position:2,name:c.heading,item:BASE+c.back},{'@type':'ListItem',position:3,name:item.title,item:c.canonical}]},{'@type':'LocalBusiness','@id':BASE+'#localbusiness',name:'Call4All',url:BASE,telephone:'+91-7737353588'}]};
    if (kind === 'property') Object.assign(product,{datePosted:item.timestamp,address:{'@type':'PostalAddress',addressLocality:item.city,addressRegion:item.state,addressCountry:'IN'},geo:{'@type':'GeoCoordinates',latitude:item.latitude,longitude:item.longitude}});
    else product.itemCondition = kind === 'second-hand' ? 'https://schema.org/UsedCondition' : 'https://schema.org/NewCondition';
    return `<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(c.title)}</title><meta name="description" content="${esc(c.description)}"><meta name="keywords" content="${esc(c.keywords)}"><meta name="robots" content="${esc(c.robots)},max-image-preview:large,max-snippet:-1,max-video-preview:-1"><link rel="canonical" href="${esc(c.canonical)}">
<meta property="og:type" content="product"><meta property="og:site_name" content="Call4All"><meta property="og:locale" content="en_IN"><meta property="og:title" content="${esc(c.ogTitle)}"><meta property="og:description" content="${esc(c.ogDescription)}"><meta property="og:url" content="${esc(c.canonical)}"><meta property="og:image" content="${esc(c.image)}"><meta property="og:image:secure_url" content="${esc(c.image)}"><meta property="og:image:alt" content="${esc(c.imageAlt)}"><meta property="product:price:amount" content="${esc(item.price)}"><meta property="product:price:currency" content="INR">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(c.ogTitle)}"><meta name="twitter:description" content="${esc(c.ogDescription)}"><meta name="twitter:image" content="${esc(c.image)}"><meta name="twitter:image:alt" content="${esc(c.imageAlt)}"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>
<link rel="stylesheet" href="assets/css/style.css"><link rel="stylesheet" href="assets/css/properties.css">${c.css}<link rel="icon" href="assets/icons/favicon-32.png"></head><body><div id="site-header"></div><header class="${kind === 'property' ? 'property-hero' : 'market-hero'}"><span class="section-eyebrow">Call4All Verified Listing</span><h1>${esc(c.heading)}</h1><p><a href="${c.back}">View all listings</a></p></header><main id="${c.mount}" data-catalog-id="${esc(item.id)}"><p class="empty-map">Loading…</p></main>${kind === 'handmade' ? '<section class="market-shell related-products"><h2>More Handmade Products</h2><div class="market-grid market-scroll" id="handmadeRelated"></div></section>' : ''}<div id="site-footer"></div><div id="site-floating"></div><script src="assets/js/icons.js"></script><script src="assets/js/site.js"></script><script src="assets/js/booking.js"></script><script src="assets/js/${c.script}"></script></body></html>\n`;
  }
  async function generate(kind, item, token) {
    const c = config(kind, item), sha = await window.CsvAPI.getFileSha(c.path, token);
    await window.CsvAPI.putFile(c.path, html(kind, item), sha, token, `Generate SEO page ${c.path}`);
    return c.path;
  }
  async function retire(kind, item, token) {
    const path=pagePath(kind,item),sha=await window.CsvAPI.getFileSha(path,token);
    if(!sha)return;
    const target=kind==='property'?'properties.html':(kind==='second-hand'?'second-hand-items.html':'handmade-items.html');
    const content=`<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="robots" content="noindex,follow"><title>Listing No Longer Available | Call4All</title><link rel="canonical" href="${BASE+target}"><meta http-equiv="refresh" content="0; url=${target}"></head><body><p>This listing is no longer available. <a href="${target}">View current listings</a>.</p></body></html>\n`;
    await window.CsvAPI.putFile(path,content,sha,token,`Retire SEO page ${path}`);
  }
  window.CatalogPageGenerator = { pagePath, generate, retire, html };
})();
