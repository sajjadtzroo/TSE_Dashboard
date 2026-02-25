import React from 'react';
import { Box, Text, Group, Badge, UnstyledButton, Collapse, Checkbox, Alert } from '@mantine/core';
import { IconSettings, IconChevronDown } from '@tabler/icons-react';
import rallyColors from '../../../../theme/rallyColors';
import CurrencyInput from '@/components/loans/inputs/CurrencyInput';
import OptimizerInfoTooltip from './OptimizerInfoTooltip';

interface OptimizerAdvancedSectionProps {
  showAdvanced: boolean;
  considerPrivilegePurchase: boolean;
  privilegePurchasePrice: number;
  onToggleAdvanced: () => void;
  onConsiderPrivilegePurchaseChange: (val: boolean) => void;
  onPrivilegePurchasePriceChange: (val: number) => void;
}

const OptimizerAdvancedSection: React.FC<OptimizerAdvancedSectionProps> = ({
  showAdvanced,
  considerPrivilegePurchase,
  privilegePurchasePrice,
  onToggleAdvanced,
  onConsiderPrivilegePurchaseChange,
  onPrivilegePurchasePriceChange,
}) => (
  <Box
    style={{
      border: `1px solid ${rallyColors.border}`,
      borderRadius: 8,
      overflow: 'hidden',
    }}
  >
    <UnstyledButton
      onClick={onToggleAdvanced}
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
          onChange={(e) => onConsiderPrivilegePurchaseChange(e.currentTarget.checked)}
          label={
            <Group gap="xs">
              <Text size="sm" fw={500} c={rallyColors.textPrimary}>
                تحلیل خرید امتیاز (Privilege Purchase)
              </Text>
              <OptimizerInfoTooltip text="محاسبه قیمت مناسب برای خرید امتیاز و دریافت فوری وام بدون انتظار" />
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
              onChange={onPrivilegePurchasePriceChange}
            />
            <Text size="xs" c={rallyColors.textSecondary} mt="xs">
              اگر قیمت بازار دارید وارد کنید، در غیر این صورت خالی بگذارید
            </Text>
          </Box>
        </Collapse>
      </Box>
    </Collapse>
  </Box>
);

export default OptimizerAdvancedSection;
