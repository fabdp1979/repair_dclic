import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Wrench, Wifi, WifiOff, Search } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useDeviceMode } from "../hooks/useDeviceMode";
import { ipadCurrent, ipadHeartbeat } from "../lib/api";

const POLL_INTERVAL_MS = 3000; // écran d'accueil : 3s
const HEARTBEAT_MS = 8000;
const OFFLINE_AFTER_MS = 15000;

export default function HomeIpadPage() {
  const navigate = useNavigate();
  const { setMode } = useDeviceMode();
  const [tracking, setTracking] = useState("");
  const [clock, setClock] = useState(new Date());
  const [online, setOnline] = useState(true);
  const lastOkRef = useRef(Date.now());
  const lastReparationIdRef = useRef(null);

  const poll = useCallback(async () => {
    try {
      const { data } = await ipadCurrent();
      lastOkRef.current = Date.now();
      setOnline(true);
      const newId = data?.reparation_id;
      if (newId && newId !== lastReparationIdRef.current) {
        lastReparationIdRef.current = newId;
        const fs = data.kiosk ? "?fullscreen=1" : "";
        navigate(`/signer/${newId}${fs}`);
      } else {
        lastReparationIdRef.current = newId || null;
      }
    } catch {
      if (Date.now() - lastOkRef.current > OFFLINE_AFTER_MS) setOnline(false);
    }
  }, [navigate]);

  // Polling assignation
  useEffect(() => {
    poll();
    const t = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [poll]);

  // Heartbeat pour indicateur "iPad en ligne" côté PC
  useEffect(() => {
    const send = () => { ipadHeartbeat().catch(() => {}); };
    send();
    const t = setInterval(send, HEARTBEAT_MS);
    return () => clearInterval(t);
  }, []);

  // Horloge
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  // Resync après retour de visibilité / focus (iPad réveillé)
  useEffect(() => {
    const onVisible = () => { if (!document.hidden) poll(); };
    const onOnline = () => poll();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onVisible);
    };
  }, [poll]);

  const goToSuivi = (e) => {
    e.preventDefault();
    if (tracking.trim()) navigate(`/suivi/${tracking.trim()}`);
  };

  const clockStr = clock.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center relative">
      <div className="w-20 h-20 rounded-2xl bg-[#84CC16] flex items-center justify-center mb-8 shadow-sm">
        <Wrench className="w-11 h-11 text-white" />
      </div>

      <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-3">
        DCLIC INFORMATIQUE
      </h1>
      <p className="text-xl text-slate-600 mb-12 max-w-xl">
        Bienvenue ! Veuillez remettre cet appareil au technicien.
      </p>

      <form onSubmit={goToSuivi} className="w-full max-w-md space-y-4">
        <div className="text-left">
          <label htmlFor="tracking" className="block text-lg font-semibold text-slate-800 mb-2">
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
          Passer en mode technicien
        </button>
      </div>

      {/* Horloge + état connexion discret en bas-droite */}
      <div
        className="fixed bottom-4 right-4 flex items-center gap-3 text-sm text-slate-400 select-none"
        data-testid="ipad-status-footer"
      >
        <span className="font-mono">{clockStr}</span>
        {online ? (
          <span className="inline-flex items-center gap-1 text-green-500" title="En ligne">
            <Wifi className="w-3.5 h-3.5" />
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-red-500" title="Hors ligne">
            <WifiOff className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </main>
  );
}
