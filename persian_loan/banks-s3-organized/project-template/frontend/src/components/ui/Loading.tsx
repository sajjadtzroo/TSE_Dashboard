/**
 * Loading Component - Dark Theme
 */

import { clsx } from 'clsx';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export function Loading({ size = 'md', className, text }: LoadingProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  return (
    <div className={clsx('flex flex-col items-center justify-center', className)}>
      <div
        className={clsx(
          'animate-spin rounded-full border-b-2 border-primary-400',
          sizeClasses[size]
        )}
      />
      {text && <p className="mt-3 text-sm text-gray-400">{text}</p>}
    </div>
  );
}

interface LoadingPageProps {
  text?: string;
}

export function LoadingPage({ text = 'در حال بارگذاری...' }: LoadingPageProps) {
  return (
    <div className="flex items-center justify-center h-64">
      <Loading size="lg" text={text} />
    </div>
  );
}

export default Loading;
