/**
 * Empty State Component - Dark Theme
 */

import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function Empty({
  title = 'اطلاعاتی یافت نشد',
  description,
  icon,
  action,
}: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-gray-500 mb-4">
        {icon || <Inbox className="w-12 h-12" />}
      </div>
      <h3 className="text-lg font-medium text-gray-200">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-gray-400 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default Empty;
