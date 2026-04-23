import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
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
import { getReparationPublic, saveSignature, deleteSignature } from "../lib/api";
import { toast } from "sonner";

const CONDITION_LABELS = {
  prise_en_charge: "Prise en charge du matériel",
  delais: "Délais",
  devis: "Devis",
  tarifs: "Tarifs",
  reglement: "Règlement",
  garantie: "Garantie",
  abandon: "Abandon",
  contestations: "Contestations",
};

export default function SignaturePage() {
  const { reparationId } = useParams();
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

  const load = async () => {
    try {
      const { data: d } = await getReparationPublic(reparationId);
      setData(d);
    } catch (e) {
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
    } catch (e) {
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
    const b64 = sigRef.current.getTrimmedCanvas().toDataURL("image/png");
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#84CC16]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <p className="text-slate-700 font-medium">Fiche de réparation introuvable</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
        <div className="text-center max-w-md">
          <CheckCircle2 className="w-20 h-20 mx-auto text-[#84CC16] mb-4" />
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Merci !</h1>
          <p className="text-slate-600 text-lg">
            Votre signature a été enregistrée avec succès.
          </p>
          <p className="text-slate-500 mt-4 text-sm">
            Vous pouvez rendre la tablette au technicien.
          </p>
        </div>
      </div>
    );
  }

  const alreadySigned = !!data.signature_b64;

  return (
    <div className="min-h-screen bg-slate-50 pb-8" data-testid="signature-page">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900">
              {data.company?.name || "DCLIC INFORMATIQUE"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Fiche n° <span className="font-mono text-[#84CC16] font-semibold">{data.numero}</span>
              {" — "}
              {data.date_creation}
            </p>
          </div>
          {alreadySigned && (
            <span className="hidden sm:inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium border border-green-200">
              <CheckCircle2 className="w-4 h-4" />
              Déjà signé
            </span>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 1. Conditions (bloc principal) */}
        <section className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Conditions de réparation
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Merci de lire attentivement avant de signer.
            </p>
          </div>
          <div className="px-6 py-6 max-h-[420px] overflow-y-auto space-y-5">
            {Object.entries(CONDITION_LABELS).map(([key, label]) => (
              data.conditions?.[key] && (
                <div key={key} data-testid={`condition-${key}`}>
                  <h3 className="font-semibold text-slate-900 mb-1">{label}</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {data.conditions[key]}
                  </p>
                </div>
              )
            ))}
          </div>
        </section>

        {/* 2. Case à cocher obligatoire */}
        <section className="bg-white rounded-lg border-2 border-[#84CC16] shadow-sm p-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={accepted}
              onCheckedChange={(v) => setAccepted(!!v)}
              className="mt-1 w-6 h-6"
              data-testid="accept-conditions-checkbox"
            />
            <span className="text-slate-900 text-base sm:text-lg font-medium select-none">
              Je reconnais avoir pris connaissance des conditions de réparation
              et je les accepte sans réserve.
            </span>
          </label>
        </section>

        {/* 3. Informations en rappel */}
        <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Rappel des informations
          </h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-500">Client</p>
              <p className="font-medium text-slate-900">{data.client_prenom} {data.client_nom}</p>
            </div>
            <div>
              <p className="text-slate-500">Téléphone</p>
              <p className="font-medium text-slate-900">{data.client_telephone || "-"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-slate-500">Appareil</p>
              <p className="font-medium text-slate-900">
                {data.materiel?.length ? data.materiel.join(", ") : "-"}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-slate-500">Problème</p>
              <p className="font-medium text-slate-900">{data.description_panne || "-"}</p>
            </div>
            {data.urgence && (
              <div className="sm:col-span-2">
                <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                  <AlertTriangle className="w-3 h-3" /> Réparation urgente (+25€)
                </span>
              </div>
            )}
          </div>
        </section>

        {/* 4. Signature */}
        {alreadySigned ? (
          <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-6 h-6 text-[#84CC16]" />
              <div>
                <h2 className="text-lg font-bold text-slate-900">Signature déjà enregistrée</h2>
                <p className="text-sm text-slate-500">
                  {data.nom_signataire ? `Par ${data.nom_signataire} ` : ""}
                  le {data.date_signature?.slice(0, 10)}
                </p>
              </div>
            </div>
            <div className="bg-slate-50 rounded border border-slate-200 p-4 inline-block">
              <img src={data.signature_b64} alt="Signature" className="max-h-24" />
            </div>
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setShowResignConfirm(true)}
                data-testid="resign-btn"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Re-signer (efface la précédente)
              </Button>
            </div>
          </section>
        ) : (
          <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Votre signature</h2>
              <p className="text-sm text-slate-500">
                Signez dans la zone ci-dessous avec votre doigt (ou la souris).
              </p>
            </div>

            <div className={`border-2 rounded-lg overflow-hidden ${accepted ? "border-[#84CC16]" : "border-slate-200 opacity-60"}`}>
              <SignatureCanvas
                ref={sigRef}
                canvasProps={{
                  className: "w-full h-48 sm:h-56 bg-white cursor-crosshair touch-none",
                  "data-testid": "signature-canvas",
                }}
                penColor="#0F172A"
                onEnd={() => setHasStrokes(true)}
                backgroundColor="#FFFFFF"
              />
            </div>

            {/* Signataire différent */}
            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={differentSignataire}
                  onCheckedChange={(v) => setDifferentSignataire(!!v)}
                  data-testid="different-signataire-checkbox"
                />
                <span className="text-sm text-slate-700">
                  Le signataire est différent du client
                </span>
              </label>
              {differentSignataire && (
                <div>
                  <Label htmlFor="nom-signataire" className="text-sm">Nom du signataire</Label>
                  <Input
                    id="nom-signataire"
                    value={nomSignataire}
                    onChange={(e) => setNomSignataire(e.target.value)}
                    placeholder="Ex : Marie Dupont (conjoint)"
                    data-testid="nom-signataire-input"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleClear}
                disabled={!hasStrokes}
                className="sm:w-40"
                data-testid="clear-signature-btn"
              >
                <Eraser className="w-5 h-5 mr-2" />
                Effacer
              </Button>
              <Button
                type="button"
                size="lg"
                className="flex-1 bg-[#84CC16] hover:bg-[#65A30D] text-white text-lg py-6 disabled:opacity-50"
                onClick={handleValidate}
                disabled={!accepted || !hasStrokes || saving}
                data-testid="validate-signature-btn"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  "Valider la signature"
                )}
              </Button>
            </div>
            {(!accepted || !hasStrokes) && (
              <p className="text-xs text-slate-500 text-center">
                {!accepted
                  ? "⚠ Cochez la case des conditions pour activer la signature"
                  : "⚠ Dessinez votre signature pour pouvoir valider"}
              </p>
            )}
          </section>
        )}
      </main>

      {/* Confirm re-sign */}
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
}
