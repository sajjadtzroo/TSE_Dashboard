/**
 * Toast Notification Utility
 * Wrapper around react-hot-toast for consistent toast notifications
 */

import toast, { ToastOptions } from 'react-hot-toast';
import { TOAST_CONFIG } from '../constants/app.constants';

const defaultOptions: ToastOptions = {
  duration: TOAST_CONFIG.DURATION,
  position: 'bottom-center',
  style: {
    background: '#1e1e1e',
    color: '#f3f4f6',
    border: '1px solid #2d2d2d',
    borderRadius: '0.5rem',
    padding: '1rem',
  },
};

const successOptions: ToastOptions = {
  ...defaultOptions,
  duration: TOAST_CONFIG.SUCCESS_DURATION,
  style: {
    ...defaultOptions.style,
    borderColor: '#10b981',
  },
  iconTheme: {
    primary: '#10b981',
    secondary: '#1e1e1e',
  },
};

const errorOptions: ToastOptions = {
  ...defaultOptions,
  duration: TOAST_CONFIG.ERROR_DURATION,
  style: {
    ...defaultOptions.style,
    borderColor: '#ef4444',
  },
  iconTheme: {
    primary: '#ef4444',
    secondary: '#1e1e1e',
  },
};

const warningOptions: ToastOptions = {
  ...defaultOptions,
  style: {
    ...defaultOptions.style,
    borderColor: '#f59e0b',
  },
  iconTheme: {
    primary: '#f59e0b',
    secondary: '#1e1e1e',
  },
};

const infoOptions: ToastOptions = {
  ...defaultOptions,
  style: {
    ...defaultOptions.style,
    borderColor: '#60a5fa',
  },
  iconTheme: {
    primary: '#60a5fa',
    secondary: '#1e1e1e',
  },
};

/**
 * Show success toast
 */
export const showSuccess = (message: string, options?: ToastOptions): string => {
  return toast.success(message, { ...successOptions, ...options });
};

/**
 * Show error toast
 */
export const showError = (message: string, options?: ToastOptions): string => {
  return toast.error(message, { ...errorOptions, ...options });
};

/**
 * Show warning toast
 */
export const showWarning = (message: string, options?: ToastOptions): string => {
  return toast(message, {
    ...warningOptions,
    ...options,
    icon: '⚠️',
  });
};

/**
 * Show info toast
 */
export const showInfo = (message: string, options?: ToastOptions): string => {
  return toast(message, {
    ...infoOptions,
    ...options,
    icon: 'ℹ️',
  });
};

/**
 * Show loading toast
 */
export const showLoading = (message: string, options?: ToastOptions): string => {
  return toast.loading(message, { ...defaultOptions, ...options });
};

/**
 * Dismiss a specific toast
 */
export const dismissToast = (toastId: string): void => {
  toast.dismiss(toastId);
};

/**
 * Dismiss all toasts
 */
export const dismissAll = (): void => {
  toast.dismiss();
};

/**
 * Update an existing toast
 */
export const updateToast = (
  toastId: string,
  message: string,
  type: 'success' | 'error' | 'loading',
  options?: ToastOptions
): void => {
  switch (type) {
    case 'success':
      toast.success(message, { ...successOptions, ...options, id: toastId });
      break;
    case 'error':
      toast.error(message, { ...errorOptions, ...options, id: toastId });
      break;
    case 'loading':
      toast.loading(message, { ...defaultOptions, ...options, id: toastId });
      break;
  }
};

/**
 * Show promise toast (for async operations)
 */
export const showPromise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  },
  options?: ToastOptions
): Promise<T> => {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    },
    {
      ...defaultOptions,
      ...options,
      success: { ...successOptions, ...options },
      error: { ...errorOptions, ...options },
    }
  );
};

// Re-export toast for custom usage
export { toast };

export default {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  loading: showLoading,
  promise: showPromise,
  dismiss: dismissToast,
  dismissAll,
  update: updateToast,
};
