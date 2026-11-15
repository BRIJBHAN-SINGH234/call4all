/* Local, vector PDF invoices. No bill details are uploaded to a PDF service. */
(()=>{
'use strict';
const business=Object.freeze({brand:'Call4All',subBrand:'Call4Food',branch:'C4f_RES_001',gstin:'08GVGPK0382E1ZL',legalName:'AKANKSHA KANWAR',address:'Plot No. 60, Shyam Vatika -2, Modi Road, Kukas, Jaipur, Rajasthan 302028',phone:'7737353588'});
const money=c=>'₹'+(Number(c||0)/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
function totals(b){const subtotal=b.lines.reduce((s,x)=>s+x.price_cents*x.qty,0),discount=Number(b.discount_cents||0),base=Math.max(0,subtotal-discount),tax=Math.floor((base*Number(b.tax_bps||0)+5000)/10000);return{subtotal,discount,base,tax,total:base+tax}}
const date=t=>t?new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}).format(new Date(t*1000))+' IST':'—';
function create(b){
 if(!b||b.status!=='generated'||b.dirty)throw Error('Pehle generated bill ke changes save karein.');
 if(!window.jspdf?.jsPDF||!window.BillingInvoiceFont)throw Error('PDF tools load nahi hue. Page refresh karein.');
 const doc=new window.jspdf.jsPDF({unit:'mm',format:'a4',compress:true,putOnlyUsedFonts:true});
 doc.addFileToVFS('Invoice.ttf',window.BillingInvoiceFont);doc.addFont('Invoice.ttf','Invoice','normal');
 doc.setProperties({title:business.subBrand+' Bill '+b.bill_no,author:business.brand,subject:'Customer bill • '+business.branch});
 const t=totals(b),left=16,right=194,bottom=271;let y=0;
 const write=(s,x,y,size=9,options={})=>{doc.setFont('Invoice','normal');doc.setFontSize(size);doc.setTextColor(25,39,33);doc.text(String(s??''),x,y,options)};
 const line=y=>{doc.setDrawColor(218,223,217);doc.setLineWidth(.2);doc.line(left,y,right,y)};
 const paragraph=(s,x,width,size=9)=>{doc.setFont('Invoice','normal');doc.setFontSize(size);return doc.splitTextToSize(String(s??''),width)};
 function heading(continued=false){
  doc.setFillColor(18,38,32);doc.rect(0,0,210,31,'F');doc.setFont('helvetica','bold');doc.setFontSize(21);doc.setTextColor(255,255,255);doc.text(business.brand,left,14);doc.setFontSize(11);doc.setTextColor(245,190,53);doc.text(business.subBrand,left,23);doc.setFontSize(10);doc.text('CUSTOMER BILL',right,14,{align:'right'});doc.setFontSize(8);doc.text('Branch: '+business.branch,right,23,{align:'right'});
  write('GSTIN: '+business.gstin,left,39,10);write('Legal name: '+business.legalName,left,45,8);
  const address=paragraph(business.address,0,178,8);write(address,left,51,8);y=51+address.length*4;
  write('Bill: '+b.bill_no,left,y+4,10);write(date(b.generated_at),right,y+4,8,{align:'right'});y+=12;
  if(!continued){
   const info=[b.kind==='food'?'Table: '+(b.table||'—'):null,'Customer: '+(b.customer||'Walk-in customer'),b.phone?'Phone: '+b.phone:null].filter(Boolean);
   for(const s of info){const parts=paragraph(s,0,178,9);write(parts,left,y,9);y+=parts.length*4.5+2}
  }else{write('Items continued',left,y,8);y+=7}
  y+=3;doc.setFillColor(237,241,234);doc.rect(left,y-5,right-left,9,'F');write('Item / Serving',left+2,y,9);write('Qty',128,y,9,{align:'right'});write('Rate',157,y,9,{align:'right'});write('Amount',right-2,y,9,{align:'right'});y+=10;
 }
 function newPage(){doc.addPage();heading(true)}
 heading();
 for(const [i,x] of b.lines.entries()){
  const name=paragraph((i+1)+'. '+x.name+' ('+x.variant+')',0,99,9),height=Math.max(10,name.length*4.5+4);
  if(y+height>bottom)newPage();
  // The input limits keep a single item below one page; split long words too.
  write(name,left+2,y,9);write(x.qty,128,y,9,{align:'right'});write(money(x.price_cents),157,y,9,{align:'right'});write(money(x.price_cents*x.qty),right-2,y,9,{align:'right'});y+=height;line(y-4);
 }
 if(y+65>bottom)newPage();
 y+=5;
 for(const [label,amount] of [['Subtotal',t.subtotal],['Discount',t.discount],['Taxable amount',t.base],['GST ('+Number(b.tax_bps||0)/100+'%)',t.tax]]){write(label,112,y,9);write(money(amount),right-2,y,10,{align:'right'});y+=7}
 doc.setFillColor(237,241,234);doc.rect(108,y-5,86,12,'F');write('Total payable',112,y+2,11);write(money(t.total),right-2,y+2,12,{align:'right'});y+=18;
 write('Thank you for choosing '+business.subBrand+'!',left,y,10);
 const pages=doc.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);line(281);write('Call4All • Call4Food | '+business.phone+' | call4all.co.in',left,287,8);write(i+' / '+pages,right,287,8,{align:'right'})}
 const filename='Call4Food-'+String(b.bill_no||b.id).replace(/[^a-zA-Z0-9_-]/g,'-')+'.pdf';
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
