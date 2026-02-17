/**
 * Loan Card Component - Dark Theme (Improved)
 */

import React from 'react';
import { Percent, Banknote, Clock, UserCheck, Check } from 'lucide-react';
import { Badge, Card } from '../ui';
import type { LoanType, LoanWithBank } from '@/types';

interface LoanCardProps {
  loan: LoanType | LoanWithBank;
  showBank?: boolean;
  onClick?: () => void;
  isSelected?: boolean;
  onSelect?: (loan: LoanType | LoanWithBank) => void;
  selectable?: boolean;
}

const LoanCardComponent = function LoanCard({
  loan,
  showBank = false,
  onClick,
  isSelected = false,
  onSelect,
  selectable = false,
}: LoanCardProps) {
  const loanWithBank = loan as LoanWithBank;
  const hasGuarantor = loan.guarantor !== false;

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(loan);
    }
  };

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'border-primary-400 ring-2 ring-primary-400/40 shadow-glow-sm'
          : 'hover:border-primary-400/50 hover:shadow-dark-lg'
      }`}
      padding="md"
    >
      <div onClick={handleCardClick}>
        <div className="flex items-start justify-between mb-3 pb-3 border-b border-border-dark">
          <div className="flex items-start gap-3 flex-1">
            {selectable && (
              <button
                onClick={handleSelectClick}
                className={`flex-shrink-0 mt-1 w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
                  isSelected
                    ? 'bg-primary-500 border-primary-500'
                    : 'border-gray-400 hover:border-primary-400'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </button>
            )}
            <div>
              <h4 className="font-semibold text-gray-50">{loan.nameFA}</h4>
              {showBank && loanWithBank.bankNameFA && (
                <p className="text-sm text-gray-300 mt-1">
                  {loanWithBank.bankNameFA}
                </p>
              )}
            </div>
          </div>
          {!hasGuarantor && (
            <Badge variant="green" size="sm">
              بدون ضامن
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {loan.interestRate && (
            <div className="flex items-center gap-2 text-gray-300">
              <Percent className="w-4 h-4 text-primary-400" />
              <span>نرخ: {loan.interestRate}</span>
            </div>
          )}

          {(loan.minAmount || loan.maxAmount) && (
            <div className="flex items-center gap-2 text-gray-300">
              <Banknote className="w-4 h-4 text-secondary-500" />
              <span>
                {loan.minAmount && `از ${loan.minAmount}`}
                {loan.maxAmount && ` تا ${loan.maxAmount}`}
              </span>
            </div>
          )}

          {(loan.minTerm || loan.maxTerm) && (
            <div className="flex items-center gap-2 text-gray-300">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span>
                {loan.minTerm && `از ${loan.minTerm}`}
                {loan.maxTerm && ` تا ${loan.maxTerm}`}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-gray-300">
            <UserCheck className={`w-4 h-4 ${hasGuarantor ? 'text-yellow-400' : 'text-secondary-500'}`} />
            <span>{hasGuarantor ? 'نیاز به ضامن' : 'بدون ضامن'}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export const LoanCard = React.memo(LoanCardComponent);
LoanCard.displayName = 'LoanCard';

export default LoanCard;
