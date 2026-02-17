import { memo } from 'react';
import { SimpleGrid, Group, Text, Box } from '@mantine/core';
import { IconPercentage, IconCash, IconClock, IconUserCheck } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';
import type { LoanType } from '@/types';

interface LoanKeyInfoGridProps {
  loan: LoanType;
  hasGuarantor: boolean;
}

interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

function InfoCard({ icon, label, value, subtitle, color, bgColor, borderColor }: InfoCardProps) {
  return (
    <Box
      p="sm"
      style={{
        backgroundColor: bgColor,
        borderRadius: 8,
        border: `1px solid ${borderColor}`,
      }}
    >
      <Group gap={6} mb={4}>
        {icon}
        <Text size="xs" c={color}>{label}</Text>
      </Group>
      <Text fw={700} c={color}>{value}</Text>
      {subtitle && (
        <Text size="xs" c={color} opacity={0.7} mt={4}>{subtitle}</Text>
      )}
    </Box>
  );
}

export const LoanKeyInfoGrid = memo(function LoanKeyInfoGrid({
  loan,
  hasGuarantor,
}: LoanKeyInfoGridProps) {
  return (
    <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
      {loan.interestRate && (
        <InfoCard
          icon={<IconPercentage size={16} color={rallyColors.green} />}
          label="نرخ سود"
          value={String(loan.interestRate)}
          subtitle={loan.interestRateFA}
          color={rallyColors.green}
          bgColor="rgba(16,185,129,0.1)"
          borderColor="rgba(16,185,129,0.2)"
        />
      )}

      {(loan.minAmount || loan.maxAmount) && (
        <InfoCard
          icon={<IconCash size={16} color="#14b8a6" />}
          label="مبلغ"
          value={String(loan.maxAmount || loan.minAmount)}
          subtitle={loan.maxAmountFA}
          color="#14b8a6"
          bgColor="rgba(20,184,166,0.1)"
          borderColor="rgba(20,184,166,0.2)"
        />
      )}

      {(loan.repaymentPeriod || loan.minTerm || loan.maxTerm) && (
        <InfoCard
          icon={<IconClock size={16} color="#a78bfa" />}
          label="بازپرداخت"
          value={String(loan.repaymentPeriod || `${loan.minTerm} تا ${loan.maxTerm}`)}
          subtitle={loan.repaymentPeriodFA}
          color="#a78bfa"
          bgColor="rgba(167,139,250,0.1)"
          borderColor="rgba(167,139,250,0.2)"
        />
      )}

      <InfoCard
        icon={<IconUserCheck size={16} color={hasGuarantor ? '#eab308' : rallyColors.green} />}
        label="ضامن"
        value={hasGuarantor ? 'نیاز به ضامن' : 'بدون ضامن'}
        subtitle={loan.guarantorFA}
        color={hasGuarantor ? '#eab308' : rallyColors.green}
        bgColor={hasGuarantor ? 'rgba(234,179,8,0.1)' : 'rgba(16,185,129,0.1)'}
        borderColor={hasGuarantor ? 'rgba(234,179,8,0.2)' : 'rgba(16,185,129,0.2)'}
      />
    </SimpleGrid>
  );
});
