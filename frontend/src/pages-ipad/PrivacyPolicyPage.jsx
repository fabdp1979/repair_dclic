import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Loader2 } from "lucide-react";
import api from "../lib/api";

export default function PrivacyPolicyPage() {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/privacy-policy")
      .then((r) => setPolicy(r.data))
      .catch(() => setPolicy(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#84CC16]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12" data-testid="privacy-page">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-4">
          <Link
            to="/ipad"
            className="text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
            data-testid="privacy-back"
          >
            <ArrowLeft className="w-5 h-5" /> Retour
          </Link>
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-[#84CC16]" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {policy?.title || "Politique de confidentialité"}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <p className="text-base text-slate-500">
          Dernière mise à jour&nbsp;: avril 2026
        </p>

        {policy?.sections?.map((section, i) => (
          <section
            key={i}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
            data-testid={`privacy-section-${i}`}
          >
            <h2 className="text-xl font-bold text-slate-900 mb-3">{section.title}</h2>
            <p className="text-base text-slate-700 whitespace-pre-line leading-relaxed">
              {section.content}
            </p>
          </section>
        ))}

        <p className="text-sm text-slate-400 text-center pt-4">
          Pour toute question, contactez DCLIC Informatique au 05.55.73.57.20 ou par email à
          contact@d-clic-informatique.fr
        </p>
      </main>
    </div>
  );
}
