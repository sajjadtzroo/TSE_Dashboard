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
import RallyMainCard from '../components/RallyMainCard';
import RallyKPICard from '../components/RallyKPICard';
import PageHeader from '../components/PageHeader';
import BinomialTreeChart from '../components/charts/BinomialTreeChart';
import { buildTree, convergenceData } from '../utils/binomialTree';
import { blackScholesPrice, impliedVolatility } from '../utils/blackScholes';
import { formatNum, toPersianNum } from '../utils/formatUtils';
import { computeT } from '../utils/dateUtils';
import rallyColors from '../theme/rallyColors';
import { GRID_STROKE, axisTick, TOOLTIP_STYLE } from '../components/charts/shared/chartStyles';
import { IconBinaryTree, IconChartLine, IconPlugConnected } from '@tabler/icons-react';
import { useOptionsUnderlyings, useOptionsChain } from '../hooks/useMarketData';

export default function OptionsBinomial() {
  const [stockPrice, setStockPrice] = useState(10000);
  const [strikePrice, setStrikePrice] = useState(10000);
  const [daysToExpiry, setDaysToExpiry] = useState(90);
  const [riskFreeRate, setRiskFreeRate] = useState(23);
  const [volatility, setVolatility] = useState(30);
  const [steps, setSteps] = useState(4);
  const [optionType, setOptionType] = useState('call');
  const [style, setStyle] = useState('european');

  // Market data connection
  const [selectedUnderlying, setSelectedUnderlying] = useState(null);
  const [selectedExpiry, setSelectedExpiry] = useState(null);
  const [selectedContractSymbol, setSelectedContractSymbol] = useState(null);

  const { data: underlyings = [] } = useOptionsUnderlyings();
  const { data: chainData } = useOptionsChain(selectedUnderlying);

  const underlyingPrice = chainData?.underlying_info?.close;
  const expiryDates = chainData?.expiry_dates || [];
  const allContracts = chainData?.options || [];
  const filteredContracts = selectedExpiry
    ? allContracts.filter((c) => c.expiry_date === selectedExpiry)
    : allContracts;

  const underlyingSelectData = underlyings
    .filter((u) => u.underlying)
    .map((u) => ({ value: u.underlying, label: `${u.underlying}${u.name_fa ? ` - ${u.name_fa}` : ''}` }));

  const contractSelectData = filteredContracts
    .filter((c) => c.symbol)
    .map((c) => ({
      value: c.symbol,
      label: `${c.symbol} | ${c.option_type === 'call' ? 'خرید' : 'فروش'} | اعمال: ${formatNum(c.strike_price)}`,
    }));

  // Reset expiry/contract when underlying changes
  useEffect(() => {
    setSelectedExpiry(null);
    setSelectedContractSymbol(null);
  }, [selectedUnderlying]);

  // Auto-fill S from underlying close price
  useEffect(() => {
    if (underlyingPrice > 0) setStockPrice(Math.round(underlyingPrice));
  }, [underlyingPrice]);

  // Auto-fill K, T, optionType, and σ when contract is selected
  useEffect(() => {
    if (!selectedContractSymbol) return;
    const contract = allContracts.find((c) => c.symbol === selectedContractSymbol);
    if (!contract) return;

    if (contract.strike_price) setStrikePrice(Math.round(contract.strike_price));

    const days = Math.round(computeT(contract.expiry_date) * 365);
    if (days > 0) setDaysToExpiry(days);

    if (contract.option_type) setOptionType(contract.option_type);

    const S = underlyingPrice || stockPrice;
    const contractT = days / 365;
    const contractR = riskFreeRate / 100;
    const premium = contract.last || contract.close;
    if (S > 0 && contractT > 0 && premium > 0 && contract.strike_price > 0) {
      const iv = impliedVolatility(contract.option_type, premium, S, contract.strike_price, contractT, contractR);
      if (iv && iv > 0.01 && iv < 5) setVolatility(Math.round(iv * 100 * 10) / 10);
    }
  }, [selectedContractSymbol, allContracts]); // eslint-disable-line react-hooks/exhaustive-deps

  const T = daysToExpiry / 365;
  const r = riskFreeRate / 100;
  const sigma = volatility / 100;

  // Build tree for visualization (limited to 6 steps for visual clarity)
  const tree = useMemo(() => {
    if (stockPrice <= 0 || strikePrice <= 0 || T <= 0 || sigma <= 0) return null;
    return buildTree(stockPrice, strikePrice, T, r, sigma, steps, optionType, style);
  }, [stockPrice, strikePrice, T, r, sigma, steps, optionType, style]);

  // BS price for comparison
  const bsPrice = useMemo(() => {
    if (stockPrice <= 0 || strikePrice <= 0 || T <= 0 || sigma <= 0) return null;
    return blackScholesPrice(optionType, stockPrice, strikePrice, T, r, sigma);
  }, [stockPrice, strikePrice, T, r, sigma, optionType]);

  // Convergence chart data (1→50 steps)
  const convData = useMemo(() => {
    if (stockPrice <= 0 || strikePrice <= 0 || T <= 0 || sigma <= 0) return [];
    return convergenceData(stockPrice, strikePrice, T, r, sigma, optionType, style, 50);
  }, [stockPrice, strikePrice, T, r, sigma, optionType, style]);

  const priceDiff = tree && bsPrice != null
    ? Math.abs(tree.optionPrice - bsPrice)
    : null;

  return (
    <>
      <PageHeader title="مدل درخت دوجمله‌ای (Binomial Tree)" />

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
          {selectedUnderlying && allContracts.length > 0 && (
            <Badge color="rally-blue" variant="light" size="lg">
              {formatNum(allContracts.length)} قرارداد
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
        {selectedUnderlying && contractSelectData.length > 0 && (
          <Select
            label="انتخاب قرارداد"
            placeholder="قرارداد..."
            data={contractSelectData}
            value={selectedContractSymbol}
            onChange={setSelectedContractSymbol}
            searchable
            clearable
            size="sm"
            mt="sm"
            style={{ maxWidth: 480 }}
            nothingFoundMessage="قرارداد یافت نشد"
          />
        )}
        <Text size="xs" c="dimmed" mt="xs">
          با انتخاب قرارداد، قیمت سهم، قیمت اعمال، سررسید و نوسان‌پذیری به‌روز می‌شوند.
        </Text>
      </RallyMainCard>

      {/* Parameters */}
      <RallyMainCard mb="md">
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="md">
          <div>
            <NumberInput label="قیمت سهم (S)" value={stockPrice} onChange={(v) => setStockPrice(v || 0)} min={1} step={100} size="sm" />
            <Slider value={stockPrice} onChange={setStockPrice} min={100} max={100000} step={100} mt="xs" size="xs" color="rally-primary" />
          </div>
          <div>
            <NumberInput label="قیمت اعمال (K)" value={strikePrice} onChange={(v) => setStrikePrice(v || 0)} min={1} step={100} size="sm" />
            <Slider value={strikePrice} onChange={setStrikePrice} min={100} max={100000} step={100} mt="xs" size="xs" color="rally-primary" />
          </div>
          <div>
            <NumberInput label="روز تا سررسید" value={daysToExpiry} onChange={(v) => setDaysToExpiry(v || 1)} min={1} max={730} size="sm" />
            <Slider value={daysToExpiry} onChange={setDaysToExpiry} min={1} max={730} mt="xs" size="xs" color="rally-primary" />
          </div>
          <div>
            <NumberInput label="نوسان‌پذیری (٪)" value={volatility} onChange={(v) => setVolatility(v ?? 1)} min={1} max={200} step={1} size="sm" />
            <Slider value={volatility} onChange={setVolatility} min={1} max={200} mt="xs" size="xs" color="rally-primary" />
          </div>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          <div>
            <NumberInput label="نرخ بدون ریسک (٪)" value={riskFreeRate} onChange={(v) => setRiskFreeRate(v ?? 0)} min={0} max={50} step={0.5} decimalScale={1} size="sm" />
          </div>
          <div>
            <Text size="sm" fw={500} mb={4}>تعداد مراحل (n)</Text>
            <Slider value={steps} onChange={setSteps} min={1} max={6} step={1} size="sm" color="rally-primary"
              marks={[{ value: 1, label: '1' }, { value: 3, label: '3' }, { value: 6, label: '6' }]}
            />
          </div>
          <div>
            <Text size="sm" fw={500} mb={4}>نوع اختیار</Text>
            <SegmentedControl
              value={optionType}
              onChange={setOptionType}
              data={[{ value: 'call', label: 'خرید (Call)' }, { value: 'put', label: 'فروش (Put)' }]}
              fullWidth
              size="sm"
            />
          </div>
          <div>
            <Text size="sm" fw={500} mb={4}>سبک اعمال</Text>
            <SegmentedControl
              value={style}
              onChange={setStyle}
              data={[{ value: 'european', label: 'اروپایی' }, { value: 'american', label: 'آمریکایی' }]}
              fullWidth
              size="sm"
            />
          </div>
        </SimpleGrid>
      </RallyMainCard>

      {/* KPI Cards */}
      {tree && (
        <SimpleGrid cols={{ base: 2, md: 4 }} mb="md">
          <RallyKPICard
            title="قیمت دوجمله‌ای"
            value={formatNum(Math.round(tree.optionPrice * 100) / 100)}
            icon={IconBinaryTree}
            color={rallyColors.primary}
            variant="accent-bar"
          />
          <RallyKPICard
            title="قیمت بلک-شولز"
            value={bsPrice != null ? formatNum(Math.round(bsPrice * 100) / 100) : '-'}
            icon={IconChartLine}
            color={rallyColors.blue}
            variant="accent-bar"
          />
          <RallyKPICard
            title="اختلاف"
            value={priceDiff != null ? formatNum(Math.round(priceDiff * 100) / 100) : '-'}
            color={rallyColors.yellow}
            variant="accent-bar"
          />
          <RallyKPICard
            title="احتمال بی‌طرف ریسک (p)"
            value={toPersianNum((tree.p * 100).toFixed(1)) + '٪'}
            subtitle={`u=${tree.u.toFixed(4)}, d=${tree.d.toFixed(4)}`}
            color={rallyColors.purple}
            variant="accent-bar"
          />
        </SimpleGrid>
      )}

      <Stack gap="md">
        {/* Tree Visualization */}
        {tree && (
          <RallyMainCard
            title={
              <Group gap="sm">
                <Text fw={700} size="lg">درخت قیمت‌گذاری</Text>
                {style === 'american' && tree.earlyExerciseNodes.length > 0 && (
                  <Badge color="yellow" variant="light">
                    {toPersianNum(tree.earlyExerciseNodes.length)} نقطه اعمال زودهنگام
                  </Badge>
                )}
              </Group>
            }
          >
            <BinomialTreeChart tree={tree} steps={steps} />
          </RallyMainCard>
        )}

        {/* Convergence Chart */}
        {convData.length > 0 && (
          <RallyMainCard title="همگرایی قیمت (Convergence)" fullscreenable>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={convData} margin={{ top: 10, right: 20, bottom: 20, left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis
                  dataKey="steps"
                  tick={axisTick(10)}
                  label={{ value: 'تعداد مراحل', position: 'insideBottom', offset: -10, fontSize: 11, fill: rallyColors.textSecondary }}
                />
                <YAxis tick={axisTick(10)} tickFormatter={(v) => formatNum(v)} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [formatNum(v), 'قیمت دوجمله‌ای']}
                  labelFormatter={(v) => `${v} مرحله`}
                />
                {bsPrice != null && (
                  <ReferenceLine
                    y={bsPrice}
                    stroke={rallyColors.blue}
                    strokeDasharray="5 5"
                    label={{ value: `BS: ${formatNum(Math.round(bsPrice * 100) / 100)}`, fill: rallyColors.blue, fontSize: 10 }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={rallyColors.primary}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </RallyMainCard>
        )}
      </Stack>
    </>
  );
}
