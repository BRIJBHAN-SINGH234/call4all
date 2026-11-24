async function invoiceTests(w){
 const assert=(v,m)=>{if(!v)throw Error(m)},wait=async fn=>{for(let n=0;n<800;n++){if(fn())return;await new Promise(r=>setTimeout(r,25))}throw Error('Invoice UI timeout')},d=w.document,api=w.BillingAPI,token=api.session('c4b_staff_session').token;
 d.getElementById('newFood').click();
 assert(d.getElementById('tax').value==='5'&&d.getElementById('tax').readOnly,'Food defaults to fixed GST 5%');
 const change=(id,value)=>{const el=d.getElementById(id);el.value=value;el.dispatchEvent(new w.Event('input'))};
 change('table','DEMO-1');change('customer','Demo Customer');change('phone','9000000001');
 d.querySelector('[data-id="f1"][data-variant="Full"]').click();change('discount','0.01');
 assert(d.getElementById('downloadPdf').disabled,'Draft cannot be exported as issued invoice');
 const realOpen=w.open;let autoTextURL=null,chatClosed=false;
 w.open=(url)=>{assert(url==='about:blank','Chat window reserved during Generate click');return{opener:w,closed:false,location:{replace:url=>{autoTextURL=url}},close:()=>{chatClosed=true}}};
 const request=api.request;
 try{
  api.request=(route,options)=>(route.endsWith('/generate')||options?.data?.generate===true)?Promise.reject(new Error('Invoice test generation failed')):request(route,options);
  d.getElementById('generateBill').click();await wait(()=>d.getElementById('status').textContent==='Invoice test generation failed');
  assert(chatClosed&&autoTextURL===null&&!d.getElementById('generateBill').hidden,'Failed generation closes reserved chat without text invoice');
  api.request=request;chatClosed=false;
  d.getElementById('generateBill').click();await wait(()=>d.getElementById('generateBill').hidden&&autoTextURL!==null);
 }finally{api.request=request;w.open=realOpen}
 assert(!chatClosed&&autoTextURL.startsWith('https://wa.me/919000000001?text='),'Successful generation opens customer text chat');
 const autoMessage=new URL(autoTextURL).searchParams.get('text');
 for(const value of ['Call4All','Call4Food','C4f_RES_001','08GVGPK0382E1ZL','GST (5%): ₹1.00','₹20.99','PDF bill chahiye'])assert(autoMessage.includes(value),'Generated WhatsApp text includes '+value);
 const id=JSON.parse(w.localStorage.getItem('c4b_workspace_v2:'+api.session('c4b_staff_session').user.id)).active;
 const state=JSON.parse(w.localStorage.getItem('c4b_workspace_v2:'+api.session('c4b_staff_session').user.id)),bill=state.bills[id];
 assert(bill.tax_bps===500&&bill.tax_cents===100&&bill.total_cents===2099,'Persisted GST rounds paise after discount');
 assert(d.getElementById('total').textContent==='₹20.99','Visible total matches saved invoice');
 const pdf=w.BillingInvoice.create(bill);assert(pdf.totals.total===bill.total_cents,'PDF total matches persisted bill');assert((await pdf.blob.text()).startsWith('%PDF-'),'PDF bytes generated');
 let captured=null,downloads=0;
 const actualClick=w.HTMLAnchorElement.prototype.click,originalOpen=w.open;
 w.HTMLAnchorElement.prototype.click=function(){if(this.download)downloads++;else actualClick.call(this)};
 w.open=url=>{captured={textURL:url};return null};
 d.getElementById('whatsappBill').click();assert(captured.textURL===autoTextURL,'Text button opens same saved bill and customer directly');
 captured=null;w.open=()=>{throw Error('PDF request must use file sharing, not a text popup')};
 const canShare=Object.getOwnPropertyDescriptor(w.navigator,'canShare'),share=Object.getOwnPropertyDescriptor(w.navigator,'share');
 const set=(key,value)=>Object.defineProperty(w.navigator,key,{value,configurable:true});
 try{
  set('canShare',({files})=>files.length===1&&files[0].type==='application/pdf');set('share',async data=>{captured=data});
  d.getElementById('sharePdf').click();await wait(()=>captured!==null&&!d.getElementById('sharePdf').disabled);
  assert(captured.files[0].name.endsWith('.pdf')&&!captured.url&&!captured.text,'Share sends an actual PDF attachment without text bill');
  assert(downloads===0,'Native share does not download duplicate');
  set('share',async()=>{throw new w.DOMException('Cancelled','AbortError')});assert(await w.BillingInvoice.share(pdf)==='cancelled'&&downloads===0,'Cancel does not trigger fallback download');
  set('canShare',()=>false);d.getElementById('sharePdf').click();await wait(()=>!d.getElementById('pdfShareFallback').hidden);
  assert(downloads===1,'Unsupported file sharing downloads PDF');assert(d.getElementById('openWhatsAppChat').href==='https://wa.me/919000000001','Fallback chat has correct customer, no text payload');
  set('canShare',()=>true);set('share',async()=>{throw new w.DOMException('Blocked','NotAllowedError')});assert(await w.BillingInvoice.share(pdf)==='downloaded'&&downloads===2,'Denied native sharing provides PDF fallback');
 }finally{w.HTMLAnchorElement.prototype.click=actualClick;w.open=originalOpen;for(const [key,descriptor]of [['canShare',canShare],['share',share]]){if(descriptor)Object.defineProperty(w.navigator,key,descriptor);else delete w.navigator[key]}}
 const historical=await api.request('/bills/old',{token});assert(historical.tax_bps===0&&w.BillingInvoice.totals(historical).total===2000,'Issued old bill tax and total preserved');
 const stale=await api.request('/bills',{token,method:'POST',data:{kind:'food',tax_bps:0},key:crypto.randomUUID()});
 const result=await api.request('/bills/'+stale.id+'/generate',{token,method:'POST',data:{version:stale.version,tax_bps:0,lines:[{item_id:'f1',variant:'Full',qty:1}]},key:crypto.randomUUID()});assert(result.tax_bps===500&&result.total_cents===2100,'CSV adapter enforces GST for older clients too');
 const longBill={...bill,bill_no:'SAMPLE-LONG-001',lines:Array.from({length:300},(_,i)=>({...bill.lines[0],name:'Long item name with serving and spices '+i,qty:i+1}))};
 const long=w.BillingInvoice.create(longBill);assert(long.doc.getNumberOfPages()>5,'300-line invoice paginates');
 let rejected=false;try{w.BillingInvoice.create({...bill,dirty:true})}catch{rejected=true}assert(rejected,'Unsaved bills cannot produce misleading PDFs');
 // Save only synthetic fixture invoices for PDF text and layout inspection.
 for(const [name,invoice]of [['sample',w.BillingInvoice.create({...bill,bill_no:'SAMPLE-C4F-001'} )],['long',long]]){
  const response=await fetch('/__invoice-'+name,{method:'POST',body:invoice.blob});assert(response.ok,'Sample PDF captured');
 }
}
