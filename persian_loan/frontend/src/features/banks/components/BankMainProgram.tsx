/**
 * Bank Main Program Component
 * Displays main program information (Bank Iran Zamin style)
 */

import { memo } from 'react';
import { Info } from 'lucide-react';
import type { Bank } from '@/types';

interface BankMainProgramProps {
  mainProgram: Bank['mainProgram'];
}

export const BankMainProgram = memo(function BankMainProgram({
  mainProgram,
}: BankMainProgramProps) {
  if (!mainProgram) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-5 h-5 text-secondary-500" />
        <h2 className="text-lg font-semibold text-gray-50">برنامه اصلی</h2>
      </div>
      <div className="bg-secondary-900/20 border border-secondary-700/30 p-4 rounded-lg space-y-2">
        {mainProgram.nameFA && (
          <p className="font-bold text-secondary-400">{mainProgram.nameFA}</p>
        )}
        {mainProgram.descriptionFA && (
          <p className="text-secondary-300">{mainProgram.descriptionFA}</p>
        )}
        {mainProgram.benefitsFA && (
          <ul className="list-disc list-inside text-secondary-300 text-sm">
            {(mainProgram.benefitsFA as string[]).map(
              (benefit: string, idx: number) => (
                <li key={idx}>{benefit}</li>
              )
            )}
          </ul>
        )}
      </div>
    </>
  );
});
