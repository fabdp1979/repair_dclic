import { useEffect, useRef, useState } from "react";
import { Settings as SettingsIcon, Upload, Trash2, Image as ImageIcon } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { getAdBanner, putAdBanner, deleteAdBanner } from "../lib/api";
import { toast } from "sonner";
import { formatDateTimeFR } from "../lib/date";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function ParametresPage() {
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const refresh = async () => {
    try {
      const { data } = await getAdBanner();
      setBanner(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleFile = async (file) => {
    if (!file) return;
    if (!/image\/(jpeg|jpg|png|webp)/i.test(file.type)) {
      toast.error("Format non supporté (JPG, PNG ou WebP uniquement)");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image trop lourde (max 3 Mo)");
      return;
    }
    try {
      setUploading(true);
      const b64 = await fileToBase64(file);
      await putAdBanner(b64);
      toast.success("Bannière mise à jour");
      await refresh();
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message || "Erreur upload";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Supprimer la bannière publicitaire ?")) return;
    try {
      await deleteAdBanner();
      toast.success("Bannière supprimée");
      await refresh();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <div className="space-y-6" data-testid="parametres-page">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-7 h-7 text-[#84CC16]" />
        <div>
          <h1 className="font-outfit text-3xl font-bold text-slate-900">Paramètres</h1>
          <p className="text-slate-500 text-sm">Configuration de l'application</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-outfit flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#84CC16]" />
            Bannière publicitaire (fiche compte-rendu)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-slate-600">
            Cette image apparaît au bas de chaque <strong>fiche compte rendu</strong> remise au client après la réparation.
            Format recommandé : 1600 × 400 px (bannière horizontale), JPG ou PNG, max 3 Mo.
          </p>

          {loading ? (
            <div className="text-slate-400 text-sm">Chargement…</div>
          ) : banner?.exists ? (
            <div className="space-y-3">
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 p-3">
                <img
                  src={banner.image_b64}
                  alt="Bannière publicitaire"
                  className="max-w-full max-h-72 mx-auto block"
                  data-testid="ad-banner-preview"
                />
              </div>
              {banner.updated_at && (
                <p className="text-xs text-slate-500">
                  Dernière mise à jour : {formatDateTimeFR(banner.updated_at)}
                </p>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  data-testid="ad-banner-replace-btn"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Remplacer
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={handleDelete}
                  disabled={uploading}
                  data-testid="ad-banner-delete-btn"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-slate-300 rounded-lg p-10 text-center cursor-pointer hover:border-[#84CC16] hover:bg-[#84CC16]/5 transition"
              onClick={() => fileRef.current?.click()}
              data-testid="ad-banner-upload-zone"
            >
              <Upload className="w-10 h-10 mx-auto text-slate-400 mb-3" />
              <p className="text-slate-700 font-medium">Cliquez pour uploader une bannière</p>
              <p className="text-slate-500 text-sm mt-1">JPG, PNG ou WebP, max 3 Mo</p>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
            data-testid="ad-banner-file-input"
          />
        </CardContent>
      </Card>
    </div>
  );
}
