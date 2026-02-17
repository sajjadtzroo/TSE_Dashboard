import React from 'react';
import { Card, Group, Text, Badge, SimpleGrid, Checkbox, Box } from '@mantine/core';
import { IconPercentage, IconCash, IconClock, IconUserCheck } from '@tabler/icons-react';
import rallyColors from '../../theme/rallyColors';
import type { LoanType, LoanWithBank } from '@/types';

interface LoanCardProps {
  loan: LoanType | LoanWithBank;
  showBank?: boolean;
  onClick?: () => void;
  isSelected?: boolean;
  onSelect?: (loan: LoanType | LoanWithBank) => void;
  selectable?: boolean;
}

const LoanCardComponent = function LoanCard({
  loan,
  showBank = false,
  onClick,
  isSelected = false,
  onSelect,
  selectable = false,
}: LoanCardProps) {
  const loanWithBank = loan as LoanWithBank;
  const hasGuarantor = loan.guarantor !== false;

  const handleCardClick = () => {
    onClick?.();
  };

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(loan);
  };

  return (
    <Card
      padding="md"
      radius="md"
      style={{
        backgroundColor: rallyColors.GLASS_BG,
        border: `1px solid ${isSelected ? rallyColors.RALLY_GREEN : rallyColors.GLASS_BORDER}`,
        backdropFilter: 'blur(12px)',
        cursor: onClick ? 'pointer' : undefined,
        transition: 'all 0.2s ease',
        boxShadow: isSelected ? `0 0 0 2px rgba(16,185,129,0.3)` : undefined,
      }}
      onClick={handleCardClick}
    >
      <Box
        pb="sm"
        mb="sm"
        style={{ borderBottom: `1px solid ${rallyColors.GLASS_BORDER}` }}
      >
        <Group justify="space-between" align="flex-start">
          <Group gap="sm" style={{ flex: 1 }}>
            {selectable && (
              <Checkbox
                checked={isSelected}
                onChange={() => {}}
                onClick={handleSelectClick}
                color="rally-green"
                size="sm"
              />
            )}
            <div>
              <Text fw={600} c={rallyColors.TEXT_PRIMARY}>
                {loan.nameFA}
              </Text>
              {showBank && loanWithBank.bankNameFA && (
                <Text size="sm" c={rallyColors.TEXT_SECONDARY} mt={2}>
                  {loanWithBank.bankNameFA}
                </Text>
              )}
            </div>
          </Group>
          {!hasGuarantor && (
            <Badge color="teal" variant="light" size="sm">
              بدون ضامن
            </Badge>
          )}
        </Group>
      </Box>

      <SimpleGrid cols={2} spacing="xs">
        {loan.interestRate && (
          <Group gap={6}>
            <IconPercentage size={16} color={rallyColors.RALLY_GREEN} />
            <Text size="sm" c={rallyColors.TEXT_SECONDARY}>
              نرخ: {loan.interestRate}
            </Text>
          </Group>
        )}

        {(loan.minAmount || loan.maxAmount) && (
          <Group gap={6}>
            <IconCash size={16} color={rallyColors.RALLY_GREEN} />
            <Text size="sm" c={rallyColors.TEXT_SECONDARY}>
              {loan.minAmount && `از ${loan.minAmount}`}
              {loan.maxAmount && ` تا ${loan.maxAmount}`}
            </Text>
          </Group>
        )}

        {(loan.minTerm || loan.maxTerm) && (
          <Group gap={6}>
            <IconClock size={16} color="#eab308" />
            <Text size="sm" c={rallyColors.TEXT_SECONDARY}>
              {loan.minTerm && `از ${loan.minTerm}`}
              {loan.maxTerm && ` تا ${loan.maxTerm}`}
            </Text>
          </Group>
        )}

        <Group gap={6}>
          <IconUserCheck
            size={16}
            color={hasGuarantor ? '#eab308' : rallyColors.RALLY_GREEN}
          />
          <Text size="sm" c={rallyColors.TEXT_SECONDARY}>
            {hasGuarantor ? 'نیاز به ضامن' : 'بدون ضامن'}
          </Text>
        </Group>
      </SimpleGrid>
    </Card>
  );
};

export const LoanCard = React.memo(LoanCardComponent);
LoanCard.displayName = 'LoanCard';

export default LoanCard;
