(function () {
  'use strict';
  const CONFIG = 'data/weekend-crew.json';
  const GALLERY = 'data/weekend-crew-gallery.csv';
  const HEADERS = ['id','image_path','alt_text','caption','status','featured','sort_order'];
  const token = () => localStorage.getItem('c4a_admin_token');
  const safe = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const asset = path => window.assetUrl ? window.assetUrl(path) : path;
  let configStore = {json:{},sha:null}, galleryStore = {items:[],sha:null}, editing = '';

  function authorize() {
    if (sessionStorage.getItem('c4a_admin_session') !== '1' || !token()) { location.href='admin.html'; return false; }
    return true;
  }
  async function load() {
    try {
      [configStore,galleryStore] = await Promise.all([CsvAPI.loadJson(CONFIG,token()),CsvAPI.loadAll(token(),GALLERY)]);
      fillConfig(); render();
    } catch (error) { document.getElementById('configStatus').textContent='Load failed: '+error.message; }
  }
  function fillConfig() {
    const form=document.getElementById('weekendConfigForm'),config=configStore.json||{};
    ['brand_name','eyebrow','hero_title','hero_subtitle','about','video_url','whatsapp','instagram','service_area','og_image','seo_title','seo_description'].forEach(key=>form.elements[key].value=config[key]||'');
    form.elements.enabled.checked=config.enabled!==false;
  }
  function render() {
    const rows=galleryStore.items.slice().sort((a,b)=>Number(a.sort_order||99)-Number(b.sort_order||99));
    document.getElementById('weekendAdminGallery').innerHTML=rows.map(item=>`<article class="wca-item"><img src="${safe(asset(item.image_path))}" alt="${safe(item.alt_text)}"><div><strong>${safe(item.caption||item.alt_text)}</strong><p class="wca-muted">${safe(item.status)} · Featured: ${safe(item.featured)} · Order ${safe(item.sort_order)}</p><button class="pa-btn wca-edit" data-id="${safe(item.id)}">Edit</button> <button class="pa-btn danger wca-delete" data-id="${safe(item.id)}">Delete</button></div></article>`).join('')||'<p>No images.</p>';
    document.querySelectorAll('.wca-edit').forEach(button=>button.onclick=()=>edit(button.dataset.id));
    document.querySelectorAll('.wca-delete').forEach(button=>button.onclick=()=>remove(button.dataset.id));
  }
  async function saveConfig(event) {
    event.preventDefault(); const form=event.currentTarget,config={...configStore.json};
    ['brand_name','eyebrow','hero_title','hero_subtitle','about','video_url','whatsapp','instagram','service_area','og_image','seo_title','seo_description'].forEach(key=>config[key]=form.elements[key].value.trim());
    config.enabled=form.elements.enabled.checked; config.updated_at=new Date().toISOString();
    const out=document.getElementById('configStatus');
    try { out.textContent='Saving…'; await CsvAPI.saveJson(CONFIG,config,configStore.sha,token(),'Update Weekend Crew page'); out.textContent='✅ Page content saved'; await load(); }
    catch(error){out.textContent='❌ '+error.message;}
  }
  function edit(id) {
    const item=galleryStore.items.find(row=>row.id===id); if(!item)return; editing=id;
    const form=document.getElementById('weekendGalleryForm'); HEADERS.slice(1).forEach(key=>{if(form.elements[key])form.elements[key].value=item[key]||''});
    document.getElementById('galleryFormTitle').textContent='Edit Gallery Image'; document.getElementById('cancelGallery').hidden=false; scrollTo({top:0,behavior:'smooth'});
  }
  function resetGallery() {
    editing=''; const form=document.getElementById('weekendGalleryForm'); form.reset(); form.elements.status.value='Active'; form.elements.featured.value='No'; form.elements.sort_order.value='50';
    document.getElementById('galleryFormTitle').textContent='Add Gallery Image'; document.getElementById('cancelGallery').hidden=true;
  }
  async function saveGallery(event) {
    event.preventDefault(); const form=event.currentTarget,fields=form.elements,out=document.getElementById('galleryStatus');
    try {
      out.textContent='Saving…'; let path=fields.image_path.value.trim(),file=document.getElementById('weekendImage').files[0];
      if(file){out.textContent='Uploading image…';path=(await CsvAPI.uploadImage(file,token(),{folder:'assets/uploads/weekend-crew/',prefix:'weekend-crew',maxWidth:1800,quality:.86,message:'Upload Weekend Crew gallery image'})).path;}
      if(!path)throw Error('Select an image');
      const row={id:editing||'wc-'+Date.now(),image_path:path,alt_text:fields.alt_text.value.trim(),caption:fields.caption.value.trim(),status:fields.status.value,featured:fields.featured.value,sort_order:fields.sort_order.value};
      const items=editing?galleryStore.items.map(item=>item.id===editing?row:item):[...galleryStore.items,row];
      await CsvAPI.saveAll(HEADERS,items,galleryStore.sha,token(),(editing?'Update ':'Add ')+'Weekend Crew image',GALLERY); out.textContent='✅ Gallery saved'; resetGallery(); await load();
    } catch(error){out.textContent='❌ '+error.message;}
  }
  async function remove(id) {
    if(!confirm('Delete this gallery entry? Image file will remain safely in uploads.'))return;
    try { await CsvAPI.saveAll(HEADERS,galleryStore.items.filter(item=>item.id!==id),galleryStore.sha,token(),'Delete Weekend Crew gallery entry',GALLERY); await load(); }
    catch(error){alert(error.message);}
  }
  document.addEventListener('DOMContentLoaded',()=>{if(!authorize())return;document.getElementById('weekendConfigForm').onsubmit=saveConfig;document.getElementById('weekendGalleryForm').onsubmit=saveGallery;document.getElementById('cancelGallery').onclick=resetGallery;load();});
})();
