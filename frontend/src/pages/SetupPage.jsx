import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Wrench, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { useAuth } from "../contexts/AuthContext";
import { checkSetupRequired, setupAdmin } from "../lib/api";
import { toast } from "sonner";

export default function SetupPage() {
  const { isAuthenticated, setupSession } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Vérifie qu'aucun admin n'existe déjà
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await checkSetupRequired();
        if (!cancelled) {
          setAllowed(!!data?.required);
        }
      } catch {
        if (!cancelled) setAllowed(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#84CC16]" />
      </div>
    );
  }
  // Setup déjà fait → on renvoie vers /login
  if (!allowed) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { toast.error("Email requis"); return; }
    if (password.length < 8) { toast.error("Mot de passe trop court (8 caractères minimum)"); return; }
    if (password !== confirm) { toast.error("Les mots de passe ne correspondent pas"); return; }

    setSubmitting(true);
    try {
      const { data } = await setupAdmin({
        email: cleanEmail,
        password,
        name: name.trim() || "Administrateur",
      });
      setupSession(data);
      toast.success("Compte administrateur créé ! Bienvenue.");
      navigate("/", { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.detail || "Impossible de créer le compte";
      toast.error(typeof msg === "string" ? msg : "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md" data-testid="setup-page">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="w-14 h-14 rounded-2xl bg-[#84CC16] flex items-center justify-center">
              <Wrench className="w-7 h-7 text-white" />
            </div>
          </div>
          <CardTitle className="font-outfit text-2xl">
            Configuration initiale
          </CardTitle>
          <CardDescription className="text-slate-600 mt-2">
            Bienvenue sur DCLIC Informatique. Créez votre compte administrateur
            pour démarrer. Cet écran ne s'affichera qu'une seule fois.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="setup-name">Nom complet (optionnel)</Label>
              <Input
                id="setup-name"
                type="text"
                placeholder="Jean Dupont"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                data-testid="setup-name-input"
              />
            </div>

            <div>
              <Label htmlFor="setup-email">Email *</Label>
              <Input
                id="setup-email"
                type="email"
                placeholder="contact@votre-domaine.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                data-testid="setup-email-input"
              />
            </div>

            <div>
              <Label htmlFor="setup-password">Mot de passe *</Label>
              <div className="relative">
                <Input
                  id="setup-password"
                  type={showPwd ? "text" : "password"}
                  placeholder="8 caractères minimum"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  data-testid="setup-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="setup-confirm">Confirmer le mot de passe *</Label>
              <Input
                id="setup-confirm"
                type={showPwd ? "text" : "password"}
                placeholder="Retaper le mot de passe"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                data-testid="setup-confirm-input"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex gap-2">
              <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Conservez précieusement ces identifiants. Aucune procédure de
                récupération par email n'est proposée. En cas de perte, il
                faudra réinitialiser via le serveur (voir notice).
              </span>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#84CC16] hover:bg-[#84CC16]/90"
              disabled={submitting}
              data-testid="setup-submit-btn"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Création…</>
              ) : (
                "Créer le compte administrateur"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
