import { useState, useEffect, useCallback } from "react";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  Send, 
  CheckCircle,
  Wrench,
  Download,
  X,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  getReparations, 
  createReparation, 
  updateReparation, 
  deleteReparation,
  getClients,
  getClientPdfUrl,
  getInternalPdfUrl,
  sendRepairEmail,
  exportReparationsExcel
} from "../lib/api";
import { toast } from "sonner";
import Fuse from "fuse.js";

const emptyReparation = {
  client_id: "",
  marque: "",
  modele: "",
  mot_de_passe: "",
  probleme_declare: "",
  diagnostic: "",
  action_realisee: "",
  prix: "",
  statut: "En cours"
};

export default function ReparationsPage() {
  const [reparations, setReparations] = useState([]);
  const [filteredReparations, setFilteredReparations] = useState([]);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReparation, setSelectedReparation] = useState(null);
  const [formData, setFormData] = useState(emptyReparation);
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [repairsRes, clientsRes] = await Promise.all([
        getReparations(),
        getClients()
      ]);
      setReparations(repairsRes.data);
      setFilteredReparations(repairsRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des données");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and search
  const applyFilters = useCallback((searchTerm, status) => {
    let filtered = [...reparations];

    // Apply status filter
    if (status !== "all") {
      filtered = filtered.filter(r => r.statut === status);
    }

    // Apply search
    if (searchTerm.trim()) {
      const fuse = new Fuse(filtered, {
        keys: ['numero', 'client_nom', 'client_prenom', 'marque', 'modele'],
        threshold: 0.4,
        includeScore: true
      });
      filtered = fuse.search(searchTerm).map(r => r.item);
    }

    setFilteredReparations(filtered);
  }, [reparations]);

  useEffect(() => {
    applyFilters(search, statusFilter);
  }, [search, statusFilter, applyFilters]);

  const handleOpenDialog = (reparation = null) => {
    if (reparation) {
      setSelectedReparation(reparation);
      setFormData({
        client_id: reparation.client_id,
        marque: reparation.marque,
        modele: reparation.modele,
        mot_de_passe: reparation.mot_de_passe || "",
        probleme_declare: reparation.probleme_declare,
        diagnostic: reparation.diagnostic || "",
        action_realisee: reparation.action_realisee || "",
        prix: reparation.prix?.toString() || "",
        statut: reparation.statut
      });
    } else {
      setSelectedReparation(null);
      setFormData(emptyReparation);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedReparation(null);
    setFormData(emptyReparation);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.marque.trim() || !formData.modele.trim() || !formData.probleme_declare.trim()) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }

    setSaving(true);
    try {
      const dataToSend = {
        ...formData,
        prix: formData.prix ? parseFloat(formData.prix) : null
      };

      if (selectedReparation) {
        await updateReparation(selectedReparation.id, dataToSend);
        toast.success("Réparation modifiée avec succès");
      } else {
        await createReparation(dataToSend);
        toast.success("Réparation créée avec succès");
      }
      handleCloseDialog();
      loadData();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedReparation) return;
    
    try {
      await deleteReparation(selectedReparation.id);
      toast.success("Réparation supprimée");
      setDeleteDialogOpen(false);
      setSelectedReparation(null);
      loadData();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    }
  };

  const openDeleteDialog = (reparation) => {
    setSelectedReparation(reparation);
    setDeleteDialogOpen(true);
  };

  const handleMarkComplete = async (reparation) => {
    try {
      await updateReparation(reparation.id, { statut: "Terminé" });
      toast.success("Réparation marquée comme terminée");
      loadData();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
    }
  };

  const handleSendEmail = async (reparation) => {
    if (!reparation.client_email) {
      toast.error("Ce client n'a pas d'adresse email");
      return;
    }

    setSendingEmail(reparation.id);
    try {
      await sendRepairEmail(reparation.id);
      toast.success(`Email envoyé à ${reparation.client_email}`);
    } catch (error) {
      const message = error.response?.data?.detail || "Erreur lors de l'envoi";
      toast.error(message);
      console.error(error);
    } finally {
      setSendingEmail(null);
    }
  };

  const handleExportExcel = () => {
    window.open(exportReparationsExcel(), '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="reparations-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Réparations
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {reparations.length} fiche{reparations.length > 1 ? 's' : ''} de réparation
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleExportExcel}
            data-testid="export-excel-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button 
            className="bg-[#84CC16] hover:bg-[#65A30D] text-white gap-2"
            onClick={() => handleOpenDialog()}
            data-testid="add-reparation-btn"
          >
            <Plus className="w-4 h-4" />
            Nouvelle fiche
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Rechercher par n°, client, appareil..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="reparation-search-input"
              />
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
              <TabsList data-testid="status-filter-tabs">
                <TabsTrigger value="all" data-testid="filter-all">Toutes</TabsTrigger>
                <TabsTrigger value="En cours" data-testid="filter-en-cours">En cours</TabsTrigger>
                <TabsTrigger value="Terminé" data-testid="filter-termine">Terminées</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Reparations List */}
      <Card data-testid="reparations-list">
        <CardHeader className="pb-2">
          <CardTitle className="font-outfit text-lg">Fiches de réparation</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReparations.length === 0 ? (
            <div className="empty-state py-8">
              <Wrench className="w-12 h-12 empty-state-icon" />
              <p className="empty-state-title">
                {search || statusFilter !== "all" ? "Aucun résultat" : "Aucune réparation"}
              </p>
              <p className="empty-state-description">
                {search || statusFilter !== "all"
                  ? "Essayez avec d'autres filtres"
                  : "Commencez par créer une nouvelle fiche"
                }
              </p>
              {!search && statusFilter === "all" && (
                <Button 
                  className="mt-4 bg-[#84CC16] hover:bg-[#65A30D] text-white gap-2"
                  onClick={() => handleOpenDialog()}
                >
                  <Plus className="w-4 h-4" />
                  Nouvelle fiche
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReparations.map((reparation) => (
                <div 
                  key={reparation.id}
                  className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  data-testid={`reparation-card-${reparation.id}`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm font-semibold text-[#84CC16]">
                          {reparation.numero}
                        </span>
                        <span className={`badge ${
                          reparation.statut === "Terminé" 
                            ? "status-termine" 
                            : "status-en-cours"
                        }`}>
                          {reparation.statut === "Terminé" ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <Clock className="w-3 h-3 mr-1" />
                          )}
                          {reparation.statut}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                        <div>
                          <p className="text-slate-500">Client</p>
                          <p className="font-medium text-slate-900">
                            {reparation.client_prenom} {reparation.client_nom}
                          </p>
                          <p className="text-xs text-slate-500">{reparation.client_telephone}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Appareil</p>
                          <p className="font-medium text-slate-900">
                            {reparation.marque} {reparation.modele}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Problème</p>
                          <p className="text-slate-700 truncate">{reparation.probleme_declare}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Prix</p>
                          <p className="font-mono font-semibold text-slate-900">
                            {reparation.prix ? `${reparation.prix.toFixed(2)} €` : '-'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 lg:flex-nowrap">
                      {reparation.statut !== "Terminé" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => handleMarkComplete(reparation)}
                          data-testid={`complete-btn-${reparation.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Terminer
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getClientPdfUrl(reparation.id), '_blank')}
                        data-testid={`pdf-client-btn-${reparation.id}`}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        PDF Client
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getInternalPdfUrl(reparation.id), '_blank')}
                        data-testid={`pdf-interne-btn-${reparation.id}`}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        PDF Interne
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => handleSendEmail(reparation)}
                        disabled={sendingEmail === reparation.id || !reparation.client_email}
                        data-testid={`send-email-btn-${reparation.id}`}
                      >
                        {sendingEmail === reparation.id ? (
                          <div className="spinner mr-1" />
                        ) : (
                          <Send className="w-4 h-4 mr-1" />
                        )}
                        Email
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(reparation)}
                        data-testid={`edit-btn-${reparation.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => openDeleteDialog(reparation)}
                        data-testid={`delete-btn-${reparation.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reparation Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="reparation-dialog">
          <DialogHeader>
            <DialogTitle className="font-outfit">
              {selectedReparation ? `Modifier ${selectedReparation.numero}` : "Nouvelle fiche de réparation"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Client Selection */}
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({...formData, client_id: value})}
                  required
                >
                  <SelectTrigger data-testid="client-select">
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.prenom} {client.nom} - {client.telephone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {clients.length === 0 && (
                  <p className="text-xs text-amber-600">
                    Aucun client disponible. Créez d'abord un client.
                  </p>
                )}
              </div>

              {/* Device Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marque">Marque *</Label>
                  <Input
                    id="marque"
                    value={formData.marque}
                    onChange={(e) => setFormData({...formData, marque: e.target.value})}
                    placeholder="Ex: HP, Dell, Apple..."
                    required
                    data-testid="marque-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modele">Modèle *</Label>
                  <Input
                    id="modele"
                    value={formData.modele}
                    onChange={(e) => setFormData({...formData, modele: e.target.value})}
                    placeholder="Ex: Pavilion 15, MacBook Pro..."
                    required
                    data-testid="modele-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mot_de_passe">Mot de passe appareil</Label>
                <Input
                  id="mot_de_passe"
                  value={formData.mot_de_passe}
                  onChange={(e) => setFormData({...formData, mot_de_passe: e.target.value})}
                  placeholder="Mot de passe de session"
                  data-testid="mot-de-passe-input"
                />
                <p className="text-xs text-slate-500">
                  Ce champ n'apparaît que sur la fiche interne
                </p>
              </div>

              {/* Problem */}
              <div className="space-y-2">
                <Label htmlFor="probleme_declare">Problème déclaré *</Label>
                <Textarea
                  id="probleme_declare"
                  value={formData.probleme_declare}
                  onChange={(e) => setFormData({...formData, probleme_declare: e.target.value})}
                  placeholder="Décrivez le problème signalé par le client"
                  rows={3}
                  required
                  data-testid="probleme-input"
                />
              </div>

              {/* Diagnostic & Action */}
              <div className="space-y-2">
                <Label htmlFor="diagnostic">Diagnostic</Label>
                <Textarea
                  id="diagnostic"
                  value={formData.diagnostic}
                  onChange={(e) => setFormData({...formData, diagnostic: e.target.value})}
                  placeholder="Votre diagnostic technique"
                  rows={2}
                  data-testid="diagnostic-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="action_realisee">Action réalisée</Label>
                <Textarea
                  id="action_realisee"
                  value={formData.action_realisee}
                  onChange={(e) => setFormData({...formData, action_realisee: e.target.value})}
                  placeholder="Actions effectuées pour résoudre le problème"
                  rows={2}
                  data-testid="action-input"
                />
              </div>

              {/* Price & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prix">Prix (€)</Label>
                  <Input
                    id="prix"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.prix}
                    onChange={(e) => setFormData({...formData, prix: e.target.value})}
                    placeholder="0.00"
                    data-testid="prix-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select
                    value={formData.statut}
                    onValueChange={(value) => setFormData({...formData, statut: value})}
                  >
                    <SelectTrigger data-testid="statut-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="En cours">En cours</SelectItem>
                      <SelectItem value="Terminé">Terminé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                data-testid="reparation-cancel-btn"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-[#84CC16] hover:bg-[#65A30D] text-white"
                disabled={saving}
                data-testid="reparation-save-btn"
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="delete-reparation-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la réparation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La fiche "{selectedReparation?.numero}" 
              sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-reparation-cancel">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
              data-testid="delete-reparation-confirm"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
