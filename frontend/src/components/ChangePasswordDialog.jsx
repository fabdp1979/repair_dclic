import { useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { changePassword } from "../lib/api";
import { toast } from "sonner";

export default function ChangePasswordDialog({ open, onOpenChange }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCurrent(""); setNext(""); setConfirm("");
    setShowCurrent(false); setShowNext(false);
  };

  const close = () => { reset(); onOpenChange(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (next.length < 8) {
      toast.error("Le nouveau mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (next !== confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (next === current) {
      toast.error("Le nouveau mot de passe doit être différent de l'actuel");
      return;
    }
    setSaving(true);
    try {
      await changePassword(current, next);
      toast.success("Mot de passe mis à jour avec succès");
      close();
    } catch (err) {
      const msg = err.response?.data?.detail || "Erreur lors du changement";
      toast.error(typeof msg === "string" ? msg : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="sm:max-w-md bg-white" data-testid="change-password-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-outfit">
            <KeyRound className="w-5 h-5 text-[#84CC16]" />
            Changer mon mot de passe
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label htmlFor="current">Mot de passe actuel</Label>
            <div className="relative">
              <Input
                id="current"
                type={showCurrent ? "text" : "password"}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                required
                className="pr-10"
                data-testid="current-password-input"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label="Afficher le mot de passe"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="next">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="next"
                type={showNext ? "text" : "password"}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
                required
                className="pr-10"
                data-testid="new-password-input"
              />
              <button
                type="button"
                onClick={() => setShowNext((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label="Afficher le mot de passe"
              >
                {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">8 caractères minimum.</p>
          </div>
          <div>
            <Label htmlFor="confirm">Confirmer le nouveau mot de passe</Label>
            <Input
              id="confirm"
              type={showNext ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              data-testid="confirm-password-input"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={saving}>
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-[#84CC16] hover:bg-[#65A30D] text-white"
              disabled={saving}
              data-testid="submit-password-change"
            >
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enregistrement...</> : "Mettre à jour"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
