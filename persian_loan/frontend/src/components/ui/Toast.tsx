/**
 * Toast Component - Sonner wrapper with dark theme
 */

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      dir="rtl"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-surface-100 group-[.toaster]:text-gray-50 group-[.toaster]:border-border-light group-[.toaster]:shadow-dark-lg',
          description: 'group-[.toast]:text-gray-300',
          actionButton:
            'group-[.toast]:bg-primary-400 group-[.toast]:text-surface-900',
          cancelButton:
            'group-[.toast]:bg-surface-50 group-[.toast]:text-gray-300',
          success:
            'group-[.toaster]:bg-surface-100 group-[.toaster]:text-secondary-500 group-[.toaster]:border-secondary-500',
          error:
            'group-[.toaster]:bg-surface-100 group-[.toaster]:text-red-400 group-[.toaster]:border-red-400',
          info:
            'group-[.toaster]:bg-surface-100 group-[.toaster]:text-blue-400 group-[.toaster]:border-blue-400',
          warning:
            'group-[.toaster]:bg-surface-100 group-[.toaster]:text-yellow-400 group-[.toaster]:border-yellow-400',
        },
      }}
      {...props}
    />
  );
}

export { toast } from 'sonner';
