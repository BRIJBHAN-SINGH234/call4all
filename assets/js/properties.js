(function(){
  'use strict';
  const INDIA_BOUNDS=[[6.4,68],[37.6,97.5]];
  const safe=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>v?new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v)):'Price on request';
  const image=p=>p||'assets/icons/icon-512.png';
  const type=p=>p.property_type==='Sale'?'Sale':'Lease/Rent';
  const typeIcon=p=>type(p)==='Sale'?'🏷️':'🔑';
  const locationName=p=>[p.city||'Jaipur',p.state||'Rajasthan'].filter(Boolean).join(', ');
  const detailUrl=p=>'property.html?id='+encodeURIComponent(p.id);
  async function load(){try{return(await window.CsvAPI.loadAllPublic('data/properties.csv')).items.filter(p=>String(p.status).toLowerCase()==='active'&&String(p.approval_status).toLowerCase()==='approved')}catch(e){console.warn(e);return[]}}
  const whatsappUrl=p=>{const number=(window.SITE_CONFIG&&window.SITE_CONFIG.whatsappNumber)||'917737353588',message=['Hello Call4All, mujhe yeh property book/visit karni hai:','','Property: '+p.title,'Type: '+type(p),'Location: '+locationName(p),'Price: '+money(p.price),'Size: '+p.width_ft+' × '+p.height_ft+' ft','Listing ID: '+p.id,'Link: '+new URL(detailUrl(p),location.href).href].join('\n');return 'https://wa.me/'+number+'?text='+encodeURIComponent(message)};

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
      const direct=/\.(mp4|webm|ogg)(?:$|\?)/i.test(source),joiner=source.includes('?')?'&':'?';
      const modal=document.createElement('div');modal.className='video-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Property video');
      modal.innerHTML=`<div class="video-modal-box"><button class="video-close" type="button" aria-label="Close video">×</button><div class="video-frame">${direct?`<video src="${safe(source)}" controls autoplay playsinline></video>`:`<iframe src="${safe(source+joiner+'autoplay=1')}" title="Property video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`}</div></div>`;
      const close=()=>modal.remove();modal.onclick=e=>{if(e.target===modal)close()};modal.querySelector('.video-close').onclick=close;document.body.appendChild(modal);modal.querySelector('.video-close').focus();
    });
  }
  function card(p){return `<article class="property-list-card"><a href="${detailUrl(p)}"><img src="${safe(image(p.image_path))}" alt="${safe(p.title)} property ${safe(type(p))} in ${safe(locationName(p))}" loading="lazy"></a><div class="property-list-body"><span class="property-type type-${type(p)==='Sale'?'sale':'rent'}">${typeIcon(p)} ${safe(type(p))}</span><h3><a href="${detailUrl(p)}">${safe(p.title)}</a></h3><strong class="property-card-price">${money(p.price)}</strong><p>📍 ${safe(locationName(p))}</p><p>📐 ${safe(p.width_ft)} × ${safe(p.height_ft)} ft · ${Number(p.width_ft)*Number(p.height_ft)||0} sq ft</p><div class="property-card-actions"><a class="property-view-link" href="${detailUrl(p)}">View details →</a>${videoButton(p)}<a class="btn btn-whatsapp btn-sm" href="${whatsappUrl(p)}" target="_blank" rel="noopener">Book</a></div></div></article>`}
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
    const id=new URLSearchParams(location.search).get('id'),p=(await load()).find(x=>x.id===id);
    if(!p){mount.innerHTML='<p class="empty-map">Property not found or no longer active.</p>';return}
    const canonical=`https://call4all.co.in/${detailUrl(p)}`,place=locationName(p);
    document.title=`${p.title} ${type(p)} in ${place} | Call4All`;
    const desc=`${p.title} available for ${type(p)} in ${place}. Price ${money(p.price)}, size ${p.width_ft} × ${p.height_ft} feet. View photos, video and map location.`;
    document.querySelector('meta[name="description"]')?.setAttribute('content',desc);document.querySelector('meta[name="robots"]')?.setAttribute('content','index,follow,max-image-preview:large,max-video-preview:-1');
    let link=document.querySelector('link[rel="canonical"]');if(!link){link=document.createElement('link');link.rel='canonical';document.head.appendChild(link)}link.href=canonical;
    [['og:title',document.title],['og:description',desc],['og:url',canonical],['og:image',new URL(image(p.image_path),location.href).href]].forEach(([key,value])=>{let meta=document.querySelector(`meta[property="${key}"]`);if(!meta){meta=document.createElement('meta');meta.setAttribute('property',key);document.head.appendChild(meta)}meta.content=value});
    mount.innerHTML=`<article class="detail-card"><img src="${safe(image(p.image_path))}" alt="${safe(p.title)} ${safe(type(p))} in ${safe(place)}"><div class="detail-content"><a href="properties.html">← Back to all properties</a><span class="property-type type-${type(p)==='Sale'?'sale':'rent'}">${typeIcon(p)} ${safe(type(p))}</span><h1>${safe(p.title)}</h1><div class="detail-price">${money(p.price)}</div><p class="property-location">📍 ${safe(place)}</p><div class="detail-grid"><div class="detail-stat"><small>Width</small><strong>${safe(p.width_ft)} feet</strong></div><div class="detail-stat"><small>Height / Length</small><strong>${safe(p.height_ft)} feet</strong></div><div class="detail-stat"><small>Total area</small><strong>${Number(p.width_ft)*Number(p.height_ft)||0} sq ft</strong></div><div class="detail-stat"><small>Listing type</small><strong>${safe(type(p))}</strong></div></div><p>${safe(p.description)||'Contact Call4All for more information about this property.'}</p><div class="detail-actions"><a class="btn btn-primary" href="https://www.google.com/maps?q=${encodeURIComponent(p.latitude+','+p.longitude)}" target="_blank" rel="noopener">Open directions</a>${videoButton(p)}<a class="btn btn-whatsapp" href="${whatsappUrl(p)}" target="_blank" rel="noopener">Book on WhatsApp</a></div></div></article>`;
    bindVideoButtons(mount);
    const schema={'@context':'https://schema.org','@type':'RealEstateListing',name:p.title,description:p.description||desc,url:canonical,image:new URL(image(p.image_path),location.href).href,datePosted:p.timestamp,offers:{'@type':'Offer',price:p.price,priceCurrency:'INR',availability:'https://schema.org/InStock'},address:{'@type':'PostalAddress',addressLocality:p.city||'Jaipur',addressRegion:p.state||'Rajasthan',addressCountry:'IN'},geo:{'@type':'GeoCoordinates',latitude:p.latitude,longitude:p.longitude},floorSize:{'@type':'QuantitativeValue',value:Number(p.width_ft)*Number(p.height_ft),unitCode:'FTK'}};
    if(videoEmbed(p.video_url))schema.video={'@type':'VideoObject',name:p.title+' property video',description:desc,thumbnailUrl:new URL(image(p.image_path),location.href).href,uploadDate:p.timestamp,contentUrl:p.video_url};
    const s=document.createElement('script');s.type='application/ld+json';s.textContent=JSON.stringify(schema);document.head.appendChild(s);
  }
  window.PropertyCatalog={load,card,whatsappUrl,type};
  document.addEventListener('DOMContentLoaded',()=>{mapPage();detailPage()});
})();
