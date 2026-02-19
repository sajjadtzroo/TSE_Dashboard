import { useMemo } from 'react';
import { SimpleGrid, Button, Text, Box, Group, FileButton } from '@mantine/core';
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
import HoldingsTable from './HoldingsTable';
import PortfolioCharts from './PortfolioCharts';
import { usePortfolioContext } from './PortfolioProvider';
import { formatTrillion, toPersianNum } from '../../utils/formatUtils';
import { sharpeRatio } from '../../utils/riskMetrics/capm.js';
import rallyColors from '../../theme/rallyColors';
import animStyles from '../../components/shared/animations.module.css';

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

  const isEmpty = holdings.length === 0;

  const handleImport = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!Array.isArray(imported)) return;
        // Save directly to localStorage and reload
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
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="md">
            <Box className={animStyles.cardEnter}>
              <RallyKPICard
                title="ارزش فعلی"
                value={formatTrillion(totalValue)}
                icon={IconBriefcase}
                color={rallyColors.blue}
              />
            </Box>
            <Box className={animStyles.cardEnter}>
              <RallyKPICard
                title="سود/زیان امروز"
                value={`${todayPnl >= 0 ? '+' : ''}${toPersianNum(todayPnl.toFixed(0))}`}
                icon={todayPnl >= 0 ? IconTrendingUp : IconTrendingDown}
                color={todayPnl >= 0 ? rallyColors.green : rallyColors.red}
                trend={todayPnl}
              />
            </Box>
            <Box className={animStyles.cardEnter}>
              <RallyKPICard
                title="بازده کل"
                value={`${totalPnlPct >= 0 ? '+' : ''}${toPersianNum(totalPnlPct.toFixed(1))}٪`}
                subtitle={formatTrillion(Math.abs(totalPnl))}
                icon={totalPnl >= 0 ? IconTrendingUp : IconTrendingDown}
                color={totalPnl >= 0 ? rallyColors.green : rallyColors.red}
                trend={totalPnl}
              />
            </Box>
            <Box className={animStyles.cardEnter}>
              <RallyKPICard
                title="شارپ پرتفو"
                value={portSharpe != null ? toPersianNum(portSharpe.toFixed(2)) : '-'}
                icon={IconChartPie}
                color={rallyColors.purple}
              />
            </Box>
          </SimpleGrid>

          <Box mb="md" className={`${animStyles.sectionEnter} ${animStyles.sectionDelay1}`}>
            <HoldingsTable
              enriched={enriched}
              loading={marketLoading}
              onEdit={(h) => openModal(h)}
              onRemove={removeHolding}
            />
          </Box>

          <Box mb="md" className={`${animStyles.sectionEnter} ${animStyles.sectionDelay2}`}>
            <PortfolioCharts holdings={holdings} enriched={enriched} />
          </Box>
        </>
      )}
    </>
  );
}
