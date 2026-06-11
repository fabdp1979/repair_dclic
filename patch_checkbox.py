from pathlib import Path

f = Path("/opt/dclic/frontend/src/pages-ipad/SignaturePage.jsx")
c = f.read_text(encoding="utf-8")

old = '      <section className="bg-white rounded-xl border-2 border-[#84CC16] shadow-sm p-6">'
new = '      <section className={`rounded-xl border-4 shadow-md p-6 transition-all ${accepted ? "bg-green-50 border-[#84CC16]" : "bg-orange-50 border-orange-400"}`}>'

if old in c:
    c = c.replace(old, new, 1)
    print("OK : section couleur dynamique")
else:
    print("NON TROUVE : section")

old2 = '          <span className="text-slate-900 text-xl font-medium select-none leading-snug">\n            Je reconnais avoir pris connaissance des conditions de réparation et je les accepte sans réserve.\n          </span>'
new2 = '          <span className={`text-xl font-semibold select-none leading-snug ${accepted ? "text-green-900" : "text-orange-900"}`}>\n            {accepted ? "✓ Conditions acceptées" : "⚠️ Appuyez ici pour accepter les conditions de réparation"}\n          </span>\n        </label>\n        <p className="mt-3 text-base text-slate-600 leading-relaxed ml-11">Je reconnais avoir pris connaissance des conditions de réparation et je les accepte sans réserve.</p>\n        <label className="hidden">'

if old2 in c:
    c = c.replace(old2, new2, 1)
    print("OK : texte dynamique")
else:
    print("NON TROUVE : span texte")

f.write_text(c, encoding="utf-8")
