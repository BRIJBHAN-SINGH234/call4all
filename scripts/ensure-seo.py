#!/usr/bin/env python3
"""Normalize social and technical SEO metadata on canonical public pages."""
from html import escape, unescape
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
ORIGIN = "https://call4all.co.in"
FALLBACK_IMAGE = f"{ORIGIN}/assets/uploads/logo-1783588318460-logo-1778677681106-call4alllogolatest.png"
PAGES = [
    "index.html", "properties.html", "second-hand-items.html", "car-rental-kukas.html",
    "kukas.html", "wedding-services-kukas.html", "flat-rent-kukas-jaipur.html",
    "room-rent-kukas-jaipur.html", "car-decoration-kukas.html",
    "construction-labor-kukas.html", "flower-bouquet-kukas.html",
    "home-tutor-kukas.html", "manpower-supply-kukas.html", "rooms-flats-kukas.html",
    "contact.html", "gallery.html", "about.html",
]


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
