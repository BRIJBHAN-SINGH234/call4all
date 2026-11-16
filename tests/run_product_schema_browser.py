#!/usr/bin/env python3
"""Exercise rendered product schemas with real CSVs and malformed-price fixtures.
Requires Chrome and the standard-library chrome_driver in this directory.
"""
import csv
import json
import os
import re
import tempfile
from pathlib import Path

from chrome_driver import browser_test

ROOT = Path(__file__).resolve().parents[1]
BROWSER = os.environ.get('CHROME_BIN', '/usr/bin/google-chrome')
CASES = [
    ('second-hand-items.html', 'second-hand.js', 'second-hand-items', None),
    ('second-hand-used-1787813642121.html', 'second-hand.js', 'second-hand-items', 'secondHandDetail'),
    ('building-materials-jaipur.html', 'building-materials.js', 'building-materials', None),
    ('car-rental-kukas.html', 'rental-cars-catalog.js', 'rental-cars', None),
]
CHECK = r"""
const assert=(condition,message)=>{if(!condition)throw Error(message)};
const products=[];
function walk(value){
 if(Array.isArray(value)){value.forEach(walk);return}
 if(!value||typeof value!=='object')return;
 const types=[value['@type']].flat();
 if(types.includes('Product')||types.includes('Vehicle')){
  products.push(value);
  const offers=[value.offers].flat();
  assert(offers.length&&offers.every(o=>o&&o.price!==undefined&&o.price!==null&&/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(String(o.price).trim())&&o.priceCurrency==='INR'),'Product lacks valid own INR offer: '+value.name);
  assert(!value.review&&!value.aggregateRating,'Invented reviews');
 }
 Object.values(value).forEach(walk);
}
function check(doc){doc.querySelectorAll('script[type="application/ld+json"]').forEach(s=>walk(JSON.parse(s.textContent)))}
"""

def run(page, script, dataset, mount, invalid):
    rows = list(csv.DictReader((ROOT / 'data' / (dataset + '.csv')).open()))
    if invalid:
        for index, row in enumerate(rows):
            row['price'] = ['', ' ', 'on request', '-1', 'NaN', 'Infinity'][index % 6]
    source = (ROOT / page).read_text()
    source = re.sub(r'<script\b(?![^>]*type="application/ld\+json")[^>]*>.*?</script>', '', source, flags=re.S | re.I)
    source = re.sub(r'<link[^>]+(?:stylesheet|preconnect)[^>]*>', '', source)
    setup = 'window.fixtureErrors=[];window.addEventListener("error",e=>fixtureErrors.push(e.message));window.addEventListener("unhandledrejection",e=>fixtureErrors.push(String(e.reason)));'
    setup += 'window.CsvAPI={loadAllPublic:async()=>({items:'+json.dumps(rows)+'})};'
    if mount:
        setup += 'document.getElementById('+json.dumps(mount)+').dataset.catalogId='+json.dumps(rows[0]['id'])+';'
    code = (ROOT / 'assets/js' / script).read_text()
    code += '\n' + (ROOT / 'assets/js/catalog-page-generator.js').read_text()
    assertions = CHECK + '''
assert(!fixtureErrors.length,fixtureErrors.join('; '));check(document);
if(INVALID||PAGE==='handmade-items.html'||PAGE==='car-rental-kukas.html')assert(products.length===0,'Unexpected product rich-result markup');
else assert(products.length>0,'Priced products missing');
if(PAGE==='car-rental-kukas.html')assert(!document.querySelector('[itemtype="https://schema.org/Vehicle"]'),'Vehicle microdata remains');
for(const kind of ['handmade','second-hand','property']){
 for(const amount of ['80.50',0,'0','',null,undefined,' ','Ask for price',-1,Infinity,'NaN']){
  products.length=0;
  const content=CatalogPageGenerator.html(kind,{id:'fixture',title:'Schema test',price:amount});
  const doc=new DOMParser().parseFromString(content,'text/html');check(doc);
  const priced=amount===0||amount==='0'||amount==='80.50';
  assert(products.length===(kind!=='property'&&priced?1:0),'Generated schema price handling: '+kind+' / '+amount);
  assert(!!doc.querySelector('meta[property="product:price:amount"]')===(kind!=='property'&&priced),'Incorrect generated price metadata');
 }
}
'''.replace('INVALID', str(invalid).lower()).replace('PAGE', json.dumps(page))
    ending = '<script>'+setup+'</script><script>'+code.replace('</script', '<\\/script')+'</script>'
    ending += '<script>document.addEventListener("DOMContentLoaded",()=>setTimeout(()=>{try{'+assertions+';document.body.dataset.tests="PASS: product schemas"}catch(e){document.body.dataset.tests="FAIL: "+e.message}},400));</script>'
    source = source.replace('</body>', ending + '</body>')
    with tempfile.TemporaryDirectory(prefix='c4a-schema-') as d:
        path = Path(d, 'fixture.html')
        path.write_text(source)
        message, dom = browser_test(BROWSER, Path(d, 'profile'), path.as_uri(), timeout=20)
        if not message.startswith('PASS:'):
            Path('/tmp/c4a-product-schema-failure.html').write_text(dom)
            raise AssertionError(f'{page}, invalid={invalid}: {message}')
        print(f'PASS: {page}, '+('malformed prices' if invalid else 'live prices'), flush=True)

# Paused handmade routes must stay unavailable even with a product query string.
for name in ('handmade-items.html', 'handmade-item.html'):
    content = (ROOT / name).read_text()
    assert 'content="noindex,follow"' in content
    assert 'temporarily unavailable' in content
    assert 'assets/js/handmade.js' not in content and 'application/ld+json' not in content
print('PASS: handmade category and product routes are disabled', flush=True)

for case in CASES:
    for invalid in (False, True):
        run(*case, invalid)
