import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Plus, Trash2, Euro } from "lucide-react";
import { toast } from "sonner";
import { encaisserReparation } from "../lib/api";

const MODES = [
  { value: "especes", label: "Espèces" },
  { value: "cb", label: "Carte bancaire" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement" },
];

/**
 * Dialog d'encaissement d'une réparation.
 * Props :
 *  - open, onOpenChange
 *  - reparation: { id, numero, prix, client_prenom, client_nom }
 *  - onSuccess: callback après encaissement OK (reload de la liste)
 */
export default function EncaisserDialog({ open, onOpenChange, reparation, onSuccess }) {
  const prix = Number(reparation?.prix || 0);
  const [paiements, setPaiements] = useState([{ mode: "cb", montant: "" }]);
  const [saving, setSaving] = useState(false);

  // Reset à l'ouverture
  useEffect(() => {
    if (open) {
      setPaiements([{ mode: "cb", montant: prix ? String(prix.toFixed(2)) : "" }]);
    }
  }, [open, prix]);

  const totalPaiements = paiements.reduce((s, p) => s + (parseFloat(p.montant) || 0), 0);
  const diff = Math.round((totalPaiements - prix) * 100) / 100;

  const updatePaiement = (idx, field, val) =>
    setPaiements((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: val } : p)));

  const addPaiement = () =>
    setPaiements((prev) => [...prev, { mode: "especes", montant: "" }]);

  const removePaiement = (idx) =>
    setPaiements((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!prix || prix <= 0) {
      toast.error("Veuillez saisir un prix sur la fiche avant d'encaisser");
      return;
    }
    const valid = paiements
      .filter((p) => p.mode && parseFloat(p.montant) > 0)
      .map((p) => ({ mode: p.mode, montant: parseFloat(p.montant) }));
    if (!valid.length) {
      toast.error("Au moins un mode de paiement avec montant est requis");
      return;
    }
    const sum = Math.round(valid.reduce((s, p) => s + p.montant, 0) * 100) / 100;
    if (Math.abs(sum - prix) > 0.01) {
      toast.error(`La somme (${sum.toFixed(2)} €) doit égaler le prix (${prix.toFixed(2)} €)`);
      return;
    }
    try {
      setSaving(true);
      await encaisserReparation(reparation.id, { paiements: valid });
      toast.success("Encaissement enregistré — fiche marquée comme Réglée");
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Erreur lors de l'encaissement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="encaisser-dialog">
        <DialogHeader>
          <DialogTitle className="font-outfit flex items-center gap-2">
            <Euro className="w-5 h-5 text-[#84CC16]" />
            Encaisser la fiche {reparation?.numero}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Client</p>
              <p className="font-medium text-slate-900">
                {reparation?.client_prenom} {reparation?.client_nom}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Prix à encaisser</p>
              <p className="font-bold text-2xl text-[#84CC16]" data-testid="encaisser-prix">
                {prix.toFixed(2)} €
              </p>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Modes de paiement</Label>
            <div className="space-y-2">
              {paiements.map((p, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Select
                    value={p.mode}
                    onValueChange={(v) => updatePaiement(idx, "mode", v)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Montant"
                    value={p.montant}
                    onChange={(e) => updatePaiement(idx, "montant", e.target.value)}
                    className="flex-1"
                    data-testid={`encaisser-montant-${idx}`}
                  />
                  <span className="text-slate-500">€</span>
                  {paiements.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePaiement(idx)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPaiement}
              className="mt-2"
              data-testid="encaisser-add-paiement"
            >
              <Plus className="w-4 h-4 mr-1" />
              Ajouter un mode
            </Button>
          </div>

          <div className={`rounded-lg p-3 text-sm ${
            Math.abs(diff) < 0.01
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-slate-100 text-slate-700 border border-slate-300"
          }`}>
            <div className="flex justify-between">
              <span>Total saisi :</span>
              <span className="font-bold">{totalPaiements.toFixed(2)} €</span>
            </div>
            {Math.abs(diff) >= 0.01 && (
              <div className="flex justify-between mt-1">
                <span>Écart :</span>
                <span className="font-bold">{diff > 0 ? "+" : ""}{diff.toFixed(2)} €</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            onClick={submit}
            disabled={saving || Math.abs(diff) >= 0.01}
            className="bg-[#84CC16] hover:bg-[#84CC16]/90"
            data-testid="encaisser-submit-btn"
          >
            {saving ? "Enregistrement…" : "Valider l'encaissement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
