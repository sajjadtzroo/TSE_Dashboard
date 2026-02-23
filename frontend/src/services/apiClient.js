/**
 * Shared Axios client for all non-loans API endpoints.
 * Mirrors the interceptor pattern from services/loans/api.ts.
 */
import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — inject JWT from localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — normalize error shape
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalized = {
      message: error.response?.data?.detail || error.message || 'Request failed',
      status: error.response?.status,
      original: error,
    };
    return Promise.reject(normalized);
  },
);

export default apiClient;
