# -*- coding: utf-8 -*-
"""
Usage: python3 generate.py values.json output_prefix
Reads template.docx (sitting alongside this script), substitutes {{TOKENS}}
in word/document.xml with values from values.json, writes output_prefix.docx
"""
import sys, json, zipfile, shutil, os

def main():
    values_path = sys.argv[1]
    out_prefix = sys.argv[2]
    with open(values_path, encoding='utf-8') as f:
        values = json.load(f)

    src = os.path.join(os.path.dirname(__file__), 'template.docx')
    workdir = out_prefix + '_work'
    if os.path.exists(workdir):
        shutil.rmtree(workdir)
    os.makedirs(workdir)
    with zipfile.ZipFile(src) as z:
        z.extractall(workdir)

    doc_path = os.path.join(workdir, 'word', 'document.xml')
    with open(doc_path, encoding='utf-8') as f:
        content = f.read()

    missing = []
    for key, val in values.items():
        token = '{{%s}}' % key
        if token not in content:
            missing.append(key)
        content = content.replace(token, val)

    # check leftover tokens
    import re
    leftover = re.findall(r'\{\{[A-Z0-9_]+\}\}', content)

    with open(doc_path, 'w', encoding='utf-8') as f:
        f.write(content)

    out_docx = out_prefix + '.docx'
    if os.path.exists(out_docx):
        os.remove(out_docx)
    # zip it back
    base = os.getcwd()
    os.chdir(workdir)
    os.system(f'zip -Xr "../{os.path.basename(out_docx)}" . -x ".*" > /dev/null')
    os.chdir(base)

    print(json.dumps({"missing_keys_not_in_template": missing, "leftover_unfilled_tokens": leftover}))

if __name__ == '__main__':
    main()
