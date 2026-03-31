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
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { getDashboardStats, getReparations } from "../lib/api";
import { toast } from "sonner";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentRepairs, setRecentRepairs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, repairsRes] = await Promise.all([
        getDashboardStats(),
        getReparations('', '', 5)
      ]);
      setStats(statsRes.data);
      setRecentRepairs(repairsRes.data);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover" data-testid="stat-clients">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total clients</p>
                <p className="font-mono text-2xl font-semibold text-slate-900">
                  {stats?.total_clients || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover" data-testid="stat-repairs">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total réparations</p>
                <p className="font-mono text-2xl font-semibold text-slate-900">
                  {stats?.total_reparations || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover" data-testid="stat-in-progress">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">En cours</p>
                <p className="font-mono text-2xl font-semibold text-amber-600">
                  {stats?.reparations_en_cours || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover" data-testid="stat-completed">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Terminées</p>
                <p className="font-mono text-2xl font-semibold text-green-600">
                  {stats?.reparations_terminees || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Register Summary */}
      <Card data-testid="cash-summary">
        <CardHeader className="pb-2">
          <CardTitle className="font-outfit text-lg">Journal de caisse (aujourd'hui)</CardTitle>
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
            <div className="empty-state py-8">
              <Wrench className="w-12 h-12 empty-state-icon" />
              <p className="empty-state-title">Aucune réparation</p>
              <p className="empty-state-description">
                Commencez par créer une nouvelle fiche de réparation
              </p>
              <Link to="/reparations" className="mt-4">
                <Button className="bg-[#84CC16] hover:bg-[#65A30D] text-white gap-2">
                  <Plus className="w-4 h-4" />
                  Nouvelle réparation
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Client</th>
                    <th>Appareil</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRepairs.map((repair) => (
                    <tr key={repair.id}>
                      <td>
                        <span className="font-mono text-sm text-[#84CC16]">
                          {repair.numero}
                        </span>
                      </td>
                      <td>
                        <div>
                          <p className="font-medium text-slate-900">
                            {repair.client_prenom} {repair.client_nom}
                          </p>
                          <p className="text-xs text-slate-500">{repair.client_telephone}</p>
                        </div>
                      </td>
                      <td>
                        <p className="text-slate-700">{repair.marque} {repair.modele}</p>
                      </td>
                      <td>
                        <span className={`badge ${
                          repair.statut === "Terminé" 
                            ? "status-termine" 
                            : "status-en-cours"
                        }`}>
                          {repair.statut}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
