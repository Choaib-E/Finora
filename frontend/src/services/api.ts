import axios, { AxiosError } from 'axios';
import type {
  AuthResponse,
  Budget,
  BudgetPayload,
  Category,
  CategoryPayload,
  CsvImportResponse,
  DashboardData,
  ReportSummary,
  Transaction,
  TransactionListResponse,
  TransactionPayload,
  TransactionType,
  User,
} from '../types';

const TOKEN_STORAGE_KEY = 'finora_access_token';
const USER_STORAGE_KEY = 'finora_user';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorizedCallback: (() => void) | null = null;

export function registerUnauthorizedHandler(cb: () => void) {
  onUnauthorizedCallback = cb;
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    if (error.response?.status === 401 && onUnauthorizedCallback) {
      const url = error.config?.url || '';
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        onUnauthorizedCallback();
      }
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(err: unknown, fallback = 'Une erreur est survenue.'): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return 'Impossible de joindre le serveur Finora. Vérifiez votre connexion réseau.';
    }
    const detail = (err.response?.data as { detail?: unknown })?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: string };
      if (first?.msg) return first.msg;
    }
  }
  return fallback;
}

export const storage = {
  getToken: () => localStorage.getItem(TOKEN_STORAGE_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_STORAGE_KEY, token),
  getUser: (): User | null => {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },
  setUser: (user: User) => localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user)),
  clear: () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  },
};

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<AuthResponse>('/auth/register', data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),
  logout: () => api.post<{ message: string }>('/auth/logout').then((r) => r.data),
  me: () => api.get<User>('/auth/me').then((r) => r.data),
  updateProfile: (data: { name: string; email: string }) =>
    api.put<User>('/auth/me', data).then((r) => r.data),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.put<{ message: string }>('/auth/me/password', data).then((r) => r.data),
};

export const transactionsApi = {
  list: (params?: {
    search?: string;
    type?: TransactionType | '';
    categorie?: string;
    date_from?: string;
    date_to?: string;
    sort_by?: 'date' | 'montant';
    sort_order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params || {}).filter(([, v]) => v !== '' && v !== undefined && v !== null)
    );
    return api.get<TransactionListResponse>('/transactions', { params: cleanParams }).then((r) => r.data);
  },
  create: (data: TransactionPayload) => api.post<Transaction>('/transactions', data).then((r) => r.data),
  update: (id: string, data: Partial<TransactionPayload>) =>
    api.put<Transaction>(`/transactions/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete<{ message: string }>(`/transactions/${id}`).then((r) => r.data),
};

export const categoriesApi = {
  list: (type?: TransactionType) =>
    api.get<Category[]>('/categories', { params: type ? { type } : undefined }).then((r) => r.data),
  create: (data: CategoryPayload) => api.post<Category>('/categories', data).then((r) => r.data),
  update: (id: string, data: Partial<CategoryPayload>) =>
    api.put<Category>(`/categories/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete<{ message: string }>(`/categories/${id}`).then((r) => r.data),
};

export const budgetsApi = {
  list: (params?: { mois?: number; annee?: number }) =>
    api.get<Budget[]>('/budgets', { params }).then((r) => r.data),
  create: (data: BudgetPayload) => api.post<Budget>('/budgets', data).then((r) => r.data),
  update: (id: string, data: Partial<BudgetPayload>) =>
    api.put<Budget>(`/budgets/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete<{ message: string }>(`/budgets/${id}`).then((r) => r.data),
};

export const dashboardApi = {
  get: (params?: { mois?: number; annee?: number }) =>
    api.get<DashboardData>('/dashboard', { params }).then((r) => r.data),
};

export const importsApi = {
  uploadCsv: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api
      .post<CsvImportResponse>('/imports/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};

export const reportsApi = {
  summary: (params?: { date_from?: string; date_to?: string }) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params || {}).filter(([, v]) => v !== '' && v !== undefined && v !== null)
    );
    return api.get<ReportSummary>('/reports/summary', { params: cleanParams }).then((r) => r.data);
  },
  exportCsv: async (params?: { date_from?: string; date_to?: string }) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params || {}).filter(([, v]) => v !== '' && v !== undefined && v !== null)
    );
    const resp = await api.get('/reports/export/csv', { params: cleanParams, responseType: 'blob' });
    return resp.data as Blob;
  },
  exportPdf: async (params?: { date_from?: string; date_to?: string }) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params || {}).filter(([, v]) => v !== '' && v !== undefined && v !== null)
    );
    const resp = await api.get('/reports/export/pdf', { params: cleanParams, responseType: 'blob' });
    return resp.data as Blob;
  },
};
