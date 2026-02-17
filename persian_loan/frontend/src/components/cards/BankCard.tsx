/**
 * Bank Card Component - Dark Theme (Improved)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ArrowLeft, CreditCard } from 'lucide-react';
import { Badge } from '../ui';
import type { Bank } from '@/types';

interface BankCardProps {
  bank: Bank;
}

export const BankCard = React.memo(({ bank }: BankCardProps) => {
  const isDigital = bank.category === 'digital-banks';

  return (
    <Link
      to={`/banks/${bank.id}`}
      className="block bg-surface-100 rounded-lg shadow-dark-md border border-border-light hover:shadow-dark-lg hover:border-primary-400/40 transition-all duration-200 group"
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-800/20 rounded-lg border border-primary-700/30 group-hover:bg-primary-800/30 transition-colors">
              <Building2 className="w-8 h-8 text-primary-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-50 group-hover:text-primary-400 transition-colors">
                {bank.nameFA}
              </h3>
              <p className="text-sm text-gray-300">{bank.nameEN}</p>
            </div>
          </div>
          <Badge variant={isDigital ? 'purple' : 'blue'} size="sm">
            {isDigital ? 'دیجیتال' : 'سنتی'}
          </Badge>
        </div>

        <div className="mt-4 flex items-center justify-between pt-4 border-t border-border-dark">
          <div className="flex items-center gap-2 text-gray-300">
            <CreditCard className="w-4 h-4 text-secondary-500" />
            <span className="text-sm">{bank.loansCount} محصول وام</span>
          </div>
          <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </Link>
  );
});

BankCard.displayName = 'BankCard';

export default BankCard;
