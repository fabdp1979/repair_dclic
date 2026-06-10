import base64, struct, zlib

# SVG favicon
svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="18" fill="#84CC16"/>
  <text x="50" y="72" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="54" fill="white">DC</text>
</svg>'''

svg_bytes = svg.encode('utf-8')
svg_b64 = base64.b64encode(svg_bytes).decode()

# Écrire le SVG comme favicon
with open('/opt/dclic/frontend/public/favicon.svg', 'w') as f:
    f.write(svg)
print("OK : favicon.svg créé")

# Mettre à jour index.html pour pointer vers le SVG
import re
idx = open('/opt/dclic/frontend/public/index.html').read()
old = '<link rel="icon" href="%PUBLIC_URL%/favicon.ico" />'
new = '<link rel="icon" type="image/svg+xml" href="%PUBLIC_URL%/favicon.svg" />'
if old in idx:
    idx = idx.replace(old, new, 1)
    open('/opt/dclic/frontend/public/index.html', 'w').write(idx)
    print("OK : index.html mis à jour")
else:
    print("NON TROUVE : lien favicon dans index.html")
    print("Contenu actuel autour de favicon:")
    m = re.search(r'.{0,100}favicon.{0,100}', idx)
    if m: print(m.group(0))
