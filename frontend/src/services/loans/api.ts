/**
 * Base API Configuration
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { apiLogger } from '../../utils/loans/logger';

// Detect API URL based on environment
function getApiUrl(): string {
  // In development, use Vite proxy (relative path)
  if (import.meta.env.DEV) {
    apiLogger.debug('Using Vite proxy for API requests');
    return ''; // Empty string = use same origin (Vite will proxy /api to backend)
  }

  // Auto-detect Codespaces environment
  const hostname = window.location.hostname;
  if (hostname.includes('.app.github.dev') || hostname.includes('.github.dev')) {
    const currentPort = window.location.origin.match(/-(\d+)\./)?.[1] || '80';
    // If served through nginx (port 80), use relative paths — nginx proxies /api to backend
    if (currentPort === '80') {
      apiLogger.info('Codespaces via nginx detected, using relative paths');
      return '';
    }
    // Otherwise (dev server on 3000/5173), rewrite to backend port
    const backendUrl = window.location.origin.replace(`-${currentPort}.`, '-8000.');
    apiLogger.info('Codespaces dev detected, API URL:', backendUrl);
    return backendUrl;
  }

  // Check for explicit environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Default: use relative paths so Nginx (port 80) proxies /api/* to the backend.
  // Set VITE_API_URL if you need to target a different host directly.
  return '';
}

const API_URL = getApiUrl();

export const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api/loans`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // Increased to 60s for heavy queries like no-guarantor
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Attach JWT token from localStorage (same key as AuthContext)
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Prevent browser caching of API responses
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';

    // Add trailing slash to list endpoints if missing
    if (config.url && !config.url.includes('?') && !config.url.endsWith('/')) {
      const pathParts = config.url.split('/').filter(Boolean);
      // If it's a base resource endpoint (e.g., /banks, /loans)
      if (pathParts.length === 1) {
        config.url = `${config.url}/`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    apiLogger.error('API request failed:', error);
    return Promise.reject(error);
  }
);

export default api;
