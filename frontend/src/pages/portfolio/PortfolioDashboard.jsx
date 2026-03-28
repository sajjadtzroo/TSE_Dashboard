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
import HoldingsTreemap from './components/HoldingsTreemap';
import PeriodReturnsBar from './components/PeriodReturnsBar';

function KPIMini({ title, value, color, sublabel }) {
  return (
    <Box
      style={{
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 8,
        padding: '10px 12px',
        borderInlineStart: `2px solid ${color}`,
      }}
    >
      <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>{title}</Text>
      <Text
        fw={700}
        c={color}
        style={{ fontSize: 15, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}
      >
        {value}
      </Text>
      {sublabel && (
        <Text size="xs" c="dimmed" style={{ fontSize: 9, marginTop: 1 }}>{sublabel}</Text>
      )}
    </Box>
  );
}

function WealthSummaryHero({ totalValue, todayPnl, totalPnlPct, totalPnl, portSharpe, sparklineData, currencyLabel }) {
  const pnlColor = totalPnl >= 0 ? rallyColors.green : rallyColors.red;
  const todayColor = todayPnl >= 0 ? rallyColors.green : rallyColors.red;

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
          background: `linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(139,92,246,0.04) 100%)`,
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
            width: 220,
            height: 220,
            background: `radial-gradient(circle, ${rallyColors.blue}14 0%, transparent 70%)`,
            top: -70,
            right: -50,
            pointerEvents: 'none',
          }}
        />

        <Box style={{ position: 'relative', zIndex: 1 }}>
          {/* Top row: Big value + change badge + sparkline */}
          <Group align="flex-start" justify="space-between" wrap="wrap" gap="md" mb="md">
            <Stack gap={4}>
              <Text size="xs" c="dimmed" style={{ letterSpacing: 0.5 }}>ارزش کل پورتفولیو</Text>
              <Text
                style={{ fontSize: 32, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}
                c={rallyColors.textPrimary}
              >
                {toPersianNum(Math.round(totalValue).toLocaleString())}
              </Text>
              <Group gap={8} mt={4}>
                <Box
                  style={{
                    background: `${pnlColor}12`,
                    padding: '2px 10px',
                    borderRadius: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Text size="xs" fw={600} c={pnlColor} style={{ fontSize: 11 }}>
                    {totalPnlPct >= 0 ? '▲' : '▼'} {totalPnlPct >= 0 ? '+' : ''}{toPersianNum(totalPnlPct.toFixed(1))}٪
                  </Text>
                </Box>
                <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>از ابتدای سرمایه‌گذاری</Text>
              </Group>
              <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>{currencyLabel}</Text>
            </Stack>

            {/* Sparkline */}
            {sparklineData && sparklineData.length > 1 && (
              <Box
                style={{
                  background: `linear-gradient(180deg, ${pnlColor}18 0%, ${pnlColor}04 100%)`,
                  borderRadius: 8,
                  border: `1px solid ${pnlColor}15`,
                  padding: 6,
                }}
              >
                <SparklineMini
                  data={sparklineData}
                  color={pnlColor}
                  width={120}
                  height={44}
                />
              </Box>
            )}
          </Group>

          {/* KPI row: 5 mini cards with colored left borders */}
          <SimpleGrid cols={{ base: 2, xs: 3, sm: 5 }} spacing={8}>
            <KPIMini
              title="سود/زیان امروز"
              value={`${todayPnl >= 0 ? '+' : ''}${toPersianNum(todayPnl.toFixed(0))}`}
              color={todayColor}
              sublabel={`${todayPnl >= 0 ? '+' : ''}${toPersianNum((todayPnl / (totalValue || 1) * 100).toFixed(1))}٪`}
            />
            <KPIMini
              title="سود تحقق‌یافته"
              value="—"
              color={rallyColors.blue}
              sublabel="realized"
            />
            <KPIMini
              title="سود تحقق‌نیافته"
              value={`${totalPnl >= 0 ? '+' : ''}${toPersianNum(totalPnl.toFixed(0))}`}
              color={rallyColors.yellow}
              sublabel="unrealized"
            />
            <KPIMini
              title="TWRR"
              value="—"
              color={rallyColors.purple}
              sublabel="سالانه"
            />
            <KPIMini
              title="IRR"
              value="—"
              color="#06b6d4"
              sublabel="سالانه"
            />
          </SimpleGrid>
        </Box>
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

  // 30-day histories for table sparklines (route TSE vs crypto)
  const sparklineApi = useMemo(() => axios.create({ baseURL: '/api' }), []);
  const stockHistories = useQueries({
    queries: holdings.map((h) => {
      const isCrypto = h.market_type === 'crypto';
      return {
        queryKey: [isCrypto ? 'crypto-history' : 'stock-history', h.symbol, 30],
        queryFn: () => {
          if (isCrypto) {
            return sparklineApi
              .get(`/crypto/${encodeURIComponent(h.symbol)}/history`, {
                params: { interval: '1day', limit: 30 },
              })
              .then((r) => (r.data || []).map((d) => ({ date: d.open_time, close: d.close })));
          }
          return sparklineApi
            .get(`/stocks/${encodeURIComponent(h.symbol)}/history`, { params: { days: 30 } })
            .then((r) => r.data);
        },
        enabled: holdings.length > 0 && !!h.symbol,
        staleTime: 5 * 60 * 1000,
      };
    }),
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

  const hasRial   = enriched.some((h) => h.market_type !== 'crypto');
  const hasCrypto = enriched.some((h) => h.market_type === 'crypto');
  const currencyLabel =
    hasRial && hasCrypto ? 'ریال + دلار'
    : hasCrypto           ? 'دلار'
    :                       'ریال';

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
              currencyLabel={currencyLabel}
            />
          </Box>

          <Box mb="sm">
            <PeriodReturnsBar returns={{}} />
          </Box>

          <Box mb="md" className={`${animStyles.sectionEnter} ${animStyles.sectionDelay1}`}>
            <PortfolioCharts holdings={holdings} enriched={enriched} />
          </Box>

          <Box mb="md" className={`${animStyles.sectionEnter} ${animStyles.sectionDelay2}`}>
            <HoldingsTreemap enriched={enriched} />
          </Box>

          <Box mb="md" className={`${animStyles.sectionEnter} ${animStyles.sectionDelay3}`}>
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
