import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Users, 
  Wrench, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  Plus,
  ArrowRight,
  ShoppingCart,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { getDashboardStats, getReparations, getCommandes } from "../lib/api";
import { toast } from "sonner";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentRepairs, setRecentRepairs] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, repairsRes, ordersRes] = await Promise.all([
        getDashboardStats(),
        getReparations('', '', '', 5),
        getCommandes('', '', 5)
      ]);
      setStats(statsRes.data);
      setRecentRepairs(repairsRes.data);
      setPendingOrders(ordersRes.data.filter(o => !['Livré/Récupéré', 'Réglé', 'Annulé'].includes(o.statut)));
    } catch (error) {
      toast.error("Erreur lors du chargement des données");
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

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Bienvenue sur votre espace de gestion
          </p>
        </div>
        <Link to="/reparations">
          <Button 
            className="bg-[#84CC16] hover:bg-[#65A30D] text-white gap-2"
            data-testid="new-repair-btn"
          >
            <Plus className="w-4 h-4" />
            Nouvelle réparation
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="card-hover" data-testid="stat-clients">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Clients</p>
                <p className="font-mono text-xl font-semibold text-slate-900">
                  {stats?.total_clients || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover" data-testid="stat-repairs">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Réparations</p>
                <p className="font-mono text-xl font-semibold text-slate-900">
                  {stats?.total_reparations || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Wrench className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover" data-testid="stat-in-progress">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">En cours</p>
                <p className="font-mono text-xl font-semibold text-amber-600">
                  {stats?.reparations_en_cours || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover" data-testid="stat-completed">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Terminées</p>
                <p className="font-mono text-xl font-semibold text-green-600">
                  {stats?.reparations_terminees || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover" data-testid="stat-orders">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Commandes</p>
                <p className="font-mono text-xl font-semibold text-orange-600">
                  {stats?.commandes_en_attente || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Register Summary */}
      <Card data-testid="cash-summary">
        <CardHeader className="pb-2">
          <CardTitle className="font-outfit text-lg">Caisse du jour</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-green-700">Entrées</p>
                <p className="font-mono text-lg font-semibold text-green-700">
                  {(stats?.total_entrees_jour || 0).toFixed(2)} €
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-xs text-red-700">Sorties</p>
                <p className="font-mono text-lg font-semibold text-red-700">
                  {(stats?.total_sorties_jour || 0).toFixed(2)} €
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-100 rounded-lg">
              <div className="w-5 h-5 flex items-center justify-center text-slate-700 font-bold">=</div>
              <div>
                <p className="text-xs text-slate-600">Solde</p>
                <p className="font-mono text-lg font-semibold text-slate-900">
                  {(stats?.total_caisse_jour || 0).toFixed(2)} €
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Repairs */}
        <Card data-testid="recent-repairs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-outfit text-lg">Réparations récentes</CardTitle>
            <Link to="/reparations">
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 gap-1">
                Voir tout
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentRepairs.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-sm">
                Aucune réparation
              </div>
            ) : (
              <div className="space-y-3">
                {recentRepairs.map((repair) => (
                  <div key={repair.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[#84CC16]">{repair.numero}</span>
                        {repair.urgence && (
                          <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">URGENT</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {repair.client_prenom} {repair.client_nom}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      repair.statut === "Appareil prêt" 
                        ? "bg-green-100 text-green-700" 
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {repair.statut}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Orders */}
        <Card data-testid="pending-orders">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-outfit text-lg">Commandes en cours</CardTitle>
            <Link to="/commandes">
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 gap-1">
                Voir tout
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {pendingOrders.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-sm">
                Aucune commande en attente
              </div>
            ) : (
              <div className="space-y-3">
                {pendingOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {order.designation}
                      </p>
                      <p className="text-xs text-slate-500">
                        {order.client_prenom} {order.client_nom}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      order.statut === "Reçu" 
                        ? "bg-green-100 text-green-700" 
                        : order.statut === "Commandé"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {order.statut}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
