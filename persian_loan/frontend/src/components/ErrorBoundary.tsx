/**
 * Error Boundary Component
 * Catches React errors and displays user-friendly error UI
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console (or external service like Sentry)
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-bg-darker flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-surface-100 rounded-xl border border-border-dark p-8">
              {/* Error Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>
              </div>

              {/* Error Title */}
              <h1 className="text-2xl font-bold text-gray-100 text-center mb-4">
                خطایی رخ داده است
              </h1>

              {/* Error Description */}
              <p className="text-gray-300 text-center mb-6">
                متأسفانه در اجرای برنامه مشکلی پیش آمده است. لطفاً دوباره تلاش کنید یا به صفحه اصلی بازگردید.
              </p>

              {/* Error Details (development only) */}
              {import.meta.env.DEV && this.state.error && (
                <div className="bg-bg-darker rounded-lg p-4 mb-6 border border-border-light">
                  <p className="text-xs font-mono text-red-400 mb-2">
                    <strong>Error:</strong> {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <details className="text-xs font-mono text-gray-400 mt-2">
                      <summary className="cursor-pointer hover:text-gray-300">
                        Stack Trace
                      </summary>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>تلاش مجدد</span>
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface-50 hover:bg-surface-25 text-gray-200 rounded-lg border border-border-dark transition-colors"
                >
                  <Home className="w-4 h-4" />
                  <span>بازگشت به خانه</span>
                </button>

                {import.meta.env.DEV && (
                  <button
                    onClick={this.handleReload}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface-50 hover:bg-surface-25 text-gray-200 rounded-lg border border-border-dark transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>بارگذاری مجدد صفحه</span>
                  </button>
                )}
              </div>

              {/* Support Info */}
              <div className="mt-8 pt-6 border-t border-border-dark">
                <p className="text-sm text-gray-400 text-center">
                  در صورت تکرار این خطا، لطفاً با پشتیبانی تماس بگیرید.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
