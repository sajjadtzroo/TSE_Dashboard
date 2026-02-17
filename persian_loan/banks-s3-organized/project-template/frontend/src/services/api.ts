/**
 * Base API Configuration
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { apiLogger } from '../utils/logger';

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
    // In Codespaces: replace frontend port with 8000 (backend port)
    const currentPort = window.location.origin.match(/-(\d+)\./)?.[1] || '5173';
    const backendUrl = window.location.origin.replace(`-${currentPort}.`, '-8000.');
    apiLogger.info('Codespaces detected, API URL:', backendUrl);
    return backendUrl;
  }

  // Check for explicit environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Default to localhost
  return 'http://localhost:8000';
}

const API_URL = getApiUrl();

export const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // Increased to 60s for heavy queries like no-guarantor
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
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
