#!/usr/bin/env python3
"""Audit every root HTML page and fail on actionable technical SEO issues."""
from pathlib import Path
from html import unescape
import re

ROOT = Path(__file__).resolve().parent.parent
SITEMAP = (ROOT / "sitemap.xml").read_text()
INDEXABLE_DYNAMIC_TEMPLATES = {
    "property.html", "second-hand-item.html", "handmade-item.html", "menu-item.html"
}
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
titles = {}
canonicals = {}
for filename in files:
    source = (ROOT / filename).read_text()
    if not re.search(r'<html\s+lang="en-IN"', source, re.I):
        errors.append(f"{filename}: missing lang=en-IN")
    if not re.search(r'<link\s+[^>]*rel="canonical"', source, re.I):
        errors.append(f"{filename}: missing canonical")
    for key in required:
        if not re.search(rf'<meta\s+[^>]*(?:name|property)="{re.escape(key)}"[^>]*content="[^"]+"', source, re.I):
            errors.append(f"{filename}: missing {key}")
    title_match = re.search(r"<title[^>]*>(.*?)</title>", source, re.I | re.S)
    title = unescape(re.sub(r"\s+", " ", title_match.group(1)).strip()) if title_match else ""
    description_match = re.search(r'<meta\s+[^>]*name="description"[^>]*content="([^"]+)"', source, re.I)
    description = unescape(description_match.group(1)).strip() if description_match else ""
    canonical_match = re.search(r'<link\s+[^>]*rel="canonical"[^>]*href="([^"]+)"', source, re.I)
    canonical = canonical_match.group(1) if canonical_match else ""
    if not 20 <= len(title) <= 65:
        errors.append(f"{filename}: title length {len(title)} (expected 20-65)")
    if not 70 <= len(description) <= 165:
        errors.append(f"{filename}: description length {len(description)} (expected 70-165)")
    if title in titles:
        errors.append(f"{filename}: duplicate title also used by {titles[title]}")
    titles[title] = filename
    if canonical in canonicals:
        errors.append(f"{filename}: duplicate canonical also used by {canonicals[canonical]}")
    canonicals[canonical] = filename
    if len(re.findall(r"<h1\b", source, re.I)) != 1:
        errors.append(f"{filename}: expected exactly one static h1")

# Operational and legacy pages must never become indexable accidentally.
for filename in INDEXABLE_DYNAMIC_TEMPLATES:
    source = (ROOT / filename).read_text()
    if re.search(r'<meta\s+[^>]*(?:name="robots"|name="googlebot"|name="bingbot")[^>]*content="[^"]*noindex', source, re.I):
        errors.append(f"{filename}: valid dynamic product template must not ship with noindex")

for path in ROOT.glob("*.html"):
    if path.name in files or path.name in INDEXABLE_DYNAMIC_TEMPLATES or path.name == "googleb71665e6b1f52ee2.html":
        continue
    source = path.read_text()
    if not re.search(r'<meta\s+[^>]*name="robots"[^>]*content="[^"]*noindex', source, re.I):
        errors.append(f"{path.name}: non-canonical page must be noindex")

# Catch broken relative links across all frontend HTML.
for path in ROOT.glob("*.html"):
    source = path.read_text()
    for href in re.findall(r'href=["\']([^"\']+)', source, re.I):
        target = href.split("#", 1)[0].split("?", 1)[0]
        if target and not re.match(r"^(?:https?:|mailto:|tel:|javascript:|/)", target) and not (ROOT / target).exists():
            errors.append(f"{path.name}: broken relative link {href}")
if errors:
    raise SystemExit("\n".join(errors))
print(f"SEO audit passed for {len(files)} canonical public pages.")
