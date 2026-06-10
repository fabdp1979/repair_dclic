import shutil
from datetime import datetime
from pathlib import Path

def patch(filepath, old, new, label):
    f = Path(filepath)
    content = f.read_text(encoding="utf-8")
    if old in content:
        f.write_text(content.replace(old, new, 1), encoding="utf-8")
        print(f"OK : {label}")
        return True
    print(f"NON TROUVE : {label}")
    return False

# ── 1. BACKEND : ajouter champ societe au modele client ──────────────────────
patch("/opt/dclic/backend/server.py",
    "class ClientBase(BaseModel):\n    nom: str\n    prenom: str\n    telephone: str\n    telephone2: Optional[str] = None\n    email: Optional[EmailStr] = None\n    adresse: Optional[str] = None",
    "class ClientBase(BaseModel):\n    nom: str\n    prenom: str\n    societe: Optional[str] = None\n    telephone: str\n    telephone2: Optional[str] = None\n    email: Optional[EmailStr] = None\n    adresse: Optional[str] = None",
    "Backend : champ societe ajouté")

patch("/opt/dclic/backend/server.py",
    "class ClientUpdate(BaseModel):\n    nom: Optional[str] = None\n    prenom: Optional[str] = None\n    telephone: Optional[str] = None\n    telephone2: Optional[str] = None\n    email: Optional[EmailStr] = None\n    adresse: Optional[str] = None",
    "class ClientUpdate(BaseModel):\n    nom: Optional[str] = None\n    prenom: Optional[str] = None\n    societe: Optional[str] = None\n    telephone: Optional[str] = None\n    telephone2: Optional[str] = None\n    email: Optional[EmailStr] = None\n    adresse: Optional[str] = None",
    "Backend : ClientUpdate societe ajouté")

# ── 2. FRONTEND : ClientCombobox — afficher societe ──────────────────────────
patch("/opt/dclic/frontend/src/components/ClientCombobox.jsx",
    '              <div className="font-medium text-slate-900 truncate">\n                        {c.prenom} {c.nom}\n                      </div>',
    '              <div className="font-medium text-slate-900 truncate">\n                        {c.societe ? <span className="text-[#84CC16]">{c.societe} — </span> : null}{c.prenom} {c.nom}\n                      </div>',
    "ClientCombobox : affichage société")

# ── 3. FRONTEND : formulaire client — champ societe ─────────────────────────
patch("/opt/dclic/frontend/src/pages/ReparationsPage.jsx",
    '                <Label>Client *</Label>\n                <ClientCombobox',
    '                <Label>Client *</Label>\n                <ClientCombobox',
    "ReparationsPage : déjà ok")

# Ajouter champ société dans le dialog de création client (ReparationsPage)
patch("/opt/dclic/frontend/src/pages/ReparationsPage.jsx",
    '                  <Label htmlFor="client-nom">Nom *</Label>',
    '                  <Label htmlFor="client-societe">Société (optionnel)</Label>\n                  <Input\n                    id="client-societe"\n                    value={clientFormData.societe || ""}\n                    onChange={(e) => setClientFormData({...clientFormData, societe: e.target.value})}\n                    placeholder="Nom de la société"\n                  />\n                </div>\n                <div>\n                  <Label htmlFor="client-nom">Nom *</Label>',
    "ReparationsPage : champ société ajouté")

# ── 4. FRONTEND : CommandesPage — remplacer Select par ClientCombobox ─────────
commandes = Path("/opt/dclic/frontend/src/pages/CommandesPage.jsx")
c = commandes.read_text(encoding="utf-8")

# Ajouter import ClientCombobox
old_imp = 'import { getCommandes, createCommande, updateCommande, deleteCommande, getClients } from "../lib/api";'
new_imp = 'import { getCommandes, createCommande, updateCommande, deleteCommande, getClients, createClient } from "../lib/api";\nimport ClientCombobox from "../components/ClientCombobox";'
if old_imp in c:
    c = c.replace(old_imp, new_imp, 1)
    print("OK : CommandesPage import ClientCombobox")
else:
    # Essayons un import plus flexible
    if 'from "../lib/api"' in c and 'ClientCombobox' not in c:
        c = c.replace('from "../lib/api";', 'from "../lib/api";\nimport ClientCombobox from "../components/ClientCombobox";', 1)
        print("OK : CommandesPage import ClientCombobox (alt)")

# Ajouter état clientDialogOpen
old_state = "  const [selectedCommande, setSelectedCommande] = useState(null);"
new_state = "  const [selectedCommande, setSelectedCommande] = useState(null);\n  const [clientDialogOpen, setClientDialogOpen] = useState(false);\n  const emptyClient = { nom: \"\", prenom: \"\", societe: \"\", telephone: \"\", telephone2: \"\", email: \"\", adresse: \"\" };\n  const [clientFormData, setClientFormData] = useState(emptyClient);"
if old_state in c:
    c = c.replace(old_state, new_state, 1)
    print("OK : CommandesPage state clientDialog")

# Remplacer le Select client par ClientCombobox
old_select = """              <div>
                <Label>Client *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({...formData, client_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder=\"Sélectionner un client\" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.prenom} {client.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>"""
new_select = """              <div>
                <Label>Client *</Label>
                <ClientCombobox
                  clients={clients}
                  value={formData.client_id}
                  onChange={(id) => setFormData({...formData, client_id: id})}
                  onCreateNew={() => setClientDialogOpen(true)}
                />
              </div>"""
if old_select in c:
    c = c.replace(old_select, new_select, 1)
    print("OK : CommandesPage Select → ClientCombobox")
else:
    print("NON TROUVE : CommandesPage Select client")

commandes.write_text(c, encoding="utf-8")

# ── 5. FRONTEND : EncaissementPage — remplacer Select par ClientCombobox ──────
encaiss = Path("/opt/dclic/frontend/src/pages/EncaissementPage.jsx")
e = encaiss.read_text(encoding="utf-8")

if 'ClientCombobox' not in e:
    e = e.replace('from "../lib/api";', 'from "../lib/api";\nimport ClientCombobox from "../components/ClientCombobox";', 1)
    print("OK : EncaissementPage import ClientCombobox")

# Trouver et remplacer le Select client dans EncaissementPage
import re
# Chercher le bloc Select pour client_id
old_enc = re.search(r'(<Select[^>]*client_id.*?</Select>)', e, re.DOTALL)
if old_enc:
    old_block = old_enc.group(0)
    new_block = '''<ClientCombobox
                            clients={clients}
                            value={formData.client_id || ""}
                            onChange={(id) => setFormData({...formData, client_id: id})}
                          />'''
    e = e.replace(old_block, new_block, 1)
    print("OK : EncaissementPage Select → ClientCombobox")
else:
    print("NON TROUVE : EncaissementPage Select client")

encaiss.write_text(e, encoding="utf-8")
print("\nPatch terminé !")
