#!/usr/bin/env python3
"""Pack the CRM into one self-contained HTML file.

Usage:
  python3 tools/build_single_file.py dist/crm.html            # full standalone page
  python3 tools/build_single_file.py dist/crm.html --fragment # body content only (for Claude artifacts)
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def build(fragment: bool) -> str:
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    css = (ROOT / 'css' / 'styles.css').read_text(encoding='utf-8')

    def inline_js(m):
        js = (ROOT / m.group(1)).read_text(encoding='utf-8')
        assert '</script' not in js.lower(), m.group(1)
        return '<script>\n' + js + '\n</script>'

    html = re.sub(r'<script src="([^"]+)"></script>', inline_js, html)
    html = html.replace('<link rel="stylesheet" href="css/styles.css">', '<style>\n' + css + '\n</style>')
    if not fragment:
        return html
    title = re.search(r'<title>.*?</title>', html).group(0)
    style = re.search(r'<style>.*?</style>', html, re.S).group(0)
    body = re.search(r'<body>(.*)</body>', html, re.S).group(1)
    return title + '\n' + style + '\n' + body.strip() + '\n'


if __name__ == '__main__':
    out = pathlib.Path(sys.argv[1])
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(build('--fragment' in sys.argv), encoding='utf-8')
    print('wrote', out, out.stat().st_size, 'bytes')
