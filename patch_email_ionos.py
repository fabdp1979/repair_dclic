import shutil
from datetime import datetime
from pathlib import Path

TARGET = Path("/opt/dclic/backend/server.py")

OLD_IMPORT = "import resend"
NEW_IMPORT = "import smtplib\nfrom email.mime.multipart import MIMEMultipart\nfrom email.mime.text import MIMEText\nfrom email.mime.base import MIMEBase\nfrom email import encoders"

OLD_RESEND_CONFIG = """# Resend configuration
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')"""

NEW_SMTP_CONFIG = """# SMTP IONOS configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.ionos.fr')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '465'))
SMTP_USER = os.environ.get('SMTP_USER', 'suividepannage@d-clic-informatique.fr')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'suividepannage@d-clic-informatique.fr')"""

OLD_SEND_FUNC = """async def send_repair_email(reparation_id: str, force: bool = Query(False, description=\"Forcer l'envoi sans signature\")):"""

NEW_SEND_FUNC = """def _send_email_smtp(to, subject, html_body, pdf_bytes=None, pdf_filename=None):
    msg = MIMEMultipart("mixed")
    msg["From"] = SENDER_EMAIL
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    if pdf_bytes and pdf_filename:
        part = MIMEBase("application", "octet-stream")
        part.set_payload(pdf_bytes)
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f"attachment; filename={pdf_filename}")
        msg.attach(part)
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SENDER_EMAIL, [to], msg.as_string())


def _build_email_html(client, rep, tracking_url):
    prenom = client.get("prenom", "")
    nom = client.get("nom", "")
    statut = rep.get("statut", "")
    numero = rep.get("numero", "")
    return f\"\"\"
    <html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:auto;">
        <div style="background:#84CC16;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
            <h1 style="color:white;margin:0;">D-Clic Informatique</h1>
        </div>
        <div style="padding:30px;background:#f9f9f9;">
            <p>Bonjour <strong>{prenom} {nom}</strong>,</p>
            <p>Votre réparation <strong>n°{numero}</strong> a été mise à jour.</p>
            <p><strong>Statut :</strong> {statut}</p>
            <p>Suivez l'avancement en cliquant ci-dessous :</p>
            <div style="text-align:center;margin:30px 0;">
                <a href="{tracking_url}" style="background:#84CC16;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">Suivre ma réparation</a>
            </div>
            <p>La fiche complète est jointe à ce mail.</p>
            <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;">
            <p style="font-size:13px;color:#666;">
                <strong>{COMPANY_INFO["name"]}</strong><br>
                {COMPANY_INFO["address"]}<br>
                Tél : {COMPANY_INFO["phone"]}<br>
                Email : {COMPANY_INFO["email"]}
            </p>
        </div>
    </body></html>
    \"\"\"


async def send_repair_email(reparation_id: str, force: bool = Query(False, description=\"Forcer l'envoi sans signature\")):"""

OLD_EMAIL_BODY = """    if not resend.api_key:
        raise HTTPException(status_code=500, detail=\"Service email non configuré\")

    frontend_url = os.environ.get('FRONTEND_URL', 'https://fiche-repair.preview.emergentagent.com')
    tracking_url = f\"{frontend_url}/suivi/{rep.get('tracking_id', '')}\"
    
    pdf_content = generate_client_pdf(rep, client, tracking_url)
    pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
    filename = sanitize_filename(f\"Reparation_n{rep['numero']}.pdf\")
    
    html_content = f\"\"\"
    <html>
    <body style=\"font-family: Arial, sans-serif; color: #333;\">
        <p>Bonjour {client.get('prenom', '')} {client.get('nom', '')},</p>
        <p>Veuillez trouver en pièce jointe votre fiche de réparation n°{rep['numero']}.</p>
        <p>Vous pouvez suivre l'avancement de votre réparation en ligne :</p>
        <p><a href=\"{tracking_url}\" style=\"color: #84CC16; font-weight: bold;\">{tracking_url}</a></p>
        <p>Cordialement,<br>
        <strong>{COMPANY_INFO['name']}</strong><br>
        {COMPANY_INFO['address']}<br>
        Tél: {COMPANY_INFO['phone']}<br>
        Email: {COMPANY_INFO['email']}</p>
    </body>
    </html>
    \"\"\"
    
    params = {
        \"from\": SENDER_EMAIL,
        \"to\": [client[\"email\"]],
        \"subject\": f\"Fiche de réparation n°{rep['numero']} - {COMPANY_INFO['name']}\",
        \"html\": html_content,
        \"attachments\": [{\"filename\": filename, \"content\": pdf_base64}]
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        return {\"status\": \"success\", \"message\": f\"Email envoyé à {client['email']}\", \"email_id\": email.get(\"id\")}
    except Exception as e:
        logger.error(f\"Failed to send email: {str(e)}\")
        raise HTTPException(status_code=500, detail=f\"Erreur lors de l'envoi: {str(e)}\")"""

NEW_EMAIL_BODY = """    frontend_url = os.environ.get('FRONTEND_URL', 'https://app.d-clic-informatique.fr')
    tracking_url = f\"{frontend_url}/suivi/{rep.get('tracking_id', '')}\"
    pdf_content = generate_client_pdf(rep, client, tracking_url)
    filename = sanitize_filename(f\"Reparation_n{rep['numero']}.pdf\")
    html_content = _build_email_html(client, rep, tracking_url)
    subject = f\"Fiche de réparation n°{rep['numero']} - {COMPANY_INFO['name']}\"
    try:
        await asyncio.to_thread(_send_email_smtp, client[\"email\"], subject, html_content, pdf_content, filename)
        await db.reparations.update_one({\"id\": reparation_id}, {\"$set\": {\"email_envoye\": True, \"date_email\": datetime.now(timezone.utc).isoformat()}})
        return {\"status\": \"success\", \"message\": f\"Email envoyé à {client['email']}\"}
    except Exception as e:
        logger.error(f\"Failed to send email: {str(e)}\")
        raise HTTPException(status_code=500, detail=f\"Erreur lors de l'envoi: {str(e)}\")"""

OLD_CREATE_RETURN = """    await db.reparations.insert_one(rep_doc)
    rep_doc.pop(\"_id\", None)
    
    rep_doc[\"client_nom\"] = client.get(\"nom\")
    rep_doc[\"client_prenom\"] = client.get(\"prenom\")
    rep_doc[\"client_email\"] = client.get(\"email\")
    rep_doc[\"client_telephone\"] = client.get(\"telephone\")
    
    return rep_doc"""

NEW_CREATE_RETURN = """    await db.reparations.insert_one(rep_doc)
    rep_doc.pop(\"_id\", None)
    rep_doc[\"client_nom\"] = client.get(\"nom\")
    rep_doc[\"client_prenom\"] = client.get(\"prenom\")
    rep_doc[\"client_email\"] = client.get(\"email\")
    rep_doc[\"client_telephone\"] = client.get(\"telephone\")
    if client.get(\"email\"):
        try:
            frontend_url = os.environ.get('FRONTEND_URL', 'https://app.d-clic-informatique.fr')
            tracking_url = f\"{frontend_url}/suivi/{rep_doc.get('tracking_id', '')}\"
            pdf_content = generate_client_pdf(rep_doc, client, tracking_url, force_no_signature=True)
            filename = sanitize_filename(f\"Reparation_n{rep_doc['numero']}.pdf\")
            html_content = _build_email_html(client, rep_doc, tracking_url)
            subject = f\"Réparation enregistrée n°{rep_doc['numero']} - {COMPANY_INFO['name']}\"
            await asyncio.to_thread(_send_email_smtp, client[\"email\"], subject, html_content, pdf_content, filename)
            await db.reparations.update_one({\"id\": rep_doc[\"id\"]}, {\"$set\": {\"email_envoye\": True, \"date_email\": datetime.now(timezone.utc).isoformat()}})
            logger.info(f\"Mail création envoyé à {client['email']}\")
        except Exception as e:
            logger.error(f\"Echec mail création: {e}\")
    return rep_doc"""

OLD_UPDATE_RETURN = """    client = await db.clients.find_one({\"id\": updated[\"client_id\"]}, {\"_id\": 0})
    if client:
        updated[\"client_nom\"] = client.get(\"nom\")
        updated[\"client_prenom\"] = client.get(\"prenom\")
        updated[\"client_email\"] = client.get(\"email\")
        updated[\"client_telephone\"] = client.get(\"telephone\")
    
    return updated"""

NEW_UPDATE_RETURN = """    client = await db.clients.find_one({\"id\": updated[\"client_id\"]}, {\"_id\": 0})
    if client:
        updated[\"client_nom\"] = client.get(\"nom\")
        updated[\"client_prenom\"] = client.get(\"prenom\")
        updated[\"client_email\"] = client.get(\"email\")
        updated[\"client_telephone\"] = client.get(\"telephone\")
    statut_changed = \"statut\" in update_data and update_data[\"statut\"] != existing.get(\"statut\")
    if statut_changed and client and client.get(\"email\"):
        try:
            frontend_url = os.environ.get('FRONTEND_URL', 'https://app.d-clic-informatique.fr')
            tracking_url = f\"{frontend_url}/suivi/{updated.get('tracking_id', '')}\"
            pdf_content = generate_client_pdf(updated, client, tracking_url, force_no_signature=True)
            filename = sanitize_filename(f\"Reparation_n{updated['numero']}.pdf\")
            html_content = _build_email_html(client, updated, tracking_url)
            subject = f\"Mise à jour réparation n°{updated['numero']} - {COMPANY_INFO['name']}\"
            await asyncio.to_thread(_send_email_smtp, client[\"email\"], subject, html_content, pdf_content, filename)
            await db.reparations.update_one({\"id\": reparation_id}, {\"$set\": {\"email_envoye\": True, \"date_email\": datetime.now(timezone.utc).isoformat()}})
            logger.info(f\"Mail statut envoyé à {client['email']}\")
        except Exception as e:
            logger.error(f\"Echec mail statut: {e}\")
    return updated"""

def apply():
    content = TARGET.read_text(encoding="utf-8")
    backup = TARGET.with_suffix(f".py.bak_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
    shutil.copy2(TARGET, backup)
    print(f"Sauvegarde : {backup}")
    patches = [
        ("Import smtplib", OLD_IMPORT, NEW_IMPORT),
        ("Config SMTP", OLD_RESEND_CONFIG, NEW_SMTP_CONFIG),
        ("Fonctions SMTP", OLD_SEND_FUNC, NEW_SEND_FUNC),
        ("Corps send_repair_email", OLD_EMAIL_BODY, NEW_EMAIL_BODY),
        ("Envoi auto creation", OLD_CREATE_RETURN, NEW_CREATE_RETURN),
        ("Envoi auto statut", OLD_UPDATE_RETURN, NEW_UPDATE_RETURN),
    ]
    ok = 0
    for label, old, new in patches:
        if old in content:
            content = content.replace(old, new, 1)
            print(f"OK : {label}")
            ok += 1
        else:
            print(f"NON TROUVE : {label}")
    TARGET.write_text(content, encoding="utf-8")
    print(f"{ok}/{len(patches)} patches appliques.")

apply()
