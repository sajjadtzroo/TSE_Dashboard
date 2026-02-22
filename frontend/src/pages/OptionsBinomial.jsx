import { useState, useMemo } from 'react';
import {
  SimpleGrid,
  NumberInput,
  Slider,
  SegmentedControl,
  Group,
  Text,
  Badge,
  Stack,
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
import { blackScholesPrice } from '../utils/blackScholes';
import { formatNum, toPersianNum } from '../utils/formatUtils';
import rallyColors from '../theme/rallyColors';
import { GRID_STROKE, axisTick, TOOLTIP_STYLE } from '../components/charts/shared/chartStyles';
import { IconBinaryTree, IconChartLine } from '@tabler/icons-react';

export default function OptionsBinomial() {
  const [stockPrice, setStockPrice] = useState(10000);
  const [strikePrice, setStrikePrice] = useState(10000);
  const [daysToExpiry, setDaysToExpiry] = useState(90);
  const [riskFreeRate, setRiskFreeRate] = useState(23);
  const [volatility, setVolatility] = useState(30);
  const [steps, setSteps] = useState(4);
  const [optionType, setOptionType] = useState('call');
  const [style, setStyle] = useState('european');

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

      {/* Parameters */}
      <RallyMainCard mb="md">
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="md">
          <div>
            <NumberInput label="قیمت سهم (S)" value={stockPrice} onChange={(v) => setStockPrice(v || 0)} min={1} step={100} size="sm" />
            <Slider value={stockPrice} onChange={setStockPrice} min={100} max={100000} step={100} mt="xs" size="xs" color="rally-green" />
          </div>
          <div>
            <NumberInput label="قیمت اعمال (K)" value={strikePrice} onChange={(v) => setStrikePrice(v || 0)} min={1} step={100} size="sm" />
            <Slider value={strikePrice} onChange={setStrikePrice} min={100} max={100000} step={100} mt="xs" size="xs" color="rally-green" />
          </div>
          <div>
            <NumberInput label="روز تا سررسید" value={daysToExpiry} onChange={(v) => setDaysToExpiry(v || 1)} min={1} max={730} size="sm" />
            <Slider value={daysToExpiry} onChange={setDaysToExpiry} min={1} max={730} mt="xs" size="xs" color="rally-green" />
          </div>
          <div>
            <NumberInput label="نوسان‌پذیری (٪)" value={volatility} onChange={(v) => setVolatility(v ?? 1)} min={1} max={200} step={1} size="sm" />
            <Slider value={volatility} onChange={setVolatility} min={1} max={200} mt="xs" size="xs" color="rally-green" />
          </div>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          <div>
            <NumberInput label="نرخ بدون ریسک (٪)" value={riskFreeRate} onChange={(v) => setRiskFreeRate(v ?? 0)} min={0} max={50} step={0.5} decimalScale={1} size="sm" />
          </div>
          <div>
            <Text size="sm" fw={500} mb={4}>تعداد مراحل (n)</Text>
            <Slider value={steps} onChange={setSteps} min={1} max={6} step={1} size="sm" color="rally-green"
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
            color={rallyColors.green}
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
                  stroke={rallyColors.green}
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
