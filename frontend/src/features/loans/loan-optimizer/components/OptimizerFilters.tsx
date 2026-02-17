/**
 * Optimizer Filters Component
 * Allows users to filter loan results
 */

import React, { useCallback, useMemo } from 'react';
import { Box, Checkbox, Group, Stack, Text, Button, ScrollArea } from '@mantine/core';
import rallyColors from '../../../../theme/rallyColors';
import type { LoanAnalysisResult } from '../types';

interface OptimizerFiltersProps {
  results: LoanAnalysisResult[];
  selectedBanks: string[];
  onSelectedBanksChange: (banks: string[]) => void;
  onlySuitable: boolean;
  onOnlySuitableChange: (value: boolean) => void;
}

const OptimizerFilters: React.FC<OptimizerFiltersProps> = ({
  results,
  selectedBanks,
  onSelectedBanksChange,
  onlySuitable,
  onOnlySuitableChange,
}) => {
  // Get unique banks from results
  const uniqueBanks = useMemo(() => {
    const banks = new Set(results.map((r) => r.bankNameFA));
    return Array.from(banks).sort();
  }, [results]);

  // Memoize suitable count calculation
  const suitableCount = useMemo(
    () => results.filter((r) => r.meetsRequirement).length,
    [results]
  );

  // Memoize handlers
  const handleBankToggle = useCallback(
    (bank: string) => {
      if (selectedBanks.includes(bank)) {
        onSelectedBanksChange(selectedBanks.filter((b) => b !== bank));
      } else {
        onSelectedBanksChange([...selectedBanks, bank]);
      }
    },
    [selectedBanks, onSelectedBanksChange]
  );

  const handleSelectAll = useCallback(() => {
    onSelectedBanksChange(uniqueBanks);
  }, [uniqueBanks, onSelectedBanksChange]);

  const handleClearAll = useCallback(() => {
    onSelectedBanksChange([]);
  }, [onSelectedBanksChange]);

  return (
    <Box
      p="md"
      style={{
        backgroundColor: rallyColors.card,
        borderRadius: 8,
        border: `1px solid ${rallyColors.border}`,
      }}
    >
      <Group align="flex-start" justify="space-between" wrap="wrap" gap="md">
        {/* Bank filters */}
        <Box style={{ flex: 1 }}>
          <Text size="sm" fw={500} c={rallyColors.textSecondary} mb="xs">
            فیلتر بانک
          </Text>
          <Group gap="xs" mb="xs">
            <Button
              variant="subtle"
              size="compact-xs"
              onClick={handleSelectAll}
              styles={{
                root: {
                  color: rallyColors.textSecondary,
                  backgroundColor: rallyColors.elevated,
                  border: `1px solid ${rallyColors.border}`,
                },
              }}
            >
              انتخاب همه
            </Button>
            <Button
              variant="subtle"
              size="compact-xs"
              onClick={handleClearAll}
              styles={{
                root: {
                  color: rallyColors.textSecondary,
                  backgroundColor: rallyColors.elevated,
                  border: `1px solid ${rallyColors.border}`,
                },
              }}
            >
              حذف همه
            </Button>
            <Text size="xs" c={rallyColors.textDimmed}>
              ({selectedBanks.length} از {uniqueBanks.length} بانک انتخاب شده)
            </Text>
          </Group>
          <ScrollArea h={128}>
            <Stack gap={4}>
              {uniqueBanks.map((bank) => (
                <Checkbox
                  key={bank}
                  label={bank}
                  checked={selectedBanks.includes(bank)}
                  onChange={() => handleBankToggle(bank)}
                  size="sm"
                  styles={{
                    root: {
                      padding: '4px 8px',
                      borderRadius: 4,
                    },
                    label: { color: rallyColors.textSecondary, cursor: 'pointer' },
                  }}
                />
              ))}
            </Stack>
          </ScrollArea>
        </Box>

        {/* Suitable loans toggle */}
        <Box
          style={{
            borderRight: `1px solid ${rallyColors.border}`,
            paddingRight: 16,
          }}
        >
          <Checkbox
            checked={onlySuitable}
            onChange={(e) => onOnlySuitableChange(e.currentTarget.checked)}
            size="md"
            label={
              <Stack gap={2}>
                <Text size="sm" fw={500} c={rallyColors.textSecondary}>
                  فقط وام‌های مناسب
                </Text>
                <Text size="xs" c={rallyColors.textDimmed}>
                  ({suitableCount.toLocaleString('fa-IR')} وام)
                </Text>
              </Stack>
            }
            styles={{
              label: { cursor: 'pointer' },
            }}
          />
        </Box>
      </Group>
    </Box>
  );
};

export default React.memo(OptimizerFilters);
