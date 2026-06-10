import shutil
from datetime import datetime
from pathlib import Path

TARGET = Path("/opt/dclic/backend/server.py")

OLD_SMTP_CONFIG = "# SMTP IONOS configuration\nSMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.ionos.fr')"

NEW_SMTP_CONFIG = "# SMTP IONOS configuration\nSMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.ionos.fr')\n\n# Sweego SMS configuration\nSWEEGO_API_KEY = os.environ.get('SWEEGO_API_KEY', '')\nSWEEGO_SENDER = os.environ.get('SWEEGO_SENDER', 'DCLIC INFO')"

OLD_BUILD_HTML = "def _build_email_html(client, rep, tracking_url):"

NEW_BUILD_HTML = '''def _send_sms_sweego(to, message):
    import urllib.request, json as _json
    if not SWEEGO_API_KEY:
        raise ValueError("SWEEGO_API_KEY non configure")
    phone = to.strip().replace(" ","").replace(".","").replace("-","")
    if phone.startswith("0"):
        phone = "+33" + phone[1:]
    payload = _json.dumps({"channel":"sms","campaign-type":"transac","recipients":[{"phone":phone}],"from":SWEEGO_SENDER,"message-txt":message}).encode("utf-8")
    req = urllib.request.Request("https://api.sweego.io/send",data=payload,headers={"Content-Type":"application/json","Accept":"application/json","Api-Key":SWEEGO_API_KEY},method="POST")
    with urllib.request.urlopen(req,timeout=10) as resp:
        return _json.loads(resp.read())

def _build_email_html(client, rep, tracking_url):'''

OLD_CREATE_SMS = "            logger.info(f\"Mail cr\u00e9ation envoy\u00e9 \u00e0 {client['email']}\")\n        except Exception as e:\n            logger.error(f\"Echec mail cr\u00e9ation: {e}\")\n    return rep_doc"

NEW_CREATE_SMS = "            logger.info(f\"Mail cr\u00e9ation envoy\u00e9 \u00e0 {client['email']}\")\n        except Exception as e:\n            logger.error(f\"Echec mail cr\u00e9ation: {e}\")\n    if client.get(\"telephone\") and SWEEGO_API_KEY:\n        try:\n            frontend_url = os.environ.get('FRONTEND_URL', 'https://app.d-clic-informatique.fr')\n            tracking_url = f\"{frontend_url}/suivi/{rep_doc.get('tracking_id', '')}\"\n            sms_msg = f\"Bonjour {client.get('prenom','')}, votre reparation n\u00b0{rep_doc['numero']} est enregistree chez D-Clic Informatique. Suivi : {tracking_url}\"\n            await asyncio.to_thread(_send_sms_sweego, client[\"telephone\"], sms_msg)\n            logger.info(f\"SMS creation envoye a {client['telephone']}\")\n        except Exception as e:\n            logger.error(f\"Echec SMS creation: {e}\")\n    return rep_doc"

OLD_UPDATE_SMS = "            logger.info(f\"Mail statut envoy\u00e9 \u00e0 {client['email']}\")\n        except Exception as e:\n            logger.error(f\"Echec mail statut: {e}\")\n    return updated"

NEW_UPDATE_SMS = "            logger.info(f\"Mail statut envoy\u00e9 \u00e0 {client['email']}\")\n        except Exception as e:\n            logger.error(f\"Echec mail statut: {e}\")\n    nouveau_statut = update_data.get(\"statut\",\"\")\n    if nouveau_statut == \"Appareil pr\u00eat\" and client and client.get(\"telephone\") and SWEEGO_API_KEY:\n        try:\n            frontend_url = os.environ.get('FRONTEND_URL', 'https://app.d-clic-informatique.fr')\n            tracking_url = f\"{frontend_url}/suivi/{updated.get('tracking_id', '')}\"\n            sms_msg = f\"Bonjour {client.get('prenom','')}, votre appareil (reparation n\u00b0{updated['numero']}) est pret a etre recupere chez D-Clic Informatique. Suivi : {tracking_url}\"\n            await asyncio.to_thread(_send_sms_sweego, client[\"telephone\"], sms_msg)\n            logger.info(f\"SMS pret envoye a {client['telephone']}\")\n        except Exception as e:\n            logger.error(f\"Echec SMS statut: {e}\")\n    return updated"

content = Path(TARGET).read_text(encoding="utf-8")
backup = TARGET.with_suffix(f".py.bak_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
shutil.copy2(TARGET, backup)
print(f"Sauvegarde : {backup}")

patches = [
    ("Config Sweego", OLD_SMTP_CONFIG, NEW_SMTP_CONFIG),
    ("Fonction SMS", OLD_BUILD_HTML, NEW_BUILD_HTML),
    ("SMS creation", OLD_CREATE_SMS, NEW_CREATE_SMS),
    ("SMS statut pret", OLD_UPDATE_SMS, NEW_UPDATE_SMS),
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
