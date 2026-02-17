/**
 * PersianDatePicker Example Usage
 *
 * This file demonstrates various use cases for the PersianDatePicker component.
 */

import { useState } from 'react';
import { PersianDatePicker } from './PersianDatePicker';

/**
 * Example 1: Basic Usage
 */
export function BasicExample() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  return (
    <div className="p-6 bg-surface-base rounded-lg">
      <h3 className="text-lg font-medium text-gray-100 mb-4">
        مثال پایه: انتخاب تاریخ
      </h3>

      <PersianDatePicker
        label="تاریخ"
        value={selectedDate}
        onChange={setSelectedDate}
        placeholder="انتخاب تاریخ"
      />

      {selectedDate && (
        <p className="mt-4 text-sm text-gray-300">
          تاریخ انتخاب شده: {selectedDate.toLocaleDateString('fa-IR')}
        </p>
      )}
    </div>
  );
}

/**
 * Example 2: Form Integration with Validation
 */
export function FormIntegrationExample() {
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [error, setError] = useState<string>('');

  const handleDateChange = (date: Date | null) => {
    setBirthDate(date);

    // Validation example
    if (!date) {
      setError('تاریخ تولد الزامی است');
    } else if (date > new Date()) {
      setError('تاریخ تولد نمی‌تواند در آینده باشد');
    } else {
      setError('');
    }
  };

  return (
    <div className="p-6 bg-surface-base rounded-lg">
      <h3 className="text-lg font-medium text-gray-100 mb-4">
        مثال فرم: تاریخ تولد با اعتبارسنجی
      </h3>

      <PersianDatePicker
        label="تاریخ تولد"
        value={birthDate}
        onChange={handleDateChange}
        maxDate={new Date()}
        error={!!error}
        helperText={error || 'لطفا تاریخ تولد خود را وارد کنید'}
        required
        placeholder="مثال: 1370/05/15"
      />
    </div>
  );
}

/**
 * Example 3: Date Range Selection
 */
export function DateRangeExample() {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
    // Clear end date if it's before the new start date
    if (endDate && date && endDate < date) {
      setEndDate(null);
    }
  };

  return (
    <div className="p-6 bg-surface-base rounded-lg">
      <h3 className="text-lg font-medium text-gray-100 mb-4">
        مثال بازه زمانی: تاریخ شروع و پایان
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PersianDatePicker
          label="تاریخ شروع"
          value={startDate}
          onChange={handleStartDateChange}
          placeholder="انتخاب تاریخ شروع"
        />

        <PersianDatePicker
          label="تاریخ پایان"
          value={endDate}
          onChange={setEndDate}
          minDate={startDate || undefined}
          disabled={!startDate}
          placeholder="ابتدا تاریخ شروع را انتخاب کنید"
        />
      </div>

      {startDate && endDate && (
        <div className="mt-4 p-4 bg-surface-50 rounded-lg">
          <p className="text-sm text-gray-300">
            از {startDate.toLocaleDateString('fa-IR')} تا {endDate.toLocaleDateString('fa-IR')}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            مدت: {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} روز
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Example 4: Loan Start Date (Real-world usage)
 */
export function LoanStartDateExample() {
  const [loanStartDate, setLoanStartDate] = useState<Date | null>(null);
  const [firstPaymentDate, setFirstPaymentDate] = useState<Date | null>(null);

  const handleLoanStartChange = (date: Date | null) => {
    setLoanStartDate(date);

    // Automatically set first payment date to 30 days after loan start
    if (date) {
      const firstPayment = new Date(date);
      firstPayment.setDate(firstPayment.getDate() + 30);
      setFirstPaymentDate(firstPayment);
    } else {
      setFirstPaymentDate(null);
    }
  };

  return (
    <div className="p-6 bg-surface-base rounded-lg">
      <h3 className="text-lg font-medium text-gray-100 mb-4">
        مثال واقعی: تاریخ شروع وام
      </h3>

      <div className="space-y-4">
        <PersianDatePicker
          label="تاریخ شروع وام"
          value={loanStartDate}
          onChange={handleLoanStartChange}
          minDate={new Date()}
          required
          placeholder="تاریخ دریافت وام"
          helperText="تاریخی که وام دریافت می‌شود"
        />

        <PersianDatePicker
          label="تاریخ اولین قسط"
          value={firstPaymentDate}
          onChange={setFirstPaymentDate}
          minDate={loanStartDate || new Date()}
          disabled={!loanStartDate}
          placeholder="محاسبه خودکار"
          helperText="30 روز پس از دریافت وام"
        />
      </div>

      {loanStartDate && (
        <div className="mt-4 p-4 bg-primary-900/20 border border-primary-700/30 rounded-lg">
          <h4 className="text-sm font-medium text-primary-400 mb-2">
            خلاصه اطلاعات
          </h4>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>تاریخ شروع: {loanStartDate.toLocaleDateString('fa-IR')}</li>
            {firstPaymentDate && (
              <li>اولین پرداخت: {firstPaymentDate.toLocaleDateString('fa-IR')}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Example 5: Disabled and Read-only States
 */
export function DisabledExample() {
  const [date, setDate] = useState<Date | null>(new Date());

  return (
    <div className="p-6 bg-surface-base rounded-lg">
      <h3 className="text-lg font-medium text-gray-100 mb-4">
        مثال حالت‌های مختلف
      </h3>

      <div className="space-y-4">
        <PersianDatePicker
          label="فعال"
          value={date}
          onChange={setDate}
          placeholder="می‌توانید تاریخ را تغییر دهید"
        />

        <PersianDatePicker
          label="غیرفعال"
          value={date}
          onChange={() => {}}
          disabled
          placeholder="نمی‌توانید تاریخ را تغییر دهید"
        />
      </div>
    </div>
  );
}

/**
 * Example 6: Complete Form Example
 */
export function CompleteFormExample() {
  const [formData, setFormData] = useState({
    loanStartDate: null as Date | null,
    birthDate: null as Date | null,
    employmentDate: null as Date | null,
  });

  const [errors, setErrors] = useState({
    loanStartDate: '',
    birthDate: '',
    employmentDate: '',
  });

  const validateForm = () => {
    const newErrors = {
      loanStartDate: '',
      birthDate: '',
      employmentDate: '',
    };

    if (!formData.loanStartDate) {
      newErrors.loanStartDate = 'تاریخ شروع وام الزامی است';
    }

    if (!formData.birthDate) {
      newErrors.birthDate = 'تاریخ تولد الزامی است';
    } else if (formData.birthDate > new Date()) {
      newErrors.birthDate = 'تاریخ تولد نمی‌تواند در آینده باشد';
    }

    if (formData.employmentDate && formData.employmentDate > new Date()) {
      newErrors.employmentDate = 'تاریخ استخدام نمی‌تواند در آینده باشد';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      console.log('Form submitted:', formData);
      alert('فرم با موفقیت ارسال شد!');
    }
  };

  return (
    <div className="p-6 bg-surface-base rounded-lg">
      <h3 className="text-lg font-medium text-gray-100 mb-4">
        مثال فرم کامل
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <PersianDatePicker
          label="تاریخ شروع وام"
          value={formData.loanStartDate}
          onChange={(date) => setFormData({ ...formData, loanStartDate: date })}
          minDate={new Date()}
          error={!!errors.loanStartDate}
          helperText={errors.loanStartDate || 'تاریخی که وام دریافت می‌شود'}
          required
        />

        <PersianDatePicker
          label="تاریخ تولد"
          value={formData.birthDate}
          onChange={(date) => setFormData({ ...formData, birthDate: date })}
          maxDate={new Date()}
          error={!!errors.birthDate}
          helperText={errors.birthDate || 'برای محاسبه سن'}
          required
        />

        <PersianDatePicker
          label="تاریخ استخدام"
          value={formData.employmentDate}
          onChange={(date) => setFormData({ ...formData, employmentDate: date })}
          maxDate={new Date()}
          error={!!errors.employmentDate}
          helperText={errors.employmentDate || 'برای محاسبه سابقه کاری (اختیاری)'}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-border-dark">
          <button
            type="button"
            onClick={() => setFormData({ loanStartDate: null, birthDate: null, employmentDate: null })}
            className="px-6 py-2.5 text-gray-300 bg-surface-50 border border-border-light rounded-lg hover:bg-surface-100 hover:text-gray-100 transition-colors"
          >
            پاک کردن
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors"
          >
            ارسال فرم
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * All Examples Component
 */
export function PersianDatePickerExamples() {
  return (
    <div className="min-h-screen bg-surface-dark p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-100 mb-2">
          نمونه‌های استفاده از PersianDatePicker
        </h1>
        <p className="text-gray-400 mb-8">
          راهنمای جامع استفاده از کامپوننت تقویم شمسی
        </p>

        <div className="space-y-6">
          <BasicExample />
          <FormIntegrationExample />
          <DateRangeExample />
          <LoanStartDateExample />
          <DisabledExample />
          <CompleteFormExample />
        </div>

        <div className="mt-8 p-6 bg-surface-100 border border-border-light rounded-lg">
          <h3 className="text-lg font-medium text-gray-100 mb-4">
            نکات مهم
          </h3>
          <ul className="text-sm text-gray-300 space-y-2 list-disc list-inside">
            <li>کامپوننت از تقویم شمسی (جلالی) استفاده می‌کند</li>
            <li>کامل راست‌چین (RTL) و با طراحی تیره</li>
            <li>پشتیبانی از اعتبارسنجی و نمایش خطا</li>
            <li>قابلیت تعیین حداقل و حداکثر تاریخ</li>
            <li>سازگار با سیستم طراحی موجود در پروژه</li>
            <li>کاملا تایپ‌سیف با TypeScript</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default PersianDatePickerExamples;
