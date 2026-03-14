import { useState, useEffect, useMemo } from 'react';
import {
  Grid,
  Stack,
  Group,
  Button,
  Card,
  Text,
  Select,
  Badge,
  SegmentedControl,
} from '@mantine/core';
import { IconDownload, IconPhoto, IconPlugConnected } from '@tabler/icons-react';
import RallyMainCard from '../../components/RallyMainCard';
import PageHeader from '../../components/PageHeader';
import PayoffChart from '../../components/charts/PayoffChart';
import useOptionsState from '../../hooks/useOptionsState';
import StrategySelector from '../options/StrategySelector';
import OptionsParameters from '../options/OptionsParameters';
import PositionLegsTable from '../options/PositionLegsTable';
import OptionsSummary from '../options/OptionsSummary';
import OptionsGreeks from '../options/OptionsGreeks';
import useDeribitOptionsChain from '../../hooks/useDeribitOptionsChain';
import { blackScholesPrice } from '../../utils/blackScholes';
import { formatNum } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';

export default function CryptoOptionsCalculator() {
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

  // Deribit market data connection
  const {
    currency, setCurrency,
    selectedExpiry, setSelectedExpiry,
    allOptions,
    expiries,
    underlyingPrice,
    loading,
  } = useDeribitOptionsChain();

  // Auto-fill stock price when chain data loads
  useEffect(() => {
    if (underlyingPrice && underlyingPrice > 0) {
      setStockPrice(Math.round(underlyingPrice));
    }
  }, [underlyingPrice, setStockPrice]);

  // Auto-set USD risk-free rate on mount
  useEffect(() => {
    setRiskFreeRate(5); // 5% SOFR
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset expiry when currency changes
  useEffect(() => { setSelectedExpiry(null); }, [currency]); // eslint-disable-line react-hooks/exhaustive-deps

  const availableContracts = useMemo(() => {
    if (!selectedExpiry) return allOptions;
    return allOptions.filter((c) => {
      const parts = c.instrument_name.split('-');
      return parts[1] === selectedExpiry;
    });
  }, [allOptions, selectedExpiry]);

  // Per-leg IV and valuation analytics
  const legAnalytics = useMemo(() => {
    const S = underlyingPrice || stockPrice;
    if (!S || S <= 0) return [];
    const r = riskFreeRate / 100;
    const T = daysToExpiry / 365;
    const sigma = volatility / 100;

    return legs.map((leg) => {
      if (leg.type === 'stock' || !leg.premium || leg.premium <= 0 || T <= 0) return null;
      const bsPrice = blackScholesPrice(leg.type, S, leg.strike, T, r, sigma);
      const diff = leg.premium - bsPrice;
      const pctDiff = bsPrice > 0 ? (diff / bsPrice) * 100 : 0;
      return {
        iv: null, // Deribit IV available from chainMap if needed
        bsPrice: Math.round(bsPrice * 10000) / 10000,
        diff: Math.round(diff * 10000) / 10000,
        pctDiff: Math.round(pctDiff * 10) / 10,
        overpriced: diff > bsPrice * 0.02,
        underpriced: diff < -bsPrice * 0.02,
      };
    });
  }, [legs, underlyingPrice, stockPrice, riskFreeRate, daysToExpiry, volatility]);

  // Contract options for leg selection
  const contractSelectData = useMemo(() => {
    return availableContracts
      .filter((c) => c.instrument_name)
      .map((c) => ({
        value: c.instrument_name,
        label: `${c.instrument_name} | ${c.option_type === 'call' ? 'Call' : 'Put'} | K: ${formatNum(c.strike_price)}`,
        contract: c,
      }));
  }, [availableContracts]);

  const handleContractSelect = (legIndex, instrumentName) => {
    if (!instrumentName) return;
    const contract = availableContracts.find((c) => c.instrument_name === instrumentName);
    if (!contract) return;
    updateLeg(legIndex, 'type', contract.option_type);
    updateLeg(legIndex, 'strike', contract.strike_price);
    updateLeg(legIndex, 'premium', contract.mark_price || 0);
    if (contract.daysToExpiry > 0) setDaysToExpiry(Math.round(contract.daysToExpiry));
    if (contract.iv && contract.iv > 0) setVolatility(Math.round(contract.iv * 10) / 10);
  };

  return (
    <>
      <PageHeader title="محاسبه‌گر اختیار رمزارز — Deribit" />

      <RallyMainCard title="استراتژی" mb="md">
        <StrategySelector strategy={strategy} onStrategyChange={handleStrategyChange} />
      </RallyMainCard>

      {/* Market Data Connection */}
      <RallyMainCard
        title={
          <Group gap="xs">
            <IconPlugConnected size={18} color={rallyColors.blue} />
            <Text fw={600}>اتصال به داده Deribit</Text>
          </Group>
        }
        mb="md"
      >
        <Group gap="md" wrap="wrap" align="flex-end">
          <SegmentedControl
            value={currency}
            onChange={setCurrency}
            data={[{ value: 'BTC', label: 'BTC' }, { value: 'ETH', label: 'ETH' }]}
            size="sm"
          />
          {underlyingPrice > 0 && (
            <Badge color="rally-primary" variant="light" size="lg">
              {currency}: ${formatNum(underlyingPrice?.toFixed(2))}
            </Badge>
          )}
          {availableContracts.length > 0 && (
            <Badge color="rally-blue" variant="light" size="lg">
              {availableContracts.length} قرارداد
            </Badge>
          )}
        </Group>
        {expiries.length > 0 && (
          <Group gap="sm" mt="sm" wrap="wrap" align="center">
            <Text size="xs" c="dimmed" fw={600}>سررسید:</Text>
            <SegmentedControl
              value={selectedExpiry || ''}
              onChange={(v) => setSelectedExpiry(v || null)}
              data={[{ value: '', label: 'همه' }, ...expiries.map((d) => ({ value: d, label: d }))]}
              size="xs"
              styles={{ root: { background: 'rgba(42,46,62,0.5)' } }}
            />
          </Group>
        )}
        <Text size="xs" c="dimmed" mt="xs">
          با انتخاب رمزارز و سررسید، قیمت پایه به‌روز می‌شود و قراردادهای Deribit در دسترس خواهند بود.
        </Text>
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
    </>
  );
}
