/**
 * Comparison View - Main Container
 * Displays side-by-side loan comparison
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X, Download, Share2, Eye, EyeOff } from 'lucide-react';
import { useLoanSelection } from '@/context/LoanSelectionContext';
import { Card, Button, Badge } from '@/components/ui';
import { ComparisonTable } from './components/ComparisonTable';
import type { LoanWithBank } from '@/types';

export function ComparisonView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedLoans, clearSelection } = useLoanSelection();
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);

  // Handle URL-based comparison (e.g., /compare?loans=bank1:loan1,bank2:loan2)
  useEffect(() => {
    const loansParam = searchParams.get('loans');
    if (loansParam && selectedLoans.length === 0) {
      // TODO: Load loans from URL parameter
      // This would require fetching the loans by their IDs
    }
  }, [searchParams, selectedLoans.length]);

  const handleClearSelection = () => {
    clearSelection();
    navigate('/loans');
  };

  const handleExportCSV = () => {
    // TODO: Implement CSV export
    console.log('Export CSV');
  };

  const handleShare = async () => {
    // Generate shareable URL
    const loanIds = selectedLoans.map((loan) => {
      const loanWithBank = loan as LoanWithBank;
      return loanWithBank.bankId
        ? `${loanWithBank.bankId}:${loan.id}`
        : loan.id;
    });

    const shareUrl = `${window.location.origin}/compare?loans=${loanIds.join(',')}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('لینک مقایسه کپی شد!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (selectedLoans.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="text-center py-12">
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-50 mb-4">
              هیچ وامی برای مقایسه انتخاب نشده است
            </h2>
            <p className="text-gray-300 mb-6">
              لطفاً از صفحه وام‌ها، حداقل ۲ وام را برای مقایسه انتخاب کنید.
            </p>
            <Button onClick={() => navigate('/loans')} variant="primary">
              رفتن به صفحه وام‌ها
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (selectedLoans.length === 1) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="text-center py-12">
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-50 mb-4">
              برای مقایسه، حداقل ۲ وام انتخاب کنید
            </h2>
            <p className="text-gray-300 mb-6">
              شما یک وام انتخاب کرده‌اید. لطفاً حداقل یک وام دیگر برای مقایسه انتخاب کنید.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate('/loans')} variant="primary">
                انتخاب وام‌های بیشتر
              </Button>
              <Button onClick={handleClearSelection} variant="outline">
                پاک کردن انتخاب
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-50 mb-2">
              مقایسه وام‌ها
            </h1>
            <p className="text-gray-300">
              مقایسه {selectedLoans.length} وام انتخاب شده
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setShowDifferencesOnly(!showDifferencesOnly)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {showDifferencesOnly ? (
                <>
                  <Eye className="w-4 h-4" />
                  نمایش همه
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" />
                  فقط تفاوت‌ها
                </>
              )}
            </Button>

            <Button
              onClick={handleShare}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Share2 className="w-4 h-4" />
              اشتراک‌گذاری
            </Button>

            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              خروجی CSV
            </Button>

            <Button
              onClick={handleClearSelection}
              variant="ghost"
              size="sm"
              className="gap-2 text-red-400 hover:text-red-300"
            >
              <X className="w-4 h-4" />
              پاک کردن همه
            </Button>
          </div>
        </div>

        {/* Selected Loans Badges */}
        <div className="flex flex-wrap gap-2">
          {selectedLoans.map((loan) => (
            <Badge key={loan.id} variant="blue" size="sm">
              {loan.nameFA}
            </Badge>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <ComparisonTable
        loans={selectedLoans}
        showDifferencesOnly={showDifferencesOnly}
      />
    </div>
  );
}

export default ComparisonView;
