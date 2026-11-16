#!/usr/bin/env python3
"""Optimize tracked images and update local references. Requires Pillow >= 10.

Original URLs remain available for older CSVs, shared links and social previews.
Run from any directory with: python3 scripts/optimize-images.py
"""
import io
import json
from pathlib import Path
import subprocess

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
replacements = {}
before = after = count = 0
for name in tracked:
    path = ROOT / name
    if path.suffix.lower() not in {'.png', '.jpg', '.jpeg', '.webp'} or not path.is_file():
        continue
    if path.suffix.lower() == '.webp' and any(path.with_suffix(ext).exists() for ext in ('.png', '.jpg', '.jpeg')):
        continue  # Generated variant: always regenerate from its original.
    original = path.read_bytes()
    before += len(original)
    with Image.open(path) as source:
        if getattr(source, 'is_animated', False):
            after += len(original)
            continue
        image = ImageOps.exif_transpose(source)
        # Keep icon sizes, logos, signatures and their original formats intact.
        branding = 'assets/icons/' in name or any(s in path.name.lower() for s in ('logo', 'signature'))
        if branding:
            output = io.BytesIO()
            image.save(output, format=source.format, optimize=True)
            if len(output.getvalue()) < len(original):
                path.write_bytes(output.getvalue())
            after += path.stat().st_size
            continue
        image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        if image.mode not in ('RGB', 'RGBA'):
            image = image.convert('RGBA' if 'transparency' in image.info else 'RGB')
        output = io.BytesIO()
        image.save(output, format='WEBP', quality=78, method=6)
        if len(output.getvalue()) < len(original):
            target = path.with_suffix('.webp')
            if target != path and target.exists() and target.read_bytes() != output.getvalue():
                raise RuntimeError(f'WebP destination already exists: {target}')
            target.write_bytes(output.getvalue())
            replacements[name] = target.relative_to(ROOT).as_posix()
            after += target.stat().st_size
            count += 1
        else:
            after += len(original)

# Full paths avoid accidentally changing unrelated filenames or external URLs.
changed = 0
for name in tracked:
    path = ROOT / name
    if path.suffix.lower() not in {'.html', '.css', '.js', '.json', '.csv', '.xml'} or not path.is_file():
        continue
    content = path.read_text()
    updated = content
    for old, new in replacements.items():
        updated = updated.replace(old, new)
    if updated != content:
        path.write_text(updated)
        changed += 1
print(json.dumps({'converted': count, 'reference_files_updated': changed,
                  'original_bytes': before, 'optimized_bytes': after,
                  'saved_percent': round((before - after) / before * 100, 1)}, indent=2))
