/**
 * Bank Step System Component
 * Displays step system with tiers (Hi Bank style)
 */

import { memo } from 'react';
import { Layers } from 'lucide-react';
import type { Bank } from '@/types';

interface BankStepSystemProps {
  stepSystem: Bank['stepSystem'];
}

export const BankStepSystem = memo(function BankStepSystem({
  stepSystem,
}: BankStepSystemProps) {
  if (!stepSystem) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-5 h-5 text-orange-400" />
        <h2 className="text-lg font-semibold text-gray-50">سیستم پلکانی</h2>
      </div>
      {stepSystem.descriptionFA && (
        <p className="text-gray-300 mb-4">{stepSystem.descriptionFA}</p>
      )}
      <div className="space-y-3">
        {stepSystem.tiers?.map((tier, idx) => (
          <div
            key={idx}
            className="bg-gradient-to-l from-orange-900/20 to-surface-100 p-4 rounded-lg border-r-4 border-orange-500"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
                {idx + 1}
              </span>
              <p className="font-bold text-gray-100">
                {tier.nameFA || tier.name}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {tier.amount && (
                <div>
                  <span className="text-gray-400">مبلغ: </span>
                  <span className="font-medium text-gray-200">
                    {tier.amountFA || tier.amount}
                  </span>
                </div>
              )}
              {tier.interestRate && (
                <div>
                  <span className="text-gray-400">نرخ سود: </span>
                  <span className="font-medium text-gray-200">
                    {tier.interestRate}
                  </span>
                </div>
              )}
              {tier.timeToUnlock && (
                <div>
                  <span className="text-gray-400">زمان باز شدن: </span>
                  <span className="font-medium text-gray-200">
                    {tier.timeToUnlock}
                  </span>
                </div>
              )}
            </div>
            {tier.requirementFA && (
              <p className="text-xs text-gray-500 mt-2">{tier.requirementFA}</p>
            )}
          </div>
        ))}
      </div>
    </>
  );
});
