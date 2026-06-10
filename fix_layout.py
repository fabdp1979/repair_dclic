from pathlib import Path

f = Path("/opt/dclic/frontend/src/pages/ReparationsPage.jsx")
content = f.read_text(encoding="utf-8")

old = '<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">'
new = '<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">'

if old in content:
    content = content.replace(old, new, 1)
    f.write_text(content, encoding="utf-8")
    print("OK : layout corrigé")
else:
    print("NON TROUVE")
