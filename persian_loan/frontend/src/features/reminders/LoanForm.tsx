/**
 * Loan Input Form Component
 *
 * Form for adding/editing user loans with validation and preview.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Text,
  Title,
  Group,
  Stack,
  SimpleGrid,
  Box,
  Button,
  TextInput,
  NumberInput,
  Select,
  Textarea,
} from '@mantine/core';
import { CreateLoanRequest, ReminderLoanType, PaymentCalculationResponse } from '@/services';
import { useCalculatePayment } from '@/hooks/useReminders';
import { PersianDatePicker } from '@/components/ui';
import rallyColors from '@/theme/rallyColors';

interface LoanFormProps {
  initialData?: Partial<CreateLoanRequest>;
  onSubmit: (data: CreateLoanRequest) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  userId: string;
}

const LOAN_TYPE_OPTIONS: { value: ReminderLoanType; label: string }[] = [
  { value: 'equal_installments', label: 'قسط مساوی' },
  { value: 'reducing_balance', label: 'مانده نزولی' },
  { value: 'graduated', label: 'پلکانی' },
  { value: 'balloon', label: 'بالونی' },
  { value: 'interest_only', label: 'فقط سود' },
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

const inputStyles = {
  label: { color: rallyColors.textPrimary, marginBottom: 8 },
  input: {
    backgroundColor: rallyColors.elevated,
    borderColor: rallyColors.border,
    color: rallyColors.textPrimary,
  },
  error: { color: rallyColors.red },
  description: { color: rallyColors.textDimmed },
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
    <form onSubmit={handleSubmit}>
      <Stack gap="lg">
        {/* Loan Name */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <TextInput
            label={
              <Text span>
                نام وام <Text span c={rallyColors.red}>*</Text>
              </Text>
            }
            value={formData.loanName}
            onChange={(e) => handleChange('loanName', e.currentTarget.value)}
            placeholder="مثال: وام مسکن"
            error={errors.loanName}
            styles={inputStyles}
          />

          <TextInput
            label="نام بانک"
            value={formData.bankNameFA || ''}
            onChange={(e) => handleChange('bankNameFA', e.currentTarget.value)}
            placeholder="مثال: بانک مسکن"
            styles={inputStyles}
          />
        </SimpleGrid>

        {/* Financial Details */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <div>
            <TextInput
              label={
                <Text span>
                  مبلغ وام (تومان) <Text span c={rallyColors.red}>*</Text>
                </Text>
              }
              value={formData.principalAmount}
              onChange={(e) => handleChange('principalAmount', e.currentTarget.value)}
              placeholder="مثال: 500000000"
              error={errors.principalAmount}
              styles={inputStyles}
            />
            {formData.principalAmount && (
              <Text size="xs" c={rallyColors.textSecondary} mt={4}>
                {formatNumber(parseNumber(formData.principalAmount))} تومان
              </Text>
            )}
          </div>

          <TextInput
            label={
              <Text span>
                نرخ سود سالانه (%) <Text span c={rallyColors.red}>*</Text>
              </Text>
            }
            value={formData.interestRate}
            onChange={(e) => handleChange('interestRate', e.currentTarget.value)}
            placeholder="مثال: 18"
            error={errors.interestRate}
            styles={inputStyles}
          />
        </SimpleGrid>

        {/* Loan Type and Installments */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <Select
            label="نوع وام"
            value={formData.loanType}
            onChange={(val) => handleChange('loanType', val as ReminderLoanType)}
            data={LOAN_TYPE_OPTIONS}
            styles={inputStyles}
          />

          <NumberInput
            label={
              <Text span>
                تعداد اقساط <Text span c={rallyColors.red}>*</Text>
              </Text>
            }
            value={formData.totalInstallments}
            onChange={(val) => handleChange('totalInstallments', Number(val) || 0)}
            min={1}
            max={360}
            error={errors.totalInstallments}
            styles={inputStyles}
          />
        </SimpleGrid>

        {/* Start Date and Payment Day */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
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

          <div>
            <NumberInput
              label={
                <Text span>
                  روز پرداخت قسط <Text span c={rallyColors.red}>*</Text>
                </Text>
              }
              value={formData.paymentDay}
              onChange={(val) => handleChange('paymentDay', Number(val) || 1)}
              min={1}
              max={31}
              error={errors.paymentDay}
              description="روز هر ماه که قسط پرداخت می‌شود"
              styles={inputStyles}
            />
          </div>
        </SimpleGrid>

        {/* Description */}
        <Textarea
          label="توضیحات"
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.currentTarget.value)}
          rows={3}
          placeholder="توضیحات اضافی..."
          styles={{
            ...inputStyles,
            input: {
              ...inputStyles.input,
              resize: 'none',
            },
          }}
        />

        {/* Preview Section */}
        {preview && (
          <Card
            withBorder
            radius="md"
            p="md"
            style={{
              backgroundColor: rallyColors.card,
              border: `1px solid ${rallyColors.glassBorder}`,
            }}
          >
            <Title
              order={4}
              c={rallyColors.textPrimary}
              mb="md"
              pb="sm"
              style={{ borderBottom: `1px solid ${rallyColors.border}` }}
            >
              پیش‌نمایش محاسبات
            </Title>

            <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
              <Box ta="center">
                <Text size="xs" c={rallyColors.textSecondary} mb={4}>مبلغ هر قسط</Text>
                <Text size="lg" fw={700} c={rallyColors.blue}>
                  {formatNumber(preview.monthlyPayment)}
                </Text>
                <Text size="xs" c={rallyColors.textSecondary}>تومان</Text>
              </Box>
              <Box ta="center">
                <Text size="xs" c={rallyColors.textSecondary} mb={4}>مجموع پرداختی</Text>
                <Text size="lg" fw={700} c={rallyColors.textPrimary}>
                  {formatNumber(preview.totalPayment)}
                </Text>
                <Text size="xs" c={rallyColors.textSecondary}>تومان</Text>
              </Box>
              <Box ta="center">
                <Text size="xs" c={rallyColors.textSecondary} mb={4}>مجموع سود</Text>
                <Text size="lg" fw={700} c={rallyColors.yellow}>
                  {formatNumber(preview.totalInterest)}
                </Text>
                <Text size="xs" c={rallyColors.textSecondary}>تومان</Text>
              </Box>
              <Box ta="center">
                <Text size="xs" c={rallyColors.textSecondary} mb={4}>نرخ موثر سالانه</Text>
                <Text size="lg" fw={700} c={rallyColors.textPrimary}>
                  {preview.effectiveRate}%
                </Text>
              </Box>
            </SimpleGrid>

            {/* First 3 payments preview */}
            {preview.paymentSchedule.length > 0 && (
              <Box mt="md">
                <Text size="sm" fw={500} c={rallyColors.textPrimary} mb="xs">
                  سه قسط اول:
                </Text>
                <Stack gap="xs">
                  {preview.paymentSchedule.slice(0, 3).map((payment) => (
                    <Group
                      key={payment.installmentNumber}
                      justify="space-between"
                      p="xs"
                      style={{
                        backgroundColor: rallyColors.elevated,
                        borderRadius: 4,
                      }}
                    >
                      <Text size="sm" c={rallyColors.textSecondary}>
                        قسط {payment.installmentNumber} - {payment.dueDateJalali}
                      </Text>
                      <Text size="sm" fw={500} c={rallyColors.textPrimary}>
                        {formatNumber(payment.totalPayment)} تومان
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </Box>
            )}
          </Card>
        )}

        {/* Form Actions */}
        <Group
          justify="flex-end"
          gap="sm"
          pt="md"
          style={{ borderTop: `1px solid ${rallyColors.border}` }}
        >
          <Button
            variant="outline"
            onClick={onCancel}
          >
            انصراف
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            {isSubmitting ? 'در حال ذخیره...' : 'ذخیره وام'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export default LoanForm;
