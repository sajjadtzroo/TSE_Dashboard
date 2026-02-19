/**
 * AllMetricsTopCards
 * Three highlight cards: best IRR, best NPV, lowest total cost.
 */

import React from 'react';
import { Badge, Box, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconArrowUpRight, IconCoin, IconTrendingDown, IconTrendingUp } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';
import type { LoanAnalysisResult } from './loanAnalysisEngine';

interface AllMetricsTopCardsProps {
  results: LoanAnalysisResult[];
}

const formatRials = (v: number): string => {
  if (v >= 1e9) return (v / 1e9).toFixed(1) + ' میلیارد';
  if (v >= 1e6) return (v / 1e6).toFixed(0) + ' میلیون';
  return v.toLocaleString('fa-IR');
};

const formatPct = (v: number | null): string => {
  if (v === null) return '—';
  return (v * 100).toFixed(2) + '٪';
};

interface HighlightCardProps {
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  loanName: string;
  bankName: string;
  metricLabel: string;
  metricValue: string;
  score: number;
}

const HighlightCard: React.FC<HighlightCardProps> = ({
  title,
  icon,
  accentColor,
  loanName,
  bankName,
  metricLabel,
  metricValue,
  score,
}) => (
  <Card
    p="lg"
    style={{
      backgroundColor: rallyColors.card,
      border: `1px solid ${rallyColors.border}`,
      borderRadius: 12,
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    {/* Accent glow strip */}
    <Box
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        left: 0,
        height: 3,
        background: `linear-gradient(to right, transparent, ${accentColor}, transparent)`,
        borderRadius: '12px 12px 0 0',
      }}
    />

    <Stack gap="sm">
      <Group justify="space-between">
        <Group gap="xs">
          <Box p="xs" style={{ backgroundColor: `${accentColor}20`, borderRadius: 8 }}>
            {icon}
          </Box>
          <Text size="sm" fw={600} c={rallyColors.textSecondary}>
            {title}
          </Text>
        </Group>
        <Badge
          size="sm"
          styles={{
            root: {
              backgroundColor:
                score >= 70
                  ? 'rgba(16, 185, 129, 0.15)'
                  : score >= 40
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(239, 68, 68, 0.15)',
              color:
                score >= 70
                  ? rallyColors.green
                  : score >= 40
                  ? rallyColors.yellow
                  : rallyColors.red,
              fontWeight: 700,
            },
          }}
        >
          امتیاز {Math.round(score)}
        </Badge>
      </Group>

      <Stack gap={2}>
        <Title order={4} fw={700} c={rallyColors.textPrimary} style={{ lineHeight: 1.3 }}>
          {loanName}
        </Title>
        <Text size="sm" c={rallyColors.textSecondary}>
          {bankName}
        </Text>
      </Stack>

      <Group gap="xs">
        <Text size="xs" c={rallyColors.textDimmed}>
          {metricLabel}:
        </Text>
        <Text size="sm" fw={700} c={accentColor}>
          {metricValue}
        </Text>
      </Group>
    </Stack>
  </Card>
);

const AllMetricsTopCards: React.FC<AllMetricsTopCardsProps> = ({ results }) => {
  if (results.length === 0) return null;

  // Best IRR: highest irr (non-null)
  const withIrr = results.filter((r) => r.irr !== null);
  const bestIrr = withIrr.length > 0
    ? withIrr.reduce((a, b) => ((a.irr ?? -Infinity) > (b.irr ?? -Infinity) ? a : b))
    : results[0];

  // Best NPV
  const bestNpv = results.reduce((a, b) => (a.npv > b.npv ? a : b));

  // Lowest total cost (relative to loan amount)
  const lowestCost = results.reduce((a, b) =>
    a.totalCost / a.loanAmount < b.totalCost / b.loanAmount ? a : b
  );

  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
      <HighlightCard
        title="بهترین IRR"
        icon={<IconArrowUpRight size={20} color={rallyColors.green} />}
        accentColor={rallyColors.green}
        loanName={bestIrr.loanName}
        bankName={bestIrr.bankName}
        metricLabel="IRR سالانه"
        metricValue={formatPct(bestIrr.irr)}
        score={bestIrr.score}
      />
      <HighlightCard
        title="بهترین NPV"
        icon={<IconTrendingUp size={20} color="#BB86FC" />}
        accentColor="#BB86FC"
        loanName={bestNpv.loanName}
        bankName={bestNpv.bankName}
        metricLabel="NPV"
        metricValue={formatRials(bestNpv.npv)}
        score={bestNpv.score}
      />
      <HighlightCard
        title="کمترین هزینه"
        icon={<IconTrendingDown size={20} color={rallyColors.yellow} />}
        accentColor={rallyColors.yellow}
        loanName={lowestCost.loanName}
        bankName={lowestCost.bankName}
        metricLabel="هزینه کل"
        metricValue={formatRials(lowestCost.totalCost)}
        score={lowestCost.score}
      />
    </SimpleGrid>
  );
};

export default AllMetricsTopCards;
