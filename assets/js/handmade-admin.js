(function () {
  'use strict';
  const PATH = 'data/handmade-items.csv';
  const HEADERS = ['id','timestamp','category','title','artisan','materials','price','stock','city','area','contact_phone','image_path','description','meta_title','meta_description','keywords','status','added_by','approval_status','pending_json','reviewed_by','reviewed_at','state','og_title','og_description','og_image','image_alt','robots'];
  const FIELDS = ['category','title','artisan','materials','price','stock','city','area','contact_phone','image_path','description','meta_title','meta_description','keywords','state','og_title','og_description','og_image','image_alt','robots'];
  const isAdmin = sessionStorage.getItem('c4a_admin_session') === '1' && !!localStorage.getItem('c4a_admin_token');
  const isStaff = sessionStorage.getItem('c4a_staff_session') === '1' && !!localStorage.getItem('c4a_staff_token');
  const role = isAdmin ? 'admin' : (isStaff ? 'staff' : '');
  const token = () => localStorage.getItem(isAdmin ? 'c4a_admin_token' : 'c4a_staff_token');
  const user = () => localStorage.getItem(isAdmin ? 'c4a_admin_user' : 'c4a_staff_email') || role;
  const safe = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const draftOf = item => { try { return JSON.parse(item.pending_json || 'null'); } catch (_) { return null; } };
  let state = { items: [], sha: null }, editing = null;

  function authorize() {
    if (!role) { location.href = 'staff.html'; return false; }
    document.getElementById('managerRole').textContent = isAdmin ? 'Admin' : 'Staff';
    document.getElementById('backPanel').href = isAdmin ? 'admin.html' : 'staff.html';
    return true;
  }
  async function load() {
    try { state = await window.CsvAPI.loadAll(token(), PATH); render(); }
    catch (error) { document.getElementById('handmadeAdminList').innerHTML = '<p>Load failed: ' + safe(error.message) + '</p>'; }
  }
  function render() {
    const box = document.getElementById('handmadeAdminList');
    const visible = isAdmin ? state.items : state.items.filter(item => item.added_by === user());
    box.innerHTML = visible.length ? visible.slice().reverse().map(item => {
      const draft = draftOf(item), view = draft || item;
      return `<article class="pa-item"><img src="${safe(view.image_path || item.image_path || 'assets/icons/icon-512.png')}" alt=""><div><h3>${safe(view.title)}</h3><p>${safe(view.category)} · ₹${Number(view.price || 0).toLocaleString('en-IN')} · Stock ${safe(view.stock)}</p><p>${safe([view.area, view.city].filter(Boolean).join(', '))} · <strong>${safe(item.approval_status || 'Pending')}</strong>${draft ? ' · Edit pending' : ''}</p><p>Added by: ${safe(item.added_by)}</p></div><div><button class="pa-btn edit" data-id="${safe(item.id)}">Edit</button>${isAdmin && (item.approval_status !== 'Approved' || draft) ? `<button class="pa-btn gold approve" data-id="${safe(item.id)}">Approve</button>` : ''}${isAdmin ? `<button class="pa-btn danger delete" data-id="${safe(item.id)}">Delete</button>` : ''}</div></article>`;
    }).join('') : '<p>No handmade product added yet.</p>';
    box.querySelectorAll('.edit').forEach(button => button.onclick = () => edit(button.dataset.id));
    box.querySelectorAll('.approve').forEach(button => button.onclick = () => approve(button.dataset.id));
    box.querySelectorAll('.delete').forEach(button => button.onclick = () => remove(button.dataset.id));
  }
  function edit(id) {
    const item = state.items.find(entry => entry.id === id);
    if (!item || (!isAdmin && item.added_by !== user())) return;
    editing = id;
    const view = draftOf(item) || item, form = document.getElementById('handmadeForm');
    FIELDS.forEach(field => { if (form.elements[field]) form.elements[field].value = view[field] || ''; });
    form.elements.image_path.value = view.image_path || item.image_path || '';
    document.getElementById('formTitle').textContent = 'Edit Handmade Product';
    document.getElementById('cancelEdit').hidden = false;
    scrollTo({ top: 0, behavior: 'smooth' });
  }
  function reset() {
    editing = null;
    const form = document.getElementById('handmadeForm');
    form.reset(); form.elements.stock.value = '1'; form.elements.image_path.value = '';
    document.getElementById('formTitle').textContent = 'Add Handmade Product';
    document.getElementById('cancelEdit').hidden = true;
    document.getElementById('handmadeImage').value = '';
  }
  async function persist(items, message) {
    await window.CsvAPI.saveAll(HEADERS, items, state.sha, token(), message, PATH);
    await load();
  }
  async function approve(id) {
    const items = [...state.items], index = items.findIndex(item => item.id === id);
    if (index < 0) return;
    const item = { ...items[index] }, draft = draftOf(item);
    if (draft) FIELDS.forEach(field => item[field] = draft[field] ?? item[field]);
    item.pending_json = ''; item.approval_status = 'Approved'; item.status = 'Active';
    item.reviewed_by = user(); item.reviewed_at = new Date().toISOString(); items[index] = item;
    try { await window.CatalogPageGenerator.generate('handmade', item, token()); await persist(items, 'Approve handmade product ' + id); } catch (error) { alert(error.message); }
  }
  async function remove(id) {
    if (!confirm('Is handmade product ko permanently delete karna hai?')) return;
    try { const item=state.items.find(entry=>entry.id===id);await window.CatalogPageGenerator.retire('handmade',item,token());await persist(state.items.filter(item => item.id !== id), 'Delete handmade product ' + id); } catch (error) { alert(error.message); }
  }
  async function save(event) {
    event.preventDefault();
    const form = event.currentTarget, button = form.querySelector('[type="submit"]'), status = document.getElementById('saveStatus');
    button.disabled = true; status.textContent = 'Saving…';
    try {
      let imagePath = form.elements.image_path.value;
      const file = document.getElementById('handmadeImage').files[0];
      if (file) {
        status.textContent = 'Image upload ho rahi hai…';
        imagePath = (await window.CsvAPI.uploadImage(file, token(), { folder:'assets/uploads/', prefix:'handmade', maxWidth:1600, quality:.86, message:'Upload handmade product image' })).path;
      }
      if (!imagePath) throw new Error('Product image select karein.');
      const draft = {};
      FIELDS.forEach(field => draft[field] = form.elements[field] ? form.elements[field].value.trim() : '');
      draft.image_path = imagePath;
      const items = [...state.items], index = items.findIndex(item => item.id === editing);
      if (index >= 0) {
        const old = { ...items[index] };
        if (isAdmin) {
          FIELDS.forEach(field => old[field] = draft[field]);
          old.pending_json = ''; old.approval_status = 'Approved'; old.status = 'Active';
          old.reviewed_by = user(); old.reviewed_at = new Date().toISOString();
        } else old.pending_json = JSON.stringify(draft);
        items[index] = old;
      } else {
        const row = { id:'handmade-' + Date.now(), timestamp:new Date().toISOString(), status:isAdmin ? 'Active' : 'Inactive', added_by:user(), approval_status:isAdmin ? 'Approved' : 'Pending', pending_json:'', reviewed_by:isAdmin ? user() : '', reviewed_at:isAdmin ? new Date().toISOString() : '' };
        FIELDS.forEach(field => row[field] = draft[field]); items.push(row);
      }
      if (isAdmin) { status.textContent = 'SEO page generate ho raha hai…'; await window.CatalogPageGenerator.generate('handmade', items[index >= 0 ? index : items.length - 1], token()); }
      await persist(items, (isAdmin ? 'Save ' : 'Submit ') + 'handmade product');
      status.textContent = isAdmin ? '✅ Product aur SEO page published' : '✅ Admin approval ke liye submit ho gaya';
      reset();
    } catch (error) { status.textContent = '❌ ' + error.message; }
    finally { button.disabled = false; }
  }
  document.addEventListener('DOMContentLoaded', () => {
    if (!authorize()) return;
    const seoTitle=document.querySelector('[name="meta_title"]');seoTitle.required=true;const seoDescription=document.querySelector('[name="meta_description"]');seoDescription.required=true;seoDescription.minLength=80;document.querySelector('[name="keywords"]').required=true;document.getElementById('saveStatus').insertAdjacentHTML('beforebegin','<label>Social / OG title</label><input name="og_title" maxlength="95"><label>Social / OG description</label><textarea name="og_description" maxlength="220" rows="3"></textarea><label>Social / OG image URL</label><input name="og_image" type="url"><label>Image alt text *</label><input name="image_alt" required maxlength="160"><label>Search indexing</label><select name="robots"><option value="index,follow">Index &amp; follow</option><option value="noindex,follow">No index</option></select>');
    if(isAdmin){const list=document.getElementById('handmadeAdminList');list.insertAdjacentHTML('beforebegin','<button class="pa-btn" id="rebuildHandmadePages" type="button">Rebuild All SEO Pages</button>');document.getElementById('rebuildHandmadePages').onclick=async e=>{const button=e.currentTarget,rows=state.items.filter(x=>x.status==='Active'&&x.approval_status==='Approved');button.disabled=true;try{for(let i=0;i<rows.length;i++){button.textContent=`Generating ${i+1}/${rows.length}…`;await window.CatalogPageGenerator.generate('handmade',rows[i],token())}button.textContent=`✅ ${rows.length} SEO pages rebuilt`}catch(error){button.textContent='❌ '+error.message}finally{button.disabled=false}}}
    document.getElementById('handmadeForm').addEventListener('submit', save);
    document.getElementById('cancelEdit').onclick = reset;
    load();
  });
})();
