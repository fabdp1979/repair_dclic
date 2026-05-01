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

export const getCompteRenduPdfUrl = (id) => `${API_BASE}/reparations/${id}/pdf/compte-rendu`;

export const getQrCodeUrl = (id) => `${API_BASE}/reparations/${id}/qrcode`;

// Bannière publicitaire (compte-rendu)
export const getAdBanner = () => api.get('/settings/ad-banner');
export const putAdBanner = (image_b64) => api.put('/settings/ad-banner', { image_b64 });
export const deleteAdBanner = () => api.delete('/settings/ad-banner');

// Email
export const sendRepairEmail = (id, force = false) =>
  api.post(`/reparations/${id}/send-email`, null, { params: { force } });

// Signature client
export const getReparationPublic = (id) => api.get(`/reparations/${id}/public`);
export const saveSignature = (id, data) => api.post(`/reparations/${id}/signature`, data);
export const deleteSignature = (id) => api.delete(`/reparations/${id}/signature`);

// iPad terminal sync
export const ipadCurrent = () => api.get(`/ipad/current`);
export const ipadAssign = (reparation_id, kiosk = true) =>
  api.post(`/ipad/assign`, { reparation_id, kiosk });
export const ipadRelease = () => api.post(`/ipad/release`);
export const ipadHeartbeat = () => api.put(`/ipad/heartbeat`);
export const ipadStatus = () => api.get(`/ipad/status`);

// Auth
export const changePassword = (current_password, new_password) =>
  api.post(`/auth/change-password`, { current_password, new_password });

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

// Exports — direct URLs
const buildExportUrl = (endpoint, params) => {
  const filtered = Object.entries(params).filter(([, v]) => v !== '' && v != null);
  const qs = new URLSearchParams(filtered).toString();
  return qs ? `${API_BASE}${endpoint}?${qs}` : `${API_BASE}${endpoint}`;
};

export const exportReparationsExcelUrl = (dateFrom = '', dateTo = '') =>
  buildExportUrl('/export/reparations/excel', { date_from: dateFrom, date_to: dateTo });

export const exportCaisseExcelUrl = (dateFrom = '', dateTo = '', year = '', month = '') =>
  buildExportUrl('/export/caisse/excel', { date_from: dateFrom, date_to: dateTo, year, month });

// Backwards-compat aliases
export const exportReparationsExcel = exportReparationsExcelUrl;
export const exportCaisseExcel = exportCaisseExcelUrl;

// Robust blob downloader (évite les pop-ups bloquées et tabs blanches)
export const downloadFile = async (url, filename) => {
  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
};

export default api;
