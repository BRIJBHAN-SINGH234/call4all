/* Local, vector PDF invoices. No bill details are uploaded to a PDF service. */
(()=>{
'use strict';
const business=Object.freeze({brand:'Call4All',subBrand:'Call4Food',branch:'C4f_RES_001',gstin:'08GVGPK0382E1ZL',legalName:'AKANKSHA KANWAR',address:'Plot No. 60, Shyam Vatika -2, Modi Road, Kukas, Jaipur, Rajasthan 302028',phone:'7737353588'});
const money=c=>'₹'+(Number(c||0)/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
function totals(b){const subtotal=b.lines.reduce((s,x)=>s+x.price_cents*x.qty,0),discount=Number(b.discount_cents||0),base=Math.max(0,subtotal-discount),tax=Math.floor((base*Number(b.tax_bps||0)+5000)/10000);return{subtotal,discount,base,tax,total:base+tax}}
const date=t=>t?new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}).format(new Date(t*1000))+' IST':'—';
function create(b){
 if(!b||!['generated','cancelled'].includes(b.status)||b.dirty)throw Error('Pehle generated bill ke changes save karein.');
 if(!window.jspdf?.jsPDF||!window.BillingInvoiceFont)throw Error('PDF tools load nahi hue. Page refresh karein.');
 const doc=new window.jspdf.jsPDF({unit:'mm',format:'a4',compress:true,putOnlyUsedFonts:true});
 doc.addFileToVFS('Invoice.ttf',window.BillingInvoiceFont);doc.addFont('Invoice.ttf','Invoice','normal');
 doc.setProperties({title:business.subBrand+' Bill '+b.bill_no,author:business.brand,subject:'Customer bill • '+business.branch});
 const t=totals(b),left=16,right=194,bottom=266;let y=0;
 const write=(s,x,y,size=9,options={})=>{doc.setFont('Invoice','normal');doc.setFontSize(size);doc.setTextColor(35,43,39);doc.text(String(s??''),x,y,options)};
 const muted=(s,x,y,size=8,options={})=>{doc.setFont('Invoice','normal');doc.setFontSize(size);doc.setTextColor(102,108,102);doc.text(String(s??''),x,y,options)};
 const line=y=>{doc.setDrawColor(224,225,218);doc.setLineWidth(.2);doc.line(left,y,right,y)};
 const paragraph=(s,width,size=9)=>{doc.setFont('Invoice','normal');doc.setFontSize(size);return doc.splitTextToSize(String(s??''),width)};
 function heading(section='first'){
  // White invoice sheet, warm neutral panels and a restrained gold accent.
  // All decoration stays inside the printable margins.
  doc.setFillColor(250,249,246);doc.rect(0,0,210,297,'F');
  doc.setFillColor(255,255,255);doc.setDrawColor(232,230,221);doc.roundedRect(10,10,190,277,2,2,'FD');
  doc.setFillColor(249,246,237);doc.roundedRect(left,16,right-left,33,2,2,'F');
  doc.setFillColor(210,163,53);doc.rect(left,20,1.2,25,'F');
  doc.setFont('helvetica','bold');doc.setTextColor(47,53,45);doc.setFontSize(10);doc.text(business.brand,left+5,25);
  doc.setFontSize(23);doc.text(business.subBrand,left+5,35);
  muted('Good Food • Great Mood',left+5,43,8);
  write(b.status==='cancelled'?'CANCELLED BILL':'CUSTOMER BILL',right-5,27,12,{align:'right'});
  muted('Branch: '+business.branch,right-5,35,8,{align:'right'});
  muted('call4all.co.in  |  '+business.phone,right-5,42,7,{align:'right'});
  write('GSTIN: '+business.gstin,left,57,9);
  muted('Legal name: '+business.legalName,right,57,7,{align:'right'});
  const address=paragraph(business.address,178,8);muted(address,left,63,8);
  const metaTop=65+address.length*4;line(metaTop);
  muted('BILL NUMBER',left,metaTop+7,7);muted('BILL DATE',right,metaTop+7,7,{align:'right'});
  write(b.bill_no,left,metaTop+14,10);write(date(b.generated_at),right,metaTop+14,8,{align:'right'});
  y=metaTop+23;
  if(section==='first'){
   const names=paragraph(b.customer||'Walk-in customer',119,10),table=paragraph(b.table||'—',33,10);
   const customerHeight=Math.max(names.length,table.length)*4.5;
   const boxHeight=customerHeight+14+(b.phone?6:0);
   doc.setFillColor(247,248,245);doc.roundedRect(left,y-4,right-left,boxHeight,2,2,'F');
   muted('BILL TO',left+4,y+2,7);muted('TABLE',right-4,y+2,7,{align:'right'});
   write(names,left+4,y+8,10);write(table,right-4,y+8,10,{align:'right'});
   if(b.phone)muted('Phone: '+b.phone,left+4,y+9+customerHeight,8);
   y+=boxHeight+5;
  }else{muted(section==='summary'?'Bill summary':'Items continued',left,y,8);y+=8}
  if(section!=='summary'){
   doc.setFillColor(243,233,208);doc.roundedRect(left,y-5,right-left,10,1,1,'F');
   write('Item / Serving',left+3,y+1,9);write('Qty',128,y+1,9,{align:'right'});write('Rate',157,y+1,9,{align:'right'});write('Amount',right-3,y+1,9,{align:'right'});y+=12;
  }
 }
 function newPage(section='items'){doc.addPage();heading(section)}
 heading();
 for(const [i,x] of b.lines.entries()){
  const name=paragraph((i+1)+'. '+x.name+' ('+x.variant+')',99,9),height=Math.max(11,name.length*4.5+5);
  if(y+height>bottom)newPage();
  if(i%2===0){doc.setFillColor(251,251,248);doc.rect(left,y-4,right-left,height,'F')}
  // Item names wrap independently of the aligned quantity and price columns.
  write(name,left+3,y+1,9);write(x.qty,128,y+1,9,{align:'right'});write(money(x.price_cents),157,y+1,9,{align:'right'});write(money(x.price_cents*x.qty),right-3,y+1,9,{align:'right'});y+=height;line(y-4);
 }
 if(y+66>bottom)newPage('summary');
 y+=5;
 const summaryTop=y;
 doc.setFillColor(248,248,244);doc.roundedRect(108,summaryTop-5,86,48,2,2,'F');
 for(const [label,amount] of [['Subtotal',t.subtotal],['Discount',t.discount],['Taxable amount',t.base],['GST ('+Number(b.tax_bps||0)/100+'%)',t.tax]]){write(label,112,y,9);write(money(amount),right-3,y,10,{align:'right'});y+=7}
 doc.setFillColor(243,233,208);doc.roundedRect(108,y-3,86,13,1.5,1.5,'F');write(b.status==='cancelled'?'Original total':'Total payable',112,y+5,10);write(money(t.total),right-3,y+5,12,{align:'right'});y+=22;
 write('Thank you for choosing '+business.subBrand+'!',left,y,9);
 const pages=doc.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);line(276);muted('Call4All • Call4Food | '+business.phone+' | call4all.co.in',left,282,7);muted(i+' / '+pages,right,282,7,{align:'right'})}
 const filename='Call4Food-'+String(b.bill_no||b.id).replace(/[^a-zA-Z0-9_-]/g,'-')+(b.status==='cancelled'?'-Cancelled':'')+'.pdf';
 return{doc,filename,blob:doc.output('blob'),totals:t};
}
function download(invoice){const url=URL.createObjectURL(invoice.blob),a=document.createElement('a');a.href=url;a.download=invoice.filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
async function share(invoice){
 const file=new File([invoice.blob],invoice.filename,{type:'application/pdf'});
 try{
  if(navigator.share&&navigator.canShare?.({files:[file]})){
   await navigator.share({files:[file],title:'Call4Food customer bill'});return'shared';
  }
 }catch(e){if(e.name==='AbortError')return'cancelled'}
 download(invoice);return'downloaded';
}
function chatURL(phone){const number=String(phone||'').replace(/\D/g,'');return /^\d{10}$/.test(number)?'https://wa.me/91'+number:/^91\d{10}$/.test(number)?'https://wa.me/'+number:'https://web.whatsapp.com/'}
window.BillingInvoice=Object.freeze({business,totals,create,download,share,chatURL});
})();
