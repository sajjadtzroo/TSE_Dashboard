/**
 * Breadcrumb Navigation Component - Dark Theme
 * Provides hierarchical navigation with RTL support for Persian text
 */

import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { clsx } from 'clsx';
import { LucideIcon } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: LucideIcon;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={clsx('flex items-center space-x-2 rtl:space-x-reverse', className)}
    >
      <ol className="flex items-center space-x-2 rtl:space-x-reverse">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const Icon = item.icon;
          const isHome = Icon === Home;

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight
                  className="w-4 h-4 mx-2 text-gray-500 rtl:rotate-180"
                  aria-hidden="true"
                />
              )}

              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className={clsx(
                    'flex items-center gap-1.5 text-sm font-medium transition-colors',
                    'text-gray-400 hover:text-primary-400',
                    'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-surface-500 rounded',
                    isHome && 'p-1'
                  )}
                >
                  {Icon && (
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  )}
                  {!isHome && <span>{item.label}</span>}
                  {isHome && <span className="sr-only">{item.label}</span>}
                </Link>
              ) : (
                <span
                  className={clsx(
                    'flex items-center gap-1.5 text-sm font-medium',
                    isLast ? 'text-gray-100' : 'text-gray-400',
                    isHome && 'p-1'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {Icon && (
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  )}
                  {!isHome && <span>{item.label}</span>}
                  {isHome && <span className="sr-only">{item.label}</span>}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
