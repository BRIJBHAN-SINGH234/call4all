(function(){
  const KUKAS=[27.041750,75.895101],RADIUS=10000;
  const safe=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>v?new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v)):'Price on request';
  const image=p=>p||'assets/icons/icon-512.png';
  const type=p=>p.property_type==='Sale'?'Sale':'Lease/Rent';
  const typeIcon=p=>type(p)==='Sale'?'🏷️':'🔑';
  async function load(){try{return(await window.CsvAPI.loadAllPublic('data/properties.csv')).items.filter(p=>String(p.status).toLowerCase()==='active'&&String(p.approval_status).toLowerCase()==='approved')}catch(e){console.warn(e);return[]}}
  const detailUrl=p=>'property.html?id='+encodeURIComponent(p.id);
  const whatsappUrl=p=>{const number=(window.SITE_CONFIG&&window.SITE_CONFIG.whatsappNumber)||'917737353588',message=['Hello Call4All, mujhe yeh property book/visit karni hai:','','Property: '+p.title,'Type: '+type(p),'Price: '+money(p.price),'Size: '+p.width_ft+' × '+p.height_ft+' ft','Listing ID: '+p.id,'Link: '+new URL(detailUrl(p),location.href).href].join('\n');return 'https://wa.me/'+number+'?text='+encodeURIComponent(message)};

  function card(p){return `<article class="property-list-card"><a href="${detailUrl(p)}"><img src="${safe(image(p.image_path))}" alt="${safe(p.title)} property ${safe(type(p))} in Kukas" loading="lazy"></a><div class="property-list-body"><span class="property-type type-${type(p)==='Sale'?'sale':'rent'}">${typeIcon(p)} ${safe(type(p))}</span><h3><a href="${detailUrl(p)}">${safe(p.title)}</a></h3><strong class="property-card-price">${money(p.price)}</strong><p>📐 ${safe(p.width_ft)} × ${safe(p.height_ft)} ft · ${Number(p.width_ft)*Number(p.height_ft)||0} sq ft</p><div class="property-card-actions"><a class="property-view-link" href="${detailUrl(p)}">View details →</a><a class="btn btn-whatsapp btn-sm" href="${whatsappUrl(p)}" target="_blank" rel="noopener">Book</a></div></div></article>`}

  function addItemListSchema(list){const s=document.createElement('script');s.type='application/ld+json';s.textContent=JSON.stringify({'@context':'https://schema.org','@type':'ItemList',name:'Properties for Sale and Rent in Kukas',numberOfItems:list.length,itemListElement:list.map((p,i)=>({'@type':'ListItem',position:i+1,url:'https://call4all.co.in/'+detailUrl(p),name:p.title}))});document.head.appendChild(s)}

  async function mapPage(){
    const el=document.getElementById('propertyMap');if(!el||!window.L)return;
    const kukasBounds=L.latLng(KUKAS).toBounds(RADIUS*2);
    const map=L.map(el,{minZoom:10,maxZoom:19,maxBoundsViscosity:1,worldCopyJump:false});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,noWrap:true,bounds:[[-90,-180],[90,180]],attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
    map.fitBounds(kukasBounds,{padding:[18,18]});
    map.setMinZoom(map.getZoom());
    L.circle(KUKAS,{radius:RADIUS,color:'#f4a62a',fillColor:'#f4a62a',fillOpacity:.05,weight:2,dashArray:'7 7'}).addTo(map);
    L.marker(KUKAS).addTo(map).bindTooltip('Kukas Centre');

    let list=await load(),markers=[];
    if(new URLSearchParams(location.search).get('type')==='rent')list=list.filter(p=>type(p)==='Lease/Rent');
    const allowedBounds=L.latLngBounds(kukasBounds);
    list.forEach(p=>{
      const lat=Number(p.latitude),lon=Number(p.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lon))return;
      allowedBounds.extend([lat,lon]);
      const sale=type(p)==='Sale';
      const icon=L.divIcon({className:'',html:`<div class="property-pin ${sale?'pin-sale':'pin-rent'}"><span>${typeIcon(p)}</span></div>`,iconSize:[36,36],iconAnchor:[18,36]});
      const m=L.marker([lat,lon],{icon}).addTo(map).bindPopup(`<div class="property-popup"><img src="${safe(image(p.image_path))}" alt=""><span class="property-type type-${sale?'sale':'rent'}">${typeIcon(p)} ${safe(type(p))}</span><h3>${safe(p.title)}</h3><b>${money(p.price)}</b><div>${safe(p.width_ft)} × ${safe(p.height_ft)} ft</div><a href="${detailUrl(p)}">View full details</a></div>`);
      m._property=p;markers.push(m);
    });
    // Users can pan to an outside listing, but cannot zoom out to an India/world view.
    map.setMaxBounds(allowedBounds.pad(.18));
    addItemListSchema(list);
    const grid=document.getElementById('propertyListGrid'),count=document.getElementById('propertyCount'),search=document.getElementById('propertySearch'),filter=document.getElementById('propertyTypeFilter');
    function render(){const q=(search.value||'').toLowerCase(),t=filter.value,shown=list.filter(p=>(!t||type(p)===t)&&(!q||(p.title+' '+p.description+' '+type(p)).toLowerCase().includes(q)));grid.innerHTML=shown.length?shown.map(card).join(''):'<p class="empty-map">No matching property found.</p>';count.textContent=shown.length+' of '+list.length+' properties';markers.forEach(m=>{const show=shown.includes(m._property);if(show&&!map.hasLayer(m))m.addTo(map);if(!show&&map.hasLayer(m))m.removeFrom(map)})}
    search.addEventListener('input',render);filter.addEventListener('change',render);render();
  }

  async function detailPage(){const mount=document.getElementById('propertyDetail');if(!mount)return;const id=new URLSearchParams(location.search).get('id'),p=(await load()).find(x=>x.id===id);if(!p){mount.innerHTML='<p class="empty-map">Property not found or no longer active.</p>';return}const canonical=`https://call4all.co.in/${detailUrl(p)}`;document.title=`${p.title} ${type(p)} in Kukas Jaipur | Call4All`;const desc=`${p.title} available for ${type(p)} in Kukas, Jaipur. Price ${money(p.price)}, size ${p.width_ft} × ${p.height_ft} feet. View photos and location.`;document.querySelector('meta[name="description"]')?.setAttribute('content',desc);document.querySelector('meta[name="robots"]')?.setAttribute('content','index,follow,max-image-preview:large');let link=document.querySelector('link[rel="canonical"]');if(!link){link=document.createElement('link');link.rel='canonical';document.head.appendChild(link)}link.href=canonical;[['og:title',document.title],['og:description',desc],['og:url',canonical],['og:image',new URL(image(p.image_path),location.href).href]].forEach(([key,value])=>{let meta=document.querySelector(`meta[property="${key}"]`);if(!meta){meta=document.createElement('meta');meta.setAttribute('property',key);document.head.appendChild(meta)}meta.content=value});mount.innerHTML=`<article class="detail-card"><img src="${safe(image(p.image_path))}" alt="${safe(p.title)} ${safe(type(p))} in Kukas"><div class="detail-content"><a href="properties.html">← Back to all properties</a><span class="property-type type-${type(p)==='Sale'?'sale':'rent'}">${typeIcon(p)} ${safe(type(p))}</span><h1>${safe(p.title)}</h1><div class="detail-price">${money(p.price)}</div><div class="detail-grid"><div class="detail-stat"><small>Width</small><strong>${safe(p.width_ft)} feet</strong></div><div class="detail-stat"><small>Height / Length</small><strong>${safe(p.height_ft)} feet</strong></div><div class="detail-stat"><small>Total area</small><strong>${Number(p.width_ft)*Number(p.height_ft)||0} sq ft</strong></div><div class="detail-stat"><small>Listing type</small><strong>${safe(type(p))}</strong></div></div><p>${safe(p.description)||'Contact Call4All for more information about this property.'}</p><a class="btn btn-primary" href="https://www.google.com/maps?q=${encodeURIComponent(p.latitude+','+p.longitude)}" target="_blank" rel="noopener">Open directions</a></div></article>`;const s=document.createElement('script');s.type='application/ld+json';s.textContent=JSON.stringify({'@context':'https://schema.org','@type':'RealEstateListing',name:p.title,description:p.description,url:canonical,image:new URL(image(p.image_path),location.href).href,datePosted:p.timestamp,offers:{'@type':'Offer',price:p.price,priceCurrency:'INR',availability:'https://schema.org/InStock'},geo:{'@type':'GeoCoordinates',latitude:p.latitude,longitude:p.longitude},floorSize:{'@type':'QuantitativeValue',value:Number(p.width_ft)*Number(p.height_ft),unitCode:'FTK'}});document.head.appendChild(s)}
  window.PropertyCatalog={load,card,whatsappUrl,type};
  document.addEventListener('DOMContentLoaded',()=>{mapPage();detailPage().then(async()=>{const content=document.querySelector('#propertyDetail .detail-content');if(!content||content.querySelector('.btn-whatsapp'))return;const id=new URLSearchParams(location.search).get('id'),p=(await load()).find(item=>item.id===id);if(!p)return;const button=document.createElement('a');button.className='btn btn-whatsapp';button.href=whatsappUrl(p);button.target='_blank';button.rel='noopener';button.textContent='Book on WhatsApp';content.appendChild(button)})});
})();
