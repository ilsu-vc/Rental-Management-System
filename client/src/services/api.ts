import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string) || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rentahub_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rentahub_token');
      localStorage.removeItem('rentahub_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUTH API
// ============================================
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  getMe: () => api.get('/auth/me'),

  registerTenant: (data: any) =>
    api.post('/auth/register-tenant', data),

  registerAdmin: (data: any) =>
    api.post('/auth/register-admin', data),

  registerPublic: (data: any) =>
    api.post('/auth/register', data),
};

// ============================================
// BUILDINGS API
// ============================================
export const buildingsAPI = {
  getAll: () => api.get('/buildings'),
  getById: (id: string) => api.get(`/buildings/${id}`),
  create: (data: any) => api.post('/buildings', data),
  update: (id: string, data: any) => api.put(`/buildings/${id}`, data),
  delete: (id: string) => api.delete(`/buildings/${id}`),
};

// ============================================
// ROOMS API
// ============================================
export const roomsAPI = {
  getAll: (params?: { buildingId?: string; status?: string }) =>
    api.get('/rooms', { params }),
  getById: (id: string) => api.get(`/rooms/${id}`),
  update: (id: string, data: any) => api.put(`/rooms/${id}`, data),
  createAccount: (roomId: string, data: any) =>
    api.post(`/rooms/${roomId}/account`, data),
};

// ============================================
// TENANTS API
// ============================================
export const tenantsAPI = {
  getAll: (params?: { accountId?: string; buildingId?: string; status?: string }) =>
    api.get('/tenants', { params }),
  getById: (id: string) => api.get(`/tenants/${id}`),
  create: (data: any) => api.post('/tenants', data),
  update: (id: string, data: any) => api.put(`/tenants/${id}`, data),
  delete: (id: string, hard?: boolean) =>
    api.delete(`/tenants/${id}`, { params: { hard } }),
};

// ============================================
// BILLS API
// ============================================
export const billsAPI = {
  getAll: (params?: {
    accountId?: string;
    buildingId?: string;
    billType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/bills', { params }),
  getById: (id: string) => api.get(`/bills/${id}`),
  create: (data: any) => api.post('/bills', data),
  update: (id: string, data: any) => api.put(`/bills/${id}`, data),
  delete: (id: string) => api.delete(`/bills/${id}`),
  uploadImage: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('billImage', file);
    return api.post(`/bills/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  recordPayment: (id: string, data: any) =>
    api.post(`/bills/${id}/pay`, data),
};

// ============================================
// ANNOUNCEMENTS API
// ============================================
export const announcementsAPI = {
  getAll: () => api.get('/announcements'),
  getById: (id: string) => api.get(`/announcements/${id}`),
  create: (data: any) => api.post('/announcements', data),
  update: (id: string, data: any) => api.put(`/announcements/${id}`, data),
  delete: (id: string) => api.delete(`/announcements/${id}`),
};

// ============================================
// REPORTS API
// ============================================
export const reportsAPI = {
  getSummary: () => api.get('/reports/summary'),
  getRevenue: (year?: number) =>
    api.get('/reports/revenue', { params: { year } }),
  getOccupancy: () => api.get('/reports/occupancy'),
  getBuildingRevenue: () => api.get('/reports/building-revenue'),
  export: (type: string, format: string = 'xlsx') => {
    return api.get('/reports/export', {
      params: { type, format },
      responseType: 'blob',
    });
  },
};

export default api;
