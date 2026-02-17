/**
 * Bank Header Component
 * Displays bank name, badges, website link, and description
 */

import { memo } from 'react';
import { Building2, Globe } from 'lucide-react';
import { Badge } from '@/components/ui';
import type { Bank } from '@/types';

interface BankHeaderProps {
  bank: Bank;
  isDigital: boolean;
}

export const BankHeader = memo(function BankHeader({
  bank,
  isDigital,
}: BankHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary-800/20 rounded-xl border border-primary-700/30">
          <Building2 className="w-12 h-12 text-primary-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-50">{bank.nameFA}</h1>
          <p className="text-gray-200">{bank.nameEN}</p>
          {bank.parentBankFA && (
            <p className="text-sm text-gray-400 mt-1">
              زیرمجموعه: {bank.parentBankFA}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant={isDigital ? 'purple' : 'blue'}>
              {isDigital ? 'بانک دیجیتال' : 'بانک سنتی'}
            </Badge>
            {bank.type && <Badge variant="gray">{bank.type}</Badge>}
            {bank.calculationMethod && (
              <Badge variant="green">{bank.calculationMethod}</Badge>
            )}
          </div>
        </div>
      </div>
      {bank.website && (
        <a
          href={bank.website}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-primary-400 hover:text-primary-300 bg-primary-800/20 px-4 py-2 rounded-lg border border-primary-700/40 hover:border-primary-600/50 transition-all"
        >
          <Globe className="w-4 h-4" />
          <span>وبسایت رسمی</span>
        </a>
      )}
    </div>
  );
});
