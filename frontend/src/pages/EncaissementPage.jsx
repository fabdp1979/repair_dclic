import { useState, useEffect } from "react";
import { Plus, Trash2, CreditCard, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { getEncaissements, createEncaissement, deleteEncaissement, getClients } from "../lib/api";
import { toast } from "sonner";

const TYPES_RECETTE = [
  { value: "vente", label: "Vente" },
  { value: "reparation", label: "Réparation" },
  { value: "autre", label: "Autre recette" }
];

const MODES_PAIEMENT = [
  { value: "especes", label: "Espèces" },
  { value: "cb", label: "Carte bancaire" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement" }
];

const emptyEntry = {
  type_recette: "reparation",
  montant: "",
  mode_paiement: "especes",
  client_id: "",
  reference: "",
  remarque: ""
};

export default function EncaissementPage() {
  const [entries, setEntries] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [formData, setFormData] = useState(emptyEntry);
  const [saving, setSaving] = useState(false);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, [dateFilter]);

  const loadData = async () => {
    try {
      const [entriesRes, clientsRes] = await Promise.all([
        getEncaissements(dateFilter, dateFilter),
        getClients()
      ]);
      setEntries(entriesRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error("Erreur lors du chargement");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return entries.reduce((sum, e) => sum + e.montant, 0);
  };

  const calculateByMode = () => {
    const byMode = {};
    entries.forEach(e => {
      if (!byMode[e.mode_paiement]) byMode[e.mode_paiement] = 0;
      byMode[e.mode_paiement] += e.montant;
    });
    return byMode;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.montant) {
      toast.error("Veuillez saisir un montant");
      return;
    }

    setSaving(true);
    try {
      await createEncaissement({
        ...formData,
        montant: parseFloat(formData.montant),
        client_id: formData.client_id || null
      });
      toast.success("Encaissement enregistré");
      setDialogOpen(false);
      setFormData(emptyEntry);
      loadData();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;
    
    try {
      await deleteEncaissement(selectedEntry.id);
      toast.success("Entrée supprimée");
      setDeleteDialogOpen(false);
      setSelectedEntry(null);
      loadData();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const formatTime = (isoDate) => {
    if (!isoDate) return "";
    return new Date(isoDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const byMode = calculateByMode();
  const total = calculateTotal();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="encaissement-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Encaissement
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Vue quotidienne des recettes
          </p>
        </div>
        <Button 
          className="bg-[#84CC16] hover:bg-[#65A30D] text-white gap-2"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Nouvel encaissement
        </Button>
      </div>

      {/* Date Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-slate-400" />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-auto"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDateFilter(new Date().toISOString().split('T')[0])}
            >
              Aujourd'hui
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="col-span-2 sm:col-span-1 bg-[#84CC16]/10 border-[#84CC16]/20">
          <CardContent className="pt-6">
            <p className="text-xs text-slate-600">Total du jour</p>
            <p className="font-mono text-2xl font-bold text-[#84CC16]">{total.toFixed(2)} €</p>
          </CardContent>
        </Card>
        {MODES_PAIEMENT.map(mode => (
          <Card key={mode.value}>
            <CardContent className="pt-6">
              <p className="text-xs text-slate-500">{mode.label}</p>
              <p className="font-mono text-lg font-semibold text-slate-900">
                {(byMode[mode.value] || 0).toFixed(2)} €
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Entries List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-outfit text-lg">Encaissements du jour</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Aucun encaissement pour cette date</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Heure</th>
                    <th>Type</th>
                    <th>Montant</th>
                    <th>Mode</th>
                    <th>Client</th>
                    <th>Remarque</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="font-mono text-xs">{formatTime(entry.date)}</td>
                      <td>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          entry.type_recette === "reparation" ? "bg-purple-100 text-purple-700" :
                          entry.type_recette === "vente" ? "bg-blue-100 text-blue-700" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {TYPES_RECETTE.find(t => t.value === entry.type_recette)?.label}
                        </span>
                      </td>
                      <td className="font-mono font-semibold text-green-600">
                        +{entry.montant.toFixed(2)} €
                      </td>
                      <td className="capitalize">{entry.mode_paiement}</td>
                      <td>
                        {entry.client_nom ? `${entry.client_prenom} ${entry.client_nom}` : "-"}
                      </td>
                      <td className="text-slate-500 text-sm truncate max-w-[150px]">
                        {entry.remarque || "-"}
                      </td>
                      <td>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => { setSelectedEntry(entry); setDeleteDialogOpen(true); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-outfit">Nouvel encaissement</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type de recette</Label>
                  <Select
                    value={formData.type_recette}
                    onValueChange={(value) => setFormData({...formData, type_recette: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES_RECETTE.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="montant">Montant (€) *</Label>
                  <Input
                    id="montant"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.montant}
                    onChange={(e) => setFormData({...formData, montant: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Mode de paiement</Label>
                <Select
                  value={formData.mode_paiement}
                  onValueChange={(value) => setFormData({...formData, mode_paiement: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODES_PAIEMENT.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Client (optionnel)</Label>
                <Select
                  value={formData.client_id || "none"}
                  onValueChange={(value) => setFormData({...formData, client_id: value === "none" ? "" : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.prenom} {c.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="remarque">Remarque</Label>
                <Input
                  id="remarque"
                  value={formData.remarque}
                  onChange={(e) => setFormData({...formData, remarque: e.target.value})}
                  placeholder="Note optionnelle"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-[#84CC16] hover:bg-[#65A30D] text-white" disabled={saving}>
                {saving ? "..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet encaissement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
