import axios from 'axios';

const MAX_LOGS = 500;

// Global API call log store
const apiLogs = [];
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLogs() {
  return apiLogs;
}

export function clearLogs() {
  apiLogs.length = 0;
  notify();
}

// Install axios interceptors on the default instance
axios.interceptors.request.use((config) => {
  config._startTime = performance.now();
  return config;
});

axios.interceptors.response.use(
  (response) => {
    const duration = Math.round(performance.now() - (response.config._startTime || 0));
    apiLogs.unshift({
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      method: (response.config.method || 'get').toUpperCase(),
      url: response.config.url,
      status: response.status,
      duration,
      size: JSON.stringify(response.data).length,
      error: null,
    });
    if (apiLogs.length > MAX_LOGS) apiLogs.length = MAX_LOGS;
    notify();
    return response;
  },
  (error) => {
    const config = error.config || {};
    const duration = Math.round(performance.now() - (config._startTime || 0));
    apiLogs.unshift({
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      method: (config.method || 'get').toUpperCase(),
      url: config.url || 'unknown',
      status: error.response?.status || 0,
      duration,
      size: 0,
      error: error.message,
    });
    if (apiLogs.length > MAX_LOGS) apiLogs.length = MAX_LOGS;
    notify();
    return Promise.reject(error);
  }
);
