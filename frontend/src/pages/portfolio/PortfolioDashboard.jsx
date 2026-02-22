import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import axios from 'axios';
import { SimpleGrid, Button, Text, Box, Group, FileButton, Card, Stack } from '@mantine/core';
import { motion } from 'motion/react';
import {
  IconPlus,
  IconBriefcase,
  IconTrendingUp,
  IconTrendingDown,
  IconChartPie,
  IconUpload,
} from '@tabler/icons-react';
import PageHeader from '../../components/PageHeader';
import RallyKPICard from '../../components/RallyKPICard';
import RallyMainCard from '../../components/RallyMainCard';
import RallyEmptyState from '../../components/RallyEmptyState';
import SparklineMini from '../../components/charts/SparklineMini';
import HoldingsTable from './HoldingsTable';
import PortfolioCharts from './PortfolioCharts';
import { usePortfolioContext } from './PortfolioProvider';
import { formatTrillion, toPersianNum } from '../../utils/formatUtils';
import { sharpeRatio } from '../../utils/riskMetrics/capm.js';
import rallyColors from '../../theme/rallyColors';
import animStyles from '../../components/shared/animations.module.css';

function WealthSummaryHero({ totalValue, todayPnl, totalPnlPct, totalPnl, portSharpe, sparklineData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card
        radius="lg"
        p="lg"
        style={{
          background: rallyColors.glassBg,
          backdropFilter: rallyColors.glassBlur,
          border: `1px solid ${rallyColors.glassBorder}`,
          position: 'relative',
          overflow: 'hidden',
          contain: 'paint',
        }}
      >
        {/* Accent glow blob */}
        <Box
          style={{
            position: 'absolute',
            width: 200,
            height: 200,
            background: `radial-gradient(circle, ${rallyColors.blue}18 0%, transparent 70%)`,
            top: -60,
            right: -40,
            pointerEvents: 'none',
          }}
        />

        <Group
          align="flex-start"
          justify="space-between"
          wrap="wrap"
          gap="lg"
          style={{ position: 'relative', zIndex: 1 }}
        >
          {/* Left: Big total value + sparkline */}
          <Stack gap={4} style={{ minWidth: 200 }}>
            <Text size="xs" c="dimmed">ارزش کل پورتفولیو</Text>
            <Text
              style={{ fontSize: '2rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}
              c={rallyColors.textPrimary}
            >
              {formatTrillion(totalValue)}
            </Text>
            {sparklineData && sparklineData.length > 1 && (
              <SparklineMini
                data={sparklineData}
                color={totalPnl >= 0 ? rallyColors.green : rallyColors.red}
                width={120}
                height={32}
              />
            )}
          </Stack>

          {/* Right: 3x compact KPI cards */}
          <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="xs" style={{ flex: 1, maxWidth: 480 }}>
            <RallyKPICard
              compact
              title="سود/زیان امروز"
              value={`${todayPnl >= 0 ? '+' : ''}${toPersianNum(todayPnl.toFixed(0))}`}
              icon={todayPnl >= 0 ? IconTrendingUp : IconTrendingDown}
              color={todayPnl >= 0 ? rallyColors.green : rallyColors.red}
              trend={todayPnl}
              animateValue
            />
            <RallyKPICard
              compact
              title="بازده کل"
              value={`${totalPnlPct >= 0 ? '+' : ''}${toPersianNum(totalPnlPct.toFixed(1))}٪`}
              icon={totalPnl >= 0 ? IconTrendingUp : IconTrendingDown}
              color={totalPnl >= 0 ? rallyColors.green : rallyColors.red}
              trend={totalPnl}
              animateValue
            />
            <RallyKPICard
              compact
              title="شارپ پرتفو"
              value={portSharpe != null ? toPersianNum(portSharpe.toFixed(2)) : '-'}
              icon={IconChartPie}
              color={rallyColors.purple}
              animateValue
            />
          </SimpleGrid>
        </Group>
      </Card>
    </motion.div>
  );
}

export default function PortfolioDashboard() {
  const {
    holdings,
    enriched,
    marketLoading,
    totalCost,
    removeHolding,
    openModal,
    portfolioReturns,
  } = usePortfolioContext();

  const totalValue = enriched.reduce((s, h) => s + h.value, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const todayPnl = enriched.reduce((s, h) => {
    if (h.close_change_pct == null) return s;
    return s + h.quantity * h.currentPrice * (h.close_change_pct / 100);
  }, 0);

  const portSharpe = useMemo(() => {
    if (portfolioReturns.returns.length < 20) return null;
    return sharpeRatio(portfolioReturns.returns);
  }, [portfolioReturns]);

  // Cumulative return sparkline (base 100)
  const heroSparkline = useMemo(() => {
    const rets = portfolioReturns.returns;
    if (!rets || rets.length < 2) return null;
    const cumulative = [100];
    for (let i = 0; i < rets.length; i++) {
      cumulative.push(cumulative[i] * (1 + rets[i]));
    }
    return cumulative;
  }, [portfolioReturns]);

  // 30-day stock histories for table sparklines
  const sparklineApi = useMemo(() => axios.create({ baseURL: '/api' }), []);
  const stockHistories = useQueries({
    queries: holdings.map((h) => ({
      queryKey: ['stock-history', h.symbol, 30],
      queryFn: () =>
        sparklineApi
          .get(`/stocks/${encodeURIComponent(h.symbol)}/history`, { params: { days: 30 } })
          .then((r) => r.data),
      enabled: holdings.length > 0 && !!h.symbol,
      staleTime: 5 * 60 * 1000,
    })),
  });

  // Enrich holdings with _sparkline arrays for the table
  const enrichedWithSparklines = useMemo(() => {
    const histMap = {};
    holdings.forEach((h, i) => {
      const data = stockHistories[i]?.data;
      if (data) histMap[h.symbol] = data.map((d) => d.close);
    });
    return enriched.map((h) => ({
      ...h,
      _sparkline: histMap[h.symbol] || [],
    }));
  }, [enriched, holdings, stockHistories]);

  const isEmpty = holdings.length === 0;

  const handleImport = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!Array.isArray(imported)) return;
        localStorage.setItem('tse-portfolio', JSON.stringify(imported));
        window.location.reload();
      } catch { /* invalid JSON — ignore */ }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <PageHeader title="پورتفولیو">
        <Group gap="xs">
          <FileButton onChange={handleImport} accept="application/json">
            {(props) => (
              <Button size="xs" variant="light" color="gray" leftSection={<IconUpload size={14} />} {...props}>
                ورودی
              </Button>
            )}
          </FileButton>
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={() => openModal()}
            color="blue"
          >
            افزودن دارایی
          </Button>
        </Group>
      </PageHeader>

      {isEmpty ? (
        <RallyMainCard>
          <RallyEmptyState
            icon={IconBriefcase}
            message="سبد سهام شما خالی است"
            actionLabel="افزودن اولین دارایی"
            onAction={() => openModal()}
          />
        </RallyMainCard>
      ) : (
        <>
          <Box mb="md">
            <WealthSummaryHero
              totalValue={totalValue}
              todayPnl={todayPnl}
              totalPnlPct={totalPnlPct}
              totalPnl={totalPnl}
              portSharpe={portSharpe}
              sparklineData={heroSparkline}
            />
          </Box>

          <Box mb="md" className={`${animStyles.sectionEnter} ${animStyles.sectionDelay1}`}>
            <PortfolioCharts holdings={holdings} enriched={enriched} />
          </Box>

          <Box mb="md" className={`${animStyles.sectionEnter} ${animStyles.sectionDelay2}`}>
            <HoldingsTable
              enriched={enrichedWithSparklines}
              loading={marketLoading}
              onEdit={(h) => openModal(h)}
              onRemove={removeHolding}
            />
          </Box>
        </>
      )}
    </>
  );
}
