import { Tablet, Wrench, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useDeviceMode } from "../hooks/useDeviceMode";

/**
 * Page d'accueil iPad — affichée si le client arrive sur /ipad.
 * Fond clair, gros boutons, pas de menu admin.
 */
export default function HomeIpadPage() {
  const [tracking, setTracking] = useState("");
  const navigate = useNavigate();
  const { setMode } = useDeviceMode();

  const goToSuivi = (e) => {
    e.preventDefault();
    if (tracking.trim()) navigate(`/suivi/${tracking.trim()}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="w-20 h-20 rounded-2xl bg-[#84CC16] flex items-center justify-center mb-8 shadow-sm">
        <Wrench className="w-11 h-11 text-white" />
      </div>

      <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-3">
        DCLIC INFORMATIQUE
      </h1>
      <p className="text-xl text-slate-600 mb-12 max-w-xl">
        Bienvenue ! Veuillez remettre la tablette au technicien pour
        compléter votre dossier.
      </p>

      <form onSubmit={goToSuivi} className="w-full max-w-md space-y-4">
        <div className="text-left">
          <label
            htmlFor="tracking"
            className="block text-lg font-semibold text-slate-800 mb-2"
          >
            Suivre ma réparation
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                id="tracking"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="Code de suivi"
                className="pl-12 h-16 text-lg"
                data-testid="tracking-input"
              />
            </div>
            <Button
              type="submit"
              className="h-16 px-8 text-lg bg-[#84CC16] hover:bg-[#65A30D] text-white"
              disabled={!tracking.trim()}
              data-testid="tracking-submit"
            >
              Valider
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-16 text-slate-400 text-sm">
        <button
          type="button"
          onClick={() => {
            setMode("pc");
            window.location.href = "/";
          }}
          className="inline-flex items-center gap-2 hover:text-slate-700"
          data-testid="mode-back-pc"
        >
          <Tablet className="w-4 h-4" />
          Passer en mode technicien
        </button>
      </div>
    </main>
  );
}
