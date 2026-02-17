/**
 * Improved Optimizer Input Form Component
 * Enhanced UI/UX with better organization, tooltips, and presets
 */

import React, { useState } from 'react';
import {
  Box,
  Text,
  Title,
  Group,
  Stack,
  SimpleGrid,
  Select,
  Checkbox,
  Radio,
  Badge,
  Tooltip,
  ActionIcon,
  Collapse,
  UnstyledButton,
  Loader,
  Alert,
  Button,
} from '@mantine/core';
import {
  IconInfoCircle,
  IconTrendingUp,
  IconBuildingBank,
  IconSettings,
  IconBolt,
  IconHome,
  IconBuilding,
  IconChevronDown,
} from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';
import type { OptimizerInputs, DiscountRateMethod, RiskTolerance } from '../types';
import CurrencyInput from '@/components/inputs/CurrencyInput';
import NumberInput from '@/components/inputs/NumberInput';
import PercentageInput from '@/components/inputs/PercentageInput';

interface OptimizerInputFormProps {
  onSubmit: (inputs: OptimizerInputs) => void;
  loading?: boolean;
}

interface Preset {
  name: string;
  icon: React.ReactNode;
  description: string;
  values: {
    depositAmount: number;
    depositMonths: number;
    loanAmountNeeded: number;
    riskTolerance: RiskTolerance;
  };
}

const presets: Preset[] = [
  {
    name: 'خرید خانه',
    icon: <IconHome size={20} />,
    description: 'برای خرید خانه اولین',
    values: {
      depositAmount: 50_000_000,
      depositMonths: 6,
      loanAmountNeeded: 500_000_000,
      riskTolerance: 'low',
    },
  },
  {
    name: 'وام کسب‌وکار',
    icon: <IconBuilding size={20} />,
    description: 'برای توسعه کسب‌وکار',
    values: {
      depositAmount: 20_000_000,
      depositMonths: 3,
      loanAmountNeeded: 200_000_000,
      riskTolerance: 'medium',
    },
  },
  {
    name: 'نقدینگی سریع',
    icon: <IconBolt size={20} />,
    description: 'برای نیاز فوری به پول',
    values: {
      depositAmount: 10_000_000,
      depositMonths: 1,
      loanAmountNeeded: 50_000_000,
      riskTolerance: 'high',
    },
  },
];

const InfoTooltip: React.FC<{ text: string }> = ({ text }) => (
  <Tooltip
    label={text}
    withArrow
    position="top"
    multiline
    maw={300}
    styles={{
      tooltip: {
        backgroundColor: '#1a1a1a',
        color: '#e5e5e5',
        fontSize: '0.75rem',
        border: '1px solid #3d3d3d',
      },
    }}
  >
    <ActionIcon variant="transparent" size="sm" c={rallyColors.textDimmed}>
      <IconInfoCircle size={16} />
    </ActionIcon>
  </Tooltip>
);

const OptimizerInputForm: React.FC<OptimizerInputFormProps> = ({ onSubmit, loading }) => {
  const [depositAmount, setDepositAmount] = useState<number>(10_000_000);
  const [depositMonths, setDepositMonths] = useState<number>(3);
  const [loanAmountNeeded, setLoanAmountNeeded] = useState<number>(50_000_000);
  const [discountRateMethod, setDiscountRateMethod] = useState<DiscountRateMethod>('capm');
  const [customDiscountRate, setCustomDiscountRate] = useState<number>(25);
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance>('medium');
  const [considerPrivilegePurchase, setConsiderPrivilegePurchase] = useState<boolean>(false);
  const [privilegePurchasePrice, setPrivilegePurchasePrice] = useState<number>(0);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const applyPreset = (preset: Preset) => {
    setDepositAmount(preset.values.depositAmount);
    setDepositMonths(preset.values.depositMonths);
    setLoanAmountNeeded(preset.values.loanAmountNeeded);
    setRiskTolerance(preset.values.riskTolerance);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (depositAmount <= 0) {
      newErrors.depositAmount = 'مبلغ سپرده باید بزرگتر از صفر باشد';
    }

    if (depositMonths <= 0 || depositMonths > 60) {
      newErrors.depositMonths = 'مدت سپرده باید بین 1 تا 60 ماه باشد';
    }

    if (loanAmountNeeded <= 0) {
      newErrors.loanAmountNeeded = 'مبلغ وام باید بزرگتر از صفر باشد';
    }

    if (discountRateMethod === 'custom' && (customDiscountRate < 0 || customDiscountRate > 100)) {
      newErrors.customDiscountRate = 'نرخ تنزیل باید بین 0 تا 100 درصد باشد';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit({
      depositAmount,
      depositMonths,
      loanAmountNeeded,
      discountRateMethod,
      customDiscountRate: discountRateMethod === 'custom' ? customDiscountRate : undefined,
      riskTolerance,
      considerPrivilegePurchase,
      privilegePurchasePrice: considerPrivilegePurchase && privilegePurchasePrice > 0 ? privilegePurchasePrice : undefined,
    });
  };

  return (
    <Box
      p="lg"
      style={{
        backgroundColor: rallyColors.card,
        borderRadius: 12,
        border: `1px solid ${rallyColors.border}`,
        boxShadow: rallyColors.glassShadow,
      }}
    >
      {/* Header */}
      <Group justify="space-between" mb="lg">
        <Group gap="sm">
          <Box
            p="sm"
            style={{
              backgroundColor: 'rgba(187, 134, 252, 0.1)',
              borderRadius: 8,
            }}
          >
            <IconTrendingUp size={24} color="#BB86FC" />
          </Box>
          <Stack gap={2}>
            <Title order={2} size="xl" fw={600} c={rallyColors.textPrimary}>
              پارامترهای ورودی
            </Title>
            <Text size="sm" c={rallyColors.textSecondary}>
              اطلاعات مورد نیاز برای مقایسه وام‌ها
            </Text>
          </Stack>
        </Group>
      </Group>

      {/* Quick Presets */}
      <Box
        mb="lg"
        p="md"
        style={{
          backgroundColor: rallyColors.elevated,
          borderRadius: 8,
          border: `1px solid ${rallyColors.border}`,
        }}
      >
        <Group gap="xs" mb="sm">
          <IconBolt size={20} color="#BB86FC" />
          <Text size="sm" fw={500} c={rallyColors.textPrimary}>
            سناریوهای آماده
          </Text>
          <InfoTooltip text="با کلیک روی هر سناریو، فیلدها به طور خودکار پر می‌شوند" />
        </Group>
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
          {presets.map((preset) => (
            <UnstyledButton
              key={preset.name}
              onClick={() => applyPreset(preset)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                backgroundColor: rallyColors.card,
                border: `1px solid ${rallyColors.border}`,
                borderRadius: 8,
                textAlign: 'right',
                transition: 'all 0.2s',
              }}
            >
              <Box
                p="xs"
                style={{
                  backgroundColor: 'rgba(187, 134, 252, 0.1)',
                  borderRadius: 8,
                }}
              >
                {preset.icon}
              </Box>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text fw={500} c={rallyColors.textPrimary} size="sm">
                  {preset.name}
                </Text>
                <Text size="xs" c={rallyColors.textSecondary} truncate>
                  {preset.description}
                </Text>
              </Box>
            </UnstyledButton>
          ))}
        </SimpleGrid>
      </Box>

      <form onSubmit={handleSubmit}>
        <Stack gap="lg">
          {/* Section 1: Deposit Information */}
          <Box
            p="md"
            style={{
              backgroundColor: rallyColors.elevated,
              borderRadius: 8,
              border: `1px solid ${rallyColors.border}`,
            }}
          >
            <Group gap="xs" mb="md">
              <IconBuildingBank size={20} color="#BB86FC" />
              <Text size="sm" fw={600} c={rallyColors.textPrimary}>
                اطلاعات سپرده
              </Text>
              <InfoTooltip text="مبلغ و مدت سپرده‌ای که قرار است در بانک بگذارید" />
            </Group>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              <Stack gap={4}>
                <CurrencyInput
                  label="مبلغ سپرده (تومان)"
                  value={depositAmount}
                  onChange={(val) => {
                    setDepositAmount(val);
                    setErrors({ ...errors, depositAmount: '' });
                  }}
                  required
                />
                {errors.depositAmount && (
                  <Text size="xs" c="#CF6679">{errors.depositAmount}</Text>
                )}
                <Text size="xs" c={rallyColors.textSecondary}>
                  مثال: 10 میلیون تومان
                </Text>
              </Stack>

              <Stack gap={4}>
                <NumberInput
                  label="مدت سپرده (ماه)"
                  value={depositMonths}
                  onChange={(val) => {
                    setDepositMonths(val);
                    setErrors({ ...errors, depositMonths: '' });
                  }}
                  min={1}
                  max={60}
                  required
                />
                {errors.depositMonths && (
                  <Text size="xs" c="#CF6679">{errors.depositMonths}</Text>
                )}
                <Text size="xs" c={rallyColors.textSecondary}>
                  بین 1 تا 60 ماه
                </Text>
              </Stack>
            </SimpleGrid>
          </Box>

          {/* Section 2: Loan Requirements */}
          <Box
            p="md"
            style={{
              backgroundColor: rallyColors.elevated,
              borderRadius: 8,
              border: `1px solid ${rallyColors.border}`,
            }}
          >
            <Group gap="xs" mb="md">
              <IconTrendingUp size={20} color="#BB86FC" />
              <Text size="sm" fw={600} c={rallyColors.textPrimary}>
                نیاز وام
              </Text>
              <InfoTooltip text="مبلغ وامی که نیاز دارید دریافت کنید" />
            </Group>

            <Stack gap={4}>
              <CurrencyInput
                label="مبلغ وام مورد نیاز (تومان)"
                value={loanAmountNeeded}
                onChange={(val) => {
                  setLoanAmountNeeded(val);
                  setErrors({ ...errors, loanAmountNeeded: '' });
                }}
                required
              />
              {errors.loanAmountNeeded && (
                <Text size="xs" c="#CF6679">{errors.loanAmountNeeded}</Text>
              )}
              <Text size="xs" c={rallyColors.textSecondary}>
                مثال: 50 میلیون تومان
              </Text>
            </Stack>
          </Box>

          {/* Section 3: Risk & Calculation Method */}
          <Box
            p="md"
            style={{
              backgroundColor: rallyColors.elevated,
              borderRadius: 8,
              border: `1px solid ${rallyColors.border}`,
            }}
          >
            <Group gap="xs" mb="md">
              <IconSettings size={20} color="#BB86FC" />
              <Text size="sm" fw={600} c={rallyColors.textPrimary}>
                تنظیمات محاسبات
              </Text>
            </Group>

            <Stack gap="md">
              {/* Risk Tolerance */}
              <Stack gap="xs">
                <Group gap="xs">
                  <Text size="sm" c={rallyColors.textSecondary}>
                    تحمل ریسک
                  </Text>
                  <InfoTooltip text="میزان ریسکی که می‌توانید در سرمایه‌گذاری بپذیرید. کم: محافظه‌کارانه، متوسط: متعادل، زیاد: تهاجمی" />
                </Group>
                <Select
                  value={riskTolerance}
                  onChange={(val) => val && setRiskTolerance(val as RiskTolerance)}
                  data={[
                    { value: 'low', label: 'کم (محافظه‌کارانه) - برای سرمایه‌گذاران محتاط' },
                    { value: 'medium', label: 'متوسط (متعادل) - توصیه می‌شود' },
                    { value: 'high', label: 'زیاد (تهاجمی) - برای سرمایه‌گذاران پرریسک' },
                  ]}
                  styles={{
                    input: {
                      backgroundColor: rallyColors.bg,
                      borderColor: rallyColors.borderStrong,
                      borderWidth: 2,
                      borderRadius: 12,
                      color: rallyColors.textPrimary,
                    },
                    dropdown: {
                      backgroundColor: rallyColors.bg,
                      borderColor: rallyColors.border,
                    },
                    option: {
                      color: rallyColors.textPrimary,
                      '&[data-selected]': { backgroundColor: 'rgba(187, 134, 252, 0.15)' },
                      '&:hover': { backgroundColor: rallyColors.hover },
                    },
                  }}
                />
              </Stack>

              {/* Discount Rate Method */}
              <Stack gap="xs">
                <Group gap="xs">
                  <Text size="sm" fw={500} c={rallyColors.textSecondary}>
                    روش محاسبه نرخ تنزیل
                  </Text>
                  <InfoTooltip text="روش محاسبه نرخ بازده مورد انتظار برای ارزیابی سودآوری وام" />
                </Group>

                <Radio.Group value={discountRateMethod} onChange={(val) => setDiscountRateMethod(val as DiscountRateMethod)}>
                  <Stack gap="xs">
                    <UnstyledButton
                      onClick={() => setDiscountRateMethod('capm')}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        padding: 12,
                        backgroundColor: rallyColors.card,
                        border: `1px solid ${discountRateMethod === 'capm' ? 'rgba(187, 134, 252, 0.5)' : rallyColors.border}`,
                        borderRadius: 8,
                        transition: 'all 0.2s',
                      }}
                    >
                      <Radio value="capm" styles={{ radio: { cursor: 'pointer' } }} />
                      <Stack gap={2} style={{ flex: 1, paddingTop: 2, marginRight: 8 }}>
                        <Text fw={500} c={rallyColors.textPrimary} size="sm">
                          CAPM (پیشنهادی)
                        </Text>
                        <Text size="xs" c={rallyColors.textSecondary}>
                          مدل قیمت‌گذاری دارایی سرمایه‌ای - دقیق‌ترین روش
                        </Text>
                      </Stack>
                    </UnstyledButton>

                    <UnstyledButton
                      onClick={() => setDiscountRateMethod('wacc')}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        padding: 12,
                        backgroundColor: rallyColors.card,
                        border: `1px solid ${discountRateMethod === 'wacc' ? 'rgba(187, 134, 252, 0.5)' : rallyColors.border}`,
                        borderRadius: 8,
                        transition: 'all 0.2s',
                      }}
                    >
                      <Radio value="wacc" styles={{ radio: { cursor: 'pointer' } }} />
                      <Stack gap={2} style={{ flex: 1, paddingTop: 2, marginRight: 8 }}>
                        <Text fw={500} c={rallyColors.textPrimary} size="sm">
                          WACC
                        </Text>
                        <Text size="xs" c={rallyColors.textSecondary}>
                          میانگین موزون هزینه سرمایه - برای تحلیل شرکتی
                        </Text>
                      </Stack>
                    </UnstyledButton>

                    <UnstyledButton
                      onClick={() => setDiscountRateMethod('custom')}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        padding: 12,
                        backgroundColor: rallyColors.card,
                        border: `1px solid ${discountRateMethod === 'custom' ? 'rgba(187, 134, 252, 0.5)' : rallyColors.border}`,
                        borderRadius: 8,
                        transition: 'all 0.2s',
                      }}
                    >
                      <Radio value="custom" styles={{ radio: { cursor: 'pointer' } }} />
                      <Stack gap={2} style={{ flex: 1, paddingTop: 2, marginRight: 8 }}>
                        <Text fw={500} c={rallyColors.textPrimary} size="sm">
                          نرخ دلخواه
                        </Text>
                        <Text size="xs" c={rallyColors.textSecondary}>
                          وارد کردن نرخ تنزیل مورد نظر خودتان
                        </Text>
                      </Stack>
                    </UnstyledButton>
                  </Stack>
                </Radio.Group>

                <Collapse in={discountRateMethod === 'custom'}>
                  <Box mt="sm">
                    <PercentageInput
                      label="نرخ تنزیل سالانه (درصد)"
                      value={customDiscountRate}
                      onChange={(val) => {
                        setCustomDiscountRate(val);
                        setErrors({ ...errors, customDiscountRate: '' });
                      }}
                      required
                    />
                    {errors.customDiscountRate && (
                      <Text size="xs" c="#CF6679" mt={4}>{errors.customDiscountRate}</Text>
                    )}
                    <Text size="xs" c={rallyColors.textSecondary} mt={4}>
                      معمولا بین 15 تا 35 درصد
                    </Text>
                  </Box>
                </Collapse>
              </Stack>
            </Stack>
          </Box>

          {/* Section 4: Advanced Options (Collapsible) */}
          <Box
            style={{
              border: `1px solid ${rallyColors.border}`,
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <UnstyledButton
              onClick={() => setShowAdvanced(!showAdvanced)}
              w="100%"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
                backgroundColor: rallyColors.elevated,
                textAlign: 'right',
                transition: 'background-color 0.2s',
              }}
            >
              <Group gap="xs">
                <IconSettings size={20} color={rallyColors.textSecondary} />
                <Text size="sm" fw={500} c={rallyColors.textPrimary}>
                  تنظیمات پیشرفته
                </Text>
                <Badge
                  size="xs"
                  variant="light"
                  styles={{
                    root: {
                      backgroundColor: rallyColors.hover,
                      color: rallyColors.textDimmed,
                      fontSize: '0.7rem',
                      height: 20,
                    },
                  }}
                >
                  اختیاری
                </Badge>
              </Group>
              <Box
                style={{
                  transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  color: rallyColors.textSecondary,
                }}
              >
                <IconChevronDown size={20} />
              </Box>
            </UnstyledButton>

            <Collapse in={showAdvanced}>
              <Box
                p="md"
                style={{
                  backgroundColor: rallyColors.elevated,
                  borderTop: `1px solid ${rallyColors.border}`,
                }}
              >
                <Checkbox
                  checked={considerPrivilegePurchase}
                  onChange={(e) => setConsiderPrivilegePurchase(e.currentTarget.checked)}
                  label={
                    <Group gap="xs">
                      <Text size="sm" fw={500} c={rallyColors.textPrimary}>
                        تحلیل خرید امتیاز (Privilege Purchase)
                      </Text>
                      <InfoTooltip text="محاسبه قیمت مناسب برای خرید امتیاز و دریافت فوری وام بدون انتظار" />
                    </Group>
                  }
                  styles={{
                    label: { cursor: 'pointer' },
                  }}
                />

                <Collapse in={considerPrivilegePurchase}>
                  <Box
                    mt="md"
                    p="md"
                    style={{
                      backgroundColor: rallyColors.card,
                      borderRadius: 8,
                      border: `1px solid ${rallyColors.border}`,
                    }}
                  >
                    <Alert
                      color="violet"
                      variant="light"
                      mb="sm"
                      styles={{
                        root: {
                          backgroundColor: 'rgba(187, 134, 252, 0.1)',
                          color: '#BB86FC',
                          border: '1px solid rgba(187, 134, 252, 0.2)',
                        },
                      }}
                    >
                      سیستم قیمت سر‌به‌سر خرید امتیاز را محاسبه می‌کند
                    </Alert>

                    <CurrencyInput
                      label="قیمت پیشنهادی بازار (اختیاری)"
                      value={privilegePurchasePrice}
                      onChange={setPrivilegePurchasePrice}
                    />
                    <Text size="xs" c={rallyColors.textSecondary} mt="xs">
                      اگر قیمت بازار دارید وارد کنید، در غیر این صورت خالی بگذارید
                    </Text>
                  </Box>
                </Collapse>
              </Box>
            </Collapse>
          </Box>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            fullWidth
            size="lg"
            styles={{
              root: {
                background: loading
                  ? rallyColors.elevated
                  : 'linear-gradient(to right, #BB86FC, #9b59d0)',
                color: loading ? rallyColors.textDimmed : '#1a1a1a',
                fontWeight: 600,
                padding: '16px 24px',
                borderRadius: 12,
                fontSize: '1rem',
                height: 'auto',
                '&:hover': {
                  background: loading
                    ? rallyColors.elevated
                    : 'linear-gradient(to right, #9b59d0, #7c3aed)',
                },
                '&:disabled': {
                  backgroundColor: rallyColors.elevated,
                  color: rallyColors.textDimmed,
                },
              },
            }}
          >
            {loading ? (
              <Group gap="xs">
                <Loader size="xs" color="gray" />
                <span>در حال محاسبه...</span>
              </Group>
            ) : (
              <Group gap="xs">
                <IconTrendingUp size={20} />
                <span>محاسبه و مقایسه همه وام‌ها</span>
              </Group>
            )}
          </Button>

          {/* Help Text */}
          <Box
            p="sm"
            style={{
              backgroundColor: 'rgba(19, 23, 32, 0.5)',
              borderRadius: 8,
              border: `1px solid rgba(${rallyColors.border})`,
            }}
          >
            <Text size="xs" c={rallyColors.textSecondary} ta="center">
              نکته: با استفاده از سناریوهای آماده می‌توانید سریع‌تر شروع کنید
            </Text>
          </Box>
        </Stack>
      </form>
    </Box>
  );
};

export default OptimizerInputForm;
