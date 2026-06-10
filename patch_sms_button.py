import shutil
from datetime import datetime
from pathlib import Path

# ── Backend : endpoint /send-sms ──────────────────────────────────────────────
BACKEND = Path("/opt/dclic/backend/server.py")

OLD_ENDPOINT = '''@api_router.post("/reparations/{reparation_id}/send-email")'''

NEW_ENDPOINT = '''@api_router.post("/reparations/{reparation_id}/send-sms")
async def send_repair_sms(reparation_id: str):
    """Envoi manuel SMS au client"""
    rep = await db.reparations.find_one({"id": reparation_id}, {"_id": 0})
    if not rep:
        raise HTTPException(status_code=404, detail="Réparation non trouvée")
    client = await db.clients.find_one({"id": rep["client_id"]}, {"_id": 0})
    if not client or not client.get("telephone"):
        raise HTTPException(status_code=400, detail="Le client n'a pas de numéro de téléphone")
    if not SWEEGO_API_KEY:
        raise HTTPException(status_code=500, detail="Service SMS non configuré")
    frontend_url = os.environ.get("FRONTEND_URL", "https://app.d-clic-informatique.fr")
    tracking_url = f"{frontend_url}/suivi/{rep.get('tracking_id', '')}"
    sms_msg = (
        f"Bonjour {client.get('prenom','')}, votre reparation n°{rep['numero']} "
        f"- statut : {rep.get('statut','')}. Suivi : {tracking_url}"
    )
    try:
        await asyncio.to_thread(_send_sms_sweego, client["telephone"], sms_msg)
        return {"status": "success", "message": f"SMS envoyé à {client['telephone']}"}
    except Exception as e:
        logger.error(f"Echec SMS manuel: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur SMS: {str(e)}")


@api_router.post("/reparations/{reparation_id}/send-email")'''

content = BACKEND.read_text(encoding="utf-8")
backup = BACKEND.with_suffix(f".py.bak_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
shutil.copy2(BACKEND, backup)
if OLD_ENDPOINT in content:
    content = content.replace(OLD_ENDPOINT, NEW_ENDPOINT, 1)
    BACKEND.write_text(content, encoding="utf-8")
    print("OK : endpoint /send-sms ajouté")
else:
    print("NON TROUVE : endpoint send-email")

# ── Frontend api.js ───────────────────────────────────────────────────────────
API_JS = Path("/opt/dclic/frontend/src/lib/api.js")
old_api = "export const sendRepairEmail = (id, force = false) =>\n  api.post(`/reparations/${id}/send-email`, null, { params: { force } });"
new_api = """export const sendRepairEmail = (id, force = false) =>
  api.post(`/reparations/${id}/send-email`, null, { params: { force } });

export const sendRepairSms = (id) =>
  api.post(`/reparations/${id}/send-sms`);"""

content2 = API_JS.read_text(encoding="utf-8")
if old_api in content2:
    content2 = content2.replace(old_api, new_api, 1)
    API_JS.write_text(content2, encoding="utf-8")
    print("OK : sendRepairSms ajouté dans api.js")
else:
    print("NON TROUVE : sendRepairEmail dans api.js")

# ── Frontend ReparationsPage.jsx ──────────────────────────────────────────────
PAGE = Path("/opt/dclic/frontend/src/pages/ReparationsPage.jsx")
content3 = PAGE.read_text(encoding="utf-8")

# Import sendRepairSms
old_import = "  sendRepairEmail, exportReparationsExcelUrl, downloadFile"
new_import = "  sendRepairEmail, sendRepairSms, exportReparationsExcelUrl, downloadFile"
if old_import in content3:
    content3 = content3.replace(old_import, new_import, 1)
    print("OK : import sendRepairSms")
else:
    print("NON TROUVE : import sendRepairEmail")

# State sendingSms
old_state = "  const [sendingEmail, setSendingEmail] = useState(null);"
new_state = "  const [sendingEmail, setSendingEmail] = useState(null);\n  const [sendingSms, setSendingSms] = useState(null);"
if old_state in content3:
    content3 = content3.replace(old_state, new_state, 1)
    print("OK : state sendingSms")
else:
    print("NON TROUVE : state sendingEmail")

# Handler handleSendSms
old_handler = "  const handleSendEmail = async (reparation, force = false) => {"
new_handler = """  const handleSendSms = async (reparation) => {
    if (!reparation.client_telephone) {
      toast.error("Ce client n'a pas de numéro de téléphone");
      return;
    }
    setSendingSms(reparation.id);
    try {
      await sendRepairSms(reparation.id);
      toast.success(`SMS envoyé à ${reparation.client_telephone}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de l'envoi du SMS");
    } finally {
      setSendingSms(null);
    }
  };

  const handleSendEmail = async (reparation, force = false) => {"""
if old_handler in content3:
    content3 = content3.replace(old_handler, new_handler, 1)
    print("OK : handler handleSendSms")
else:
    print("NON TROUVE : handler handleSendEmail")

# Bouton SMS après bouton Email
old_btn = """                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => handleSendEmail(reparation)}
                        disabled={sendingEmail === reparation.id || !reparation.client_email}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Email
                      </Button>"""
new_btn = """                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => handleSendEmail(reparation)}
                        disabled={sendingEmail === reparation.id || !reparation.client_email}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Email
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => handleSendSms(reparation)}
                        disabled={sendingSms === reparation.id || !reparation.client_telephone}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        SMS
                      </Button>"""
if old_btn in content3:
    content3 = content3.replace(old_btn, new_btn, 1)
    print("OK : bouton SMS ajouté")
else:
    print("NON TROUVE : bouton Email")

PAGE.write_text(content3, encoding="utf-8")
print("Patch frontend terminé.")
