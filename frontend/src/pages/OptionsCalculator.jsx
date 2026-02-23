import { useState, useEffect, useMemo } from 'react';
import { Grid, Stack, Group, Button, Card, Text, Select, Badge } from '@mantine/core';
import { IconDownload, IconPhoto, IconPlugConnected } from '@tabler/icons-react';
import RallyMainCard from '../components/RallyMainCard';
import PageHeader from '../components/PageHeader';
import PayoffChart from '../components/charts/PayoffChart';
import useOptionsState from '../hooks/useOptionsState';
import StrategySelector from './options/StrategySelector';
import OptionsParameters from './options/OptionsParameters';
import PositionLegsTable from './options/PositionLegsTable';
import OptionsSummary from './options/OptionsSummary';
import OptionsGreeks from './options/OptionsGreeks';
import { useOptionsUnderlyings, useOptionsChain } from '../hooks/useMarketData';
import { impliedVolatility, blackScholesPrice } from '../utils/blackScholes';
import { formatNum } from '../utils/formatUtils';
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
  const { data: underlyings = [] } = useOptionsUnderlyings();
  const { data: chainData } = useOptionsChain(selectedUnderlying);

  const underlyingPrice = chainData?.underlying_info?.close;
  const availableContracts = chainData?.options || [];

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
  };

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
            <Badge color="rally-green" variant="light" size="lg">
              قیمت پایه: {formatNum(underlyingPrice)}
            </Badge>
          )}
          {selectedUnderlying && availableContracts.length > 0 && (
            <Badge color="rally-blue" variant="light" size="lg">
              {formatNum(availableContracts.length)} قرارداد
            </Badge>
          )}
        </Group>
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
                formatLocalNum={formatLocalNum}
              />
            </RallyMainCard>

            <RallyMainCard title="یونانی‌ها">
              <OptionsGreeks greeks={computed.greeks} />
            </RallyMainCard>

            <Card withBorder radius="md" p="md">
              <Text fw={600} size="sm" mb="sm">خروجی</Text>
              <Group gap="sm">
                <Button variant="light" color="rally-green" size="xs" leftSection={<IconDownload size={14} />} onClick={exportCSV}>
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
    </>
  );
}
