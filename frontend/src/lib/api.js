import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');

// Clients
export const getClients = (search = '', limit = 100) => 
  api.get('/clients', { params: { search: search || undefined, limit } });

export const getClient = (id) => api.get(`/clients/${id}`);

export const createClient = (data) => api.post('/clients', data);

export const updateClient = (id, data) => api.put(`/clients/${id}`, data);

export const deleteClient = (id) => api.delete(`/clients/${id}`);

export const getClientReparations = (clientId) => api.get(`/clients/${clientId}/reparations`);

export const getClientCommandes = (clientId) => api.get(`/clients/${clientId}/commandes`);

// Reparations
export const getReparations = (search = '', statut = '', statutInterne = '', limit = 100) => 
  api.get('/reparations', { 
    params: { 
      search: search || undefined, 
      statut: statut || undefined, 
      statut_interne: statutInterne || undefined,
      limit 
    } 
  });

export const getReparation = (id) => api.get(`/reparations/${id}`);

export const createReparation = (data) => api.post('/reparations', data);

export const updateReparation = (id, data) => api.put(`/reparations/${id}`, data);

export const deleteReparation = (id) => api.delete(`/reparations/${id}`);

export const getStatutsClient = () => api.get('/reparations/statuts-client');

export const getMaterielOptions = () => api.get('/reparations/materiel-options');

// PDF
export const getClientPdfUrl = (id) => `${API_BASE}/reparations/${id}/pdf/client`;

export const getInternalPdfUrl = (id) => `${API_BASE}/reparations/${id}/pdf/interne`;

export const getQrCodeUrl = (id) => `${API_BASE}/reparations/${id}/qrcode`;

// Email
export const sendRepairEmail = (id) => api.post(`/reparations/${id}/send-email`);

// Public Tracking
export const getPublicTracking = (trackingId) => api.get(`/suivi/${trackingId}`);

// Commandes
export const getCommandes = (search = '', statut = '', limit = 100) => 
  api.get('/commandes', { 
    params: { 
      search: search || undefined, 
      statut: statut || undefined, 
      limit 
    } 
  });

export const getCommande = (id) => api.get(`/commandes/${id}`);

export const createCommande = (data) => api.post('/commandes', data);

export const updateCommande = (id, data) => api.put(`/commandes/${id}`, data);

export const deleteCommande = (id) => api.delete(`/commandes/${id}`);

export const purgeCompletedCommandes = () => api.delete('/commandes/purge/completed');

export const getStatutsCommande = () => api.get('/commandes/statuts');

// Encaissement
export const getTypesRecette = () => api.get('/encaissements/types');

export const getEncaissements = (dateFrom = '', dateTo = '', limit = 100) => 
  api.get('/encaissements', { 
    params: { 
      date_from: dateFrom || undefined, 
      date_to: dateTo || undefined, 
      limit 
    } 
  });

export const createEncaissement = (data) => api.post('/encaissements', data);

export const deleteEncaissement = (id) => api.delete(`/encaissements/${id}`);

// Caisse (Journal complet)
export const getCaisseEntries = (dateFrom = '', dateTo = '', limit = 100) => 
  api.get('/caisse', { 
    params: { 
      date_from: dateFrom || undefined, 
      date_to: dateTo || undefined, 
      limit 
    } 
  });

export const createCaisseEntry = (data) => api.post('/caisse', data);

export const deleteCaisseEntry = (id) => api.delete(`/caisse/${id}`);

// Exports
export const exportReparationsExcel = (dateFrom = '', dateTo = '') => 
  `${API_BASE}/export/reparations/excel?${new URLSearchParams({ 
    date_from: dateFrom || '', 
    date_to: dateTo || '' 
  })}`;

export const exportCaisseExcel = (dateFrom = '', dateTo = '', year = '', month = '') => 
  `${API_BASE}/export/caisse/excel?${new URLSearchParams({ 
    date_from: dateFrom || '', 
    date_to: dateTo || '',
    year: year || '',
    month: month || ''
  })}`;

export default api;
