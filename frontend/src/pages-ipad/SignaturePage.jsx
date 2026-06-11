import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import { CheckCircle2, Eraser, RotateCcw, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../components/ui/alert-dialog";
import FullscreenGuard from "../components/FullscreenGuard";
import {
  getReparationPublic, saveSignature, deleteSignature,
  ipadHeartbeat, ipadCurrent, ipadRelease,
} from "../lib/api";
import { formatDateFR } from "../lib/date";
import { toast } from "sonner";

const AFTER_SIGN_RETURN_MS = 5000; // retour /ipad après signature
const SIGNER_POLL_MS = 10000;      // polling lent pendant qu'on est sur /signer

const CONDITION_LABELS = {
  prise_en_charge: "Prise en charge du matériel",
  donnees: "Données et sauvegarde",
  tarifs: "Tarifs des réparations",
  devis: "Devis et diagnostic",
  recuperation: "Récupération de données",
  imprimantes: "Imprimantes",
  montage: "Montage et matériel Dclic",
  domicile: "Intervention à domicile",
  delais: "Délais",
  garantie: "Garantie",
  abandon: "Abandon du matériel",
  paiement: "Paiement",
  acceptation: "Acceptation",
  donnees_personnelles: "Données personnelles (RGPD)",
};

export default function SignaturePage() {
  const { reparationId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [differentSignataire, setDifferentSignataire] = useState(false);
  const [nomSignataire, setNomSignataire] = useState("");
  const [success, setSuccess] = useState(false);
  const sigRef = useRef(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reparationId]);

  // Heartbeat pendant qu'on est sur /signer (indicateur "iPad en ligne" PC)
  // 5s d'intervalle + relance immédiate sur visibilitychange/focus pour contrer
  // le throttling iOS Safari
  useEffect(() => {
    const send = () => { ipadHeartbeat().catch(() => {}); };
    send();
    const t = setInterval(send, 5000);
    const onVisible = () => { if (!document.hidden) send(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", send);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", send);
    };
  }, []);

  // Polling lent désactivé : depuis qu'on n'utilise plus l'assignation iPad,
  // /signer ne doit JAMAIS rediriger automatiquement — le client a tout son temps pour signer.
  // (Auparavant, ce hook refoulait le client vers /ipad au bout de 10s)

  // Retour auto après signature (5s) — uniquement en mode kiosque/terminal
  useEffect(() => {
    if (!success) return;
    const isKiosk = new URLSearchParams(window.location.search).get("fullscreen") === "1";
    if (!isKiosk) return;
    const t = setTimeout(() => navigate("/ipad"), AFTER_SIGN_RETURN_MS);
    return () => clearTimeout(t);
  }, [success, navigate]);

  const load = async () => {
    try {
      const { data: d } = await getReparationPublic(reparationId);
      setData(d);
    } catch {
      toast.error("Réparation introuvable");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    sigRef.current?.clear();
    setHasStrokes(false);
  };

  const handleResign = async () => {
    try {
      await deleteSignature(reparationId);
      await load();
      setAccepted(false);
      setShowResignConfirm(false);
      toast.success("Signature précédente effacée. Veuillez signer à nouveau.");
    } catch {
      toast.error("Erreur lors de la réinitialisation");
    }
  };

  const handleValidate = async () => {
    if (!accepted) {
      toast.error("Veuillez cocher la case pour valider les conditions");
      return;
    }
    if (!sigRef.current || sigRef.current.isEmpty()) {
      toast.error("Veuillez signer avant de valider");
      return;
    }
    const b64 = sigRef.current.toDataURL("image/png");
    setSaving(true);
    try {
      await saveSignature(reparationId, {
        signature_b64: b64,
        nom_signataire: differentSignataire ? nomSignataire.trim() || null : null,
        accepte_conditions: accepted,
      });
      setSuccess(true);
    } catch (e) {
      const msg = e.response?.data?.detail || "Erreur lors de l'enregistrement";
      toast.error(typeof msg === "string" ? msg : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#84CC16]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <AlertTriangle className="w-14 h-14 mx-auto text-red-500 mb-4" />
          <p className="text-slate-700 font-medium text-xl">Fiche de réparation introuvable</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <CheckCircle2 className="w-24 h-24 mx-auto text-[#84CC16] mb-6" />
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Merci !</h1>
          <p className="text-slate-600 text-2xl">Votre signature a été enregistrée avec succès.</p>
          <p className="text-slate-500 mt-6 text-lg">
            Vous pouvez rendre la tablette au technicien.
          </p>
        </div>
      </div>
    );
  }

  const alreadySigned = !!data.signature_b64;

  const content = (
    <div className="min-h-screen pb-12" data-testid="signature-page">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-slate-900">
              {data.company?.name || "DCLIC INFORMATIQUE"}
            </h1>
            <p className="text-base sm:text-lg text-slate-500 mt-1">
              Fiche n° <span className="font-mono text-[#84CC16] font-semibold">{data.numero}</span>
              {" — "}
              {formatDateFR(data.date_creation)}
            </p>
          </div>
          {alreadySigned && (
            <span className="hidden sm:inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-base font-medium border border-green-200">
              <CheckCircle2 className="w-5 h-5" />
              Déjà signé
            </span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* 0. État à la prise en charge (protection juridique) */}
        {(data.numero_serie || data.etat_depot) && (
          <section className="bg-amber-50 rounded-xl border-2 border-amber-300 shadow-sm" data-testid="section-etat-depot">
            <div className="px-8 py-6 border-b border-amber-200">
              <h2 className="text-2xl sm:text-3xl font-bold text-amber-900">
                État du matériel à la prise en charge
              </h2>
              <p className="text-base text-amber-800 mt-2">
                Merci de vérifier ces informations ; elles seront annexées à la fiche signée.
              </p>
            </div>
            <div className="px-8 py-6 space-y-4 text-lg text-slate-800">
              {data.numero_serie && (
                <div>
                  <span className="font-bold">N° de série : </span>
                  <span className="font-mono">{data.numero_serie}</span>
                </div>
              )}
              {data.etat_depot && (
                <div>
                  <div className="font-bold mb-1">Observations :</div>
                  <p className="whitespace-pre-wrap leading-relaxed">{data.etat_depot}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 1. Conditions (bloc principal) */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-8 py-6 border-b border-slate-200 bg-slate-50 rounded-t-xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Conditions de réparation
            </h2>
            <p className="text-lg text-slate-500 mt-2">
              Merci de lire attentivement avant de signer.
            </p>
          </div>
          <div className="px-8 py-8 space-y-7">
            {Object.entries(CONDITION_LABELS).map(
              ([key, label]) =>
                data.conditions?.[key] && (
                  <div key={key} data-testid={`condition-${key}`}>
                    <h3 className="font-bold text-slate-900 mb-2 text-xl">{label}</h3>
                    <p className="text-lg text-slate-700 leading-relaxed">
                      {data.conditions[key]}
                    </p>
                  </div>
                )
            )}
          </div>
        </section>

        {/* 2. Case à cocher obligatoire */}
        <section className={`rounded-xl border-4 shadow-md p-6 transition-all ${accepted ? "bg-green-50 border-[#84CC16]" : "bg-orange-50 border-orange-400"}`}>
          <label className="flex items-start gap-4 cursor-pointer">
            <Checkbox
              checked={accepted}
              onCheckedChange={(v) => setAccepted(!!v)}
              className="mt-1 w-7 h-7"
              data-testid="accept-conditions-checkbox"
            />
            <span className="text-slate-900 text-xl font-medium select-none leading-snug">
              Je reconnais avoir pris connaissance des conditions de réparation et je les accepte
              sans réserve.
            </span>
          </label>
        </section>

        {/* 3. Informations en rappel */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-base font-semibold uppercase tracking-wide text-slate-500 mb-4">
            Rappel des informations
          </h2>
          <div className="grid sm:grid-cols-2 gap-5 text-lg">
            <div>
              <p className="text-slate-500">Client</p>
              <p className="font-semibold text-slate-900">
                {data.client_prenom} {data.client_nom}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Téléphone</p>
              <p className="font-semibold text-slate-900">{data.client_telephone || "-"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-slate-500">Appareil</p>
              <p className="font-semibold text-slate-900">
                {data.materiel?.length ? data.materiel.join(", ") : "-"}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-slate-500">Problème</p>
              <p className="font-semibold text-slate-900">{data.description_panne || "-"}</p>
            </div>
            {data.urgence && (
              <div className="sm:col-span-2">
                <span className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1.5 rounded-full text-sm font-medium">
                  <AlertTriangle className="w-4 h-4" /> Réparation urgente (+25€)
                </span>
              </div>
            )}
          </div>
        </section>

        {/* 4. Signature */}
        {alreadySigned ? (
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
            <div className="flex items-center gap-4 mb-6">
              <CheckCircle2 className="w-10 h-10 text-[#84CC16]" />
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Signature déjà enregistrée</h2>
                <p className="text-base text-slate-500 mt-1">
                  {data.nom_signataire ? `Par ${data.nom_signataire} ` : ""}
                  le {formatDateFR(data.date_signature)}
                </p>
              </div>
            </div>
            <div className="bg-slate-50 rounded border border-slate-200 p-5 inline-block">
              <img src={data.signature_b64} alt="Signature" className="max-h-32" />
            </div>
            <div className="mt-6">
              <Button
                type="button"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 h-14 text-lg px-6"
                onClick={() => setShowResignConfirm(true)}
                data-testid="resign-btn"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Re-signer (efface la précédente)
              </Button>
            </div>
          </section>
        ) : (
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Votre signature</h2>
              <p className="text-lg text-slate-500">
                Signez dans la zone ci-dessous avec votre doigt (ou la souris).
              </p>
            </div>

            <div
              className={`border-2 rounded-xl overflow-hidden transition ${
                accepted ? "border-[#84CC16]" : "border-slate-200 opacity-60"
              }`}
            >
              <SignatureCanvas
                ref={sigRef}
                canvasProps={{
                  className: "w-full h-[320px] bg-white cursor-crosshair touch-none",
                  "data-testid": "signature-canvas",
                }}
                penColor="#0F172A"
                onEnd={() => setHasStrokes(true)}
                backgroundColor="#FFFFFF"
              />
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={differentSignataire}
                  onCheckedChange={(v) => setDifferentSignataire(!!v)}
                  className="w-6 h-6"
                  data-testid="different-signataire-checkbox"
                />
                <span className="text-lg text-slate-700">
                  Le signataire est différent du client
                </span>
              </label>
              {differentSignataire && (
                <div>
                  <Label htmlFor="nom-signataire" className="text-base">
                    Nom du signataire
                  </Label>
                  <Input
                    id="nom-signataire"
                    value={nomSignataire}
                    onChange={(e) => setNomSignataire(e.target.value)}
                    placeholder="Ex : Marie Dupont (conjoint)"
                    className="h-14 text-lg"
                    data-testid="nom-signataire-input"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={!hasStrokes}
                className="h-[72px] text-xl sm:w-52"
                data-testid="clear-signature-btn"
              >
                <Eraser className="w-6 h-6 mr-2" />
                Effacer
              </Button>
              <Button
                type="button"
                className="flex-1 bg-[#84CC16] hover:bg-[#65A30D] text-white text-2xl h-[72px] disabled:opacity-50"
                onClick={handleValidate}
                disabled={!accepted || !hasStrokes || saving}
                data-testid="validate-signature-btn"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  "Valider la signature"
                )}
              </Button>
            </div>

            <p className="text-base text-slate-500 text-center pt-1 leading-relaxed">
              En signant, vous acceptez les conditions de réparation et la{" "}
              <a
                href="/confidentialite"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#84CC16] hover:underline font-semibold"
                data-testid="privacy-link"
              >
                politique de confidentialité
              </a>
              .
            </p>

            {(!accepted || !hasStrokes) && (
              <p className="text-base text-slate-500 text-center">
                {!accepted
                  ? "⚠ Cochez la case des conditions pour activer la signature"
                  : "⚠ Dessinez votre signature pour pouvoir valider"}
              </p>
            )}
          </section>
        )}
      </main>

      <AlertDialog open={showResignConfirm} onOpenChange={setShowResignConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la re-signature ?</AlertDialogTitle>
            <AlertDialogDescription>
              La signature précédente sera définitivement effacée. Cette action est irréversible.
              Voulez-vous continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleResign} className="bg-red-500 hover:bg-red-600">
              Oui, effacer et re-signer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return <FullscreenGuard>{content}</FullscreenGuard>;
}
