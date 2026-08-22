document.addEventListener('DOMContentLoaded', async () => {
  const mount = document.getElementById('tiffinMenu');
  if (!mount || !window.CsvAPI) return;
  const safe = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  try {
    const rows = (await CsvAPI.loadAllPublic('data/tiffin-menu.csv')).items
      .filter(item => String(item.status).toLowerCase() === 'active')
      .sort((a, b) => Number(a.sort_order || 99) - Number(b.sort_order || 99));
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