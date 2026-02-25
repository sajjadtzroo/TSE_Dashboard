import React from 'react';
import { Box, Text, Group, Stack, Select, Radio, UnstyledButton, Collapse } from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';
import rallyColors from '../../../../theme/rallyColors';
import type { DiscountRateMethod, RiskTolerance } from '../types';
import PercentageInput from '@/components/loans/inputs/PercentageInput';
import OptimizerInfoTooltip from './OptimizerInfoTooltip';

interface OptimizerCalculationSectionProps {
  riskTolerance: RiskTolerance;
  discountRateMethod: DiscountRateMethod;
  customDiscountRate: number;
  errors: Record<string, string>;
  onRiskToleranceChange: (val: RiskTolerance) => void;
  onDiscountRateMethodChange: (val: DiscountRateMethod) => void;
  onCustomDiscountRateChange: (val: number) => void;
}

const OptimizerCalculationSection: React.FC<OptimizerCalculationSectionProps> = ({
  riskTolerance,
  discountRateMethod,
  customDiscountRate,
  errors,
  onRiskToleranceChange,
  onDiscountRateMethodChange,
  onCustomDiscountRateChange,
}) => (
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
      <Stack gap="xs">
        <Group gap="xs">
          <Text size="sm" c={rallyColors.textSecondary}>
            تحمل ریسک
          </Text>
          <OptimizerInfoTooltip text="میزان ریسکی که می‌توانید در سرمایه‌گذاری بپذیرید. کم: محافظه‌کارانه، متوسط: متعادل، زیاد: تهاجمی" />
        </Group>
        <Select
          value={riskTolerance}
          onChange={(val) => val && onRiskToleranceChange(val as RiskTolerance)}
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
              backgroundColor: 'transparent',
            },
          }}
        />
      </Stack>

      <Stack gap="xs">
        <Group gap="xs">
          <Text size="sm" fw={500} c={rallyColors.textSecondary}>
            روش محاسبه نرخ تنزیل
          </Text>
          <OptimizerInfoTooltip text="روش محاسبه نرخ بازده مورد انتظار برای ارزیابی سودآوری وام" />
        </Group>

        <Radio.Group value={discountRateMethod} onChange={(val) => onDiscountRateMethodChange(val as DiscountRateMethod)}>
          <Stack gap="xs">
            <UnstyledButton
              onClick={() => onDiscountRateMethodChange('capm')}
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
              onClick={() => onDiscountRateMethodChange('wacc')}
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
              onClick={() => onDiscountRateMethodChange('custom')}
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
              onChange={onCustomDiscountRateChange}
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
);

export default OptimizerCalculationSection;
