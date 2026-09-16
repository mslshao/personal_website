"""Refresh the site's existing Latin webfonts and their redistribution licenses."""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlparse
import hashlib
import re

root = Path(__file__).resolve().parent.parent
out = root / 'fonts'
out.mkdir(exist_ok=True)
url = ('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800'
       '&family=IBM+Plex+Mono:wght@400;500&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap')
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
           '(KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'}
def download(url):
    with urlopen(Request(url, headers=headers), timeout=30) as response:
        return response.read()

css = download(url).decode('utf-8')
rules = re.findall(r'/\* latin \*/\s*(@font-face\s*\{[^}]+\})', css)
if len(rules) != 7:
    raise RuntimeError(f'Expected 7 Latin font-face rules, received {len(rules)}; review the upstream response.')
sources = {}
local_rules = []
for rule in rules:
    remote = re.search(r'url\((https://fonts\.gstatic\.com/[^)]+)\)', rule).group(1)
    if remote not in sources:
        name = Path(urlparse(remote).path).name
        data = download(remote)
        if not data.startswith(b'wOF2'):
            raise RuntimeError(f'Expected WOFF2 from {remote}')
        (out / name).write_bytes(data)
        sources[remote] = (name, hashlib.sha256(data).hexdigest())
    local_rules.append(rule.replace(remote, sources[remote][0]))

licenses = {
    'bricolage-grotesque': 'bricolagegrotesque',
    'ibm-plex-mono': 'ibmplexmono',
    'source-serif-4': 'sourceserif4',
}
for name, directory in licenses.items():
    license_url = f'https://raw.githubusercontent.com/google/fonts/main/ofl/{directory}/OFL.txt'
    text = download(license_url)
    if b'SIL OPEN FONT LICENSE' not in text:
        raise RuntimeError(f'Unexpected license response for {name}')
    (out / f'{name}-OFL.txt').write_bytes(text)

(out / 'fonts.css').write_text('/* Existing Google Fonts, hosted locally. Latin subsets; see accompanying OFL licenses. */\n'
                             + '\n\n'.join(local_rules) + '\n', encoding='utf-8')
(out / 'SOURCES.txt').write_text('Downloaded from Google Fonts. Font binaries are unmodified.\n'
    + 'CSS source: ' + url + '\n\n'
    + '\n\n'.join(f'{name}\nSource: {remote}\nSHA-256: {digest}' for remote, (name, digest) in sources.items())
    + '\n', encoding='utf-8')
print(f'Bundled {len(sources)} font files, {len(rules)} font-face rules, and all three licenses.')
print(f'Total font bytes: {sum((out/name).stat().st_size for name,_ in sources.values())}')
