import { useState, useMemo } from 'react';
import { SimpleGrid, Button, Text, Box } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconPlus,
  IconBriefcase,
  IconTrendingUp,
  IconTrendingDown,
  IconChartPie,
} from '@tabler/icons-react';
import { useMarketOverview } from '../hooks/useMarketData';
import usePortfolio from '../hooks/usePortfolio';
import PageHeader from '../components/PageHeader';
import RallyKPICard from '../components/RallyKPICard';
import KPICarousel from '../components/KPICarousel';
import RallyMainCard from '../components/RallyMainCard';
import AddHoldingModal from './portfolio/AddHoldingModal';
import HoldingsTable from './portfolio/HoldingsTable';
import PortfolioCharts from './portfolio/PortfolioCharts';
import PortfolioRiskPanel from './portfolio/PortfolioRiskPanel';
import { formatTrillion, toPersianNum } from '../utils/formatUtils';
import rallyColors from '../theme/rallyColors';

export default function Portfolio() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editHolding, setEditHolding] = useState(null);

  const { holdings, addHolding, updateHolding, removeHolding, totalCost } = usePortfolio();

  const { data: market = [], isLoading } = useMarketOverview({
    limit: 5000,
    refetchInterval: 2 * 60 * 1000,
  });

  // Enrich holdings with live prices
  const enriched = useMemo(() => {
    const totalValue = holdings.reduce((sum, h) => {
      const live = market.find((m) => m.symbol === h.symbol);
      return sum + h.quantity * (live?.close ?? h.buyPrice);
    }, 0);

    return holdings.map((h) => {
      const live = market.find((m) => m.symbol === h.symbol);
      const currentPrice = live?.close ?? h.buyPrice;
      const value = h.quantity * currentPrice;
      const cost = h.quantity * h.buyPrice;
      const pnl = value - cost;
      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
      const weight = totalValue > 0 ? (value / totalValue) * 100 : 0;
      return {
        ...live,
        symbol: h.symbol,
        quantity: h.quantity,
        buyPrice: h.buyPrice,
        addedAt: h.addedAt,
        currentPrice,
        value,
        cost,
        pnl,
        pnlPct,
        weight,
      };
    });
  }, [holdings, market]);

  const totalValue = enriched.reduce((s, h) => s + h.value, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  // Today's P&L: quantity × currentPrice × close_change_pct/100
  const todayPnl = enriched.reduce((s, h) => {
    if (h.close_change_pct == null) return s;
    return s + h.quantity * h.currentPrice * (h.close_change_pct / 100);
  }, 0);

  const handleEdit = (holding) => {
    setEditHolding(holding);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditHolding(null);
  };

  const handleAdd = (symbol, quantity, buyPrice) => {
    if (editHolding) {
      updateHolding(symbol, { quantity, buyPrice });
    } else {
      addHolding(symbol, quantity, buyPrice);
    }
  };

  const isMobile = useMediaQuery('(max-width: 48em)');
  const isEmpty = holdings.length === 0;

  const kpiCards = [
    { title: 'ارزش فعلی', value: formatTrillion(totalValue), icon: IconBriefcase, color: rallyColors.blue },
    { title: 'سود/زیان امروز', value: `${todayPnl >= 0 ? '+' : ''}${toPersianNum(todayPnl.toFixed(0))}`, icon: todayPnl >= 0 ? IconTrendingUp : IconTrendingDown, color: todayPnl >= 0 ? rallyColors.green : rallyColors.red, trend: todayPnl },
    { title: 'بازده کل', value: `${totalPnlPct >= 0 ? '+' : ''}${toPersianNum(totalPnlPct.toFixed(1))}٪`, subtitle: formatTrillion(Math.abs(totalPnl)), icon: totalPnl >= 0 ? IconTrendingUp : IconTrendingDown, color: totalPnl >= 0 ? rallyColors.green : rallyColors.red, trend: totalPnl },
    { title: 'تعداد دارایی', value: toPersianNum(holdings.length), icon: IconChartPie, color: rallyColors.purple },
  ];

  return (
    <>
      <PageHeader title="پورتفولیو">
        <Button
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={() => setModalOpen(true)}
          color="blue"
        >
          افزودن دارایی
        </Button>
      </PageHeader>

      {isEmpty ? (
        <RallyMainCard>
          <Box py="xl" style={{ textAlign: 'center' }}>
            <IconBriefcase size={48} color={rallyColors.textDimmed} style={{ marginBottom: 16 }} />
            <Text size="lg" fw={600} mb="xs" c={rallyColors.textSecondary}>
              سبد سهام شما خالی است
            </Text>
            <Text size="sm" c="dimmed" mb="xl">
              با افزودن دارایی‌ها، ارزش لحظه‌ای، سود/زیان و تحلیل ریسک سبد خود را مشاهده کنید
            </Text>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setModalOpen(true)}
              color="blue"
            >
              افزودن اولین دارایی
            </Button>
          </Box>
        </RallyMainCard>
      ) : (
        <>
          {/* KPI Strip */}
          {isMobile ? (
            <KPICarousel>
              {kpiCards.map((c, i) => <RallyKPICard key={i} {...c} compact animateValue />)}
            </KPICarousel>
          ) : (
            <SimpleGrid cols={{ base: 1, xs: 2, sm: 2, md: 4 }} spacing={{ base: 'sm', md: 'md' }} mb="md">
              {kpiCards.map((c, i) => (
                <Box key={i} h="100%">
                  <RallyKPICard {...c} animateValue />
                </Box>
              ))}
            </SimpleGrid>
          )}

          {/* Holdings Table */}
          <Box mb="md">
            <HoldingsTable
              enriched={enriched}
              loading={isLoading}
              onEdit={handleEdit}
              onRemove={removeHolding}
            />
          </Box>

          {/* Charts */}
          <Box mb="md">
            <PortfolioCharts holdings={holdings} enriched={enriched} />
          </Box>

          {/* Risk Panel */}
          <Box mb="md">
            <PortfolioRiskPanel holdings={holdings} enriched={enriched} />
          </Box>
        </>
      )}

      <AddHoldingModal
        opened={modalOpen}
        onClose={handleModalClose}
        onAdd={handleAdd}
        editHolding={editHolding}
        market={market}
      />
    </>
  );
}
