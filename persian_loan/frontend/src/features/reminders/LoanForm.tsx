/**
 * Loan Input Form Component
 *
 * Form for adding/editing user loans with validation and preview.
 */

import { useState, useEffect, useCallback } from 'react';
import { CreateLoanRequest, ReminderLoanType, PaymentCalculationResponse } from '@/services';
import { useCalculatePayment } from '@/hooks/useReminders';
import { PersianDatePicker } from '@/components/ui';

interface LoanFormProps {
  initialData?: Partial<CreateLoanRequest>;
  onSubmit: (data: CreateLoanRequest) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  userId: string;
}

const LOAN_TYPE_OPTIONS: { value: ReminderLoanType; label: string; labelFA: string }[] = [
  { value: 'equal_installments', label: 'Equal Installments', labelFA: 'قسط مساوی' },
  { value: 'reducing_balance', label: 'Reducing Balance', labelFA: 'مانده نزولی' },
  { value: 'graduated', label: 'Graduated', labelFA: 'پلکانی' },
  { value: 'balloon', label: 'Balloon', labelFA: 'بالونی' },
  { value: 'interest_only', label: 'Interest Only', labelFA: 'فقط سود' },
];

const formatNumber = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num.toLocaleString('fa-IR');
};

const parseNumber = (value: string): string => {
  // Remove commas and convert Persian digits to English
  return value
    .replace(/,/g, '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
};

export function LoanForm({ initialData, onSubmit, onCancel, isSubmitting, userId }: LoanFormProps) {
  const [formData, setFormData] = useState<CreateLoanRequest>({
    userId,
    loanName: initialData?.loanName || '',
    loanNameFA: initialData?.loanNameFA || '',
    bankName: initialData?.bankName || '',
    bankNameFA: initialData?.bankNameFA || '',
    principalAmount: initialData?.principalAmount || '',
    interestRate: initialData?.interestRate || '',
    loanType: initialData?.loanType || 'equal_installments',
    totalInstallments: initialData?.totalInstallments || 12,
    startDate: initialData?.startDate || new Date().toISOString().split('T')[0],
    paymentDay: initialData?.paymentDay || 1,
    description: initialData?.description || '',
    notes: initialData?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<PaymentCalculationResponse | null>(null);

  const calculateMutation = useCalculatePayment();

  // Validate form
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.loanName.trim()) {
      newErrors.loanName = 'نام وام الزامی است';
    }

    const principal = parseFloat(parseNumber(formData.principalAmount));
    if (isNaN(principal) || principal <= 0) {
      newErrors.principalAmount = 'مبلغ وام باید عدد مثبت باشد';
    }

    const rate = parseFloat(parseNumber(formData.interestRate));
    if (isNaN(rate) || rate < 0 || rate > 100) {
      newErrors.interestRate = 'نرخ سود باید بین 0 تا 100 درصد باشد';
    }

    if (formData.totalInstallments < 1 || formData.totalInstallments > 360) {
      newErrors.totalInstallments = 'تعداد اقساط باید بین 1 تا 360 باشد';
    }

    if (formData.paymentDay < 1 || formData.paymentDay > 31) {
      newErrors.paymentDay = 'روز پرداخت باید بین 1 تا 31 باشد';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'تاریخ شروع الزامی است';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Calculate preview when relevant fields change
  useEffect(() => {
    const principal = parseNumber(formData.principalAmount);
    const rate = parseNumber(formData.interestRate);

    if (
      principal &&
      rate &&
      formData.totalInstallments > 0 &&
      parseFloat(principal) > 0 &&
      parseFloat(rate) >= 0
    ) {
      const debounceTimeout = setTimeout(() => {
        calculateMutation.mutate({
          principalAmount: principal,
          interestRate: rate,
          totalInstallments: formData.totalInstallments,
          loanType: formData.loanType,
          startDate: formData.startDate,
          paymentDay: formData.paymentDay,
        }, {
          onSuccess: (data) => setPreview(data),
          onError: () => setPreview(null),
        });
      }, 500);

      return () => clearTimeout(debounceTimeout);
    } else {
      setPreview(null);
    }
  }, [
    formData.principalAmount,
    formData.interestRate,
    formData.totalInstallments,
    formData.loanType,
    formData.startDate,
    formData.paymentDay,
  ]);

  const handleChange = (field: keyof CreateLoanRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field changes
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Clean up data before submission
    const submitData: CreateLoanRequest = {
      ...formData,
      principalAmount: parseNumber(formData.principalAmount),
      interestRate: parseNumber(formData.interestRate),
    };

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Loan Name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">
            نام وام <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={formData.loanName}
            onChange={(e) => handleChange('loanName', e.target.value)}
            className={`w-full px-4 py-3 bg-surface-50 border ${
              errors.loanName ? 'border-red-500' : 'border-border-light'
            } rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400`}
            placeholder="مثال: وام مسکن"
          />
          {errors.loanName && (
            <p className="mt-1 text-xs text-red-400">{errors.loanName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">
            نام بانک
          </label>
          <input
            type="text"
            value={formData.bankNameFA || ''}
            onChange={(e) => handleChange('bankNameFA', e.target.value)}
            className="w-full px-4 py-3 bg-surface-50 border border-border-light rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400"
            placeholder="مثال: بانک مسکن"
          />
        </div>
      </div>

      {/* Financial Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">
            مبلغ وام (تومان) <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={formData.principalAmount}
            onChange={(e) => handleChange('principalAmount', e.target.value)}
            className={`w-full px-4 py-3 bg-surface-50 border ${
              errors.principalAmount ? 'border-red-500' : 'border-border-light'
            } rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400`}
            placeholder="مثال: 500000000"
          />
          {formData.principalAmount && (
            <p className="mt-1 text-xs text-gray-400">
              {formatNumber(parseNumber(formData.principalAmount))} تومان
            </p>
          )}
          {errors.principalAmount && (
            <p className="mt-1 text-xs text-red-400">{errors.principalAmount}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">
            نرخ سود سالانه (%) <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={formData.interestRate}
            onChange={(e) => handleChange('interestRate', e.target.value)}
            className={`w-full px-4 py-3 bg-surface-50 border ${
              errors.interestRate ? 'border-red-500' : 'border-border-light'
            } rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400`}
            placeholder="مثال: 18"
          />
          {errors.interestRate && (
            <p className="mt-1 text-xs text-red-400">{errors.interestRate}</p>
          )}
        </div>
      </div>

      {/* Loan Type and Installments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">
            نوع وام
          </label>
          <select
            value={formData.loanType}
            onChange={(e) => handleChange('loanType', e.target.value as ReminderLoanType)}
            className="w-full px-4 py-3 bg-surface-50 border border-border-light rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400"
          >
            {LOAN_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.labelFA}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">
            تعداد اقساط <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            value={formData.totalInstallments}
            onChange={(e) => handleChange('totalInstallments', parseInt(e.target.value) || 0)}
            min="1"
            max="360"
            className={`w-full px-4 py-3 bg-surface-50 border ${
              errors.totalInstallments ? 'border-red-500' : 'border-border-light'
            } rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400`}
          />
          {errors.totalInstallments && (
            <p className="mt-1 text-xs text-red-400">{errors.totalInstallments}</p>
          )}
        </div>
      </div>

      {/* Start Date and Payment Day */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <PersianDatePicker
            label="تاریخ شروع"
            value={formData.startDate ? new Date(formData.startDate) : null}
            onChange={(date) => {
              const dateStr = date ? date.toISOString().split('T')[0] : '';
              handleChange('startDate', dateStr);
            }}
            error={!!errors.startDate}
            helperText={errors.startDate}
            required
            placeholder="انتخاب تاریخ شروع"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">
            روز پرداخت قسط <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            value={formData.paymentDay}
            onChange={(e) => handleChange('paymentDay', parseInt(e.target.value) || 1)}
            min="1"
            max="31"
            className={`w-full px-4 py-3 bg-surface-50 border ${
              errors.paymentDay ? 'border-red-500' : 'border-border-light'
            } rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400`}
          />
          <p className="mt-1 text-xs text-gray-400">
            روز هر ماه که قسط پرداخت می‌شود
          </p>
          {errors.paymentDay && (
            <p className="mt-1 text-xs text-red-400">{errors.paymentDay}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">
          توضیحات
        </label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          className="w-full px-4 py-3 bg-surface-50 border border-border-light rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 resize-none"
          placeholder="توضیحات اضافی..."
        />
      </div>

      {/* Preview Section */}
      {preview && (
        <div className="bg-surface-100 border border-border-light rounded-lg p-4 space-y-4">
          <h3 className="text-lg font-medium text-gray-100 border-b border-border-dark pb-2">
            پیش‌نمایش محاسبات
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">مبلغ هر قسط</p>
              <p className="text-lg font-bold text-primary-400">
                {formatNumber(preview.monthlyPayment)}
              </p>
              <p className="text-xs text-gray-400">تومان</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">مجموع پرداختی</p>
              <p className="text-lg font-bold text-gray-100">
                {formatNumber(preview.totalPayment)}
              </p>
              <p className="text-xs text-gray-400">تومان</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">مجموع سود</p>
              <p className="text-lg font-bold text-yellow-400">
                {formatNumber(preview.totalInterest)}
              </p>
              <p className="text-xs text-gray-400">تومان</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">نرخ موثر سالانه</p>
              <p className="text-lg font-bold text-gray-100">
                {preview.effectiveRate}%
              </p>
            </div>
          </div>

          {/* First 3 payments preview */}
          {preview.paymentSchedule.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-200 mb-2">سه قسط اول:</h4>
              <div className="space-y-2">
                {preview.paymentSchedule.slice(0, 3).map((payment) => (
                  <div
                    key={payment.installmentNumber}
                    className="flex justify-between items-center text-sm bg-surface-50 rounded px-3 py-2"
                  >
                    <span className="text-gray-300">
                      قسط {payment.installmentNumber} - {payment.dueDateJalali}
                    </span>
                    <span className="text-gray-100 font-medium">
                      {formatNumber(payment.totalPayment)} تومان
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border-dark">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 text-gray-300 bg-surface-50 border border-border-light rounded-lg hover:bg-surface-100 hover:text-gray-100 transition-colors"
        >
          انصراف
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'در حال ذخیره...' : 'ذخیره وام'}
        </button>
      </div>
    </form>
  );
}

export default LoanForm;
