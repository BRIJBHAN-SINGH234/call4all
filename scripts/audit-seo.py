#!/usr/bin/env python3
"""Fail when canonical public pages lack required SEO metadata."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
SITEMAP = (ROOT / "sitemap.xml").read_text()
files = []
for match in re.finditer(r'<loc>https://call4all\.co\.in/(?:([^?<]+\.html))?(?:\?[^<]*)?</loc>', SITEMAP):
    filename = match.group(1) or "index.html"
    if filename not in files and filename not in {"property.html", "second-hand-item.html"}:
        files.append(filename)
required = [
    "description", "robots", "googlebot", "bingbot", "author", "og:type", "og:site_name",
    "og:locale", "og:title", "og:description", "og:url", "og:image", "og:image:secure_url",
    "og:image:alt", "twitter:card", "twitter:title", "twitter:description", "twitter:image",
    "twitter:image:alt",
]
errors = []
for filename in files:
    source = (ROOT / filename).read_text()
    if not re.search(r'<html\s+lang="en-IN"', source, re.I):
        errors.append(f"{filename}: missing lang=en-IN")
    if not re.search(r'<link\s+[^>]*rel="canonical"', source, re.I):
        errors.append(f"{filename}: missing canonical")
    for key in required:
        if not re.search(rf'<meta\s+[^>]*(?:name|property)="{re.escape(key)}"[^>]*content="[^"]+"', source, re.I):
            errors.append(f"{filename}: missing {key}")
if errors:
    raise SystemExit("\n".join(errors))
print(f"SEO audit passed for {len(files)} canonical public pages.")
