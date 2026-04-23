import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, X, Unlock } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "./ui/alert-dialog";
import { Input } from "./ui/input";
import { toast } from "sonner";

const KIOSK_PIN = "4827";

/**
 * Active le mode kiosque plein-écran si la query `?fullscreen=1` est présente.
 * - Demande le fullscreen au premier tap (exigence navigateurs)
 * - Bloque navigateur back + beforeunload
 * - Fournit une sortie discrète : triple-tap sur le logo + PIN
 */
export default function FullscreenGuard({ children, logoSlot }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const enabled = searchParams.get("fullscreen") === "1";
  const [isFs, setIsFs] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pin, setPin] = useState("");
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef(null);

  // ---- Listen fullscreen changes
  useEffect(() => {
    if (!enabled) return;
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [enabled]);

  // ---- Block back navigation + beforeunload
  useEffect(() => {
    if (!enabled) return;
    window.history.pushState({ lock: true }, "");
    const onPopState = () => {
      window.history.pushState({ lock: true }, "");
      toast.info("Mode kiosque actif — utilisez le bouton technicien pour quitter");
    };
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [enabled]);

  const enterFullscreen = async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    } catch (e) {
      // Safari iOS may refuse — on ignore
    }
  };

  const handleLogoTap = () => {
    tapCountRef.current += 1;
    clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 900);
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      setPinDialogOpen(true);
      setPin("");
    }
  };

  const handlePinSubmit = async () => {
    if (pin !== KIOSK_PIN) {
      toast.error("Code PIN incorrect");
      setPin("");
      return;
    }
    setPinDialogOpen(false);
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
    } catch {}
    navigate("/reparations");
  };

  if (!enabled) return <>{children}</>;

  return (
    <div className="min-h-screen" data-testid="fullscreen-guard">
      {/* Bannière de demande plein-écran si pas encore activé */}
      {!isFs && (
        <button
          type="button"
          onClick={enterFullscreen}
          className="fixed top-3 right-3 z-50 bg-slate-900 text-white text-xs px-3 py-2 rounded-md flex items-center gap-2 shadow-lg hover:bg-slate-700"
          data-testid="enter-fullscreen-btn"
        >
          <Lock className="w-3 h-3" />
          Activer le plein écran
        </button>
      )}

      {/* Logo invisible cliquable (triple-tap) pour déverrouillage technicien */}
      <button
        type="button"
        aria-label="Sortie technicien"
        onClick={handleLogoTap}
        className="fixed top-0 left-0 w-16 h-16 z-40 opacity-0"
        data-testid="kiosk-exit-zone"
      />

      <div className="select-none">{children}</div>

      {/* PIN dialog */}
      <AlertDialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Unlock className="w-5 h-5 text-slate-700" />
              Sortie technicien
            </AlertDialogTitle>
            <AlertDialogDescription>
              Entrez le code PIN pour sortir du mode kiosque.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            className="text-center text-2xl tracking-widest"
            data-testid="kiosk-pin-input"
            onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handlePinSubmit} data-testid="kiosk-pin-submit">
              <X className="w-4 h-4 mr-2" />
              Quitter le kiosque
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export { KIOSK_PIN };
