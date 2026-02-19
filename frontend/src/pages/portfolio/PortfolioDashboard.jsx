import { useMemo, useRef } from 'react';
import { SimpleGrid, Button, Text, Box, Group, FileButton } from '@mantine/core';
import {
  IconPlus,
  IconBriefcase,
  IconTrendingUp,
  IconTrendingDown,
  IconChartPie,
  IconDownload,
  IconUpload,
} from '@tabler/icons-react';
import PageHeader from '../../components/PageHeader';
import RallyKPICard from '../../components/RallyKPICard';
import RallyMainCard from '../../components/RallyMainCard';
import HoldingsTable from './HoldingsTable';
import PortfolioCharts from './PortfolioCharts';
import { usePortfolioContext } from './PortfolioProvider';
import { formatTrillion, toPersianNum } from '../../utils/formatUtils';
import { sharpeRatio } from '../../utils/riskMetrics/capm.js';
import rallyColors from '../../theme/rallyColors';

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

  const handleExport = () => {
    const data = JSON.stringify(holdings, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
          {!isEmpty && (
            <Button size="xs" variant="light" color="gray" leftSection={<IconDownload size={14} />} onClick={handleExport}>
              خروجی
            </Button>
          )}
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
              onClick={() => openModal()}
              color="blue"
            >
              افزودن اولین دارایی
            </Button>
          </Box>
        </RallyMainCard>
      ) : (
        <>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="md">
            <RallyKPICard
              title="ارزش فعلی"
              value={formatTrillion(totalValue)}
              icon={IconBriefcase}
              color={rallyColors.blue}
            />
            <RallyKPICard
              title="سود/زیان امروز"
              value={`${todayPnl >= 0 ? '+' : ''}${toPersianNum(todayPnl.toFixed(0))}`}
              icon={todayPnl >= 0 ? IconTrendingUp : IconTrendingDown}
              color={todayPnl >= 0 ? rallyColors.green : rallyColors.red}
              trend={todayPnl}
            />
            <RallyKPICard
              title="بازده کل"
              value={`${totalPnlPct >= 0 ? '+' : ''}${toPersianNum(totalPnlPct.toFixed(1))}٪`}
              subtitle={formatTrillion(Math.abs(totalPnl))}
              icon={totalPnl >= 0 ? IconTrendingUp : IconTrendingDown}
              color={totalPnl >= 0 ? rallyColors.green : rallyColors.red}
              trend={totalPnl}
            />
            <RallyKPICard
              title="شارپ پرتفو"
              value={portSharpe != null ? toPersianNum(portSharpe.toFixed(2)) : '-'}
              icon={IconChartPie}
              color={rallyColors.purple}
            />
          </SimpleGrid>

          <Box mb="md">
            <HoldingsTable
              enriched={enriched}
              loading={marketLoading}
              onEdit={(h) => openModal(h)}
              onRemove={removeHolding}
            />
          </Box>

          <Box mb="md">
            <PortfolioCharts holdings={holdings} enriched={enriched} />
          </Box>
        </>
      )}
    </>
  );
}
