#!/usr/bin/env python3
"""Normalize social and technical SEO metadata on canonical public pages."""
from html import escape, unescape
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
ORIGIN = "https://call4all.co.in"
FALLBACK_IMAGE = f"{ORIGIN}/assets/uploads/call4all-c4-logo.png"
PAGES = [
    "index.html", "properties.html", "second-hand-items.html", "car-rental-kukas.html",
    "kukas.html", "wedding-services-kukas.html", "flat-rent-kukas-jaipur.html",
    "room-rent-kukas-jaipur.html", "car-decoration-kukas.html",
    "construction-labor-kukas.html", "flower-bouquet-kukas.html",
    "home-tutor-kukas.html", "manpower-supply-kukas.html", "rooms-flats-kukas.html",
    "contact.html", "gallery.html", "about.html", "handmade-items.html", "handmade-item.html",
]

OVERRIDES = {
    "index.html": ("Call4All Jaipur | Property, Rentals & Local Services", "Find property, rental cars, rooms, second-hand items and trusted local services in Jaipur. Call or WhatsApp Call4All for quick assistance."),
    "about.html": ("About Call4All | Jaipur Local Service Platform", "Learn how Call4All connects Jaipur customers with local providers for property, rentals, tutors, labour, weddings and other everyday services."),
    "contact.html": ("Contact Call4All Jaipur | Call, WhatsApp or Enquire", "Contact Call4All by phone, WhatsApp, email or enquiry form for property, rentals and local services across Kukas and Jaipur."),
    "gallery.html": ("Call4All Service Gallery | Jaipur & Kukas", "View photos from Call4All services in Jaipur, including rental cars, rooms, construction, weddings, decoration and manpower work."),
    "kukas.html": ("Local Services in Kukas Jaipur | Call4All", "Find car rentals, rooms, wedding services, tutors, construction labour and manpower in Kukas, Jaipur through one local contact."),
    "car-rental-kukas.html": ("Car Rental in Kukas Jaipur | Taxi & Self Drive", "Book verified taxis, driver cars and self-drive rentals in Kukas, Jaipur for airport trips, local travel, weddings and outstation journeys."),
    "rooms-flats-kukas.html": ("Rooms & Flats for Rent in Kukas Jaipur", "Find verified rooms, PGs and 1BHK to 3BHK flats for rent near NH-48, Arya College, factories and resorts in Kukas, Jaipur."),
    "room-rent-kukas-jaipur.html": ("Room Rent in Kukas Jaipur | PG & Bachelor Rooms", "Find single rooms, shared rooms and PG accommodation near Arya College, factories and resorts in Kukas, Jaipur. Connect with verified owners."),
    "flat-rent-kukas-jaipur.html": ("Flat Rent in Kukas Jaipur | 1BHK, 2BHK & 3BHK", "Explore furnished and unfurnished 1BHK, 2BHK and 3BHK flats for rent near NH-48, Arya College and the Kukas resort belt."),
    "wedding-services-kukas.html": ("Wedding Services in Kukas Jaipur | Call4All", "Plan a Kukas resort wedding with local support for decoration, catering, photography, flowers, guest transport and event staff."),
    "car-decoration-kukas.html": ("Wedding Car Decoration in Kukas Jaipur", "Book fresh-flower, ribbon and themed wedding car decoration for dulha, dulhan and baraat vehicles at Kukas resorts and Jaipur venues."),
    "construction-labor-kukas.html": ("Construction Labour in Kukas | Mistri & Thekedar", "Hire mistri, mazdoor, contractors, painters, plumbers and electricians in Kukas, Jaipur for daily work, renovation or full projects."),
    "flower-bouquet-kukas.html": ("Flower Bouquet Delivery in Kukas Jaipur", "Order fresh bouquets, hotel-room decoration and event flowers in Kukas, Jaipur for birthdays, anniversaries, weddings and gifts."),
    "home-tutor-kukas.html": ("Home Tutor in Kukas Jaipur | CBSE, RBSE & Exams", "Find home tutors in Kukas for Classes 1–12, CBSE, RBSE, Maths, Science, English, NEET and JEE with flexible timings."),
    "manpower-supply-kukas.html": ("Manpower Supply in Kukas Jaipur | Local Staff", "Hire skilled and unskilled staff for Kukas factories, resorts, hotels, warehouses, weddings and events on daily or contract terms."),
    "properties.html": ("Property for Sale & Rent in Kukas Jaipur | Call4All", "Browse approved property for sale, rent and lease near Kukas, Jaipur. Compare photos, prices, dimensions and map locations."),
    "second-hand-items.html": ("Second-Hand Items in Kukas Jaipur | Call4All", "Browse approved used furniture, electronics and appliances in Kukas and Jaipur. Check photos, condition and price, then enquire on WhatsApp."),
    "handmade-items.html": ("Handmade Items in Jaipur | Local Artisan Products", "Discover handmade gifts, jewellery, pottery and home decor from local artisans in Kukas and Jaipur, with prices and WhatsApp ordering."),
}


def meta_value(source, key):
    match = re.search(rf'<meta\s+[^>]*(?:name|property)=["\']{re.escape(key)}["\'][^>]*>', source, re.I)
    if not match:
        return ""
    value = re.search(r'content=(["\'])(.*?)\1', match.group(), re.I | re.S)
    return unescape(value.group(2)) if value else ""


def set_meta(source, key, value, prop=False):
    pattern = rf'<meta\s+[^>]*(?:name|property)=["\']{re.escape(key)}["\'][^>]*>'
    tag = f'<meta {"property" if prop else "name"}="{key}" content="{escape(value, quote=True)}">'
    return re.sub(pattern, tag, source, count=1, flags=re.I) if re.search(pattern, source, re.I) else source.replace("</head>", f"{tag}\n</head>")


def set_link(source, rel, href, hreflang=None):
    if hreflang:
        pattern = rf'<link\s+(?=[^>]*hreflang=["\']{re.escape(hreflang)}["\'])[^>]*rel=["\']{rel}["\'][^>]*>'
        tag = f'<link rel="{rel}" href="{href}" hreflang="{hreflang}">'
    else:
        pattern = rf'<link\s+[^>]*rel=["\']{rel}["\'][^>]*>'
        tag = f'<link rel="{rel}" href="{href}">'
    return re.sub(pattern, tag, source, count=1, flags=re.I) if re.search(pattern, source, re.I) else source.replace("</head>", f"{tag}\n</head>")


for filename in PAGES:
    path = ROOT / filename
    source = path.read_text()
    title_match = re.search(r'<title>(.*?)</title>', source, re.I | re.S)
    title = unescape(title_match.group(1).strip()) if title_match else "Call4All"
    description = meta_value(source, "description")
    if filename in OVERRIDES:
        title, description = OVERRIDES[filename]
        source = re.sub(r'<title>.*?</title>', f"<title>{escape(title)}</title>", source, count=1, flags=re.I | re.S)
        source = set_meta(source, "description", description)
    if not description:
        raise ValueError(f"{filename}: meta description is required")
    url = f"{ORIGIN}/" if filename == "index.html" else f"{ORIGIN}/{filename}"
    social_title = meta_value(source, "og:title") or title
    social_description = meta_value(source, "og:description") or description
    image = meta_value(source, "og:image") or FALLBACK_IMAGE
    image_alt = f"{social_title} — Call4All"

    source = re.sub(r'<html(?:\s+lang=["\'][^"\']*["\'])?', '<html lang="en-IN"', source, count=1, flags=re.I)
    standard = {
        "description": description,
        "robots": "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        "googlebot": "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        "bingbot": "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        "author": "Call4All", "theme-color": "#1e3c72", "format-detection": "telephone=yes",
    }
    for key, value in standard.items():
        source = set_meta(source, key, value)
    source = set_link(source, "canonical", url)
    source = set_link(source, "alternate", url, "en-IN")
    source = set_link(source, "alternate", url, "x-default")

    og = {
        "og:type": "website", "og:site_name": "Call4All", "og:locale": "en_IN",
        "og:title": social_title, "og:description": social_description, "og:url": url,
        "og:image": image, "og:image:secure_url": image, "og:image:alt": image_alt,
    }
    twitter = {
        "twitter:card": "summary_large_image", "twitter:title": social_title,
        "twitter:description": social_description, "twitter:image": image,
        "twitter:image:alt": image_alt,
    }
    for key, value in og.items():
        source = set_meta(source, key, value, True)
    for key, value in twitter.items():
        source = set_meta(source, key, value)
    path.write_text(source)

print(f"SEO metadata normalized on {len(PAGES)} public pages.")

# Detail templates start noindex so empty or invalid query-string URLs cannot be
# indexed. Their client-side renderers switch valid, approved records to index.
for filename in ("property.html", "second-hand-item.html", "handmade-item.html"):
    path = ROOT / filename
    source = path.read_text()
    source = set_meta(source, "robots", "noindex,follow")
    path.write_text(source)
