import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Wrench, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { getReparations } from "../lib/api";
import { toast } from "sonner";

/**
 * Vue iPad pour les réparations : aucune liste, juste une recherche par numéro.
 * Le client ne voit JAMAIS les autres dossiers.
 * Le technicien saisit le numéro REP-YYYY-XXXX → ouverture directe du mode signature.
 */
export default function IpadReparationSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);
  const cacheRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    setError("");
    setSearching(true);
    try {
      // On cache la liste 60s pour éviter de hammer le backend
      if (!cacheRef.current || Date.now() - cacheRef.current.at > 60000) {
        const { data } = await getReparations();
        cacheRef.current = { data, at: Date.now() };
      }
      const list = cacheRef.current.data || [];
      // Match exact d'abord, puis partiel
      let match = list.find((r) => (r.numero || "").toLowerCase() === q);
      if (!match) {
        // Tolère "0005" → "REP-2026-0005"
        match = list.find((r) => (r.numero || "").toLowerCase().endsWith(q));
      }
      if (!match) {
        setError("Aucune fiche trouvée avec ce numéro");
        setSearching(false);
        return;
      }
      navigate(`/signer/${match.id}?fullscreen=1`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la recherche");
      setSearching(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl text-center" data-testid="ipad-rep-search">
        <div className="inline-flex w-20 h-20 rounded-2xl bg-[#84CC16] items-center justify-center mb-8 shadow-sm">
          <Wrench className="w-11 h-11 text-white" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
          Ouvrir une fiche de réparation
        </h1>
        <p className="text-lg text-slate-500 mb-10">
          Saisissez le numéro de la fiche pour la signer.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <label
            htmlFor="rep-number"
            className="block text-base font-semibold text-slate-700"
          >
            Numéro de fiche
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                id="rep-number"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setError(""); }}
                placeholder="REP-2026-0005 ou 0005"
                autoFocus
                autoComplete="off"
                className="pl-12 h-16 text-xl"
                data-testid="rep-number-input"
              />
            </div>
            <Button
              type="submit"
              className="h-16 px-8 text-lg bg-[#84CC16] hover:bg-[#65A30D] text-white"
              disabled={!query.trim() || searching}
              data-testid="rep-number-submit"
            >
              {searching ? "..." : "Ouvrir"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 flex items-center gap-2 text-base" data-testid="search-error">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}
        </form>

        <p className="mt-12 text-sm text-slate-400">
          Le client ne verra que la fiche correspondant à ce numéro.
        </p>
      </div>
    </div>
  );
}
