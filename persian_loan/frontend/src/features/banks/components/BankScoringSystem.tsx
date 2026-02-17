/**
 * Bank Scoring System Component
 * Displays scoring system formula, club name, calculation period, and max loan
 */

import { memo } from 'react';
import { Coins } from 'lucide-react';
import type { Bank } from '@/types';

interface BankScoringSystemProps {
  scoringSystem: Bank['scoringSystem'];
}

export const BankScoringSystem = memo(function BankScoringSystem({
  scoringSystem,
}: BankScoringSystemProps) {
  if (!scoringSystem) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-dark">
        <Coins className="w-5 h-5 text-yellow-400" />
        <h2 className="text-lg font-semibold text-gray-50">سیستم امتیازدهی</h2>
      </div>
      <div className="bg-yellow-900/15 border border-yellow-700/40 p-4 rounded-lg space-y-3">
        {scoringSystem.formulaFA && (
          <p className="text-yellow-200">
            <strong className="text-yellow-100">فرمول:</strong>{' '}
            {scoringSystem.formulaFA}
          </p>
        )}
        {scoringSystem.clubName && (
          <p className="text-yellow-200">
            <strong className="text-yellow-100">باشگاه:</strong>{' '}
            {scoringSystem.clubName}
          </p>
        )}
        {scoringSystem.calculationPeriodFA && (
          <p className="text-yellow-300 text-sm">
            {scoringSystem.calculationPeriodFA}
          </p>
        )}
        {scoringSystem.maxLoan && (
          <p className="text-yellow-100 font-bold">
            حداکثر وام: {scoringSystem.maxLoan}
          </p>
        )}
      </div>
    </>
  );
});
