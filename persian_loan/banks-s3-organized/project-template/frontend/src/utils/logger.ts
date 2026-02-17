/**
 * Logger Utility with Log Levels
 * Provides structured logging with environment-based log level configuration
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
  enableTimestamp?: boolean;
  enableStackTrace?: boolean;
}

class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    // Default configuration
    this.config = {
      level: this.getDefaultLogLevel(),
      prefix: '',
      enableTimestamp: true,
      enableStackTrace: false,
      ...config,
    };
  }

  /**
   * Get default log level based on environment
   */
  private getDefaultLogLevel(): LogLevel {
    if (import.meta.env.PROD) {
      return LogLevel.ERROR; // Production: only errors
    }
    if (import.meta.env.DEV) {
      return LogLevel.DEBUG; // Development: all logs
    }
    return LogLevel.INFO; // Default
  }

  /**
   * Format log message with timestamp and prefix
   */
  private formatMessage(level: string, message: string): string {
    const parts: string[] = [];

    if (this.config.enableTimestamp) {
      const timestamp = new Date().toISOString();
      parts.push(`[${timestamp}]`);
    }

    parts.push(`[${level}]`);

    if (this.config.prefix) {
      parts.push(`[${this.config.prefix}]`);
    }

    parts.push(message);

    return parts.join(' ');
  }

  /**
   * Check if log level should be displayed
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  /**
   * Get stack trace (excluding logger itself)
   */
  private getStackTrace(): string {
    const stack = new Error().stack;
    if (!stack) return '';
    const lines = stack.split('\n').slice(3); // Remove first 3 lines (Error, Logger methods)
    return lines.join('\n');
  }

  /**
   * DEBUG level logging (verbose, development only)
   */
  debug(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    console.debug(this.formatMessage('DEBUG', message), ...args);

    if (this.config.enableStackTrace) {
      console.debug(this.getStackTrace());
    }
  }

  /**
   * INFO level logging (general information)
   */
  info(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    console.info(this.formatMessage('INFO', message), ...args);
  }

  /**
   * WARN level logging (warnings, non-critical issues)
   */
  warn(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    console.warn(this.formatMessage('WARN', message), ...args);

    if (this.config.enableStackTrace) {
      console.warn(this.getStackTrace());
    }
  }

  /**
   * ERROR level logging (errors, exceptions)
   */
  error(message: string, error?: Error | any, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    console.error(this.formatMessage('ERROR', message), error, ...args);

    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }

    if (this.config.enableStackTrace) {
      console.error('Logger stack:', this.getStackTrace());
    }
  }

  /**
   * Create a child logger with a prefix
   */
  child(prefix: string): Logger {
    return new Logger({
      ...this.config,
      prefix: this.config.prefix ? `${this.config.prefix}:${prefix}` : prefix,
    });
  }

  /**
   * Update logger configuration
   */
  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.config.level;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export named loggers for specific modules
export const apiLogger = logger.child('API');
export const stateLogger = logger.child('STATE');
export const calculatorLogger = logger.child('CALCULATOR');
export const importLogger = logger.child('IMPORT');
export const analyticsLogger = logger.child('ANALYTICS');

// Helper to create custom logger
export const createLogger = (prefix: string, config?: Partial<LoggerConfig>): Logger => {
  return new Logger({ ...config, prefix });
};

export default logger;
