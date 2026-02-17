/**
 * React Hook for Console Log Saving
 */
import { useEffect } from 'react';
import { logSaver } from '@/utils/loans/logSaver';

interface UseLogSaverOptions {
  autoStart?: boolean;
  autoSaveInterval?: number; // in milliseconds
  localStorageKey?: string;
}

/**
 * Hook to manage console log saving
 */
export const useLogSaver = (options: UseLogSaverOptions = {}) => {
  const {
    autoStart = false,
    autoSaveInterval,
    localStorageKey = 'app-console-logs',
  } = options;

  useEffect(() => {
    if (autoStart) {
      logSaver.startCapturing();
    }

    // Auto-save to localStorage at regular intervals
    let intervalId: number | undefined;
    if (autoSaveInterval) {
      intervalId = window.setInterval(() => {
        logSaver.saveToLocalStorage(localStorageKey);
      }, autoSaveInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (autoStart) {
        logSaver.stopCapturing();
      }
    };
  }, [autoStart, autoSaveInterval, localStorageKey]);

  return {
    // Control functions
    start: () => logSaver.startCapturing(),
    stop: () => logSaver.stopCapturing(),
    clear: () => logSaver.clearLogs(),

    // Get logs
    getLogs: () => logSaver.getLogs(),
    getErrors: () => logSaver.getErrors(),
    getLogsByLevel: (level: 'log' | 'warn' | 'error' | 'info' | 'debug') =>
      logSaver.getLogsByLevel(level),

    // Export/Download
    downloadJSON: () => logSaver.downloadLogs('json'),
    downloadCSV: () => logSaver.downloadLogs('csv'),
    downloadText: () => logSaver.downloadLogs('txt'),

    // Storage
    saveToStorage: () => logSaver.saveToLocalStorage(localStorageKey),
    loadFromStorage: () => logSaver.loadFromLocalStorage(localStorageKey),

    // Utility
    printSummary: () => logSaver.printSummary(),
    sendToServer: (endpoint: string) => logSaver.sendToServer(endpoint),
  };
};
