import { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  Download,
  Calendar,
  BookOpen
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { 
  getCaisseEntries, 
  createCaisseEntry, 
  deleteCaisseEntry,
  exportCaisseExcel
} from "../lib/api";
import { toast } from "sonner";

const emptyEntry = {
  type: "entree",
  montant: "",
  description: "",
  mode_paiement: ""
};

const modesPaiement = [
  { value: "especes", label: "Espèces" },
  { value: "cb", label: "Carte bancaire" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement" }
];

export default function CaissePage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [formData, setFormData] = useState(emptyEntry);
  const [saving, setSaving] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    loadEntries();
  }, [dateFrom, dateTo]);

  const loadEntries = async () => {
    try {
      const response = await getCaisseEntries(dateFrom, dateTo);
      setEntries(response.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des données");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const totalEntrees = entries
      .filter(e => e.type === "entree")
      .reduce((sum, e) => sum + e.montant, 0);
    const totalSorties = entries
      .filter(e => e.type === "sortie")
      .reduce((sum, e) => sum + e.montant, 0);
    return { totalEntrees, totalSorties, solde: totalEntrees - totalSorties };
  };

  const handleOpenDialog = (type = "entree") => {
    setFormData({ ...emptyEntry, type });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData(emptyEntry);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.montant || !formData.description.trim()) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }

    setSaving(true);
    try {
      await createCaisseEntry({
        ...formData,
        montant: parseFloat(formData.montant)
      });
      toast.success(`${formData.type === "entree" ? "Entrée" : "Sortie"} enregistrée`);
      handleCloseDialog();
      loadEntries();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;
    
    try {
      await deleteCaisseEntry(selectedEntry.id);
      toast.success("Entrée supprimée");
      setDeleteDialogOpen(false);
      setSelectedEntry(null);
      loadEntries();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    }
  };

  const openDeleteDialog = (entry) => {
    setSelectedEntry(entry);
    setDeleteDialogOpen(true);
  };

  const handleExportExcel = () => {
    window.open(exportCaisseExcel(dateFrom, dateTo), '_blank');
  };

  const formatDate = (isoDate) => {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const { totalEntrees, totalSorties, solde } = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="caisse-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Journal de caisse
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Suivi des entrées et sorties de caisse
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleExportExcel}
            data-testid="export-caisse-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button 
            variant="outline"
            className="text-green-600 border-green-200 hover:bg-green-50"
            onClick={() => handleOpenDialog("entree")}
            data-testid="add-entree-btn"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Entrée
          </Button>
          <Button 
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => handleOpenDialog("sortie")}
            data-testid="add-sortie-btn"
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            Sortie
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-green-200 bg-green-50" data-testid="total-entrees">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-700">Total entrées</p>
                <p className="font-mono text-xl font-semibold text-green-800">
                  {totalEntrees.toFixed(2)} €
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50" data-testid="total-sorties">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-red-700">Total sorties</p>
                <p className="font-mono text-xl font-semibold text-red-800">
                  {totalSorties.toFixed(2)} €
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200" data-testid="solde-caisse">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <span className="text-slate-700 font-bold">=</span>
              </div>
              <div>
                <p className="text-sm text-slate-600">Solde</p>
                <p className={`font-mono text-xl font-semibold ${solde >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {solde.toFixed(2)} €
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="dateFrom" className="text-sm text-slate-600 mb-1 block">
                Du
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-10"
                  data-testid="date-from-input"
                />
              </div>
            </div>
            <div className="flex-1">
              <Label htmlFor="dateTo" className="text-sm text-slate-600 mb-1 block">
                Au
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-10"
                  data-testid="date-to-input"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              data-testid="clear-dates-btn"
            >
              Effacer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Entries List */}
      <Card data-testid="caisse-entries-list">
        <CardHeader className="pb-2">
          <CardTitle className="font-outfit text-lg">Historique</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="empty-state py-8">
              <BookOpen className="w-12 h-12 empty-state-icon" />
              <p className="empty-state-title">Aucune entrée</p>
              <p className="empty-state-description">
                Commencez par enregistrer une entrée ou une sortie de caisse
              </p>
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline"
                  className="text-green-600 border-green-200 hover:bg-green-50"
                  onClick={() => handleOpenDialog("entree")}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Entrée
                </Button>
                <Button 
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleOpenDialog("sortie")}
                >
                  <TrendingDown className="w-4 h-4 mr-2" />
                  Sortie
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Mode</th>
                    <th className="text-right">Montant</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} data-testid={`caisse-entry-${entry.id}`}>
                      <td className="font-mono text-xs text-slate-600">
                        {formatDate(entry.date)}
                      </td>
                      <td>
                        <span className={`badge ${
                          entry.type === "entree" 
                            ? "bg-green-100 text-green-700 border-green-200" 
                            : "bg-red-100 text-red-700 border-red-200"
                        }`}>
                          {entry.type === "entree" ? (
                            <TrendingUp className="w-3 h-3 mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1" />
                          )}
                          {entry.type === "entree" ? "Entrée" : "Sortie"}
                        </span>
                      </td>
                      <td className="text-slate-700">{entry.description}</td>
                      <td className="text-slate-500 capitalize">{entry.mode_paiement || "-"}</td>
                      <td className={`text-right font-mono font-semibold ${
                        entry.type === "entree" ? "text-green-600" : "text-red-600"
                      }`}>
                        {entry.type === "entree" ? "+" : "-"}{entry.montant.toFixed(2)} €
                      </td>
                      <td className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => openDeleteDialog(entry)}
                          data-testid={`delete-entry-${entry.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entry Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" data-testid="caisse-dialog">
          <DialogHeader>
            <DialogTitle className="font-outfit flex items-center gap-2">
              {formData.type === "entree" ? (
                <>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Nouvelle entrée
                </>
              ) : (
                <>
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  Nouvelle sortie
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="montant">Montant (€) *</Label>
                <Input
                  id="montant"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.montant}
                  onChange={(e) => setFormData({...formData, montant: e.target.value})}
                  placeholder="0.00"
                  required
                  data-testid="caisse-montant-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Ex: Réparation PC, Achat pièces..."
                  required
                  data-testid="caisse-description-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Mode de paiement</Label>
                <Select
                  value={formData.mode_paiement}
                  onValueChange={(value) => setFormData({...formData, mode_paiement: value})}
                >
                  <SelectTrigger data-testid="caisse-mode-select">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {modesPaiement.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                data-testid="caisse-cancel-btn"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className={formData.type === "entree" 
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
                }
                disabled={saving}
                data-testid="caisse-save-btn"
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="delete-caisse-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette entrée ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'entrée sera définitivement supprimée du journal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-caisse-cancel">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
              data-testid="delete-caisse-confirm"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
