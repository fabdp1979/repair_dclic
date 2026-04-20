import { useState, useEffect, useCallback } from "react";
import { 
  Search, Plus, Edit, Trash2, ShoppingCart, Check, Package, Truck, Eraser
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
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
  getCommandes, createCommande, updateCommande, deleteCommande, getClients, purgeCompletedCommandes
} from "../lib/api";
import { toast } from "sonner";

const STATUTS_COMMANDE = [
  "En attente de commande",
  "Commandé",
  "En attente réception",
  "Reçu",
  "Livré/Récupéré",
  "Réglé",
  "Annulé"
];

const emptyCommande = {
  client_id: "",
  reference_produit: "",
  designation: "",
  fournisseur: "",
  quantite: 1,
  prix_achat: "",
  prix_vente: "",
  statut: "En attente de commande",
  remarques: ""
};

export default function CommandesPage() {
  const [commandes, setCommandes] = useState([]);
  const [filteredCommandes, setFilteredCommandes] = useState([]);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [formData, setFormData] = useState(emptyCommande);
  const [saving, setSaving] = useState(false);
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cmdRes, clientsRes] = await Promise.all([
        getCommandes(),
        getClients()
      ]);
      setCommandes(cmdRes.data);
      setFilteredCommandes(cmdRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error("Erreur lors du chargement");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = useCallback((searchTerm, status) => {
    let filtered = [...commandes];

    if (status === "en_attente") {
      filtered = filtered.filter(c => !["Livré/Récupéré", "Réglé", "Annulé"].includes(c.statut));
    } else if (status === "termine") {
      filtered = filtered.filter(c => ["Livré/Récupéré", "Réglé"].includes(c.statut));
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.numero?.toLowerCase().includes(term) ||
        c.designation?.toLowerCase().includes(term) ||
        c.client_nom?.toLowerCase().includes(term) ||
        c.client_prenom?.toLowerCase().includes(term)
      );
    }

    setFilteredCommandes(filtered);
  }, [commandes]);

  useEffect(() => {
    applyFilters(search, statusFilter);
  }, [search, statusFilter, applyFilters]);

  const handleOpenDialog = (commande = null) => {
    if (commande) {
      setSelectedCommande(commande);
      setFormData({
        client_id: commande.client_id,
        reference_produit: commande.reference_produit || "",
        designation: commande.designation,
        fournisseur: commande.fournisseur || "",
        quantite: commande.quantite,
        prix_achat: commande.prix_achat?.toString() || "",
        prix_vente: commande.prix_vente?.toString() || "",
        statut: commande.statut,
        remarques: commande.remarques || ""
      });
    } else {
      setSelectedCommande(null);
      setFormData(emptyCommande);
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.designation.trim()) {
      toast.error("Veuillez sélectionner un client et saisir la désignation");
      return;
    }

    setSaving(true);
    try {
      const dataToSend = {
        ...formData,
        quantite: parseInt(formData.quantite) || 1,
        prix_achat: formData.prix_achat ? parseFloat(formData.prix_achat) : null,
        prix_vente: formData.prix_vente ? parseFloat(formData.prix_vente) : null
      };

      if (selectedCommande) {
        await updateCommande(selectedCommande.id, dataToSend);
        toast.success("Commande modifiée");
      } else {
        await createCommande(dataToSend);
        toast.success("Commande créée");
      }
      setDialogOpen(false);
      setSelectedCommande(null);
      setFormData(emptyCommande);
      loadData();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCommande) return;
    
    try {
      await deleteCommande(selectedCommande.id);
      toast.success("Commande supprimée");
      setDeleteDialogOpen(false);
      setSelectedCommande(null);
      loadData();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const quickUpdateStatus = async (commande, newStatus) => {
    try {
      await updateCommande(commande.id, { statut: newStatus });
      toast.success(`Statut mis à jour: ${newStatus}`);
      loadData();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handlePurge = async () => {
    try {
      const res = await purgeCompletedCommandes();
      toast.success(res.data?.message || "Commandes terminées purgées");
      setPurgeDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error("Erreur lors de la purge");
    }
  };

  const getStatusBadgeClass = (statut) => {
    switch (statut) {
      case "Reçu":
      case "Livré/Récupéré":
      case "Réglé":
        return "bg-green-100 text-green-700";
      case "Commandé":
      case "En attente réception":
        return "bg-blue-100 text-blue-700";
      case "Annulé":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="commandes-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Commandes client
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {commandes.length} commande{commandes.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPurgeDialogOpen(true)}
            className="text-red-600 border-red-200 hover:bg-red-50"
            data-testid="purge-commandes-btn"
          >
            <Eraser className="w-4 h-4 mr-2" />
            Purger terminées
          </Button>
          <Button 
            className="bg-[#84CC16] hover:bg-[#65A30D] text-white gap-2"
            onClick={() => handleOpenDialog()}
            data-testid="add-commande-btn"
          >
            <Plus className="w-4 h-4" />
            Nouvelle commande
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
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="all">Toutes</TabsTrigger>
                <TabsTrigger value="en_attente">En cours</TabsTrigger>
                <TabsTrigger value="termine">Terminées</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Commandes List */}
      <Card>
        <CardContent className="pt-6">
          {filteredCommandes.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Aucune commande</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCommandes.map((cmd) => (
                <div 
                  key={cmd.id}
                  className="border border-slate-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-mono text-xs text-slate-500">{cmd.numero}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeClass(cmd.statut)}`}>
                          {cmd.statut}
                        </span>
                      </div>
                      
                      <p className="font-medium text-slate-900">{cmd.designation}</p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-sm">
                        <div>
                          <p className="text-slate-500 text-xs">Client</p>
                          <p className="text-slate-700">{cmd.client_prenom} {cmd.client_nom}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">Fournisseur</p>
                          <p className="text-slate-700">{cmd.fournisseur || "-"}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">Qté</p>
                          <p className="text-slate-700">{cmd.quantite}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">Total</p>
                          <p className="font-mono font-semibold text-slate-900">
                            {cmd.montant_total ? `${cmd.montant_total.toFixed(2)} €` : '-'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {cmd.statut === "En attente de commande" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => quickUpdateStatus(cmd, "Commandé")}
                        >
                          <Package className="w-4 h-4 mr-1" />
                          Commandé
                        </Button>
                      )}
                      {cmd.statut === "Commandé" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => quickUpdateStatus(cmd, "Reçu")}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Reçu
                        </Button>
                      )}
                      {cmd.statut === "Reçu" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600"
                          onClick={() => quickUpdateStatus(cmd, "Livré/Récupéré")}
                        >
                          <Truck className="w-4 h-4 mr-1" />
                          Livré
                        </Button>
                      )}
                      {cmd.statut === "Livré/Récupéré" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600"
                          onClick={() => quickUpdateStatus(cmd, "Réglé")}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Réglé
                        </Button>
                      )}
                      
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(cmd)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => { setSelectedCommande(cmd); setDeleteDialogOpen(true); }}
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

      {/* Commande Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white" data-testid="commande-dialog">
          <DialogHeader>
            <DialogTitle className="font-outfit">
              {selectedCommande ? "Modifier la commande" : "Nouvelle commande"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div>
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
                        {client.prenom} {client.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="designation">Désignation *</Label>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => setFormData({...formData, designation: e.target.value})}
                  placeholder="Nom du produit/pièce"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reference_produit">Référence</Label>
                  <Input
                    id="reference_produit"
                    value={formData.reference_produit}
                    onChange={(e) => setFormData({...formData, reference_produit: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="fournisseur">Fournisseur</Label>
                  <Input
                    id="fournisseur"
                    value={formData.fournisseur}
                    onChange={(e) => setFormData({...formData, fournisseur: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quantite">Quantité</Label>
                  <Input
                    id="quantite"
                    type="number"
                    min="1"
                    value={formData.quantite}
                    onChange={(e) => setFormData({...formData, quantite: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="prix_achat">Prix achat (€)</Label>
                  <Input
                    id="prix_achat"
                    type="number"
                    step="0.01"
                    value={formData.prix_achat}
                    onChange={(e) => setFormData({...formData, prix_achat: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="prix_vente">Prix vente (€)</Label>
                  <Input
                    id="prix_vente"
                    type="number"
                    step="0.01"
                    value={formData.prix_vente}
                    onChange={(e) => setFormData({...formData, prix_vente: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label>Statut</Label>
                <Select
                  value={formData.statut}
                  onValueChange={(value) => setFormData({...formData, statut: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUTS_COMMANDE.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="remarques">Remarques</Label>
                <Textarea
                  id="remarques"
                  value={formData.remarques}
                  onChange={(e) => setFormData({...formData, remarques: e.target.value})}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-[#84CC16] hover:bg-[#65A30D] text-white" disabled={saving}>
                {saving ? "..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la commande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
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
      {/* Purge Confirmation Dialog */}
      <AlertDialog open={purgeDialogOpen} onOpenChange={setPurgeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Purger les commandes terminées ?</AlertDialogTitle>
            <AlertDialogDescription>
              Toutes les commandes avec le statut "Livré/Récupéré" ou "Réglé" seront définitivement supprimées. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handlePurge} className="bg-red-500 hover:bg-red-600">
              Purger
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
