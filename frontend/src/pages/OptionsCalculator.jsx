import { useState, useEffect, useMemo } from 'react';
import { Grid, Stack, Group, Button, Card, Text, Select, Badge, SegmentedControl, Table } from '@mantine/core';
import { IconDownload, IconPhoto, IconPlugConnected } from '@tabler/icons-react';
import RallyMainCard from '../components/RallyMainCard';
import PageHeader from '../components/PageHeader';
import PayoffChart from '../components/charts/PayoffChart';
import useOptionsState from '../hooks/useOptionsState';
import useScenarioAnalysis from '../hooks/useScenarioAnalysis';
import StrategySelector from './options/StrategySelector';
import OptionsParameters from './options/OptionsParameters';
import PositionLegsTable from './options/PositionLegsTable';
import OptionsSummary from './options/OptionsSummary';
import OptionsGreeks from './options/OptionsGreeks';
import { useOptionsUnderlyings, useOptionsChain } from '../hooks/useMarketData';
import { impliedVolatility, blackScholesPrice } from '../utils/blackScholes';
import { formatNum } from '../utils/formatUtils';
import { computeT } from '../utils/dateUtils';
import { DEFAULT_STRESS_SCENARIOS } from '../constants/options';
import GreeksRadarChart from '../components/charts/GreeksRadarChart';
import rallyColors from '../theme/rallyColors';

export default function OptionsCalculator() {
  const {
    strategy,
    stockPrice,
    daysToExpiry,
    riskFreeRate,
    volatility,
    legs,
    chartRef,
    priceRange,
    setStockPrice,
    setDaysToExpiry,
    setRiskFreeRate,
    setVolatility,
    computed,
    handleStrategyChange,
    updateLeg,
    removeLeg,
    addLeg,
    exportCSV,
    exportPNG,
    formatLocalNum,
  } = useOptionsState();

  // Market data connection
  const [selectedUnderlying, setSelectedUnderlying] = useState(null);
  const [selectedExpiry, setSelectedExpiry] = useState(null);
  const { data: underlyings = [] } = useOptionsUnderlyings();
  const { data: chainData } = useOptionsChain(selectedUnderlying);

  // Reset expiry when underlying changes
  useEffect(() => { setSelectedExpiry(null); }, [selectedUnderlying]);

  const underlyingPrice = chainData?.underlying_info?.close;
  const expiryDates = chainData?.expiry_dates || [];

  const availableContracts = useMemo(() => {
    const all = chainData?.options || [];
    return selectedExpiry ? all.filter((c) => c.expiry_date === selectedExpiry) : all;
  }, [chainData, selectedExpiry]);

  // Auto-fill stock price when chain data loads
  useEffect(() => {
    if (underlyingPrice && underlyingPrice > 0) {
      setStockPrice(Math.round(underlyingPrice));
    }
  }, [underlyingPrice, setStockPrice]);

  // Per-leg IV and valuation analytics
  const legAnalytics = useMemo(() => {
    const S = underlyingPrice || stockPrice;
    if (!S || S <= 0) return [];
    const r = riskFreeRate / 100;
    const T = daysToExpiry / 365;
    const sigma = volatility / 100;

    return legs.map((leg) => {
      if (leg.type === 'stock' || !leg.premium || leg.premium <= 0 || T <= 0) return null;
      const iv = impliedVolatility(leg.type, leg.premium, S, leg.strike, T, r);
      const bsPrice = blackScholesPrice(leg.type, S, leg.strike, T, r, sigma);
      const diff = leg.premium - bsPrice;
      const pctDiff = bsPrice > 0 ? (diff / bsPrice) * 100 : 0;
      return {
        iv: iv ? iv * 100 : null,
        bsPrice: Math.round(bsPrice * 100) / 100,
        diff: Math.round(diff * 100) / 100,
        pctDiff: Math.round(pctDiff * 10) / 10,
        overpriced: diff > bsPrice * 0.02, // >2% above BS
        underpriced: diff < -bsPrice * 0.02, // >2% below BS
      };
    });
  }, [legs, underlyingPrice, stockPrice, riskFreeRate, daysToExpiry, volatility]);

  const underlyingSelectData = underlyings
    .filter((u) => u.underlying)
    .map((u) => ({
      value: u.underlying,
      label: `${u.underlying}${u.name_fa ? ` - ${u.name_fa}` : ''}`,
    }));

  // Contract options for leg selection (grouped by type)
  const contractSelectData = useMemo(() => {
    if (!availableContracts.length) return [];
    return availableContracts
      .filter((c) => c.symbol)
      .map((c) => ({
        value: c.symbol,
        label: `${c.symbol} | ${c.option_type === 'call' ? 'خرید' : 'فروش'} | اعمال: ${formatNum(c.strike_price)}`,
        contract: c,
      }));
  }, [availableContracts]);

  const handleContractSelect = (legIndex, symbol) => {
    if (!symbol) return;
    const contract = availableContracts.find((c) => c.symbol === symbol);
    if (!contract) return;
    updateLeg(legIndex, 'type', contract.option_type);
    updateLeg(legIndex, 'strike', contract.strike_price);
    updateLeg(legIndex, 'premium', contract.last || contract.close || 0);
    const days = Math.round(computeT(contract.expiry_date) * 365);
    if (days > 0) setDaysToExpiry(days);
  };

  // Scenario / stress testing
  const scenarioResults = useScenarioAnalysis(
    legs,
    stockPrice,
    daysToExpiry / 365,
    riskFreeRate / 100,
    volatility / 100,
    DEFAULT_STRESS_SCENARIOS,
  );

  return (
    <>
      <PageHeader title="محاسبه‌گر سود و زیان اختیار" />

      <RallyMainCard title="استراتژی" mb="md">
        <StrategySelector strategy={strategy} onStrategyChange={handleStrategyChange} />
      </RallyMainCard>

      {/* Market Data Connection */}
      <RallyMainCard
        title={
          <Group gap="xs">
            <IconPlugConnected size={18} color={rallyColors.blue} />
            <Text fw={600}>اتصال به داده بازار</Text>
          </Group>
        }
        mb="md"
      >
        <Group gap="md" wrap="wrap" align="flex-end">
          <Select
            label="دارایی پایه"
            placeholder="انتخاب دارایی..."
            data={underlyingSelectData}
            value={selectedUnderlying}
            onChange={setSelectedUnderlying}
            searchable
            clearable
            size="sm"
            style={{ minWidth: 220, flex: 1, maxWidth: 360 }}
            nothingFoundMessage="دارایی یافت نشد"
          />
          {underlyingPrice > 0 && (
            <Badge color="rally-primary" variant="light" size="lg">
              قیمت پایه: {formatNum(underlyingPrice)}
            </Badge>
          )}
          {selectedUnderlying && availableContracts.length > 0 && (
            <Badge color="rally-blue" variant="light" size="lg">
              {formatNum(availableContracts.length)} قرارداد
            </Badge>
          )}
        </Group>
        {selectedUnderlying && expiryDates.length > 0 && (
          <Group gap="sm" mt="sm" wrap="wrap" align="center">
            <Text size="xs" c="dimmed" fw={600}>سررسید:</Text>
            <SegmentedControl
              value={selectedExpiry || ''}
              onChange={(v) => setSelectedExpiry(v || null)}
              data={[{ value: '', label: 'همه' }, ...expiryDates.map((d) => ({ value: d, label: d }))]}
              size="xs"
              styles={{ root: { background: 'rgba(42, 46, 62, 0.5)' } }}
            />
          </Group>
        )}
        {selectedUnderlying && (
          <Text size="xs" c="dimmed" mt="xs">
            با انتخاب دارایی پایه، قیمت سهم به‌روز شده و قراردادهای واقعی در دسترس خواهند بود.
          </Text>
        )}
      </RallyMainCard>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Stack gap="md">
            <RallyMainCard title="پارامترها">
              <OptionsParameters
                stockPrice={stockPrice}
                daysToExpiry={daysToExpiry}
                riskFreeRate={riskFreeRate}
                volatility={volatility}
                onStockPriceChange={setStockPrice}
                onDaysChange={setDaysToExpiry}
                onRateChange={setRiskFreeRate}
                onVolatilityChange={setVolatility}
              />
            </RallyMainCard>

            <RallyMainCard title="پاهای موقعیت">
              <PositionLegsTable
                legs={legs}
                onLegChange={updateLeg}
                onAddLeg={addLeg}
                onRemoveLeg={removeLeg}
                contracts={contractSelectData}
                onContractSelect={handleContractSelect}
                legAnalytics={legAnalytics}
              />
            </RallyMainCard>

            <RallyMainCard title="نمودار سود و زیان" fullscreenable>
              <div ref={chartRef}>
                <PayoffChart legs={legs} stockPrice={stockPrice} priceRange={priceRange} height={350} />
              </div>
            </RallyMainCard>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Stack gap="md">
            <RallyMainCard title="خلاصه">
              <OptionsSummary
                breakeven={computed.breakevens}
                maxProfit={computed.maxProfit}
                maxLoss={computed.maxLoss}
                riskReward={computed.riskRewardRatio}
                netPremium={computed.netPremium}
                pop={computed.pop}
                formatLocalNum={formatLocalNum}
              />
            </RallyMainCard>

            <RallyMainCard title="یونانی‌ها">
              <OptionsGreeks greeks={computed.greeks} />
              {computed.greeks && <GreeksRadarChart greeks={computed.greeks} />}
            </RallyMainCard>

            <Card withBorder radius="md" p="md">
              <Text fw={600} size="sm" mb="sm">خروجی</Text>
              <Group gap="sm">
                <Button variant="light" color="rally-primary" size="xs" leftSection={<IconDownload size={14} />} onClick={exportCSV}>
                  CSV
                </Button>
                <Button variant="light" color="rally-blue" size="xs" leftSection={<IconPhoto size={14} />} onClick={exportPNG}>
                  PNG
                </Button>
              </Group>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>

      {/* Scenario / Stress Testing */}
      {scenarioResults && scenarioResults.length > 0 && (
        <RallyMainCard title="تحلیل سناریو" mt="md">
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ textAlign: 'right' }}>سناریو</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>تغییر قیمت</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>تغییر نوسان</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>گذر زمان</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>سود/زیان</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>دلتا</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>وگا</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>احتمال سود</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {scenarioResults.map((sc) => (
                <Table.Tr key={sc.name}>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text size="sm" fw={500}>{sc.name}</Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'center' }}>
                    <Text size="sm">{sc.spotShock !== 0 ? `${(sc.spotShock * 100).toFixed(0)}%` : '—'}</Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'center' }}>
                    <Text size="sm">{sc.volShock !== 0 ? `${(sc.volShock * 100).toFixed(0)}%` : '—'}</Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'center' }}>
                    <Text size="sm">{sc.daysDecay > 0 ? `${sc.daysDecay} روز` : '—'}</Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'center' }}>
                    <Text
                      size="sm"
                      fw={600}
                      c={sc.pnl > 0 ? rallyColors.green : sc.pnl < 0 ? rallyColors.red : undefined}
                    >
                      {sc.pnl > 0 ? '+' : ''}{formatLocalNum(sc.pnl)}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'center' }}>
                    <Text size="sm">{sc.greeks.delta.toFixed(3)}</Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'center' }}>
                    <Text size="sm">{sc.greeks.vega.toFixed(3)}</Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'center' }}>
                    <Text
                      size="sm"
                      fw={500}
                      c={sc.pop > 0.5 ? rallyColors.green : rallyColors.red}
                    >
                      {(sc.pop * 100).toFixed(1)}%
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </RallyMainCard>
      )}
    </>
  );
}
