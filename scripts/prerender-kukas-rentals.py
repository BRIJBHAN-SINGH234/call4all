#!/usr/bin/env python3
"""Build Kukas rental landing pages from approved CSV inventory, without dependencies.

Run after updating data/properties.csv. Prices are listed amounts, not market
estimates; rental periods must be confirmed with the provider.
"""
import csv
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://call4all.co.in/'
PAGES = {
    'rooms-flats-kukas.html': ('all', 'Rooms & Flats for Rent in Kukas Jaipur | Call4All', 'Rooms and Flats for Rent in Kukas, Jaipur'),
    'room-rent-kukas-jaipur.html': ('room', 'Room Rent in Kukas Jaipur | Single Rooms, PG & 1RK', 'Rooms, PG and 1RK for Rent in Kukas, Jaipur'),
    'flat-rent-kukas-jaipur.html': ('flat', 'Flats for Rent in Kukas Jaipur | 1, 2 & 3 BHK', '1BHK, 2BHK and 3BHK Flats for Rent in Kukas, Jaipur'),
}
e = lambda value: html.escape(str(value), quote=True)

def category(item):
    title = item['title']
    if re.search(r'\b[123]\s*b\s*h?k\b|\bflat\b', title, re.I):
        return 'flat'
    if re.search(r'\b[12]\s*rk\b|\bpg\b|room|singal', title, re.I):
        return 'room'
    return ''

def in_kukas(item):
    if re.search(r'\bkukas\b', item.get('location', ''), re.I):
        return True
    try:
        return 27.025 <= float(item['latitude']) <= 27.055 and 75.88 <= float(item['longitude']) <= 75.92
    except ValueError:
        return False

with (ROOT / 'data/properties.csv').open() as f:
    inventory = [r for r in csv.DictReader(f) if r['status'].lower() == 'active'
                 and r['approval_status'].lower() == 'approved' and r['property_type'] == 'Lease/Rent'
                 and category(r) and in_kukas(r) and 'day' not in r['title'].lower()]
inventory.sort(key=lambda r: r['timestamp'], reverse=True)

def card(r):
    url = 'property-' + re.sub('[^a-z0-9-]+', '-', r['id'].lower()) + '.html'
    if not (ROOT / url).is_file():
        raise ValueError(f'Missing property detail: {url}')
    price = f"₹{int(float(r['price'])):,}" if r['price'] else 'Ask for price'
    return (f'<article class="market-card"><a href="{e(url)}"><img src="{e(r["image_path"])}" '
            f'alt="{e(r["title"])} in Kukas, Jaipur" width="420" height="315" loading="lazy" decoding="async"></a>'
            f'<div class="market-card-body"><h3><a href="{e(url)}">{e(r["title"])}</a></h3>'
            f'<strong>{price}</strong><p>Kukas, Jaipur · Confirm rent period and availability</p>'
            f'<a class="btn btn-outline-dark btn-sm" href="{e(url)}">Photos &amp; property details</a></div></article>')

for filename, (kind, title, heading) in PAGES.items():
    rows = [r for r in inventory if kind == 'all' or category(r) == kind]
    description = ('Compare ' + ('rooms, PG, 1RK and flats' if kind == 'all' else 'single rooms, PG and 1RK' if kind == 'room' else '1BHK, 2BHK and 3BHK flats')
                   + ' for rent in Kukas, Jaipur near RIICO Industrial Area. View listed prices, photos and property details. Call or WhatsApp Call4All.')
    intro = {
        'all': 'Compare rooms and flats in Kukas for students, working professionals and families. Browse single rooms, PG, 1RK and BHK listings below, then ask about the exact address, rental period and move-in date.',
        'room': 'Looking for a single room, shared room, PG or 1RK in Kukas? Compare room listings below. A 1RK normally combines a room and kitchen; ask whether the bathroom is private and whether the quoted price is per person or for the whole room.',
        'flat': 'Compare 1BHK, 2BHK and 3BHK flats in Kukas for families and people sharing a home. Check the number of separate bedrooms, furnishing, kitchen access and tenant rules before arranging a visit. A 1RK is listed on our rooms page instead.',
    }[kind]
    links = ' · '.join(f'<a href="{name}">{e(data[2])}</a>' for name, data in PAGES.items() if name != filename)
    groups = {}
    for r in rows:
        t = r['title'].lower()
        match = re.search(r'([123])\s*b\s*h?k', t)
        label = match.group(1) + 'BHK / flat' if match else '1RK / 2RK' if re.search(r'[12]\s*rk', t) else 'PG' if re.search(r'\bpg\b', t) else 'Other flat layouts' if category(r) == 'flat' else 'Single / shared room'
        if r['price'] and float(r['price']) > 0:
            groups.setdefault(label, []).append(int(float(r['price'])))
    table = ''.join(f'<tr><th scope="row">{e(label)}</th><td>₹{min(values):,}–₹{max(values):,}</td><td>{len(values)}</td></tr>' for label, values in sorted(groups.items()))
    faqs = [
        ('How much does renting in Kukas cost?', 'The table above summarises listed amounts from approved Call4All properties, rather than a market-wide estimate. Furnishing, sharing and rental period affect the quote. Confirm the current amount and whether it is monthly or per person before paying.'),
        ('How do I find a rental near RIICO Industrial Area or Arya College?', 'Share your workplace or college gate location with Call4All. Ask for the property map pin and compare the actual commute to RIICO Industrial Area, Arya College or your resort shift location. A Kukas address alone does not confirm walking distance.'),
        ('What should I check before booking?', 'Confirm the deposit, electricity and water charges, notice period, furnishing inventory and any brokerage or paperwork charges. Ask about family or bachelor eligibility, visit the property and read the agreement before making a payment.'),
        ('Are meals included with PG or shared rooms?' if kind != 'flat' else 'What does a furnished flat include?',
         'Meals, Wi-Fi, cleaning and laundry depend on the individual PG. Confirm meal timings, sharing occupancy and all extra charges with the provider.' if kind != 'flat' else 'Ask for a written list of beds, wardrobes, appliances, AC and kitchen equipment. Check their condition at the visit and agree on responsibility for repairs.'),
    ]
    faq_html = ''.join(f'<details class="faq-item"><summary>{e(q)}</summary><div class="faq-answer">{e(a)}</div></details>' for q, a in faqs)
    hero_image = rows[0]['image_path'] if rows else 'assets/uploads/call4all-c4-logo.png'
    cards = ''.join(card(r) for r in rows[:6]) or '<p>No matching approved listings in this snapshot. Call to check upcoming options.</p>'
    section = f'''<nav class="service-detail" aria-label="Breadcrumb"><a href="index.html">Home</a> / <a href="kukas.html">Kukas services</a> / {e(heading)}</nav>
<section class="service-hero" style="background-image:url('{e(hero_image)}');">
<span class="hero-eyebrow">Kukas · Jaipur · RIICO Industrial Area</span><h1>{e(heading)}</h1>
<p>Compare property photos and listed prices. Confirm availability and arrange a visit.</p>
<div class="hero-cta"><a href="#rental-listings" class="btn btn-accent">View rental listings</a><a href="tel:+917737353588" class="btn btn-outline">Call +91 7737353588</a></div></section>
<div class="service-detail"><p class="lead">{e(intro)}</p><p>{links}</p>
<h2>Listed rental prices in Kukas</h2><p>This guide uses {len(rows)} approved residential rental listings in our saved inventory. These are advertised amounts, not guaranteed current availability or a market average. Daily stays and commercial properties are excluded.</p>
<div class="seo-table-wrap"><table class="seo-table"><caption>Call4All listed rental amounts — confirm the rental period</caption><thead><tr><th scope="col">Accommodation</th><th scope="col">Listed amount</th><th scope="col">Listings</th></tr></thead><tbody>{table}</tbody></table></div>
<p>Confirm monthly versus daily rent, per-person versus whole-property pricing, deposit and extra charges. Listings can change before a visit.</p>
<h2>Choosing a location near RIICO Industrial Area, Kukas</h2><p>For factory work, share your RIICO unit or gate location. For college accommodation, share the Arya College entrance you use. Resort staff should check shift timings and the return journey. Request the exact map pin; compare the route, transport and water supply during your visit.</p>
<h2>Arrange a property visit</h2><ol><li>Choose a listing and note its property ID.</li><li>Share your budget, move-in date, occupants and preferred area with Call4All.</li><li>Confirm availability, rental period, deposit and visit time with the provider.</li></ol>
<p><a class="btn btn-primary" href="https://wa.me/917737353588?text=Hello%20Call4All%2C%20I%20need%20a%20rental%20in%20Kukas.%20Please%20confirm%20availability%20and%20rent.">WhatsApp your rental requirement</a> <a href="#book">Submit a requirement</a></p></div>
<section class="service-detail property-page-listings" id="rental-listings"><h2>Browse {'rooms, PG and 1RK' if kind == 'room' else 'BHK flats' if kind == 'flat' else 'rooms and flats'} in Kukas</h2><p>Saved listing snapshot; call to confirm availability. Open a listing for photos and details.</p>
<div class="property-list-grid" data-property-related="6" data-property-area="kukas" data-property-kind="{kind}">{cards}</div>
<p><a href="properties.html?type=rent#propertyListings">Explore all rental properties and map</a></p></section>
<section class="faq-section" id="faq"><h2 class="section-title">Kukas rental questions</h2><div class="faq-list">{faq_html}</div></section>
'''
    schema = [
        {'@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':[
            {'@type':'ListItem','position':1,'name':'Home','item':BASE},
            {'@type':'ListItem','position':2,'name':'Kukas services','item':BASE+'kukas.html'},
            {'@type':'ListItem','position':3,'name':heading,'item':BASE+filename}]},
        {'@context':'https://schema.org','@type':'CollectionPage','@id':BASE+filename+'#page','url':BASE+filename,'name':heading,'description':description,
         'mainEntity':{'@type':'ItemList','itemListElement':[{'@type':'ListItem','position':i+1,'name':r['title'],'url':BASE+'property-'+r['id']+'.html'} for i,r in enumerate(rows[:6])]}},
    ]
    section += '\n'.join('<script type="application/ld+json">'+json.dumps(s,ensure_ascii=False).replace('<','\\u003c')+'</script>' for s in schema)+'\n\n'
    path = ROOT / filename
    source = path.read_text()
    source = re.sub(r'<title>.*?</title>', '<title>'+e(title)+'</title>', source)
    for attr, value in [('name="description"',description),('property="og:title"',title),('name="twitter:title"',title),('property="og:description"',description),('name="twitter:description"',description),('property="og:image:alt"',heading),('name="twitter:image:alt"',heading)]:
        source = re.sub(r'(<meta '+attr+r' content=")[^"]*(">)',lambda m:m[1]+e(value)+m[2],source)
    image_url = BASE + hero_image
    for attr in ('property="og:image"','property="og:image:secure_url"','name="twitter:image"'):
        source = re.sub(r'(<meta '+attr+r' content=")[^"]*(">)',lambda m:m[1]+e(image_url)+m[2],source)
    start = source.index('<section class="service-hero"') if '<nav class="service-detail" aria-label="Breadcrumb">' not in source else source.index('<nav class="service-detail" aria-label="Breadcrumb">')
    end = source.index('<section class="booking-section"')
    source = source[:start]+section+source[end:]
    source = re.sub(r'<script src="assets/js/seo-local.js"></script>\s*','',source)
    source = source.replace('<link rel="preconnect" href="https://images.unsplash.com">\n','')
    path.write_text(source)
    print(f'{filename}: {len(rows)} matching listings, {min(6,len(rows))} static cards')
