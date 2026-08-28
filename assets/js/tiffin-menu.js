document.addEventListener('DOMContentLoaded', async () => {
  const mount = document.getElementById('tiffinMenu');
  if (!mount || !window.CsvAPI) return;
  const safe = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  try {
    const rows = (await CsvAPI.loadAllPublic('data/tiffin-menu.csv')).items
      .filter(item => String(item.status).toLowerCase() === 'active')
      .sort((a, b) => Number(a.sort_order || 99) - Number(b.sort_order || 99));
    if(rows.length){const absolute=value=>new URL(value||'assets/uploads/tiffin-center-kukas-banner.png',location.href).href,script=document.createElement('script');script.id='tiffin-menu-schema';script.type='application/ld+json';script.textContent=JSON.stringify({'@context':'https://schema.org','@graph':[{'@type':'Menu','@id':'https://call4all.co.in/tiffin-center-kukas.html#menu',name:'Call4Thali Menu in Kukas Jaipur',hasMenuSection:{'@type':'MenuSection',name:'Vegetarian Thali',hasMenuItem:rows.map(item=>({'@type':'MenuItem',name:item.name,description:item.description,image:absolute(item.image_path),url:'https://call4all.co.in/menu-item.html?slug='+encodeURIComponent(item.slug),offers:{'@type':'Offer',price:String(item.price),priceCurrency:'INR',availability:'https://schema.org/InStock'}}))}},{'@type':'ItemList',name:'Call4Thali dishes and prices',numberOfItems:rows.length,itemListElement:rows.map((item,index)=>({'@type':'ListItem',position:index+1,url:'https://call4all.co.in/menu-item.html?slug='+encodeURIComponent(item.slug),name:item.name}))}]});document.head.appendChild(script);}
    mount.innerHTML = rows.length ? rows.map(item => {
      const detail = 'menu-item.html?slug=' + encodeURIComponent(item.slug);
      const message = encodeURIComponent('Hello Call4All, I would like to order ' + item.name + ' at Rs ' + item.price + ' in Kukas, Jaipur.');
      const image = item.image_path ? `<img src="${safe(item.image_path)}" alt="${safe(item.name)} vegetarian thali in Kukas Jaipur" loading="lazy" style="width:100%;height:170px;object-fit:cover;border-radius:10px">` : '';
      return `<article>${image}<h3>${safe(item.name)}</h3><strong>Rs ${safe(item.price)}</strong><p>${safe(item.description)}</p><div class="tiffin-menu-actions"><a class="btn btn-accent btn-sm" href="tiffin-center-kukas.html#book">Book Now</a><a class="btn btn-outline-dark btn-sm" href="${detail}">View Details</a><a class="btn btn-whatsapp btn-sm" href="https://wa.me/917737353588?text=${message}" target="_blank" rel="noopener">WhatsApp</a></div></article>`;
    }).join('') : '<p>Menu is being updated. Please call to order.</p>';
  } catch (error) {
    mount.innerHTML = '<p>Menu temporarily unavailable. Please call to order.</p>';
  }
});
