/**
 * Optimizer Filters Component
 * Allows users to filter loan results
 */

import React, { useCallback, useMemo } from 'react';
import type { LoanAnalysisResult } from '../types';

interface OptimizerFiltersProps {
  results: LoanAnalysisResult[];
  selectedBanks: string[];
  onSelectedBanksChange: (banks: string[]) => void;
  onlySuitable: boolean;
  onOnlySuitableChange: (value: boolean) => void;
}

const OptimizerFilters: React.FC<OptimizerFiltersProps> = ({
  results,
  selectedBanks,
  onSelectedBanksChange,
  onlySuitable,
  onOnlySuitableChange,
}) => {
  // Get unique banks from results
  const uniqueBanks = useMemo(() => {
    const banks = new Set(results.map((r) => r.bankNameFA));
    return Array.from(banks).sort();
  }, [results]);

  // Memoize suitable count calculation
  const suitableCount = useMemo(
    () => results.filter((r) => r.meetsRequirement).length,
    [results]
  );

  // Memoize handlers
  const handleBankToggle = useCallback(
    (bank: string) => {
      if (selectedBanks.includes(bank)) {
        onSelectedBanksChange(selectedBanks.filter((b) => b !== bank));
      } else {
        onSelectedBanksChange([...selectedBanks, bank]);
      }
    },
    [selectedBanks, onSelectedBanksChange]
  );

  const handleSelectAll = useCallback(() => {
    onSelectedBanksChange(uniqueBanks);
  }, [uniqueBanks, onSelectedBanksChange]);

  const handleClearAll = useCallback(() => {
    onSelectedBanksChange([]);
  }, [onSelectedBanksChange]);

  return (
    <div className="bg-surface-800 rounded-lg p-4 border border-surface-700">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Bank filters */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            فیلتر بانک
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1 text-xs bg-surface-700 hover:bg-surface-600 text-gray-300 rounded border border-surface-600 transition-colors"
            >
              انتخاب همه
            </button>
            <button
              onClick={handleClearAll}
              className="px-3 py-1 text-xs bg-surface-700 hover:bg-surface-600 text-gray-300 rounded border border-surface-600 transition-colors"
            >
              حذف همه
            </button>
            <span className="text-xs text-gray-500 self-center">
              ({selectedBanks.length} از {uniqueBanks.length} بانک انتخاب شده)
            </span>
          </div>
          <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
            {uniqueBanks.map((bank) => (
              <label
                key={bank}
                className="flex items-center space-x-2 space-x-reverse cursor-pointer hover:bg-surface-700 px-2 py-1 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedBanks.includes(bank)}
                  onChange={() => handleBankToggle(bank)}
                  className="w-4 h-4 text-primary-400 focus:ring-primary-400 focus:ring-2 rounded"
                />
                <span className="text-sm text-gray-300">{bank}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Suitable loans toggle */}
        <div className="border-r border-surface-700 pr-4">
          <label className="flex items-center space-x-3 space-x-reverse cursor-pointer">
            <input
              type="checkbox"
              checked={onlySuitable}
              onChange={(e) => onOnlySuitableChange(e.target.checked)}
              className="w-5 h-5 text-primary-400 focus:ring-primary-400 focus:ring-2 rounded"
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-300">
                فقط وام‌های مناسب
              </span>
              <span className="text-xs text-gray-500">
                ({suitableCount.toLocaleString('fa-IR')} وام)
              </span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};

export default React.memo(OptimizerFilters);
