#!/usr/bin/env python3
"""Keep a lightweight food-ordering banner at the top of public HTML pages."""
from pathlib import Path
import re
import json

ROOT = Path(__file__).resolve().parents[1]
BANNER = '''<!-- Call4Thali topbar -->
<aside class="c4a-food-topbar" aria-label="Tiffin and food ordering"><div class="c4a-food-topbar-inner"><div class="c4a-food-topbar-copy"><a href="tiffin-center-kukas.html">Call4Thali · Tiffin &amp; Khana</a><span>Vegetarian meals · Kukas &amp; nearby areas</span></div><div class="c4a-food-topbar-actions"><a href="tiffin-center-kukas.html">Menu dekhein</a><a class="c4a-food-order" href="https://wa.me/917737353588?text=Hello%20Call4All%2C%20mujhe%20tiffin%20ya%20khana%20order%20karna%20hai.%20Please%20menu%20aur%20delivery%20confirm%20karein." target="_blank" rel="noopener">Order on WhatsApp</a></div></div></aside>
<!-- /Call4Thali topbar -->'''

def public_page(path, source):
    return ('assets/css/style.css' in source
            and not re.search(r'(?:admin|billing|^staff\.html$)', path.name)
            and not re.search(r'http-equiv=["\']refresh', source, re.I))

count = 0
for path in ROOT.glob('*.html'):
    source = path.read_text()
    if not public_page(path, source):
        continue
    source = re.sub(r'\s*<!-- Call4Thali topbar -->.*?<!-- /Call4Thali topbar -->', '', source, flags=re.S)
    updated = re.sub(r'(<body\b[^>]*>)', lambda m: m[0] + '\n' + BANNER, source, count=1, flags=re.I)
    if updated != path.read_text():
        path.write_text(updated)
    count += 1
print(f'Food topbar present on {count} public pages.')

# New catalogue pages get the same static banner before the next CI run.
generator = ROOT / 'assets/js/catalog-page-generator.js'
source = generator.read_text()
line = '  const FOOD_TOPBAR = ' + json.dumps(BANNER) + ';\n'
if '  const FOOD_TOPBAR = ' in source:
    source = re.sub(r'  const FOOD_TOPBAR = .*?;\n', lambda _: line, source, count=1)
else:
    source = source.replace("  'use strict';\n", "  'use strict';\n" + line, 1)
source = source.replace('<body><div id="site-header">', '<body>${FOOD_TOPBAR}<div id="site-header">')
generator.write_text(source)
