import { useState, useEffect, useCallback } from "react";
import { 
  Search, Plus, Edit, Trash2, FileText, Send, CheckCircle,
  Wrench, Download, Clock, AlertTriangle, Link as LinkIcon, QrCode,
  UserPlus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  getReparations, createReparation, updateReparation, deleteReparation,
  getClients, createClient, getClientPdfUrl, getInternalPdfUrl, 
  sendRepairEmail, exportReparationsExcel, getQrCodeUrl
} from "../lib/api";
import { toast } from "sonner";
import Fuse from "fuse.js";

const MATERIEL_OPTIONS = {
  pc_portable: "PC portable",
  pc_fixe: "PC fixe",
  sacoche: "Sacoche",
  imprimante: "Imprimante",
  chargeur_pc: "Chargeur PC portable",
  disque_dur_externe: "Disque dur externe",
  souris: "Souris",
  webcam: "Webcam",
  cd_dvd: "CD/DVD divers",
  clavier: "Clavier",
  cle_usb: "Clé USB",
  cables_divers: "Câbles divers",
  cle_wifi: "Clé Wifi",
  ecran: "Écran",
  onduleur: "Onduleur",
  enceintes: "Enceintes",
  documents_divers: "Documents divers",
  ipad: "iPad"
};

const STATUTS_CLIENT = [
  "Réparation enregistrée",
  "En cours de diagnostic",
  "En attente pièce/intervention",
  "En cours de réparation",
  "Appareil prêt"
];

const emptyReparation = {
  client_id: "",
  materiel_fourni: {},
  autre_materiel: "",
  urgence: false,
  mot_de_passe: "",
  description_panne: "",
  observations_client: "",
  diagnostic: "",
  action_realisee: "",
  prix: "",
  statut: "Réparation enregistrée",
  statut_interne: "En cours"
};

const emptyClient = { nom: "", prenom: "", telephone: "", email: "", adresse: "" };

export default function ReparationsPage() {
  const [reparations, setReparations] = useState([]);
  const [filteredReparations, setFilteredReparations] = useState([]);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [selectedReparation, setSelectedReparation] = useState(null);
  const [formData, setFormData] = useState(emptyReparation);
  const [clientFormData, setClientFormData] = useState(emptyClient);
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

  const applyFilters = useCallback((searchTerm, status) => {
    let filtered = [...reparations];

    if (status !== "all") {
      filtered = filtered.filter(r => r.statut_interne === status);
    }

    if (searchTerm.trim()) {
      const fuse = new Fuse(filtered, {
        keys: ['numero', 'client_nom', 'client_prenom'],
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
        materiel_fourni: reparation.materiel_fourni || {},
        autre_materiel: reparation.autre_materiel || "",
        urgence: reparation.urgence || false,
        mot_de_passe: reparation.mot_de_passe || "",
        description_panne: reparation.description_panne || "",
        observations_client: reparation.observations_client || "",
        diagnostic: reparation.diagnostic || "",
        action_realisee: reparation.action_realisee || "",
        prix: reparation.prix?.toString() || "",
        statut: reparation.statut,
        statut_interne: reparation.statut_interne
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

  const handleMaterielChange = (key, checked) => {
    setFormData({
      ...formData,
      materiel_fourni: { ...formData.materiel_fourni, [key]: checked }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.description_panne.trim()) {
      toast.error("Veuillez sélectionner un client et décrire la panne");
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

  const handleMarkComplete = async (reparation) => {
    try {
      await updateReparation(reparation.id, { 
        statut: "Appareil prêt", 
        statut_interne: "Terminé" 
      });
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
    } finally {
      setSendingEmail(null);
    }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!clientFormData.nom || !clientFormData.prenom || !clientFormData.telephone) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }

    try {
      const response = await createClient(clientFormData);
      toast.success("Client créé avec succès");
      setClients([...clients, response.data]);
      setFormData({ ...formData, client_id: response.data.id });
      setClientDialogOpen(false);
      setClientFormData(emptyClient);
    } catch (error) {
      toast.error("Erreur lors de la création du client");
    }
  };

  const copyTrackingLink = (reparation) => {
    const url = `${window.location.origin}/suivi/${reparation.tracking_id}`;
    navigator.clipboard.writeText(url);
    toast.success("Lien de suivi copié !");
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
            {reparations.length} fiche{reparations.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open(exportReparationsExcel(), '_blank')}>
            <Download className="w-4 h-4 mr-2" />
            Export
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
                placeholder="Rechercher par n°, client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="all">Toutes</TabsTrigger>
                <TabsTrigger value="En cours">En cours</TabsTrigger>
                <TabsTrigger value="Terminé">Terminées</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Reparations List */}
      <Card>
        <CardContent className="pt-6">
          {filteredReparations.length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Aucune réparation</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReparations.map((reparation) => (
                <div 
                  key={reparation.id}
                  className="border border-slate-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-[#84CC16]">
                          {reparation.numero}
                        </span>
                        {reparation.urgence && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            URGENT
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          reparation.statut === "Appareil prêt" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {reparation.statut}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-slate-500 text-xs">Client</p>
                          <p className="font-medium text-slate-900">
                            {reparation.client_prenom} {reparation.client_nom}
                          </p>
                          <p className="text-xs text-slate-500">{reparation.client_telephone}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">Date</p>
                          <p className="text-slate-700">
                            {reparation.date_creation?.substring(0, 10)} {reparation.heure_creation}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">Panne</p>
                          <p className="text-slate-700 truncate">{reparation.description_panne}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">Prix</p>
                          <p className="font-mono font-semibold text-slate-900">
                            {reparation.prix ? `${reparation.prix.toFixed(2)} €` : '-'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {reparation.statut_interne !== "Terminé" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => handleMarkComplete(reparation)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Terminer
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getClientPdfUrl(reparation.id), '_blank')}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Client
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getInternalPdfUrl(reparation.id), '_blank')}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Interne
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyTrackingLink(reparation)}
                        title="Copier lien de suivi"
                      >
                        <LinkIcon className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => handleSendEmail(reparation)}
                        disabled={sendingEmail === reparation.id || !reparation.client_email}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Email
                      </Button>
                      
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(reparation)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => { setSelectedReparation(reparation); setDeleteDialogOpen(true); }}
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
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="font-outfit">
              {selectedReparation ? `Modifier ${selectedReparation.numero}` : "Nouvelle fiche de réparation"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6 py-4">
              {/* Bloc Client */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#84CC16] text-white rounded-full flex items-center justify-center text-xs">1</span>
                  Identité / Dépôt
                </h3>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label>Client *</Label>
                    <Select
                      value={formData.client_id}
                      onValueChange={(value) => setFormData({...formData, client_id: value})}
                    >
                      <SelectTrigger>
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
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setClientDialogOpen(true)}
                    className="mt-6"
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Bloc Matériel fourni */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#84CC16] text-white rounded-full flex items-center justify-center text-xs">2</span>
                  Matériel fourni
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(MATERIEL_OPTIONS).map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={formData.materiel_fourni[key] || false}
                        onCheckedChange={(checked) => handleMaterielChange(key, checked)}
                      />
                      <Label htmlFor={key} className="text-sm cursor-pointer">{label}</Label>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <Label htmlFor="autre_materiel">Autre (précisez)</Label>
                  <Input
                    id="autre_materiel"
                    value={formData.autre_materiel}
                    onChange={(e) => setFormData({...formData, autre_materiel: e.target.value})}
                    placeholder="Autre matériel..."
                  />
                </div>
              </div>

              {/* Bloc Urgence */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#84CC16] text-white rounded-full flex items-center justify-center text-xs">3</span>
                  Option urgence
                </h3>
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="urgence"
                    checked={formData.urgence}
                    onCheckedChange={(checked) => setFormData({...formData, urgence: checked})}
                  />
                  <div>
                    <Label htmlFor="urgence" className="cursor-pointer font-medium text-red-600">
                      Réparation urgente (+25€)
                    </Label>
                    <p className="text-xs text-slate-500 mt-1">
                      Réparation prioritaire sur les autres réparations en cours
                    </p>
                  </div>
                </div>
              </div>

              {/* Bloc Technique */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#84CC16] text-white rounded-full flex items-center justify-center text-xs">4</span>
                  Informations techniques
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="mot_de_passe">Mot de passe</Label>
                    <Input
                      id="mot_de_passe"
                      value={formData.mot_de_passe}
                      onChange={(e) => setFormData({...formData, mot_de_passe: e.target.value})}
                      placeholder="Mot de passe de session"
                    />
                    <p className="text-xs text-slate-500 mt-1">Visible uniquement sur la fiche interne</p>
                  </div>
                  <div>
                    <Label htmlFor="description_panne">Description de la panne *</Label>
                    <Textarea
                      id="description_panne"
                      value={formData.description_panne}
                      onChange={(e) => setFormData({...formData, description_panne: e.target.value})}
                      placeholder="Décrivez le problème signalé"
                      rows={3}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="observations_client">Observations du client</Label>
                    <Textarea
                      id="observations_client"
                      value={formData.observations_client}
                      onChange={(e) => setFormData({...formData, observations_client: e.target.value})}
                      placeholder="Notes ou demandes particulières du client"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Bloc Diagnostic & Action */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#84CC16] text-white rounded-full flex items-center justify-center text-xs">5</span>
                  Diagnostic & Intervention
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="diagnostic">Diagnostic</Label>
                    <Textarea
                      id="diagnostic"
                      value={formData.diagnostic}
                      onChange={(e) => setFormData({...formData, diagnostic: e.target.value})}
                      placeholder="Votre diagnostic technique"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="action_realisee">Action réalisée</Label>
                    <Textarea
                      id="action_realisee"
                      value={formData.action_realisee}
                      onChange={(e) => setFormData({...formData, action_realisee: e.target.value})}
                      placeholder="Actions effectuées"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="prix">Prix (€)</Label>
                      <Input
                        id="prix"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.prix}
                        onChange={(e) => setFormData({...formData, prix: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>Statut client</Label>
                      <Select
                        value={formData.statut}
                        onValueChange={(value) => setFormData({...formData, statut: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUTS_CLIENT.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Statut interne</Label>
                      <Select
                        value={formData.statut_interne}
                        onValueChange={(value) => setFormData({...formData, statut_interne: value})}
                      >
                        <SelectTrigger>
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
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-[#84CC16] hover:bg-[#65A30D] text-white"
                disabled={saving}
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Client Dialog */}
      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-outfit">Nouveau client rapide</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateClient}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-prenom">Prénom *</Label>
                  <Input
                    id="new-prenom"
                    value={clientFormData.prenom}
                    onChange={(e) => setClientFormData({...clientFormData, prenom: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="new-nom">Nom *</Label>
                  <Input
                    id="new-nom"
                    value={clientFormData.nom}
                    onChange={(e) => setClientFormData({...clientFormData, nom: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="new-telephone">Téléphone *</Label>
                <Input
                  id="new-telephone"
                  value={clientFormData.telephone}
                  onChange={(e) => setClientFormData({...clientFormData, telephone: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="new-email">Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={clientFormData.email}
                  onChange={(e) => setClientFormData({...clientFormData, email: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setClientDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-[#84CC16] hover:bg-[#65A30D] text-white">
                Créer et sélectionner
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la réparation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La fiche "{selectedReparation?.numero}" sera supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
