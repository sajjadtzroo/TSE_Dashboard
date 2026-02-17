/**
 * Console Log Interceptor and Saver
 * Captures all console logs and provides save/export functionality
 */

interface LogEntry {
  timestamp: string;
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  data?: any[];
}

class LogSaver {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
  };

  /**
   * Start intercepting console logs
   */
  startCapturing() {
    console.log = (...args: any[]) => {
      this.addLog('log', args);
      this.originalConsole.log.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      this.addLog('warn', args);
      this.originalConsole.warn.apply(console, args);
    };

    console.error = (...args: any[]) => {
      this.addLog('error', args);
      this.originalConsole.error.apply(console, args);
    };

    console.info = (...args: any[]) => {
      this.addLog('info', args);
      this.originalConsole.info.apply(console, args);
    };

    console.debug = (...args: any[]) => {
      this.addLog('debug', args);
      this.originalConsole.debug.apply(console, args);
    };

    this.originalConsole.info('📝 Log capturing started');
  }

  /**
   * Stop intercepting and restore original console
   */
  stopCapturing() {
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.info = this.originalConsole.info;
    console.debug = this.originalConsole.debug;
    this.originalConsole.info('📝 Log capturing stopped');
  }

  private addLog(level: LogEntry['level'], data: any[]) {
    // Filter out MUI SSR warnings (cosmetic, not real errors)
    const message = this.formatData(data);
    const isMuiSsrWarning =
      (message.includes(':first-child') || message.includes(':first-of-type')) &&
      message.includes('server-side rendering');

    if (isMuiSsrWarning) {
      return; // Skip logging this warning
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };

    this.logs.push(entry);

    // Keep only the last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  private formatData(data: any[]): string {
    return data
      .map((item) => {
        if (typeof item === 'object') {
          try {
            return JSON.stringify(item, null, 2);
          } catch {
            return String(item);
          }
        }
        return String(item);
      })
      .join(' ');
  }

  /**
   * Get all captured logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogEntry['level']): LogEntry[] {
    return this.logs.filter((log) => log.level === level);
  }

  /**
   * Get error logs only
   */
  getErrors(): LogEntry[] {
    return this.getLogsByLevel('error');
  }

  /**
   * Export logs as JSON
   */
  exportAsJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Export logs as CSV
   */
  exportAsCSV(): string {
    const header = 'Timestamp,Level,Message\n';
    const rows = this.logs.map((log) => {
      const message = log.message.replace(/"/g, '""'); // Escape quotes
      return `"${log.timestamp}","${log.level}","${message}"`;
    });
    return header + rows.join('\n');
  }

  /**
   * Export logs as text
   */
  exportAsText(): string {
    return this.logs
      .map((log) => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');
  }

  /**
   * Download logs as a file
   */
  downloadLogs(format: 'json' | 'csv' | 'txt' = 'json') {
    let content: string;
    let mimeType: string;
    let extension: string;

    switch (format) {
      case 'csv':
        content = this.exportAsCSV();
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      case 'txt':
        content = this.exportAsText();
        mimeType = 'text/plain';
        extension = 'txt';
        break;
      case 'json':
      default:
        content = this.exportAsJSON();
        mimeType = 'application/json';
        extension = 'json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `console-logs-${timestamp}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.originalConsole.info(`📥 Logs downloaded as ${format.toUpperCase()}`);
  }

  /**
   * Save logs to localStorage
   */
  saveToLocalStorage(key = 'app-console-logs') {
    try {
      localStorage.setItem(key, this.exportAsJSON());
      this.originalConsole.info(`💾 Logs saved to localStorage: ${key}`);
      return true;
    } catch (error) {
      this.originalConsole.error('Failed to save logs to localStorage:', error);
      return false;
    }
  }

  /**
   * Load logs from localStorage
   */
  loadFromLocalStorage(key = 'app-console-logs'): LogEntry[] {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const loaded = JSON.parse(stored) as LogEntry[];
        this.originalConsole.info(`📂 Loaded ${loaded.length} logs from localStorage`);
        return loaded;
      }
    } catch (error) {
      this.originalConsole.error('Failed to load logs from localStorage:', error);
    }
    return [];
  }

  /**
   * Clear all captured logs
   */
  clearLogs() {
    this.logs = [];
    this.originalConsole.info('🗑️ Logs cleared');
  }

  /**
   * Print log summary
   */
  printSummary() {
    const summary = {
      total: this.logs.length,
      debug: this.getLogsByLevel('debug').length,
      info: this.getLogsByLevel('info').length,
      log: this.getLogsByLevel('log').length,
      warn: this.getLogsByLevel('warn').length,
      error: this.getLogsByLevel('error').length,
    };

    this.originalConsole.info('📊 Log Summary:', summary);
    return summary;
  }

  /**
   * Send logs to a server endpoint
   */
  async sendToServer(endpoint: string) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: this.exportAsJSON(),
      });

      if (response.ok) {
        this.originalConsole.info('✅ Logs sent to server successfully');
        return true;
      } else {
        this.originalConsole.error('❌ Failed to send logs:', response.statusText);
        return false;
      }
    } catch (error) {
      this.originalConsole.error('❌ Error sending logs to server:', error);
      return false;
    }
  }
}

// Create singleton instance
export const logSaver = new LogSaver();

// Add to window object for easy access in browser console
if (typeof window !== 'undefined') {
  (window as any).logSaver = logSaver;
}

export default logSaver;
