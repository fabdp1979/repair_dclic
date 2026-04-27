import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Wrench, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

export default function LoginPage() {
  const { isAuthenticated, login, loading: authLoading } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#84CC16]" />
      </div>
    );
  }

  if (isAuthenticated) {
    const redirectTo = location.state?.from?.pathname || "/";
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Veuillez saisir vos identifiants");
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      toast.success("Connexion réussie");
    } catch (err) {
      const msg = err.response?.data?.detail || "Identifiants invalides";
      toast.error(typeof msg === "string" ? msg : "Erreur de connexion");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-[#84CC16] items-center justify-center mb-4 shadow-sm">
            <Wrench className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">DCLIC INFORMATIQUE</h1>
          <p className="text-slate-500 mt-1">Espace technicien</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-outfit text-xl">Connexion</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
              <div>
                <Label htmlFor="email">Identifiant</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@dclic.fr"
                  data-testid="login-email-input"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    data-testid="login-password-input"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    aria-label="Afficher le mot de passe"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-[#84CC16] hover:bg-[#65A30D] text-white"
                disabled={submitting}
                data-testid="login-submit-btn"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-slate-400 text-center mt-6">
          Espace réservé au personnel DCLIC Informatique
        </p>
      </div>
    </div>
  );
}
