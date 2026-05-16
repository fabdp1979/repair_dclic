import sys, shutil
from datetime import datetime
from pathlib import Path

TARGET = Path("/opt/dclic/backend/server.py")

OLD_STYLES = '''    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'],
        fontSize=16, spaceAfter=10, textColor=colors.HexColor('#84CC16'), alignment=1)
    header_style = ParagraphStyle('Header', parent=styles['Normal'],
        fontSize=9, textColor=colors.HexColor('#64748B'), alignment=1)
    section_style = ParagraphStyle('Section', parent=styles['Heading2'],
        fontSize=11, spaceBefore=12, spaceAfter=6, textColor=colors.HexColor('#0F172A'))
    normal_style = ParagraphStyle('CustomNormal', parent=styles['Normal'],
        fontSize=9, spaceAfter=3)
    small_style = ParagraphStyle('Small', parent=styles['Normal'],
        fontSize=7, textColor=colors.HexColor('#64748B'), spaceAfter=2)
    condition_title = ParagraphStyle('ConditionTitle', parent=styles['Normal'],
        fontSize=8, fontName='Helvetica-Bold', textColor=colors.HexColor('#0F172A'), spaceAfter=2)
    condition_text = ParagraphStyle('ConditionText', parent=styles['Normal'],
        fontSize=7, textColor=colors.HexColor('#374151'), spaceAfter=4)'''

NEW_STYLES = '''    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'],
        fontSize=14, spaceAfter=3, textColor=colors.HexColor('#84CC16'), alignment=1)
    header_style = ParagraphStyle('Header', parent=styles['Normal'],
        fontSize=8, textColor=colors.HexColor('#64748B'), alignment=1)
    section_style = ParagraphStyle('Section', parent=styles['Heading2'],
        fontSize=10, spaceBefore=5, spaceAfter=2, textColor=colors.HexColor('#0F172A'))
    normal_style = ParagraphStyle('CustomNormal', parent=styles['Normal'],
        fontSize=8.5, spaceAfter=2)
    small_style = ParagraphStyle('Small', parent=styles['Normal'],
        fontSize=6.5, textColor=colors.HexColor('#64748B'), spaceAfter=1)
    condition_title = ParagraphStyle('ConditionTitle', parent=styles['Normal'],
        fontSize=7, fontName='Helvetica-Bold', textColor=colors.HexColor('#0F172A'), spaceAfter=1)
    condition_text = ParagraphStyle('ConditionText', parent=styles['Normal'],
        fontSize=6.5, textColor=colors.HexColor('#374151'), spaceAfter=2)'''

content = TARGET.read_text(encoding="utf-8")
backup = TARGET.with_suffix(f".py.bak_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
shutil.copy2(TARGET, backup)
print(f"Sauvegarde : {backup}")

patches = [
    (OLD_STYLES, NEW_STYLES),
    ("    elements.append(Spacer(1, 15))\n    \n    # Title with number and date",
     "    elements.append(Spacer(1, 6))\n    \n    # Title with number and date"),
    ("    elements.append(client_table)\n    elements.append(Spacer(1, 10))\n    \n    # Matériel fourni",
     "    elements.append(client_table)\n    elements.append(Spacer(1, 5))\n    \n    # Matériel fourni"),
    ("        elements.append(Paragraph(\", \".join(materiel_list), normal_style))\n        elements.append(Spacer(1, 10))\n\n    # Forfaits appliqués",
     "        elements.append(Paragraph(\", \".join(materiel_list), normal_style))\n        elements.append(Spacer(1, 4))\n\n    # Forfaits appliqués"),
    ("        elements.append(Paragraph(\", \".join(forfaits_labels), normal_style))\n        elements.append(Spacer(1, 10))\n\n    # État du matériel",
     "        elements.append(Paragraph(\", \".join(forfaits_labels), normal_style))\n        elements.append(Spacer(1, 4))\n\n    # État du matériel"),
    ("        elements.append(Spacer(1, 10))\n\n    # Description",
     "        elements.append(Spacer(1, 4))\n\n    # Description"),
    ("    elements.append(Spacer(1, 10))\n    \n    # Diagnostic et action",
     "    elements.append(Spacer(1, 4))\n    \n    # Diagnostic et action"),
    ("        elements.append(Spacer(1, 10))\n    \n    # Prix et statut",
     "        elements.append(Spacer(1, 4))\n    \n    # Prix et statut"),
    ("    elements.append(status_table)\n    elements.append(Spacer(1, 15))\n    \n    # QR Code for tracking",
     "    elements.append(status_table)\n    elements.append(Spacer(1, 6))\n    \n    # QR Code for tracking"),
    ("        elements.append(qr_img)\n        elements.append(Spacer(1, 10))\n    \n    # Conditions de réparation",
     "        elements.append(qr_img)\n        elements.append(Spacer(1, 5))\n    \n    # Conditions de réparation"),
    ("    elements.append(Spacer(1, 15))\n    # Bloc signature",
     "    elements.append(Spacer(1, 6))\n    # Bloc signature"),
    ("            sig_img = Image(io.BytesIO(sig_bytes), width=15 * cm, height=6 * cm)",
     "            sig_img = Image(io.BytesIO(sig_bytes), width=8 * cm, height=3 * cm)"),
]

ok = 0
for old, new in patches:
    if old in content:
        content = content.replace(old, new, 1)
        ok += 1
    else:
        print(f"NON TROUVE (ignoré)")

TARGET.write_text(content, encoding="utf-8")
print(f"{ok}/{len(patches)} patches appliqués. Redémarre le serveur !")
