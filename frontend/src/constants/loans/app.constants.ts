/**
 * Application Constants
 * Centralized configuration values and magic numbers
 */

// ===========================
// ROUTING
// ===========================
export const LOAN_BASE = '/dashboard/loans';

// ===========================
// LOAN SELECTION
// ===========================
export const MAX_LOAN_SELECTION = 4;

// ===========================
// REACT QUERY CONFIGURATION
// ===========================
export const QUERY_STALE_TIME = 5 * 60 * 1000; // 5 minutes
export const QUERY_CACHE_TIME = 10 * 60 * 1000; // 10 minutes
export const QUERY_RETRY_COUNT = 1;

// ===========================
// LOCAL STORAGE KEYS
// ===========================
export const STORAGE_KEYS = {
  LOAN_SELECTION: 'persian_loan_selection',
  LOAN_SELECTION_VERSION: 'persian_loan_selection_version',
  USER_PREFERENCES: 'persian_loan_preferences',
  THEME: 'persian_loan_theme',
  SIDEBAR_COLLAPSED: 'persian_loan_sidebar_collapsed',
  SIDEBAR_COLLAPSED_VERSION: 'persian_loan_sidebar_collapsed_version',
} as const;

// ===========================
// STORAGE VERSIONS
// ===========================
export const STORAGE_VERSION = {
  LOAN_SELECTION: '1.0',
  USER_PREFERENCES: '1.0',
  SIDEBAR_COLLAPSED: '1.0',
} as const;

// ===========================
// RISK TOLERANCE LEVELS
// ===========================
export const RISK_TOLERANCE = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export type RiskToleranceType = typeof RISK_TOLERANCE[keyof typeof RISK_TOLERANCE];

// ===========================
// IRANIAN MARKET DEFAULTS
// ===========================
export const IRANIAN_MARKET_DEFAULTS = {
  MARKET_RETURN: 0.35, // 35% annual (Tehran Stock Exchange)
  RISK_FREE_RATE: 0.20, // 20% annual (government bonds/deposits)
  CORPORATE_TAX_RATE: 0.25, // 25% corporate tax
  DEFAULT_BETA: 1.2, // Financial sector beta
  CONSERVATIVE_DE: 0.5, // Debt-to-equity ratio (low risk)
  MODERATE_DE: 1.0, // D/E ratio (medium risk)
  AGGRESSIVE_DE: 2.0, // D/E ratio (high risk)
} as const;

// ===========================
// CALCULATOR DEFAULTS
// ===========================
export const CALCULATOR_DEFAULTS = {
  DEPOSIT_AMOUNT: 100_000_000, // 100M Toman
  DEPOSIT_MONTHS: 6, // 6 months
  LOAN_MONTHS: 24, // 24 months
  COMMISSION: 0, // No commission
  INTEREST_RATE: 20, // 20% annual
  MIN_DEPOSIT_MONTHS: 1,
  MAX_DEPOSIT_MONTHS: 60,
  MIN_LOAN_MONTHS: 1,
  MAX_LOAN_MONTHS: 360,
} as const;

// ===========================
// API CONFIGURATION
// ===========================
export const API_CONFIG = {
  TIMEOUT: 60000, // 60 seconds
  RETRY_DELAY: 1000, // 1 second
  MAX_RETRIES: 3,
} as const;

// ===========================
// PAGINATION
// ===========================
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

// ===========================
// BANK CATEGORIES
// ===========================
export const BANK_CATEGORIES = {
  TRADITIONAL: 'traditional-banks',
  DIGITAL: 'digital-banks',
  SPECIALIZED: 'specialized-banks',
  COOPERATIVE: 'cooperative-banks',
} as const;

export type BankCategoryType = typeof BANK_CATEGORIES[keyof typeof BANK_CATEGORIES];

// ===========================
// LOAN CATEGORIES
// ===========================
export const LOAN_CATEGORIES = {
  HOUSING: 'housing',
  CAR: 'car',
  EDUCATION: 'education',
  PERSONAL: 'personal',
  BUSINESS: 'business',
  EMERGENCY: 'emergency',
} as const;

export type LoanCategoryType = typeof LOAN_CATEGORIES[keyof typeof LOAN_CATEGORIES];

// ===========================
// CHART COLORS (Dark Theme)
// ===========================
export const CHART_COLORS = {
  PRIMARY: '#60a5fa',
  SECONDARY: '#34d399',
  TERTIARY: '#f59e0b',
  QUATERNARY: '#8b5cf6',
  DANGER: '#ef4444',
  GRID: '#2d2d2d',
  TEXT: '#9ca3af',
  BACKGROUND: '#1e1e1e',
  BORDER: '#2d2d2d',
} as const;

// ===========================
// VALIDATION LIMITS
// ===========================
export const VALIDATION_LIMITS = {
  MIN_LOAN_AMOUNT: 1_000_000, // 1M Toman
  MAX_LOAN_AMOUNT: 10_000_000_000, // 10B Toman
  MIN_INTEREST_RATE: 0,
  MAX_INTEREST_RATE: 100,
  MIN_DEPOSIT_AMOUNT: 0,
  MAX_DEPOSIT_AMOUNT: 10_000_000_000, // 10B Toman
  MIN_COMMISSION: 0,
  MAX_COMMISSION: 1_000_000_000, // 1B Toman
} as const;

// ===========================
// DATE FORMATS
// ===========================
export const DATE_FORMATS = {
  DISPLAY: 'YYYY/MM/DD',
  API: 'YYYY-MM-DD',
  TIME: 'HH:mm:ss',
  DATETIME: 'YYYY/MM/DD HH:mm',
} as const;

// ===========================
// TOAST CONFIGURATION
// ===========================
export const TOAST_CONFIG = {
  DURATION: 4000, // 4 seconds
  SUCCESS_DURATION: 3000, // 3 seconds
  ERROR_DURATION: 5000, // 5 seconds
  POSITION: 'bottom-center',
} as const;

// ===========================
// DEBOUNCE DELAYS
// ===========================
export const DEBOUNCE_DELAYS = {
  SEARCH: 300, // 300ms
  INPUT: 500, // 500ms
  RESIZE: 150, // 150ms
} as const;

// ===========================
// ANIMATION DURATIONS
// ===========================
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// ===========================
// FEATURE FLAGS
// ===========================
export const FEATURE_FLAGS = {
  ENABLE_OCR_IMPORT: true,
  ENABLE_WEB_SCRAPING: true,
  ENABLE_ANALYTICS: true,
  ENABLE_REMINDERS: true,
  ENABLE_EXPORT: true,
  ENABLE_ADVANCED_CALCULATOR: true,
} as const;

export default {
  MAX_LOAN_SELECTION,
  QUERY_STALE_TIME,
  STORAGE_KEYS,
  STORAGE_VERSION,
  RISK_TOLERANCE,
  IRANIAN_MARKET_DEFAULTS,
  CALCULATOR_DEFAULTS,
  API_CONFIG,
  PAGINATION,
  BANK_CATEGORIES,
  LOAN_CATEGORIES,
  CHART_COLORS,
  VALIDATION_LIMITS,
  DATE_FORMATS,
  TOAST_CONFIG,
  DEBOUNCE_DELAYS,
  ANIMATION_DURATIONS,
  FEATURE_FLAGS,
};
