(function(){
  'use strict';
  const INDIA_BOUNDS=[[6.4,68],[37.6,97.5]];
  const safe=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>v?new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v)):'Price on request';
  const image=p=>p||'assets/icons/icon-512.png';
  const type=p=>p.property_type==='Sale'?'Sale':'Lease/Rent';
  const typeIcon=p=>type(p)==='Sale'?'🏷️':'🔑';
  const locationName=p=>[p.city||'Jaipur',p.state||'Rajasthan'].filter(Boolean).join(', ');
  const detailUrl=p=>'property.html?id='+encodeURIComponent(String(p.id||''));
  const absoluteUrl=(value,fallback)=>{try{return new URL(value||fallback,location.href).href}catch(_){return new URL(fallback,location.href).href}};
  function setMeta(selector,attribute,value){
    let meta=document.querySelector(selector);
    if(!meta){meta=document.createElement('meta');const match=selector.match(/^meta\[(name|property)="([^"]+)"\]$/);if(!match)return;meta.setAttribute(match[1],match[2]);document.head.appendChild(meta)}
    meta.setAttribute('content',value);
  }
  const newestFirst=(a,b)=>new Date(b.timestamp||0)-new Date(a.timestamp||0);
  async function load(){try{return(await window.CsvAPI.loadAllPublic('data/properties.csv')).items.filter(p=>String(p.status).toLowerCase()==='active'&&String(p.approval_status).toLowerCase()==='approved').sort(newestFirst)}catch(e){console.warn(e);return[]}}
  const whatsappUrl=p=>{const number=(window.SITE_CONFIG&&window.SITE_CONFIG.whatsappNumber)||'917737353588',message=['Hello Call4All, mujhe yeh property book/visit karni hai:','','Property: '+p.title,'Type: '+type(p),'Location: '+locationName(p),'Price: '+money(p.price),'Size: '+p.width_ft+' × '+p.height_ft+' ft','Listing ID: '+p.id,'Link: '+new URL(detailUrl(p),location.href).href].join('\n');return 'https://wa.me/'+number+'?text='+encodeURIComponent(message)};
  const callUrl=()=>{const number=(window.SITE_CONFIG&&window.SITE_CONFIG.phone)||'+917737353588';return 'tel:'+String(number).replace(/[^+\d]/g,'')};

  function videoEmbed(url){
    if(!url)return '';
    try{
      const parsed=new URL(url),host=parsed.hostname.replace(/^www\./,'');
      if(host==='youtu.be')return 'https://www.youtube-nocookie.com/embed/'+encodeURIComponent(parsed.pathname.slice(1));
      if(host.endsWith('youtube.com')){const id=parsed.searchParams.get('v')||parsed.pathname.split('/').filter(Boolean).pop();return id?'https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id):''}
      if(host.endsWith('vimeo.com')){const id=parsed.pathname.split('/').filter(Boolean).pop();return /^\d+$/.test(id)?'https://player.vimeo.com/video/'+id:''}
      if(host==='drive.google.com'&&parsed.pathname.includes('/file/d/')){const id=parsed.pathname.split('/file/d/')[1].split('/')[0];return id?'https://drive.google.com/file/d/'+encodeURIComponent(id)+'/preview':''}
      if(/\.(mp4|webm|ogg)$/i.test(parsed.pathname))return parsed.href;
    }catch(_){}
    return '';
  }
  function validVideoUrl(url){try{return /^https?:$/.test(new URL(url).protocol)}catch(_){return false}}
  function videoButton(p){
    if(!validVideoUrl(p.video_url))return '';
    return videoEmbed(p.video_url)
      ?`<button class="btn btn-video btn-sm" type="button" data-video="${safe(p.video_url)}">▶ Watch Video</button>`
      :`<a class="btn btn-video btn-sm" href="${safe(p.video_url)}" target="_blank" rel="noopener">▶ Open Video</a>`;
  }
  function bindVideoButtons(root=document){
    root.querySelectorAll('[data-video]').forEach(button=>button.onclick=()=>{
      const source=videoEmbed(button.dataset.video);if(!source)return;
      const direct=/\.(mp4|webm|ogg)(?:$|\?)/i.test(source),isDrive=source.includes('drive.google.com/file/d/');
      const playerSource=isDrive?source:source+(source.includes('?')?'&':'?')+'autoplay=1';
      const modal=document.createElement('div');modal.className='video-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Property video');
      modal.innerHTML=`<div class="video-modal-box"><button class="video-close" type="button" aria-label="Close video">×</button><div class="video-frame">${direct?`<video src="${safe(source)}" controls autoplay playsinline></video>`:`<iframe src="${safe(playerSource)}" title="Property video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`}</div></div>`;
      const close=()=>{modal.remove();document.body.classList.remove('video-open')};modal.onclick=e=>{if(e.target===modal)close()};modal.querySelector('.video-close').onclick=close;document.body.classList.add('video-open');document.body.appendChild(modal);modal.querySelector('.video-close').focus();
    });
  }
  function card(p){return `<article class="property-list-card"><a href="${detailUrl(p)}"><img src="${safe(image(p.image_path))}" alt="${safe(p.title)} property ${safe(type(p))} in ${safe(locationName(p))}" loading="lazy"></a><div class="property-list-body"><span class="property-type type-${type(p)==='Sale'?'sale':'rent'}">${typeIcon(p)} ${safe(type(p))}</span><h3><a href="${detailUrl(p)}">${safe(p.title)}</a></h3><strong class="property-card-price">${money(p.price)}</strong><p>📍 ${safe(locationName(p))}</p><p>📐 ${safe(p.width_ft)} × ${safe(p.height_ft)} ft · ${Number(p.width_ft)*Number(p.height_ft)||0} sq ft</p><div class="property-card-actions"><a class="property-view-link" href="${detailUrl(p)}">View details →</a>${videoButton(p)}<a class="btn btn-property-call btn-sm" href="${callUrl()}">☎ Call</a><a class="btn btn-whatsapp btn-sm" href="${whatsappUrl(p)}" target="_blank" rel="noopener">WhatsApp</a></div></div></article>`}
  function addItemListSchema(list){const s=document.createElement('script');s.type='application/ld+json';s.textContent=JSON.stringify({'@context':'https://schema.org','@type':'ItemList',name:'Properties for Sale and Rent Across India',numberOfItems:list.length,itemListElement:list.map((p,i)=>({'@type':'ListItem',position:i+1,url:'https://call4all.co.in/'+detailUrl(p),name:p.title}))});document.head.appendChild(s)}

  async function mapPage(){
    const el=document.getElementById('propertyMap');if(!el||!window.L)return;
    const map=L.map(el,{minZoom:4,maxZoom:19,maxBoundsViscosity:.8,worldCopyJump:false});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,noWrap:true,bounds:[[-90,-180],[90,180]],attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
    map.fitBounds(INDIA_BOUNDS,{padding:[18,18]});map.setMaxBounds([[-5,55],[45,110]]);
    let list=await load(),markers=[],markerBounds=L.latLngBounds([]);
    if(new URLSearchParams(location.search).get('type')==='rent')list=list.filter(p=>type(p)==='Lease/Rent');
    list.forEach(p=>{
      const lat=Number(p.latitude),lon=Number(p.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lon))return;markerBounds.extend([lat,lon]);
      const sale=type(p)==='Sale',icon=L.divIcon({className:'',html:`<div class="property-pin ${sale?'pin-sale':'pin-rent'}"><span>${typeIcon(p)}</span></div>`,iconSize:[36,36],iconAnchor:[18,36]});
      const m=L.marker([lat,lon],{icon}).addTo(map).bindPopup(`<div class="property-popup"><img src="${safe(image(p.image_path))}" alt=""><span class="property-type type-${sale?'sale':'rent'}">${typeIcon(p)} ${safe(type(p))}</span><h3>${safe(p.title)}</h3><b>${money(p.price)}</b><div>📍 ${safe(locationName(p))}</div><div>${safe(p.width_ft)} × ${safe(p.height_ft)} ft</div><a href="${detailUrl(p)}">View full details</a></div>`);
      m._property=p;markers.push(m);
    });
    if(markerBounds.isValid())map.fitBounds(markerBounds.pad(.25),{maxZoom:12});
    addItemListSchema(list);
    const grid=document.getElementById('propertyListGrid'),count=document.getElementById('propertyCount'),search=document.getElementById('propertySearch'),filter=document.getElementById('propertyTypeFilter');
    function render(){const q=(search.value||'').toLowerCase(),t=filter.value,shown=list.filter(p=>(!t||type(p)===t)&&(!q||(p.title+' '+p.description+' '+p.city+' '+p.state+' '+type(p)).toLowerCase().includes(q)));grid.innerHTML=shown.length?shown.map(card).join(''):'<p class="empty-map">No matching property found.</p>';count.textContent=shown.length+' of '+list.length+' properties';bindVideoButtons(grid);markers.forEach(m=>{const show=shown.includes(m._property);if(show&&!map.hasLayer(m))m.addTo(map);if(!show&&map.hasLayer(m))m.removeFrom(map)})}
    search.addEventListener('input',render);filter.addEventListener('change',render);render();
  }

  async function detailPage(){
    const mount=document.getElementById('propertyDetail');if(!mount)return;
    const id=mount.dataset.catalogId||new URLSearchParams(location.search).get('id'),p=(await load()).find(x=>x.id===id);
    if(!p){setMeta('meta[name="robots"]','name','noindex,follow');mount.innerHTML='<p class="empty-map">Property not found or no longer active.</p>';return}
    const generatedCanonical=`https://call4all.co.in/${detailUrl(p)}`,place=locationName(p);
    const canonical=absoluteUrl(p.canonical_url,generatedCanonical);
    const generatedTitle=`${p.title} ${type(p)} in ${place} | Call4All`;
    const generatedDesc=`${p.title} available for ${type(p)} in ${place}. Price ${money(p.price)}, size ${p.width_ft} × ${p.height_ft} feet. View photos, video and map location.`;
    const seoTitle=(p.meta_title||generatedTitle).trim(),desc=(p.meta_description||generatedDesc).trim();
    const socialTitle=(p.og_title||seoTitle).trim(),socialDesc=(p.og_description||desc).trim();
    const mainImage=absoluteUrl(p.image_path,'assets/icons/icon-512.png'),socialImage=absoluteUrl(p.og_image,mainImage);
    const imageAlt=(p.image_alt||`${p.title} ${type(p)} in ${place}`).trim();
    const robotsBase=(p.robots||'index,follow').trim();
    const robots=robotsBase.startsWith('index')?robotsBase+',max-image-preview:large,max-snippet:-1,max-video-preview:-1':robotsBase;
    document.title=seoTitle;
    setMeta('meta[name="description"]','name',desc);
    setMeta('meta[name="keywords"]','name',(p.seo_keywords||`${p.title}, ${type(p)} property in ${place}, property in ${place}`).trim());
    setMeta('meta[name="robots"]','name',robots);
    let link=document.querySelector('link[rel="canonical"]');if(!link){link=document.createElement('link');link.rel='canonical';document.head.appendChild(link)}link.href=canonical;
    [['og:type','product'],['og:site_name','Call4All'],['og:locale','en_IN'],['og:title',socialTitle],['og:description',socialDesc],['og:url',canonical],['og:image',socialImage],['og:image:secure_url',socialImage],['og:image:alt',imageAlt],['product:price:amount',String(p.price||'')],['product:price:currency','INR']].forEach(([key,value])=>setMeta(`meta[property="${key}"]`,'property',value));
    [['twitter:card','summary_large_image'],['twitter:title',socialTitle],['twitter:description',socialDesc],['twitter:image',socialImage],['twitter:image:alt',imageAlt]].forEach(([key,value])=>setMeta(`meta[name="${key}"]`,'name',value));
    const all=await load(),related=all.filter(x=>x.id!==p.id).sort((a,b)=>Number(type(b)===type(p))-Number(type(a)===type(p))||newestFirst(a,b)).slice(0,6);
    const coordinate=Number.isFinite(Number(p.latitude))&&Number.isFinite(Number(p.longitude))?`${p.latitude},${p.longitude}`:'';
    mount.innerHTML=`<article class="detail-card"><img src="${safe(image(p.image_path))}" alt="${safe(imageAlt)}"><div class="detail-content"><a href="properties.html">← Back to all properties</a><span class="property-type type-${type(p)==='Sale'?'sale':'rent'}">${typeIcon(p)} ${safe(type(p))}</span><h1>${safe(p.title)}</h1><div class="detail-price">${money(p.price)}</div><p class="property-location">📍 ${safe(place)}</p><div class="detail-grid"><div class="detail-stat"><small>Width</small><strong>${safe(p.width_ft)} feet</strong></div><div class="detail-stat"><small>Height / Length</small><strong>${safe(p.height_ft)} feet</strong></div><div class="detail-stat"><small>Total area</small><strong>${Number(p.width_ft)*Number(p.height_ft)||0} sq ft</strong></div><div class="detail-stat"><small>Listing type</small><strong>${safe(type(p))}</strong></div></div><p>${safe(p.description)||'Contact Call4All for more information about this property.'}</p><div class="detail-actions"><a class="btn btn-primary" href="https://www.google.com/maps?q=${encodeURIComponent(p.latitude+','+p.longitude)}" target="_blank" rel="noopener">Open directions</a>${videoButton(p)}<a class="btn btn-whatsapp" href="${whatsappUrl(p)}" target="_blank" rel="noopener">Book on WhatsApp</a></div></div></article><section class="property-detail-section"><span class="section-eyebrow">More options</span><h2>Latest approved properties</h2><p>Compare the newest verified listings before you choose a visit time.</p><div class="property-list-grid">${related.length?related.map(card).join(''):'<p class="empty-map">More approved properties will appear here soon.</p>'}</div></section><section class="property-detail-section property-location-section"><span class="section-eyebrow">Location</span><h2>Map and directions</h2><p>Map is placed after the property options, so you can compare listings first and then plan your visit.</p>${coordinate?`<iframe class="property-detail-map" title="Map location for ${safe(p.title)}" src="https://www.google.com/maps?q=${encodeURIComponent(coordinate)}&output=embed" loading="lazy"></iframe>`:'<p class="empty-map">The exact map coordinate will be added shortly. Please contact us for directions.</p>'}</section>`;
    bindVideoButtons(mount);
    const schema={'@context':'https://schema.org','@type':'RealEstateListing',name:p.title,headline:seoTitle,description:p.meta_description||p.description||desc,url:canonical,image:[mainImage],datePosted:p.timestamp,offers:{'@type':'Offer',price:p.price,priceCurrency:'INR',availability:'https://schema.org/InStock',url:canonical},address:{'@type':'PostalAddress',addressLocality:p.city||'Jaipur',addressRegion:p.state||'Rajasthan',addressCountry:'IN'},geo:{'@type':'GeoCoordinates',latitude:p.latitude,longitude:p.longitude},floorSize:{'@type':'QuantitativeValue',value:Number(p.width_ft)*Number(p.height_ft),unitCode:'FTK'}};
    if(videoEmbed(p.video_url))schema.video={'@type':'VideoObject',name:p.title+' property video',description:desc,thumbnailUrl:mainImage,uploadDate:p.timestamp,contentUrl:p.video_url};
    const s=document.createElement('script');s.type='application/ld+json';s.textContent=JSON.stringify(schema);document.head.appendChild(s);
  }
  async function relatedPropertyMounts(){
    const mounts=[...document.querySelectorAll('[data-property-related]')];if(!mounts.length)return;
    const list=(await load()).filter(p=>type(p)==='Lease/Rent');
    mounts.forEach(mount=>{const limit=Number(mount.dataset.propertyRelated)||6;mount.innerHTML=list.length?list.slice(0,limit).map(card).join(''):'<p class="empty-map">No approved rental properties are available right now.</p>';bindVideoButtons(mount)});
  }
  window.PropertyCatalog={load,card,whatsappUrl,callUrl,type};
  document.addEventListener('DOMContentLoaded',()=>{mapPage();detailPage();relatedPropertyMounts()});
})();
