/**
 * Loan Detail Page
 */

import { useParams, Link } from 'react-router-dom';
import { ArrowRight, Home } from 'lucide-react';
import { useLoans, useBank } from '../hooks';
import { LoadingPage, Empty, Breadcrumb } from '../components/ui';
import { LoanDetailCard } from '../components/cards';
import { LoanDetailCFASection } from '../features/loans/LoanDetailCFASection';

export default function LoanDetail() {
  const { bankId, loanId } = useParams<{ bankId: string; loanId: string }>();
  const { data: allLoans, isLoading: loansLoading } = useLoans();
  const { data: bank, isLoading: bankLoading } = useBank(bankId || '');

  if (loansLoading || bankLoading) {
    return <LoadingPage />;
  }

  // Find the specific loan
  const loan = allLoans?.find(
    (l) => l.bankId === bankId && l.id === loanId
  );

  if (!loan) {
    return (
      <div className="space-y-6">
        <Link
          to="/loans"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به لیست وام‌ها</span>
        </Link>
        <Empty
          title="وام یافت نشد"
          description="وام مورد نظر در سیستم موجود نیست"
          action={
            <Link
              to="/loans"
              className="text-primary-400 hover:text-primary-300"
            >
              بازگشت به لیست وام‌ها
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'خانه', href: '/', icon: Home },
          { label: 'بانک‌ها', href: '/banks' },
          ...(bank ? [{ label: bank.nameFA, href: `/banks/${bank.id}` }] : []),
          { label: loan.nameFA },
        ]}
      />

      {/* Back link */}
      <Link
        to="/loans"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200"
      >
        <ArrowRight className="w-4 h-4" />
        <span>بازگشت به لیست وام‌ها</span>
      </Link>

      {/* Loan Detail Card */}
      <LoanDetailCard loan={loan} />

      {/* CFA Analysis Section */}
      <LoanDetailCFASection loan={loan} />

      {/* View Bank Details Link */}
      <div className="flex justify-center">
        <Link
          to={`/banks/${loan.bankId}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-800/20 text-primary-400 rounded-lg border border-primary-700/40 hover:bg-primary-800/30 hover:border-primary-600/50 transition-all"
        >
          <span>مشاهده جزئیات بانک {loan.bankNameFA || ''}</span>
        </Link>
      </div>
    </div>
  );
}
