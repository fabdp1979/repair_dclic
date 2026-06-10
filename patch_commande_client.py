from pathlib import Path

f = Path("/opt/dclic/frontend/src/pages/CommandesPage.jsx")
c = f.read_text(encoding="utf-8")

# 1. Ajouter import Dialog
old_imp = "import { getCommandes, createCommande, updateCommande, deleteCommande, getClients, createClient } from \"../lib/api\";"
new_imp = """import { getCommandes, createCommande, updateCommande, deleteCommande, getClients, createClient } from "../lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Label } from "../components/ui/label";"""
if old_imp in c:
    c = c.replace(old_imp, new_imp, 1)
    print("OK : imports Dialog")
else:
    print("NON TROUVE : imports")

# 2. Ajouter handleCreateClient après handleSubmit
old_handler = "  const handleDelete = async () => {"
new_handler = """  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!clientFormData.nom || !clientFormData.prenom || !clientFormData.telephone) {
      return;
    }
    try {
      const payload = { ...clientFormData, telephone2: clientFormData.telephone2 || null, email: clientFormData.email || null };
      const response = await createClient(payload);
      setClients([...clients, response.data]);
      setFormData({ ...formData, client_id: response.data.id });
      setClientDialogOpen(false);
      setClientFormData(emptyClient);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async () => {"""
if old_handler in c:
    c = c.replace(old_handler, new_handler, 1)
    print("OK : handleCreateClient")
else:
    print("NON TROUVE : handleDelete")

# 3. Ajouter le dialog JSX avant la dernière balise de fermeture
old_end = "    </div>\n  );\n}"
new_end = """    </div>

      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Nouveau client rapide</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateClient}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prénom *</Label>
                  <input className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" value={clientFormData.prenom} onChange={(e) => setClientFormData({...clientFormData, prenom: e.target.value})} required />
                </div>
                <div>
                  <Label>Nom *</Label>
                  <input className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" value={clientFormData.nom} onChange={(e) => setClientFormData({...clientFormData, nom: e.target.value})} required />
                </div>
              </div>
              <div>
                <Label>Société (optionnel)</Label>
                <input className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Nom de la société" value={clientFormData.societe || ""} onChange={(e) => setClientFormData({...clientFormData, societe: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Téléphone *</Label>
                  <input className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" value={clientFormData.telephone} onChange={(e) => setClientFormData({...clientFormData, telephone: e.target.value})} required />
                </div>
                <div>
                  <Label>Téléphone 2</Label>
                  <input className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" value={clientFormData.telephone2} onChange={(e) => setClientFormData({...clientFormData, telephone2: e.target.value})} />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <input type="email" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" value={clientFormData.email} onChange={(e) => setClientFormData({...clientFormData, email: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setClientDialogOpen(false)} className="px-4 py-2 rounded-md border border-slate-200 text-sm hover:bg-slate-50">Annuler</button>
              <button type="submit" className="px-4 py-2 rounded-md bg-[#84CC16] text-white text-sm hover:bg-[#65A30D]">Créer et sélectionner</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
  );
}"""
if old_end in c:
    c = c.replace(old_end, new_end, 1)
    print("OK : dialog client ajouté")
else:
    print("NON TROUVE : fin du fichier")

f.write_text(c, encoding="utf-8")
print("Patch terminé !")
