import { useState, useMemo, useEffect } from 'react';
import {
  SimpleGrid,
  NumberInput,
  Slider,
  SegmentedControl,
  Group,
  Text,
  Badge,
  Stack,
  Select,
} from '@mantine/core';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import RallyMainCard from '../../components/RallyMainCard';
import RallyKPICard from '../../components/RallyKPICard';
import PageHeader from '../../components/PageHeader';
import BinomialTreeChart from '../../components/charts/BinomialTreeChart';
import { buildTree, convergenceData } from '../../utils/binomialTree';
import { blackScholesPrice } from '../../utils/blackScholes';
import { formatNum } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';
import { GRID_STROKE, axisTick, TOOLTIP_STYLE } from '../../components/charts/shared/chartStyles';
import { IconBinaryTree, IconChartLine, IconPlugConnected } from '@tabler/icons-react';
import useDeribitOptionsChain from '../../hooks/useDeribitOptionsChain';

export default function CryptoOptionsBinomial() {
  const [stockPrice, setStockPrice]     = useState(50000);
  const [strikePrice, setStrikePrice]   = useState(50000);
  const [daysToExpiry, setDaysToExpiry] = useState(90);
  const [riskFreeRate, setRiskFreeRate] = useState(5); // USD SOFR
  const [volatility, setVolatility]     = useState(70);
  const [steps, setSteps]               = useState(4);
  const [optionType, setOptionType]     = useState('call');
  const [style, setStyle]               = useState('european');

  // Market data connection
  const [selectedContract, setSelectedContract] = useState(null);

  const {
    currency, setCurrency,
    selectedExpiry, setSelectedExpiry,
    allOptions,
    expiries,
    underlyingPrice,
    loading,
  } = useDeribitOptionsChain();

  // Auto-fill S from underlying
  useEffect(() => {
    if (underlyingPrice > 0) {
      setStockPrice(Math.round(underlyingPrice));
      setStrikePrice(Math.round(underlyingPrice));
    }
  }, [underlyingPrice]);

  // Reset expiry/contract when currency changes
  useEffect(() => {
    setSelectedExpiry(null);
    setSelectedContract(null);
  }, [currency]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredContracts = useMemo(() => {
    if (!selectedExpiry) return allOptions;
    return allOptions.filter((c) => {
      const parts = c.instrument_name.split('-');
      return parts[1] === selectedExpiry;
    });
  }, [allOptions, selectedExpiry]);

  const contractSelectData = filteredContracts.map((c) => ({
    value: c.instrument_name,
    label: `${c.instrument_name} | ${c.option_type === 'call' ? 'Call' : 'Put'} | K: ${formatNum(c.strike_price)}`,
  }));

  // Auto-fill from contract selection
  useEffect(() => {
    if (!selectedContract) return;
    const contract = allOptions.find((c) => c.instrument_name === selectedContract);
    if (!contract) return;
    if (contract.strike_price) setStrikePrice(Math.round(contract.strike_price));
    if (contract.daysToExpiry > 0) setDaysToExpiry(Math.round(contract.daysToExpiry));
    if (contract.option_type) setOptionType(contract.option_type);
    if (contract.iv && contract.iv > 0) setVolatility(Math.round(contract.iv * 10) / 10);
  }, [selectedContract, allOptions]);

  const T = daysToExpiry / 365;
  const r = riskFreeRate / 100;
  const sigma = volatility / 100;

  const tree = useMemo(() => {
    if (stockPrice <= 0 || strikePrice <= 0 || T <= 0 || sigma <= 0) return null;
    return buildTree(stockPrice, strikePrice, T, r, sigma, steps, optionType, style);
  }, [stockPrice, strikePrice, T, r, sigma, steps, optionType, style]);

  const bsPrice = useMemo(() => {
    if (stockPrice <= 0 || strikePrice <= 0 || T <= 0 || sigma <= 0) return null;
    return blackScholesPrice(optionType, stockPrice, strikePrice, T, r, sigma);
  }, [stockPrice, strikePrice, T, r, sigma, optionType]);

  const convData = useMemo(() => {
    if (stockPrice <= 0 || strikePrice <= 0 || T <= 0 || sigma <= 0) return [];
    return convergenceData(stockPrice, strikePrice, T, r, sigma, optionType, style, 50);
  }, [stockPrice, strikePrice, T, r, sigma, optionType, style]);

  const priceDiff = tree && bsPrice != null ? Math.abs(tree.optionPrice - bsPrice) : null;

  return (
    <>
      <PageHeader title="مدل درخت دوجمله‌ای — Binomial Tree" />

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
          {allOptions.length > 0 && (
            <Badge color="rally-blue" variant="light" size="lg">
              {allOptions.length} قرارداد
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
        {contractSelectData.length > 0 && (
          <Select
            label="انتخاب قرارداد (اختیاری)"
            placeholder="قرارداد..."
            data={contractSelectData}
            value={selectedContract}
            onChange={setSelectedContract}
            searchable
            clearable
            size="sm"
            mt="sm"
            style={{ maxWidth: 520 }}
            nothingFoundMessage="قرارداد یافت نشد"
          />
        )}
        <Text size="xs" c="dimmed" mt="xs">
          با انتخاب قرارداد، پارامترها (قیمت اعمال، سررسید، نوسان‌پذیری) به‌روز می‌شوند.
        </Text>
      </RallyMainCard>

      {/* Parameters */}
      <RallyMainCard mb="md">
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="md">
          <div>
            <NumberInput label="قیمت دارایی (S) — USD" value={stockPrice} onChange={(v) => setStockPrice(v || 0)} min={1} step={100} size="sm" />
            <Slider value={stockPrice} onChange={setStockPrice} min={100} max={200000} step={100} mt="xs" size="xs" color="rally-primary" />
          </div>
          <div>
            <NumberInput label="قیمت اعمال (K) — USD" value={strikePrice} onChange={(v) => setStrikePrice(v || 0)} min={1} step={100} size="sm" />
            <Slider value={strikePrice} onChange={setStrikePrice} min={100} max={200000} step={100} mt="xs" size="xs" color="rally-primary" />
          </div>
          <div>
            <NumberInput label="روز تا سررسید" value={daysToExpiry} onChange={(v) => setDaysToExpiry(v || 1)} min={1} max={730} size="sm" />
            <Slider value={daysToExpiry} onChange={setDaysToExpiry} min={1} max={730} mt="xs" size="xs" color="rally-primary" />
          </div>
          <div>
            <NumberInput label="نوسان‌پذیری (٪)" value={volatility} onChange={(v) => setVolatility(v ?? 1)} min={1} max={500} step={1} size="sm" />
            <Slider value={volatility} onChange={setVolatility} min={1} max={300} mt="xs" size="xs" color="rally-primary" />
          </div>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          <div>
            <NumberInput label="نرخ بدون ریسک (٪ USD)" value={riskFreeRate} onChange={(v) => setRiskFreeRate(v ?? 0)} min={0} max={20} step={0.25} decimalScale={2} size="sm" />
          </div>
          <div>
            <Text size="sm" fw={500} mb={4}>تعداد مراحل (n)</Text>
            <Slider
              value={steps} onChange={setSteps} min={1} max={6} step={1} size="sm" color="rally-primary"
              marks={[{ value: 1, label: '1' }, { value: 3, label: '3' }, { value: 6, label: '6' }]}
            />
          </div>
          <div>
            <Text size="sm" fw={500} mb={4}>نوع اختیار</Text>
            <SegmentedControl value={optionType} onChange={setOptionType}
              data={[{ value: 'call', label: 'Call' }, { value: 'put', label: 'Put' }]} fullWidth size="sm" />
          </div>
          <div>
            <Text size="sm" fw={500} mb={4}>سبک اعمال</Text>
            <SegmentedControl value={style} onChange={setStyle}
              data={[{ value: 'european', label: 'اروپایی' }, { value: 'american', label: 'آمریکایی' }]} fullWidth size="sm" />
          </div>
        </SimpleGrid>
      </RallyMainCard>

      {/* KPI Cards */}
      {tree && (
        <SimpleGrid cols={{ base: 2, md: 4 }} mb="md">
          <RallyKPICard
            title="قیمت دوجمله‌ای"
            value={tree.optionPrice?.toFixed(4)}
            icon={IconBinaryTree}
            color={rallyColors.primary}
            variant="accent-bar"
          />
          <RallyKPICard
            title="قیمت بلک-شولز"
            value={bsPrice != null ? bsPrice?.toFixed(4) : '-'}
            icon={IconChartLine}
            color={rallyColors.blue}
            variant="accent-bar"
          />
          <RallyKPICard
            title="اختلاف"
            value={priceDiff != null ? priceDiff?.toFixed(4) : '-'}
            color={rallyColors.yellow}
            variant="accent-bar"
          />
          <RallyKPICard
            title="مراحل درخت"
            value={String(steps)}
            color={rallyColors.green}
            variant="accent-bar"
          />
        </SimpleGrid>
      )}

      {/* Tree visualization */}
      {tree && (
        <RallyMainCard mb="md" title="درخت دوجمله‌ای" fullscreenable>
          <BinomialTreeChart tree={tree} />
        </RallyMainCard>
      )}

      {/* Convergence chart */}
      {convData.length > 0 && (
        <RallyMainCard title="همگرایی به قیمت بلک-شولز" fullscreenable>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={convData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="steps" tickFormatter={(v) => toPersianNum(v)} tick={axisTick} />
              <YAxis tickFormatter={(v) => v.toFixed(4)} tick={axisTick} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v, name) => [v?.toFixed(4), name === 'binomial' ? 'دوجمله‌ای' : 'بلک-شولز']}
                labelFormatter={(l) => `مراحل: ${l}`}
              />
              <ReferenceLine y={bsPrice} stroke={rallyColors.blue} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="binomial" stroke={rallyColors.primary} strokeWidth={2} dot={false} name="binomial" />
              <Line type="monotone" dataKey="bs" stroke={rallyColors.blue} strokeWidth={1.5} dot={false} strokeDasharray="4 4" name="bs" />
            </LineChart>
          </ResponsiveContainer>
        </RallyMainCard>
      )}
    </>
  );
}

