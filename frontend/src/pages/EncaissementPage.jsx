import { useState, useEffect } from "react";
import { Plus, Trash2, CreditCard, Calendar, X } from "lucide-react";
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

// Types de recette EXACTS demandés par le client
const TYPES_RECETTE = [
  { value: "forfait_63", label: "Forfait réparation 63€", ttc: 63, ht: 52.50 },
  { value: "rapide_30", label: "Réparation rapide 30€", ttc: 30, ht: 25.00 },
  { value: "express_10", label: "Réparation express 10€", ttc: 10, ht: 8.33 },
  { value: "devis_15", label: "Devis 15€", ttc: 15, ht: 12.50 },
  { value: "ventes", label: "Ventes", ttc: null, ht: null },
  { value: "autre", label: "Autre", ttc: null, ht: null },
  { value: "mixte", label: "Mixte (plusieurs lignes)", ttc: null, ht: null },
];

const MODES_PAIEMENT = [
  { value: "especes", label: "Espèces" },
  { value: "cb", label: "Carte bancaire" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement" },
];

const getTypeLabel = (value) => TYPES_RECETTE.find((t) => t.value === value)?.label || value;
const getModeLabel = (value) => MODES_PAIEMENT.find((m) => m.value === value)?.label || value;

const emptyEntry = {
  // Lignes : 1 par défaut, plusieurs possibles
  lignes: [{ type_recette: "forfait_63", montant_ttc: "63", description: "" }],
  paiements: [{ mode: "especes", montant: "" }],
  client_id: "",
  reference: "",
  remarque: "",
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
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  const loadData = async () => {
    try {
      const [entriesRes, clientsRes] = await Promise.all([
        getEncaissements(dateFilter, dateFilter),
        getClients(),
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

  // Compat pour anciens encaissements : montant / mode_paiement vs montant_ttc / paiements
  const getEntryTTC = (e) => Number(e.montant_ttc ?? e.montant ?? 0);
  const getEntryHT = (e) => {
    if (e.montant_ht != null) return Number(e.montant_ht);
    const ttc = getEntryTTC(e);
    return Number((ttc / 1.2).toFixed(2));
  };
  const getEntryPaiements = (e) => {
    if (Array.isArray(e.paiements) && e.paiements.length) return e.paiements;
    if (e.mode_paiement) return [{ mode: e.mode_paiement, montant: getEntryTTC(e) }];
    return [];
  };

  const totalTTC = entries.reduce((sum, e) => sum + getEntryTTC(e), 0);
  const totalHT = entries.reduce((sum, e) => sum + getEntryHT(e), 0);

  const byMode = {};
  entries.forEach((e) => {
    getEntryPaiements(e).forEach((p) => {
      if (!byMode[p.mode]) byMode[p.mode] = 0;
      byMode[p.mode] += Number(p.montant) || 0;
    });
  });

  // === Lignes (multi-produits) ===
  const addLigne = () =>
    setFormData((prev) => ({
      ...prev,
      lignes: [...prev.lignes, { type_recette: "ventes", montant_ttc: "", description: "" }],
    }));

  const removeLigne = (idx) =>
    setFormData((prev) => ({
      ...prev,
      lignes: prev.lignes.filter((_, i) => i !== idx),
    }));

  const updateLigne = (idx, patch) =>
    setFormData((prev) => ({
      ...prev,
      lignes: prev.lignes.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    }));

  const handleLigneTypeChange = (idx, value) => {
    const type = TYPES_RECETTE.find((t) => t.value === value);
    const patch = { type_recette: value };
    if (type && type.ttc != null) patch.montant_ttc = String(type.ttc);
    updateLigne(idx, patch);
  };

  const totalLignesTTC = formData.lignes.reduce(
    (s, l) => s + (parseFloat(l.montant_ttc) || 0),
    0
  );
  const totalLignesHT = Math.round((totalLignesTTC / 1.2) * 100) / 100;

  const handlePaiementChange = (idx, field, value) => {
    setFormData((prev) => ({
      ...prev,
      paiements: prev.paiements.map((p, i) => (i === idx ? { ...p, [field]: value } : p)),
    }));
  };

  const addPaiement = () => {
    setFormData((prev) => ({
      ...prev,
      paiements: [...prev.paiements, { mode: "cb", montant: "" }],
    }));
  };

  const removePaiement = (idx) => {
    setFormData((prev) => ({
      ...prev,
      paiements: prev.paiements.filter((_, i) => i !== idx),
    }));
  };

  const autoFillSinglePaiement = () => {
    if (
      formData.paiements.length === 1 &&
      totalLignesTTC > 0 &&
      !formData.paiements[0].montant
    ) {
      setFormData((prev) => ({
        ...prev,
        paiements: [{ ...prev.paiements[0], montant: totalLignesTTC.toFixed(2) }],
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validLignes = formData.lignes
      .map((l) => ({
        type_recette: l.type_recette,
        montant_ttc: parseFloat(l.montant_ttc) || 0,
        description: (l.description || "").trim() || null,
      }))
      .filter((l) => l.montant_ttc > 0);

    if (validLignes.length === 0) {
      toast.error("Veuillez saisir au moins une ligne avec un montant");
      return;
    }
    const ttc = Math.round(validLignes.reduce((s, l) => s + l.montant_ttc, 0) * 100) / 100;

    const validPaiements = formData.paiements
      .filter((p) => p.mode && parseFloat(p.montant) > 0)
      .map((p) => ({ mode: p.mode, montant: parseFloat(p.montant) }));

    if (validPaiements.length === 0) {
      toast.error("Veuillez saisir au moins un mode de paiement avec un montant");
      return;
    }

    const totalPaiements = Math.round(validPaiements.reduce((s, p) => s + p.montant, 0) * 100) / 100;
    if (Math.abs(totalPaiements - ttc) > 0.01) {
      toast.error(
        `La somme des paiements (${totalPaiements.toFixed(2)}€) ne correspond pas au total TTC (${ttc.toFixed(2)}€)`
      );
      return;
    }

    // type_recette global : "mixte" si plusieurs catégories, sinon celle de la seule ligne
    const categories = new Set(validLignes.map((l) => l.type_recette));
    const globalType = categories.size > 1 ? "mixte" : validLignes[0].type_recette;

    setSaving(true);
    try {
      await createEncaissement({
        type_recette: globalType,
        montant_ttc: ttc,
        montant_ht: Math.round((ttc / 1.2) * 100) / 100,
        paiements: validPaiements,
        lignes: validLignes.length > 1 ? validLignes : null, // Pas besoin de stocker si 1 seule
        client_id: formData.client_id || null,
        reference: formData.reference || null,
        remarque: formData.remarque || null,
      });
      toast.success("Encaissement enregistré");
      setDialogOpen(false);
      setFormData(emptyEntry);
      loadData();
    } catch (error) {
      const msg = error.response?.data?.detail;
      toast.error(typeof msg === "string" ? msg : "Erreur lors de l'enregistrement");
      console.error(error);
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
    return new Date(isoDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

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
          <p className="text-slate-500 text-sm mt-1">Vue quotidienne des recettes</p>
        </div>
        <Button
          className="bg-[#84CC16] hover:bg-[#65A30D] text-white gap-2"
          onClick={() => {
            setFormData(emptyEntry);
            setDialogOpen(true);
          }}
          data-testid="add-encaissement-btn"
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
              data-testid="date-filter-input"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDateFilter(new Date().toISOString().split("T")[0])}
            >
              Aujourd'hui
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
        <Card className="col-span-2 sm:col-span-1 bg-[#84CC16]/10 border-[#84CC16]/20">
          <CardContent className="pt-6">
            <p className="text-xs text-slate-600">Total TTC</p>
            <p className="font-mono text-2xl font-bold text-[#84CC16]" data-testid="total-ttc">
              {totalTTC.toFixed(2)} €
            </p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1 bg-slate-50 border-slate-200">
          <CardContent className="pt-6">
            <p className="text-xs text-slate-600">Total HT</p>
            <p className="font-mono text-2xl font-bold text-slate-700" data-testid="total-ht">
              {totalHT.toFixed(2)} €
            </p>
          </CardContent>
        </Card>
        {MODES_PAIEMENT.map((mode) => (
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
                    <th>Montant TTC</th>
                    <th>Montant HT</th>
                    <th>Paiements</th>
                    <th>Client</th>
                    <th>Remarque</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const paiements = getEntryPaiements(entry);
                    return (
                      <tr key={entry.id} data-testid={`encaissement-row-${entry.id}`}>
                        <td className="font-mono text-xs">{formatTime(entry.date)}</td>
                        <td>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 w-fit">
                              {getTypeLabel(entry.type_recette)}
                            </span>
                            {/* Détail des lignes pour les encaissements multi-produits */}
                            {Array.isArray(entry.lignes) && entry.lignes.length > 1 && (
                              <div className="text-xs text-slate-600 mt-1 space-y-0.5" data-testid={`encaissement-lignes-${entry.id}`}>
                                {entry.lignes.map((l, i) => (
                                  <div key={i} className="pl-2 border-l-2 border-slate-300">
                                    • {getTypeLabel(l.type_recette)}
                                    {l.description ? ` — ${l.description}` : ""}
                                    <span className="font-mono ml-1">({Number(l.montant_ttc).toFixed(2)}€)</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="font-mono font-semibold text-green-600">
                          +{getEntryTTC(entry).toFixed(2)} €
                        </td>
                        <td className="font-mono text-slate-600">{getEntryHT(entry).toFixed(2)} €</td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {paiements.map((p, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
                              >
                                {getModeLabel(p.mode)}: {Number(p.montant).toFixed(2)}€
                              </span>
                            ))}
                          </div>
                        </td>
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
                            onClick={() => {
                              setSelectedEntry(entry);
                              setDeleteDialogOpen(true);
                            }}
                            data-testid={`delete-encaissement-${entry.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white" data-testid="encaissement-dialog">
          <DialogHeader>
            <DialogTitle className="font-outfit">Nouvel encaissement</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Lignes — multi-produits */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Lignes (produits / prestations) *</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addLigne}
                    data-testid="add-ligne-btn"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Ajouter une ligne
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Ex : Forfait 63 € <strong>+</strong> Vente 20 € sur un même encaissement CB.
                </p>
                <div className="space-y-2">
                  {formData.lignes.map((ligne, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded p-2 space-y-2">
                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <Select
                            value={ligne.type_recette}
                            onValueChange={(v) => handleLigneTypeChange(idx, v)}
                          >
                            <SelectTrigger data-testid={`ligne-type-${idx}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TYPES_RECETTE.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="TTC €"
                          value={ligne.montant_ttc}
                          onChange={(e) => updateLigne(idx, { montant_ttc: e.target.value })}
                          onBlur={autoFillSinglePaiement}
                          className="w-28"
                          data-testid={`ligne-montant-${idx}`}
                        />
                        {formData.lignes.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-red-500"
                            onClick={() => removeLigne(idx)}
                            data-testid={`ligne-remove-${idx}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <Input
                        placeholder="Description (optionnel, ex : souris sans fil, cartouche imprimante…)"
                        value={ligne.description || ""}
                        onChange={(e) => updateLigne(idx, { description: e.target.value })}
                        className="text-sm"
                        data-testid={`ligne-description-${idx}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-200 text-sm">
                  <span className="text-slate-500">
                    Total HT : <span className="font-mono">{totalLignesHT.toFixed(2)} €</span>
                  </span>
                  <span className="font-bold text-slate-900">
                    Total TTC : <span className="font-mono text-[#84CC16]" data-testid="total-ttc-display">{totalLignesTTC.toFixed(2)} €</span>
                  </span>
                </div>
              </div>

              {/* Paiements multiples */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Modes de paiement *</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addPaiement}
                    data-testid="add-paiement-btn"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Ajouter
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  La somme doit être égale au total TTC ({totalLignesTTC.toFixed(2)}€)
                </p>
                <div className="space-y-2">
                  {formData.paiements.map((p, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <div className="flex-1">
                        <Select
                          value={p.mode}
                          onValueChange={(v) => handlePaiementChange(idx, "mode", v)}
                        >
                          <SelectTrigger data-testid={`paiement-mode-${idx}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MODES_PAIEMENT.map((m) => (
                              <SelectItem key={m.value} value={m.value}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Montant €"
                        value={p.montant}
                        onChange={(e) => handlePaiementChange(idx, "montant", e.target.value)}
                        className="w-32"
                        data-testid={`paiement-montant-${idx}`}
                      />
                      {formData.paiements.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-red-500"
                          onClick={() => removePaiement(idx)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Client (optionnel)</Label>
                <Select
                  value={formData.client_id || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, client_id: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.prenom} {c.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reference">Référence</Label>
                  <Input
                    id="reference"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="N° facture, ticket..."
                  />
                </div>
                <div>
                  <Label htmlFor="remarque">Remarque</Label>
                  <Input
                    id="remarque"
                    value={formData.remarque}
                    onChange={(e) => setFormData({ ...formData, remarque: e.target.value })}
                    placeholder="Note optionnelle"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-[#84CC16] hover:bg-[#65A30D] text-white"
                disabled={saving}
                data-testid="save-encaissement-btn"
              >
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
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
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
