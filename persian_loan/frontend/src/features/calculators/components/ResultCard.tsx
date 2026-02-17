/**
 * Result Card Component
 * Beautiful card for displaying calculation results
 */

import { LucideIcon } from 'lucide-react';

interface ResultCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  subtitle?: string;
  highlight?: boolean;
}

const colorClasses = {
  primary: 'bg-primary-500/10 border-primary-500/30 text-primary-400',
  success: 'bg-teal-500/10 border-teal-500/30 text-teal-400',
  warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  danger: 'bg-pink-500/10 border-pink-500/30 text-pink-400',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
};

const iconColorClasses = {
  primary: 'text-primary-400',
  success: 'text-teal-400',
  warning: 'text-yellow-400',
  danger: 'text-pink-400',
  info: 'text-blue-400',
};

export function ResultCard({
  label,
  value,
  icon: Icon,
  color = 'primary',
  subtitle,
  highlight = false,
}: ResultCardProps) {
  return (
    <div
      className={`p-5 rounded-xl border-2 transition-all duration-200 ${
        highlight
          ? `${colorClasses[color]} shadow-lg`
          : 'bg-bg-darker border-border-dark hover:border-primary-400/50'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="text-sm text-gray-400 font-medium">{label}</div>
        {Icon && (
          <Icon
            className={`w-5 h-5 ${
              highlight ? iconColorClasses[color] : 'text-gray-400'
            }`}
          />
        )}
      </div>

      <div className={`text-2xl font-bold mb-1 ${
        highlight ? '' : 'text-gray-100'
      }`}>
        {value}
      </div>

      {subtitle && (
        <div className="text-xs text-gray-400 mt-2">{subtitle}</div>
      )}
    </div>
  );
}

export default ResultCard;
