(()=>{
'use strict';
const API=BillingAPI,SESSION='c4b_staff_session',STORE='c4b_workspace_v2:',$=id=>document.getElementById(id),safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),money=c=>'₹'+(Number(c||0)/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}),date=t=>t?new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}).format(new Date(t*1000)):'—';
let session=null,workspace={active:null,bills:{}},catalog={food:[],beverage:[]},category='All',historyOffset=null,historyItems=[],serverOffset=0,toastTimer=0,autosaveTimer=0,syncing=false;
const saving=new Set(),generating=new Set(),cancelling=new Set(),discarding=new Set(),discardedIds=new Set();
const archive=()=>new URLSearchParams(location.search).get('view')==='history';
const dayFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'});
const today=()=>dayFormat.format(API.now());
const expired=b=>b?.status==='draft'&&b.created_at<Date.parse(today()+'T00:00:00+05:30')/1000;
const current=()=>workspace.bills[workspace.active];
let billingDay;
function pruneDrafts(){
  for(const [key,b] of Object.entries(workspace.bills))if(expired(b))delete workspace.bills[key];
  if(!current())workspace.active=null;
}
function setView(historyMode,billId){
  const url=new URL(location.href);
  if(billId)url.searchParams.set('bill',billId);else url.searchParams.delete('bill');
  if(historyMode)url.searchParams.set('view','history');else url.searchParams.delete('view');
  if(url.href!==location.href)window.history.pushState(null,'',url);
}
function showView(){
  if(archive()){const id=new URLSearchParams(location.search).get('bill');return id?openBill(id):history();}
  $('historyView').hidden=true;
  if(current()?.status!=='draft')workspace.active=Object.values(workspace.bills).find(b=>b.status==='draft'&&!expired(b))?.key||null;
  render();
}
function persist(){if(!session)return;try{localStorage.setItem(STORE+session.user.id,JSON.stringify(workspace));$('footerState').textContent='Drafts device par saved · '+new Date().toLocaleTimeString('en-IN')}catch{status('Device storage full/blocked hai. Page band na karein; bills sync karein.')}}
function status(s){$('status').textContent=s}
function toast(s){$('toast').textContent=s;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,2000)}
function locked(b){return !!b&&(discarding.has(b.key)||cancelling.has(b.key)||b.status==='cancelled'||expired(b)||b.locked||b.generated_at&&API.now()>=b.generated_at*1000+3600000)}
function totals(b){return BillingInvoice.totals(b)}
function data(b){return{kind:b.kind,table:b.kind==='beverage'?'':b.table||'',customer:b.kind==='beverage'?'':b.customer||'',phone:b.kind==='beverage'?'':b.phone||'',discount_cents:b.discount_cents||0,tax_bps:b.tax_bps||0,lines:b.lines.map(x=>({item_id:x.item_id,variant:x.variant,qty:x.qty,...(x.variant==='Custom'?{name:x.name,price_cents:x.price_cents}:{})}))}}
const fingerprint=b=>JSON.stringify(data(b));
function canonical(remote,key){return gstDraft({...remote,key,id:remote.id,dirty:false,conflict:null,baseVersion:remote.version})}
function gstDraft(b){if(b.kind==='food'&&b.status==='draft'&&b.tax_bps!==500){b.tax_bps=500;b.dirty=true;delete b.writeRequest}return b}
function addDraft(kind){setView(false);const key=API.uid();workspace.bills[key]={key,id:null,bill_no:'Unsynced draft',kind,status:'draft',table:'',customer:'',phone:'',lines:[],discount_cents:0,tax_bps:kind==='food'?500:0,created_at:API.now()/1000,generated_at:null,creator_id:session.user.id,creator_name:session.user.name,updater_name:session.user.name,version:0,baseVersion:0,comments:[],audit:[],dirty:true};workspace.active=key;category='All';$('historyView').hidden=true;$('editor').hidden=false;persist();render();schedule();}
function mergeRemote(remote){if(expired(remote)||discardedIds.has(remote.id))return null;let b=Object.values(workspace.bills).find(x=>x.id===remote.id);if(b?.dirty&&remote.status!=='cancelled'){if(remote.version!==b.baseVersion)b.conflict='Server par bill update ho chuka hai. Aapke local changes safe hain.';return b}const key=b?.key||remote.id;workspace.bills[key]=canonical(remote,key);return workspace.bills[key]}
function changed(){const b=current();if(!b||locked(b)||b.generateAttempt)return;b.dirty=true;b.conflict=null;persist();renderPending();renderCart();if(b.status==='draft')schedule()}
function schedule(){clearTimeout(autosaveTimer);autosaveTimer=setTimeout(()=>syncDrafts(),API.isCSV?.()?2500:700)}
async function saveOne(b){if(!b||!b.dirty||b.generateAttempt||b.conflict||saving.has(b.key)||locked(b))return b;saving.add(b.key);const before=fingerprint(b),payload=data(b);try{
if(!b.id){b.createAttempted=true;persist();const created=await API.request('/bills',{token:session.token,method:'POST',data:{kind:b.kind},key:'create-'+b.key});b.id=created.id;b.bill_no=created.bill_no;b.baseVersion=b.version=created.version;persist()}
const body={...payload,version:b.baseVersion},signature=JSON.stringify(body);if(!b.writeRequest||b.writeRequest.signature!==signature)b.writeRequest={key:API.uid(),signature};persist();
const remote=await API.request('/bills/'+b.id,{token:session.token,method:'PUT',data:body,key:b.writeRequest.key});const latest=workspace.bills[b.key];if(!latest)return;if(fingerprint(latest)===before)workspace.bills[b.key]=canonical(remote,b.key);else{latest.id=remote.id;latest.bill_no=remote.bill_no;latest.baseVersion=latest.version=remote.version;latest.dirty=true;delete latest.writeRequest}persist();status('Saved · '+remote.bill_no);if(workspace.active===b.key&&$('historyView').hidden)render();else renderPending();return workspace.bills[b.key]
}catch(e){b.error=e.message;if(e.code==='conflict'||e.status===423){b.conflict=e.message;if(e.status===423)b.locked=true}persist();status(e.message);if(workspace.active===b.key)renderConflict();return null}finally{saving.delete(b.key);if(current()?.key===b.key&&$('historyView').hidden)renderCart()}}
async function syncDrafts(){if(syncing||!session)return;syncing=true;try{for(const b of Object.values(workspace.bills))if(b.status==='draft'&&!expired(b)&&b.dirty&&!b.conflict&&!generating.has(b.key))await saveOne(b)}finally{syncing=false}}
async function pending(){
  pruneDrafts();
  const local=Object.values(workspace.bills).filter(b=>b.status==='draft'&&b.id&&!b.generateAttempt&&!saving.has(b.key)&&!generating.has(b.key)&&!discarding.has(b.key));
  try{
    await API.request('/bills/expire-drafts',{method:'POST',token:session.token,key:API.uid()}).catch(e=>status(e.message));
    const seen=new Set();
    let offset=0;
    do{
      const result=await API.request('/bills?status=draft&limit=100&offset='+offset,{token:session.token});
      for(const bill of result.items){seen.add(bill.id);mergeRemote(bill)}
      offset=result.next_offset;
    }while(offset!==null);
    for(const b of local){
      if(seen.has(b.id)||workspace.bills[b.key]!==b||saving.has(b.key)||generating.has(b.key)||discarding.has(b.key))continue;
      try{
        const remote=await API.request('/bills/'+b.id,{token:session.token});
        if(remote.status==='draft'||workspace.bills[b.key]!==b)continue;
        workspace.bills[b.key]=b.dirty?{
          ...b,status:remote.status,generated_at:remote.generated_at,locked:remote.locked,
          conflict:'Bill doosre device par generate ho chuka hai. Latest bill load karein ya local changes ka naya draft banayein.'
        }:canonical(remote,b.key);
        if(workspace.active===b.key&&!archive()){
          workspace.active=null;
          render();
        }
      }catch(e){
        if(e.status===404&&workspace.bills[b.key]===b&&!discarding.has(b.key)&&!saving.has(b.key)&&!generating.has(b.key)){
          removeLocalDraft(b.key,b.id);
        }else if(e.status!==404)status(e.message);
      }
    }
    persist();
    renderPending();
  }catch(e){status(e.message)}
}
async function loadMenu(){try{catalog=await API.request('/menu',{token:session.token});workspace.catalog=catalog;persist();renderMenu()}catch(e){status(e.message)}}
function draftLabel(b){
  return b.kind==='beverage'?'Beverage draft':b.table?'Table '+b.table:'New table';
}
function removeLocalDraft(key,id){
  if(id)discardedIds.add(id);
  delete workspace.bills[key];
  if(workspace.active===key){
    workspace.active=Object.values(workspace.bills).find(b=>b.status==='draft'&&!expired(b))?.key||null;
    if($('historyView').hidden)render();
  }
  persist();
  renderPending();
}
async function discardDraft(key){
  let b=workspace.bills[key];
  if(b?.status!=='draft'||b.generateAttempt||locked(b)||generating.has(key))return;
  if(!confirm(draftLabel(b)+' ka pending bill delete karein?'))return;
  discarding.add(key);
  renderPending();
  if(workspace.active===key){renderCart();renderMenu()}
  try{
    for(let i=0;saving.has(key)&&i<160;i++)await new Promise(resolve=>setTimeout(resolve,250));
    if(saving.has(key))throw Error('Draft sync chal raha hai. Thodi der mein delete karein.');
    b=workspace.bills[key];
    if(!b||b.status!=='draft')return;
    if(!b.id&&b.createAttempted){
      const remote=await API.request('/bills',{token:session.token,method:'POST',data:{kind:b.kind},key:'create-'+key});
      b.id=remote.id;
      b.baseVersion=remote.version;
      persist();
    }
    if(b.id){
      await API.request('/bills/'+b.id+'/discard',{
        token:session.token,method:'POST',data:{version:b.baseVersion},key:API.uid()
      }).catch(e=>{if(e.status!==404)throw e});
    }
    removeLocalDraft(key,b.id);
    toast('Pending bill deleted');
  }catch(e){
    status(e.message);
    if(e.status===409){discarding.delete(key);pending()}
  }finally{
    discarding.delete(key);
    renderPending();
    if(workspace.active===key){renderCart();renderMenu()}
  }
}
function renderPending(){
  const items=Object.values(workspace.bills).filter(b=>b.status==='draft'&&!expired(b));
  const mount=$('pendingBills');
  mount.innerHTML=items.length?items.map(b=>`
    <div class="bw-pending-card">
      <button type="button" class="bw-tab ${workspace.active===b.key?'active':''}" data-key="${safe(b.key)}">
        <strong>${safe(draftLabel(b))} · ${b.kind==='food'?'Food':'Beverage'}</strong>
        <small>${safe(b.creator_name)} · ${money(totals(b).total)}</small>
        <small>${b.conflict?'Conflict · local safe':b.dirty?'Device par saved, sync pending':safe(b.bill_no)}</small>
      </button>
      <button type="button" class="fb-btn fb-btn-danger" data-discard="${safe(b.key)}" aria-label="Delete pending bill: ${safe(draftLabel(b))}" ${discarding.has(b.key)||generating.has(b.key)||b.generateAttempt?'disabled':''}>Delete</button>
    </div>`).join(''):'<p>No pending bills. Food ya Beverage bill add karein.</p>';
  mount.querySelectorAll('[data-key]').forEach(btn=>btn.onclick=()=>{
    workspace.active=btn.dataset.key;
    category='All';
    persist();
    render();
  });
  mount.querySelectorAll('[data-discard]').forEach(btn=>btn.onclick=()=>discardDraft(btn.dataset.discard));
}
function renderConflict(){const b=current(),mount=$('conflict');mount.hidden=!b?.conflict;if(!b?.conflict)return;mount.innerHTML=`<strong>${safe(b.conflict)}</strong><div><button id="loadLatest" class="fb-btn">Latest server bill load karein</button><button id="copyDraft" class="fb-btn fb-btn-dark">Local changes ko naya draft banayein</button></div>`;$('loadLatest').onclick=async()=>{if(!confirm('Local unsaved changes replace honge. Latest server bill kholein?'))return;try{const remote=await API.request('/bills/'+b.id,{token:session.token});workspace.bills[b.key]=canonical(remote,b.key);if(remote.status!=='draft')setView(true,remote.id);persist();render()}catch(e){status(e.message)}};$('copyDraft').onclick=()=>{const copy={...JSON.parse(JSON.stringify(b)),key:API.uid(),id:null,bill_no:'Unsynced draft',status:'draft',created_at:API.now()/1000,version:0,baseVersion:0,generated_at:null,locked:false,dirty:true,conflict:null,comments:[],audit:[],creator_id:session.user.id,creator_name:session.user.name};delete copy.writeRequest;delete copy.generateAttempt;delete copy.createAttempted;delete copy.error;setView(false);$('historyView').hidden=true;workspace.bills[copy.key]=gstDraft(copy);workspace.active=copy.key;persist();render();schedule()}}
function render(){$('pendingPanel').hidden=archive();const b=current(),form=$('customItemForm');if(form.dataset.billKey!==b?.key){form.reset();form.dataset.billKey=b?.key||''}renderPending();if(!b){$('editor').hidden=true;return}$('editor').hidden=false;for(const id of ['table','customer','phone']){$(id).value=b.kind==='beverage'?'':b[id]||'';$(id).closest('label').hidden=b.kind==='beverage'}$('pdfShareFallback').hidden=true;$('receiptTitle').textContent=b.kind==='beverage'?'Call4All Beverage Bill':'Call4Food Customer Bill';$('billNo').value=b.bill_no;$('discount').value=b.discount_cents/100;$('tax').value=b.tax_bps/100;$('tax').readOnly=b.kind==='food';$('billType').textContent=b.kind==='food'?'Food bill':'Beverages / snacks bill';renderConflict();renderCart();renderMenu();renderComments()}
function renderCart(){const b=current();if(!b)return;const ro=locked(b)||generating.has(b.key)||!!b.generateAttempt,t=totals(b);$('billDetails').innerHTML=`<p><strong>${safe(b.bill_no)}</strong>${b.kind==='food'?' · '+safe(b.table?'Table '+b.table:'No table')+'<br>'+safe(b.customer):''}<br>Created by: <strong>${safe(b.creator_name)}</strong><br>Last updated by: ${safe(b.updater_name||b.creator_name)}<br>Created: ${date(b.created_at)}${b.generated_at?'<br>Generated: '+date(b.generated_at):''}${b.status==='cancelled'?'<br><strong>Cancelled Bill</strong>':''}</p>`;$('cartList').innerHTML=b.lines.length?b.lines.map((x,i)=>`<div class="fb-cart-row"><div><strong>${safe(x.name)}</strong><small>${safe(x.variant)} · ${money(x.price_cents)} × ${x.qty}</small></div><div class="fb-qty"><button data-index="${i}" data-delta="-1" ${ro?'disabled':''} aria-label="${safe(x.name)} quantity kam karein">−</button><b>${x.qty}</b><button data-index="${i}" data-delta="1" ${ro?'disabled':''} aria-label="${safe(x.name)} quantity badhayein">+</button></div><strong>${money(x.price_cents*x.qty)}</strong></div>`).join(''):'<p class="fb-empty">Items choose karein. Doosra draft kabhi bhi khol sakte hain.</p>';$('cartList').querySelectorAll('[data-index]').forEach(btn=>btn.onclick=()=>{if(locked(b)||generating.has(b.key)||b.generateAttempt)return;const x=b.lines[Number(btn.dataset.index)];x.qty+=Number(btn.dataset.delta);b.lines=b.lines.filter(x=>x.qty>0);changed();renderMenu()});$('subtotal').textContent=money(t.subtotal);$('taxAmount').textContent=money(t.tax);$('receiptBusiness').hidden=b.kind!=='food';$('taxLabel').textContent=b.kind==='food'?'GST %':'Tax %';$('taxAmountLabel').textContent=b.kind==='food'?'GST amount':'Tax amount';$('discountAmount').textContent=money(t.discount);$('taxableAmount').textContent=money(t.base);$('total').textContent=money(t.total);$('totalLabel').textContent=b.status==='cancelled'?'Original total':'Total';$('customItemForm').hidden=b.kind!=='food';$('customItemFields').disabled=ro;for(const id of ['table','customer','phone','discount','tax'])$(id).disabled=ro;$('saveBill').disabled=ro||!b.dirty;$('saveBill').hidden=b.kind==='beverage'&&b.status==='draft';$('saveBill').textContent=b.status==='draft'?'Save draft':'Save bill changes';$('generateBill').textContent=b.kind==='beverage'?'Save beverage bill':'Generate bill';$('printBill').hidden=$('connectPrinter').hidden=$('printerStatus').hidden=b.kind==='beverage';$('whatsappNote').hidden=b.kind==='beverage'||b.status==='cancelled';$('whatsappBill').hidden=b.kind==='beverage';$('sharePdf').hidden=b.kind==='beverage'||b.status==='cancelled';$('sharePdf').disabled=b.status!=='generated'||b.dirty||cancelling.has(b.key);$('downloadPdf').hidden=b.kind==='beverage';$('downloadPdf').disabled=b.status==='draft'||b.dirty||cancelling.has(b.key);$('downloadPdf').textContent=b.status==='cancelled'?'Download Cancelled Bill PDF':'Download PDF';$('generateBill').hidden=b.status!=='draft';$('generateBill').disabled=!b.lines.length||locked(b)||generating.has(b.key);
$('cancelBill').hidden=b.status!=='generated';
$('cancelBill').disabled=cancelling.has(b.key)||saving.has(b.key);
if(b.generateAttempt&&!generating.has(b.key))$('generateBill').textContent='Retry Generate Bill';
if(b.status==='cancelled')$('pdfShareFallback').hidden=true;$('printBill').disabled=b.status==='draft'||b.dirty||cancelling.has(b.key);$('whatsappBill').disabled=b.status!=='generated'||b.dirty||cancelling.has(b.key);$('editNotice').textContent=b.status==='cancelled'?'Cancelled bill · collection se hata diya gaya.':cancelling.has(b.key)?'Bill cancel ho raha hai.':b.generateAttempt&&!generating.has(b.key)?'Save verify karne ke liye Retry Generate Bill dabayein.':generating.has(b.key)?'Bill generate ho raha hai; stock aur invoice save ho rahe hain.':ro?'1 ghanta poora: bill edit nahi hoga. Neeche comment add kar sakte hain.':b.generated_at?'Editable until '+date(b.generated_at+3600)+' IST. Changes save karna zaroori hai.':'Pending bill: draft device par turant save hota hai. Stock generate karne par deduct hoga.';$('saveState').textContent=b.dirty?'Device saved · sync pending':'Saved';}
function renderMenu(){const b=current();if(!b)return;const list=catalog[b.kind]||[],cats=['All',...new Set(list.map(x=>x.category))];if(!cats.includes(category))category='All';$('categories').innerHTML=cats.map(c=>`<button class="fb-cat ${c===category?'active':''}" data-cat="${safe(c)}">${safe(c)}</button>`).join('');$('categories').querySelectorAll('button').forEach(btn=>btn.onclick=()=>{category=btn.dataset.cat;renderMenu()});const query=$('menuSearch').value.trim().toLowerCase(),items=list.filter(x=>(category==='All'||x.category===category)&&(!query||(x.name+' '+x.category).toLowerCase().includes(query)));$('menuGrid').innerHTML=items.length?items.map(x=>{const qty=b.lines.filter(l=>l.item_id===x.id).reduce((s,l)=>s+l.qty,0);return `<article class="fb-item ${qty?'added':''}"><div><h3>${safe(x.name)}</h3><small>${safe(x.category)}${b.kind==='beverage'?' · Stock '+x.stock+' single units':''}</small></div><div class="fb-item-actions">${x.variants.map(v=>`<button data-id="${safe(x.id)}" data-variant="${safe(v.key)}" ${locked(b)||generating.has(b.key)?'disabled':''}>${safe(v.key)} ${money(v.price_cents)}</button>`).join('')}</div>${qty?`<span class="bw-added">✓ Added ${qty}</span>`:''}</article>`}).join(''):'<p class="fb-empty">No items available. Admin se items/stock add karwayein.</p>';$('menuGrid').querySelectorAll('[data-id]').forEach(btn=>btn.onclick=()=>{if(locked(b)||generating.has(b.key)||b.generateAttempt)return;const item=list.find(x=>x.id===btn.dataset.id),v=item.variants.find(v=>v.key===btn.dataset.variant),line=b.lines.find(x=>x.item_id===item.id&&x.variant===v.key);if(line)line.qty++;else b.lines.push({item_id:item.id,name:item.name,variant:v.key,price_cents:v.price_cents,units:v.units||0,qty:1});changed();renderMenu();toast('✓ '+item.name+' · '+v.key+' added to '+(b.kind==='food'&&b.table?'Table '+b.table:b.bill_no))})}
function renderComments(){const b=current();$('comments').innerHTML=(b.comments||[]).map(c=>`<div class="bw-comment">${safe(c.body)}<br><small>${safe(c.actor_name)} · ${date(c.created_at)}</small></div>`).join('')||'<p>No comments.</p>';$('billAudit').innerHTML=(b.audit||[]).map(a=>`<p class="bw-audit">${safe(({draft_created:'Draft banaya',draft_saved:'Draft saved',generated:'Bill generated',bill_edited:'Bill edited',cancelled:'Bill cancelled'})[a.action]||a.action)} · ${safe(a.actor_name)} · ${date(a.created_at)}</p>`).join('');$('commentForm').querySelector('button').disabled=!b.id;}
async function generate(){
  let b=current();
  if(b?.status!=='draft'||locked(b)||!b.lines.length||generating.has(b.key))return;
  const key=b.key;
  let chat=null;
  if(b.kind==='food'&&validPhone(b.phone)){
    try{chat=window.open('about:blank','_blank');if(chat)chat.opener=null}catch{}
  }
  generating.add(key);
  renderPending();renderCart();renderMenu();
  try{
    for(let i=0;saving.has(key)&&i<100;i++)await new Promise(r=>setTimeout(r,100));
    b=workspace.bills[key];
    if(!b||expired(b))throw Error('Draft expire ho gaya. Naya bill banayein.');
    if(saving.has(key))throw Error('Draft sync chal raha hai. Thodi der mein generate karein.');
    if(b.conflict)throw Error(b.conflict);
    if(!b.id&&b.createAttempted&&!b.generateAttempt){
      const created=await API.request('/bills',{token:session.token,method:'POST',data:{kind:b.kind},key:'create-'+key});
      b.id=created.id;b.baseVersion=b.version=created.version;b.bill_no=created.bill_no;
    }
    b.generateAttempt??={
      route:b.id?'/bills/'+b.id+'/generate':'/bills',
      data:{...data(b),...(b.id?{version:b.baseVersion}:{generate:true})},key:API.uid()
    };
    persist();
    const attempt=b.generateAttempt;
    const remote=await API.request(attempt.route,{token:session.token,method:'POST',data:attempt.data,key:attempt.key});
    workspace.bills[key]=canonical(remote,key);persist();
    if(workspace.active===key&&$('historyView').hidden){setView(true,remote.id);render()}
    if(remote.kind==='beverage')loadMenu();
    if(chat&&!chat.closed&&validPhone(remote.phone)){
      chat.location.replace(textURL(remote));chat=null;
      status('Bill generated. WhatsApp mein bill text ready hai. Send dabayein.');
    }else status('Bill generated · '+remote.bill_no);
  }catch(e){
    if(b&&[400,404,409,422,423].includes(e.status)){
      delete b.generateAttempt;
      if(e.code==='conflict')b.conflict=e.message;
      persist();if(current()?.key===key)renderConflict();
    }
    status(e.message);
  }finally{
    if(chat)chat.close();
    generating.delete(key);renderPending();
    if(workspace.active===key){renderCart();renderMenu()}
  }
}
async function cancelBill(){
  const b=current();
  if(b?.status!=='generated'||cancelling.has(b.key)||saving.has(b.key))return;
  const warning=b.dirty?' Unsaved changes discard ho jayenge.':'';
  if(!confirm(b.bill_no+' cancel karein?'+warning))return;
  cancelling.add(b.key);renderCart();renderMenu();
  try{
    const remote=await API.request('/bills/'+b.id+'/cancel',{
      method:'POST',token:session.token,data:{version:b.baseVersion},key:API.uid()
    });
    workspace.bills[b.key]=canonical(remote,b.key);persist();
    if(remote.kind==='beverage')loadMenu();
    status('Cancelled Bill · '+remote.bill_no);
  }catch(e){
    if(e.code==='conflict'){b.conflict=e.message;persist()}
    status(e.message);
  }finally{
    cancelling.delete(b.key);
    if(current()?.key===b.key&&$('historyView').hidden)render();
    else if(!$('historyView').hidden)history();
  }
}
function invoice(){const b=current();if(!b||b.kind!=='food')return null;return BillingInvoice.create(b)}
function downloadPdf(){try{const pdf=invoice();if(!pdf)return;BillingInvoice.download(pdf);status('PDF downloaded · '+pdf.filename)}catch(e){status(e.message)}}
function validPhone(phone){return /^(?:91)?\d{10}$/.test(String(phone||'').replace(/\D/g,''))}
function message(b, thermal=false){const seller=BillingInvoice.business,t=totals(b);return[
 '*'+seller.brand+' | '+seller.subBrand+'*',b.status==='cancelled'?'*Cancelled Bill*':'*Customer Bill*','Branch: '+seller.branch,'GSTIN: '+seller.gstin,
 'Bill: '+b.bill_no,'Date: '+date(b.generated_at)+' IST','Table: '+(b.table||'—'),'Customer: '+(b.customer||'Walk-in customer'),'',
 ...b.lines.map((x,i)=>`${i+1}. ${x.name} (${x.variant})\n   ${x.qty} × ${money(x.price_cents)} = ${money(x.qty*x.price_cents)}`),'',
 'Subtotal: '+money(t.subtotal),'Discount: '+money(t.discount),'Taxable amount: '+money(t.base),'GST ('+Number(b.tax_bps||0)/100+'%): '+money(t.tax),b.status==='cancelled'?'*Original total: '+money(t.total)+' · Cancelled*':'*Total payable: '+money(t.total)+'*','',
 ...(thermal?[]:['PDF bill chahiye to reply karke batayein.']),'Thank you! '+seller.subBrand,'Contact: '+seller.phone
 ].join('\n')}
function textURL(b){return BillingInvoice.chatURL(b.phone)+'?text='+encodeURIComponent(message(b))}
function whatsapp(){const b=current();if(!b||cancelling.has(b.key)||b.kind!=='food'||b.status!=='generated'||b.dirty)return;if(!validPhone(b.phone)){status('Customer ka 10 digit WhatsApp number bharein aur bill changes save karein.');return}window.open(textURL(b),'_blank','noopener');status('Customer ki WhatsApp chat mein bill text khulega. Bhejne ke liye Send dabayein.')}
async function sharePdf(){const phone=current()?.phone,button=$('sharePdf');button.disabled=true;try{const pdf=invoice();if(!pdf)return;$('pdfShareFallback').hidden=true;const result=await BillingInvoice.share(pdf);if(result==='downloaded'){$('openWhatsAppChat').href=BillingInvoice.chatURL(phone);$('pdfShareFallback').hidden=false;status('PDF downloaded. WhatsApp chat mein Document / Attach se PDF bhejein.')}else if(result==='shared')status('PDF share option khula. WhatsApp mein customer select karke Send karein.');else status('PDF sharing cancel hui. Dobara try ya Download PDF karein.')}catch(e){status(e.message)}finally{const b=current();button.disabled=!b||b.status!=='generated'||b.dirty}}

let historyRequest=0,historyPeriod='today';
function selectHistoryPeriod(period){
  historyPeriod=period;
  const fields={day:['historyDay'],month:['historyMonth'],range:['historyFrom','historyTo']};
  for(const id of Object.values(fields).flat())if(!fields[period]?.includes(id))$(id).value='';
  if(period==='today')$('historyDay').value=today();
}
function historyDates(){
  if(historyPeriod==='today'||historyPeriod==='day'){
    const day=historyPeriod==='today'?today():$('historyDay').value;
    return {from:day,to:day};
  }
  if(historyPeriod==='all')return {};
  if(historyPeriod==='range')return {from:$('historyFrom').value,to:$('historyTo').value};
  const month=$('historyMonth').value;
  const [year,number]=month.split('-').map(Number);
  const lastDay=new Date(Date.UTC(year,number,0)).getUTCDate();
  return {from:month+'-01',to:month+'-'+lastDay};
}
async function history(reset=true){
const request=++historyRequest;
$('pendingPanel').hidden=true;$('historyView').hidden=false;$('editor').hidden=true;try{if(reset){historyItems=[];$('historyList').replaceChildren();$('historyCollection').textContent='—';$('historyCount').textContent='';$('historyMore').hidden=true;}const query=new URLSearchParams({limit:'50',offset:String(reset?0:historyOffset||0),q:$('historySearch').value,kind:$('historyKind').value,status:'issued',...historyDates()});const result=await API.request('/bills?'+query,{token:session.token});if(request!==historyRequest||!archive())return;historyItems.push(...result.items);historyOffset=result.next_offset;$('historyCollection').textContent=money(result.collection_cents);$('historyCount').textContent=historyItems.length+' / '+result.total+' bills · Sab users ki history';$('historyList').innerHTML=historyItems.map(b=>`<article class="bw-history-item"><div><strong>${safe(b.bill_no)} · ${b.kind==='food'?'Food':'Beverage'}</strong><small>${b.kind==='food'?'Table '+safe(b.table||'-')+' · '+safe(b.customer)+' · ':''}${b.status==='cancelled'?'<strong>Cancelled Bill</strong>':'Generated'}</small><small>Created by ${safe(b.creator_name)} · ${date(b.generated_at||b.created_at)}${b.locked&&b.status==='generated'?' · Comments only':''}</small></div><b>${money(b.total_cents)}</b><button class="fb-btn" data-open="${safe(b.id)}">Open bill</button></article>`).join('');$('historyList').querySelectorAll('[data-open]').forEach(btn=>btn.onclick=()=>openBill(btn.dataset.open));$('historyMore').hidden=historyOffset===null;legacyHistory()}catch(e){status(e.message)}}
async function openBill(id){try{const remote=await API.request('/bills/'+id,{token:session.token}),b=mergeRemote(remote);if(!b)return;if(b.status!=='draft')setView(true,id);workspace.active=b.key;category='All';persist();$('historyView').hidden=true;render()}catch(e){status(e.message)}}
function legacyHistory(){try{const {from,to}=historyDates();
const old=JSON.parse(localStorage.getItem('c4f_bill_history_v1')||'[]').filter(b=>{
  const time=Date.parse(b.sentAt);
  return (!from||time>=Date.parse(from+'T00:00:00+05:30'))&&(!to||time<Date.parse(to+'T00:00:00+05:30')+86400000);
});$('legacyHistory').innerHTML=old.length?'<h2>Legacy bills · sirf is device ka purana archive</h2><p>Purane local bills shared CSV history/stock mein automatically import nahi kiye gaye.</p>'+old.map(b=>`<p><strong>${safe(b.billNo)}</strong> · ${safe(b.staff)} · ${safe(b.table||'')} · ₹${Number(b.total||0).toFixed(2)} <button class="fb-btn" data-legacy="${safe(b.billNo)}">WhatsApp resend</button></p>`).join(''):'';$('legacyHistory').querySelectorAll('[data-legacy]').forEach(btn=>btn.onclick=()=>{const b=old.find(x=>x.billNo===btn.dataset.legacy);if(/^\d{10,15}$/.test(b.target))window.open('https://wa.me/'+b.target+'?text='+encodeURIComponent(b.message),'_blank','noopener')})}catch{}}
async function show(s){session=s;API.saveSession(SESSION,s);try{workspace=JSON.parse(localStorage.getItem(STORE+s.user.id)||'null')||{active:null,bills:{}}}catch{workspace={active:null,bills:{}}}Object.values(workspace.bills).forEach(gstDraft);catalog=workspace.catalog||{food:[],beverage:[]};$('loginView').hidden=true;$('workspace').hidden=false;$('staffName').textContent=s.user.name;billingDay=today();selectHistoryPeriod('today');pruneDrafts();
const requested=new URLSearchParams(location.search).get('bill');
if(archive()){if(!requested)history()}
else {
  if(current()?.status!=='draft')workspace.active=Object.values(workspace.bills).find(b=>b.status==='draft')?.key||null;
  render();
}
await Promise.allSettled([loadMenu(),pending()]);
if(!archive()&&!current()&&!requested){
  workspace.active=Object.values(workspace.bills).find(b=>b.status==='draft')?.key||null;
  if(current())render();else addDraft('food');
}
schedule();
if(requested)openBill(requested)}

$('workspaceLogin').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector('button');b.disabled=true;try{const s=await API.request('/login',{method:'POST',data:{mobile:f.elements.mobile.value.trim(),password:f.elements.password.value,csv_token:f.elements.csv_token?.value||''}});f.elements.password.value='';if(f.elements.csv_token)f.elements.csv_token.value='';await show(s)}catch(ex){$('loginError').textContent=ex.message}finally{b.disabled=false}};
$('customItemForm').onsubmit=e=>{
  e.preventDefault();
  const b=current(),form=e.currentTarget;
  if(b?.kind!=='food'||locked(b)||generating.has(b.key)||b.generateAttempt)return;
  const name=form.elements.itemName.value.trim();
  if(!name){form.elements.itemName.value='';form.reportValidity();return}
  if(!form.reportValidity())return;
  const price_cents=Math.round(form.elements.itemPrice.valueAsNumber*100);
  b.lines.push({item_id:'custom-'+API.uid(),name,variant:'Custom',price_cents,units:0,qty:1});
  form.reset();
  changed();
  toast('✓ '+name+' added');
};
$('newFood').onclick=()=>addDraft('food');$('newBeverage').onclick=()=>addDraft('beverage');$('oldBills').onclick=()=>{setView(true);history()};$('backToBilling').onclick=()=>{setView(false);showView()};
window.addEventListener('popstate',()=>{if(session)showView()});
$('historyToday').onclick=()=>{selectHistoryPeriod('today');history()};
$('historyAll').onclick=()=>{selectHistoryPeriod('all');history()};
$('historyDay').onchange=()=>{selectHistoryPeriod($('historyDay').value?'day':'today');history()};
$('historyMonth').onchange=()=>{selectHistoryPeriod($('historyMonth').value?'month':'today');history()};
for(const id of ['historyFrom','historyTo'])$(id).onchange=()=>{selectHistoryPeriod($('historyFrom').value||$('historyTo').value?'range':'today');history()};
$('historyRefresh').onclick=()=>history();$('historyMore').onclick=()=>history(false);$('refreshPending').onclick=()=>{pending();syncDrafts()};$('menuSearch').oninput=renderMenu;for(const id of ['table','customer','phone'])$(id).oninput=()=>{if(current()&&!locked(current())){current()[id]=$(id).value;changed()}};for(const [id,field]of [['discount','discount_cents'],['tax','tax_bps']])$(id).oninput=()=>{if(!current()||locked(current())||(id==='tax'&&current().kind==='food'))return;current()[field]=Math.max(0,Math.round(Number($(id).value||0)*100));changed()};$('saveBill').onclick=()=>saveOne(current());$('generateBill').onclick=generate;$('cancelBill').onclick=cancelBill;$('whatsappBill').onclick=whatsapp;$('downloadPdf').onclick=downloadPdf;$('sharePdf').onclick=sharePdf;BillingPrinter.attach({
  connectButton: $('connectPrinter'),
  printButton: $('printBill'),
  status: $('printerStatus'),
  getReceipt() {
    const b = current();
    if (b?.kind === 'food' && b.status !== 'draft' && !b.dirty && !cancelling.has(b.key)) {
      return message(b, true).replace(/^\*|\*$/gm, '');
    }
    return null;
  }
});$('logout').onclick=()=>{persist();for(const key of [SESSION,'c4b_admin_session','c4b_csv_credentials','c4b_csv_access','c4f_billing_user'])API.clearSession(key);location.reload()};$('commentForm').onsubmit=async e=>{e.preventDefault();const b=current(),form=e.currentTarget,button=form.querySelector('button');if(!b?.id)return;button.disabled=true;try{const remote=await API.request('/bills/'+b.id+'/comments',{token:session.token,method:'POST',data:{body:form.elements.body.value},key:API.uid()});if(b.dirty){b.comments=remote.comments;b.audit=remote.audit}else workspace.bills[b.key]=canonical(remote,b.key);persist();form.reset();renderComments();toast('Comment saved')}catch(ex){status(ex.message)}finally{button.disabled=false}};
window.addEventListener('pagehide',persist);window.addEventListener('online',()=>{syncDrafts();pending();loadMenu();if(archive()&&!$('historyView').hidden)history()});window.addEventListener('storage',e=>{if(session&&e.key===STORE+session.user.id&&!Object.values(workspace.bills).some(b=>b.dirty)){try{workspace=JSON.parse(e.newValue);pruneDrafts();if(!archive()&&current()?.status!=='draft')workspace.active=null;if($('historyView').hidden)render()}catch{}}});setInterval(()=>{
if(session&&billingDay!==today()){
  billingDay=today();pruneDrafts();
  if(historyPeriod==='today'){selectHistoryPeriod('today');if(archive()&&!$('historyView').hidden)history();}
  if(!archive()&&current()?.status==='generated')workspace.active=null;
  persist();
  if($('historyView').hidden)render();
  pending();
}
const b=current();if(b&&b.status==='generated'&&locked(b)&&!$('table').disabled){if(b.dirty){b.conflict='Edit window expire ho gayi. Unsaved local changes naya draft bana kar rakh sakte hain.';persist();renderConflict()}renderCart();renderMenu()}},1000);
const installButtons=document.querySelectorAll('[data-install-billing]');
let installPrompt;
function hideInstall(){installPrompt=null;installButtons.forEach(button=>button.hidden=true)}
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  installPrompt=event;
  installButtons.forEach(button=>button.hidden=false);
});
installButtons.forEach(button=>button.onclick=async()=>{
  const prompt=installPrompt;
  if(!prompt)return;
  hideInstall();
  await prompt.prompt();
});
window.addEventListener('appinstalled',hideInstall);
if('serviceWorker' in navigator&&window.top===window){
  navigator.serviceWorker.register('./sw.js').catch(error=>console.warn('Billing service worker:',error));
}
(async()=>{await API.init();if(API.isCSV?.()){$('csvAccessField').hidden=false;$('csvAccessNote').hidden=false}const s=API.session(SESSION)||API.session('c4b_admin_session');if(!s)return;try{const me=await API.request('/me',{token:s.token});serverOffset=me.server_now*1000-Date.now();await show({...s,user:me.user})}catch(e){if(e.status!==401&&e.status!==403){await show(s);status('Offline mode: pending drafts device se restored. Generate/sync karne ke liye service reconnect karein.')}else{API.clearSession(SESSION);API.clearSession('c4b_admin_session');API.clearSession('c4b_csv_credentials');$('loginError').textContent=e.message}}})();
})();
