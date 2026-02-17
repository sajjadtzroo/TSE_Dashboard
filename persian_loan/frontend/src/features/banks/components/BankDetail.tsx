/**
 * Bank Detail Component (Refactored)
 * Main container that composes all bank detail sub-components
 */

import { Link } from 'react-router-dom';
import { ArrowRight, Info, Home } from 'lucide-react';
import { useBank, useBankLoans } from '@/hooks';
import { Card, LoadingPage, Empty, Breadcrumb } from '@/components/ui';
import { BankHeader } from './BankHeader';
import { BankScoringSystem } from './BankScoringSystem';
import { BankCalculatorExamples } from './BankCalculatorExamples';
import { BankCoefficientTables } from './BankCoefficientTables';
import { BankStepSystem } from './BankStepSystem';
import { BankMainProgram } from './BankMainProgram';
import { BankRequirementsSection } from './BankRequirementsSection';
import { BankLoansSection } from './BankLoansSection';

interface BankDetailProps {
  bankId: string;
}

export function BankDetailView({ bankId }: BankDetailProps) {
  const { data: bank, isLoading: bankLoading } = useBank(bankId);
  const { data: loans, isLoading: loansLoading } = useBankLoans(bankId);

  if (bankLoading || loansLoading) {
    return <LoadingPage />;
  }

  if (!bank) {
    return (
      <Empty
        title="بانک یافت نشد"
        description="بانک مورد نظر در سیستم موجود نیست"
        action={
          <Link to="/banks" className="text-primary-400 hover:text-primary-300">
            بازگشت به لیست بانک‌ها
          </Link>
        }
      />
    );
  }

  const isDigital = bank.category === 'digital-banks';

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'خانه', href: '/', icon: Home },
          { label: 'بانک‌ها', href: '/banks' },
          { label: bank.nameFA },
        ]}
      />

      {/* Back link */}
      <Link
        to="/banks"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200"
      >
        <ArrowRight className="w-4 h-4" />
        <span>بازگشت به لیست بانک‌ها</span>
      </Link>

      {/* Bank Header */}
      <Card>
        <BankHeader bank={bank} isDigital={isDigital} />

        {/* Description */}
        {bank.descriptionFA && (
          <div className="mt-4 pt-4 border-t border-border-dark">
            <p className="text-gray-200 leading-relaxed">{bank.descriptionFA}</p>
          </div>
        )}
      </Card>

      {/* Scoring System */}
      {bank.scoringSystem && (
        <Card>
          <BankScoringSystem scoringSystem={bank.scoringSystem} />
        </Card>
      )}

      {/* Loan Calculator Examples */}
      {bank.loanCalculatorExamples && bank.loanCalculatorExamples.length > 0 && (
        <Card>
          <BankCalculatorExamples examples={bank.loanCalculatorExamples} />
        </Card>
      )}

      {/* Coefficient Tables (includes Vamino tables) */}
      <BankCoefficientTables bank={bank} />

      {/* Step System (Hi Bank style) */}
      {bank.stepSystem && (
        <Card>
          <BankStepSystem stepSystem={bank.stepSystem} />
        </Card>
      )}

      {/* Main Program (Bank Iran Zamin style) */}
      {bank.mainProgram && (
        <Card>
          <BankMainProgram mainProgram={bank.mainProgram} />
        </Card>
      )}

      {/* Requirements Section (Guarantor, Credit Rating, Process, General) */}
      <BankRequirementsSection bank={bank} />

      {/* Important Note */}
      {(bank.importantNote || bank.note) && (
        <div className="bg-amber-900/20 border border-amber-700/30 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-300">{bank.importantNote || bank.note}</p>
          </div>
        </div>
      )}

      {/* Loans Section */}
      <BankLoansSection loans={loans} />
    </div>
  );
}

export default BankDetailView;
