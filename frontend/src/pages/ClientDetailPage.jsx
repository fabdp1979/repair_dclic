import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin,
  Edit,
  Wrench,
  ShoppingCart,
  Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { getClient, getClientReparations, getClientCommandes } from "../lib/api";
import { toast } from "sonner";

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [reparations, setReparations] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [clientRes, repRes, cmdRes] = await Promise.all([
        getClient(id),
        getClientReparations(id),
        getClientCommandes(id)
      ]);
      setClient(clientRes.data);
      setReparations(repRes.data);
      setCommandes(cmdRes.data);
    } catch (error) {
      toast.error("Erreur lors du chargement");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Client non trouvé</p>
        <Link to="/clients">
          <Button variant="link" className="mt-2">Retour aux clients</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="client-detail-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/clients">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </Link>
      </div>

      {/* Client Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-[#84CC16]/10 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-[#84CC16]" />
              </div>
              <div>
                <h1 className="font-outfit text-2xl font-bold text-slate-900">
                  {client.prenom} {client.nom}
                </h1>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4" />
                    <span>{client.telephone}</span>
                  </div>
                  {client.email && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-4 h-4" />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.adresse && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-4 h-4" />
                      <span>{client.adresse}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to={`/reparations?client=${id}`}>
                <Button className="bg-[#84CC16] hover:bg-[#65A30D] text-white gap-2">
                  <Wrench className="w-4 h-4" />
                  Nouvelle réparation
                </Button>
              </Link>
              <Link to={`/commandes?client=${id}`}>
                <Button variant="outline" className="gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Nouvelle commande
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="reparations">
        <TabsList>
          <TabsTrigger value="reparations" className="gap-2">
            <Wrench className="w-4 h-4" />
            Réparations ({reparations.length})
          </TabsTrigger>
          <TabsTrigger value="commandes" className="gap-2">
            <ShoppingCart className="w-4 h-4" />
            Commandes ({commandes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reparations" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-outfit text-lg">Historique des réparations</CardTitle>
            </CardHeader>
            <CardContent>
              {reparations.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Aucune réparation pour ce client
                </div>
              ) : (
                <div className="space-y-3">
                  {reparations.map((rep) => (
                    <div 
                      key={rep.id}
                      className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-[#84CC16]">{rep.numero}</span>
                          {rep.urgence && (
                            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">URGENT</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{rep.description_panne?.substring(0, 50)}...</p>
                        <p className="text-xs text-slate-400">{rep.date_creation?.substring(0, 10)}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          rep.statut === "Appareil prêt" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {rep.statut}
                        </span>
                        {rep.prix && (
                          <p className="font-mono text-sm font-semibold mt-1">{rep.prix.toFixed(2)} €</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commandes" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-outfit text-lg">Historique des commandes</CardTitle>
            </CardHeader>
            <CardContent>
              {commandes.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Aucune commande pour ce client
                </div>
              ) : (
                <div className="space-y-3">
                  {commandes.map((cmd) => (
                    <div 
                      key={cmd.id}
                      className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      <div>
                        <span className="font-mono text-sm text-slate-500">{cmd.numero}</span>
                        <p className="text-sm font-medium text-slate-900">{cmd.designation}</p>
                        <p className="text-xs text-slate-400">{cmd.date_creation?.substring(0, 10)}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          cmd.statut === "Reçu" || cmd.statut === "Livré/Récupéré"
                            ? "bg-green-100 text-green-700" 
                            : cmd.statut === "Commandé"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {cmd.statut}
                        </span>
                        {cmd.montant_total && (
                          <p className="font-mono text-sm font-semibold mt-1">{cmd.montant_total.toFixed(2)} €</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
