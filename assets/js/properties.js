(function(){
  const KUKAS=[27.0306,75.8966], RADIUS=10000;
  const safe=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>v?new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v)): 'Price on request';
  const img=p=>p||'assets/icons/icon-512.png';
  async function load(){
    try{return (await window.CsvAPI.loadAllPublic('data/properties.csv')).items.filter(p=>String(p.status).toLowerCase()!=='inactive');}
    catch(e){console.warn(e);return []}
  }
  function detailUrl(p){return 'property.html?id='+encodeURIComponent(p.id)}
  async function mapPage(){
    const el=document.getElementById('propertyMap'); if(!el||!window.L)return;
    const map=L.map(el).setView(KUKAS,12); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
    L.circle(KUKAS,{radius:RADIUS,color:'#f4a62a',fillColor:'#f4a62a',fillOpacity:.06,weight:2,dashArray:'7 7'}).addTo(map);
    L.marker(KUKAS).addTo(map).bindTooltip('Kukas Centre');
    const list=await load(), markers=[];
    list.forEach(p=>{const lat=Number(p.latitude),lon=Number(p.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lon))return;const icon=L.divIcon({className:'',html:'<div class="property-pin"><span>⌂</span></div>',iconSize:[34,34],iconAnchor:[17,34]});const m=L.marker([lat,lon],{icon}).addTo(map).bindPopup(`<div class="property-popup"><img src="${safe(img(p.image_path))}" alt=""><h3>${safe(p.title)}</h3><b>${money(p.price)}</b><div>${safe(p.width_ft)} × ${safe(p.height_ft)} ft</div><a href="${detailUrl(p)}">View full details</a></div>`);m._property=p;markers.push(m)});
    document.getElementById('propertyCount').textContent=list.length+' properties';
    const search=document.getElementById('propertySearch');search&&search.addEventListener('input',()=>{const q=search.value.toLowerCase();markers.forEach(m=>{const show=(m._property.title+' '+m._property.description).toLowerCase().includes(q);if(show&&!map.hasLayer(m))m.addTo(map);if(!show&&map.hasLayer(m))m.removeFrom(map)})});
  }
  async function detailPage(){const mount=document.getElementById('propertyDetail');if(!mount)return;const id=new URLSearchParams(location.search).get('id'),p=(await load()).find(x=>x.id===id);if(!p){mount.innerHTML='<p class="empty-map">Property not found or no longer active.</p>';return}document.title=p.title+' | Call4All';mount.innerHTML=`<article class="detail-card"><img src="${safe(img(p.image_path))}" alt="${safe(p.title)}"><div class="detail-content"><a href="properties.html">← Back to map</a><h1>${safe(p.title)}</h1><div class="detail-price">${money(p.price)}</div><div class="detail-grid"><div class="detail-stat"><small>Width</small><strong>${safe(p.width_ft)} feet</strong></div><div class="detail-stat"><small>Height / Length</small><strong>${safe(p.height_ft)} feet</strong></div><div class="detail-stat"><small>Total area</small><strong>${Number(p.width_ft)*Number(p.height_ft)||0} sq ft</strong></div><div class="detail-stat"><small>Coordinates</small><strong>${safe(p.latitude)}, ${safe(p.longitude)}</strong></div></div><p>${safe(p.description)||'Contact Call4All for more information about this property.'}</p><a class="btn btn-primary" href="https://www.google.com/maps?q=${encodeURIComponent(p.latitude+','+p.longitude)}" target="_blank" rel="noopener">Open directions</a></div></article>`}
  document.addEventListener('DOMContentLoaded',()=>{mapPage();detailPage()});
})();
