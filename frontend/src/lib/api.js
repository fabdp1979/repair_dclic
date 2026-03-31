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

// Reparations
export const getReparations = (search = '', statut = '', limit = 100) => 
  api.get('/reparations', { params: { search: search || undefined, statut: statut || undefined, limit } });

export const getReparation = (id) => api.get(`/reparations/${id}`);

export const createReparation = (data) => api.post('/reparations', data);

export const updateReparation = (id, data) => api.put(`/reparations/${id}`, data);

export const deleteReparation = (id) => api.delete(`/reparations/${id}`);

// PDF
export const getClientPdfUrl = (id) => `${API_BASE}/reparations/${id}/pdf/client`;

export const getInternalPdfUrl = (id) => `${API_BASE}/reparations/${id}/pdf/interne`;

// Email
export const sendRepairEmail = (id) => api.post(`/reparations/${id}/send-email`);

// Caisse
export const getCaisseEntries = (dateFrom = '', dateTo = '', limit = 100) => 
  api.get('/caisse', { params: { date_from: dateFrom || undefined, date_to: dateTo || undefined, limit } });

export const createCaisseEntry = (data) => api.post('/caisse', data);

export const deleteCaisseEntry = (id) => api.delete(`/caisse/${id}`);

// Exports
export const exportReparationsExcel = (dateFrom = '', dateTo = '') => 
  `${API_BASE}/export/reparations/excel?${new URLSearchParams({ date_from: dateFrom || '', date_to: dateTo || '' })}`;

export const exportCaisseExcel = (dateFrom = '', dateTo = '') => 
  `${API_BASE}/export/caisse/excel?${new URLSearchParams({ date_from: dateFrom || '', date_to: dateTo || '' })}`;

export default api;
