import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Wrench, CheckCircle, Clock, AlertTriangle, Package } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { getPublicTracking } from "../lib/api";
import { formatDateFR } from "../lib/date";

const STATUTS_PROGRESSION = [
  { key: "Réparation enregistrée", label: "Enregistrée", icon: Package },
  { key: "En cours de diagnostic", label: "Diagnostic", icon: Clock },
  { key: "En attente pièce/intervention", label: "En attente", icon: AlertTriangle },
  { key: "En cours de réparation", label: "Réparation", icon: Wrench },
  { key: "Appareil prêt", label: "Prêt", icon: CheckCircle }
];

export default function SuiviPage() {
  const { trackingId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTracking();
  }, [trackingId]);

  const loadTracking = async () => {
    try {
      const response = await getPublicTracking(trackingId);
      setData(response.data);
    } catch (err) {
      setError("Réparation non trouvée. Vérifiez votre lien de suivi.");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStep = () => {
    if (!data) return -1;
    return STATUTS_PROGRESSION.findIndex(s => s.key === data.statut);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="font-outfit text-xl font-bold text-slate-900 mb-2">
              Réparation non trouvée
            </h1>
            <p className="text-slate-500 text-sm">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStep = getCurrentStep();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-[#0F172A] text-white py-6">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-10 h-10 bg-[#84CC16] rounded-lg flex items-center justify-center">
              <Wrench className="w-6 h-6" />
            </div>
            <span className="font-outfit font-bold text-xl">DCLIC INFORMATIQUE</span>
          </div>
          <p className="text-slate-400 text-sm">Suivi de votre réparation</p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            {/* Repair info */}
            <div className="text-center mb-8">
              <span className="font-mono text-lg text-[#84CC16] font-bold">{data.numero}</span>
              <h2 className="font-outfit text-2xl font-bold text-slate-900 mt-2">
                Bonjour {data.client_prenom} {data.client_nom}
              </h2>
              <p className="text-slate-500 mt-1">Dépôt le {formatDateFR(data.date_depot)}</p>
              {data.urgence && (
                <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm mt-2">
                  <AlertTriangle className="w-4 h-4" />
                  Réparation urgente
                </span>
              )}
            </div>

            {/* Materiel */}
            {data.materiel && data.materiel.length > 0 && (
              <div className="mb-8">
                <h3 className="font-semibold text-slate-700 mb-2">Matériel déposé</h3>
                <div className="flex flex-wrap gap-2">
                  {data.materiel.map((m, i) => (
                    <span key={i} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Progress */}
            <div className="mb-8">
              <h3 className="font-semibold text-slate-700 mb-4">Avancement</h3>
              <div className="relative">
                {/* Progress line */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />
                
                {STATUTS_PROGRESSION.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted = index <= currentStep;
                  const isCurrent = index === currentStep;
                  
                  return (
                    <div key={step.key} className="relative flex items-center gap-4 pb-6 last:pb-0">
                      <div className={`
                        relative z-10 w-10 h-10 rounded-full flex items-center justify-center
                        ${isCompleted 
                          ? isCurrent 
                            ? 'bg-[#84CC16] text-white' 
                            : 'bg-[#84CC16]/20 text-[#84CC16]'
                          : 'bg-slate-100 text-slate-400'
                        }
                      `}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                          {step.label}
                        </p>
                        {isCurrent && (
                          <p className="text-sm text-[#84CC16] mt-0.5">Étape actuelle</p>
                        )}
                      </div>
                      {isCompleted && !isCurrent && (
                        <CheckCircle className="w-5 h-5 text-[#84CC16]" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current status highlight */}
            <div className={`
              p-4 rounded-lg text-center
              ${data.statut === "Appareil prêt" ? 'bg-green-100' : 'bg-blue-50'}
            `}>
              <p className={`font-semibold ${data.statut === "Appareil prêt" ? 'text-green-700' : 'text-blue-700'}`}>
                {data.statut === "Appareil prêt" 
                  ? "Votre appareil est prêt ! Vous pouvez venir le récupérer."
                  : `Statut actuel : ${data.statut}`
                }
              </p>
            </div>

            {/* Contact */}
            <div className="mt-8 pt-6 border-t border-slate-200 text-center">
              <p className="text-slate-500 text-sm">Une question ?</p>
              <p className="font-semibold text-slate-900">05.55.73.57.20</p>
              <p className="text-sm text-slate-500">contact@d-clic-informatique.fr</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
