import { useState, useMemo, useCallback } from 'react';
import {
  SimpleGrid,
  NumberInput,
  Slider,
  Button,
  Group,
  Text,
  Box,
  Stack,
  Card,
  Badge,
  Table,
  ActionIcon,
  Tooltip,
  ScrollArea,
} from '@mantine/core';
import {
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  ZAxis,
} from 'recharts';
import {
  IconStarFilled,
  IconDiamond,
  IconCircle,
  IconSquare,
  IconPlus,
  IconTrash,
  IconPlayerPlay,
  IconChartPie,
} from '@tabler/icons-react';
import PageHeader from '../../components/PageHeader';
import RallyMainCard from '../../components/RallyMainCard';
import RallyKPICard from '../../components/RallyKPICard';
import useMarkowitzWorker from '../../hooks/useMarkowitzWorker';
import { covarianceMatrix, correlationMatrix, portfolioStats } from '../../utils/riskMetrics/markowitz';
import { toPersianNum, formatNum } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';
import animStyles from '../../components/shared/animations.module.css';
import {
  GRID_STROKE,
  axisTick,
  TOOLTIP_STYLE,
  barGradientDef,
} from '../../components/charts/shared/chartStyles';

const PIE_COLORS = [
  rallyColors.blue,
  rallyColors.green,
  rallyColors.purple,
  rallyColors.yellow,
  rallyColors.red,
  rallyColors.primary,
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#F97316', // orange
  '#84CC16', // lime
];

const DEFAULT_ASSETS = [
  { name: 'دارایی ۱', expectedReturn: 0.35, risk: 0.30 },
  { name: 'دارایی ۲', expectedReturn: 0.25, risk: 0.20 },
  { name: 'دارایی ۳', expectedReturn: 0.15, risk: 0.15 },
];

/**
 * Generate synthetic daily returns for an asset based on expected return and risk.
 * Used when no historical data is available.
 */
function syntheticReturns(annualReturn, annualVol, days = 252) {
  const dailyMu = annualReturn / 252;
  const dailySigma = annualVol / Math.sqrt(252);
  const returns = [];
  // Use deterministic pseudo-random (seeded by parameters) for reproducibility
  let seed = Math.round((annualReturn + annualVol) * 10000) + 1;
  for (let i = 0; i < days; i++) {
    // Box-Muller using simple LCG
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const u1 = (seed >>> 0) / 4294967296;
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const u2 = (seed >>> 0) / 4294967296;
    const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
    returns.push(dailyMu + dailySigma * z);
  }
  return returns;
}

function CorrelationHeatmap({ corrMatrix, assetNames }) {
  if (!corrMatrix || corrMatrix.length === 0) return null;
  const n = corrMatrix.length;

  const cellColor = (val) => {
    if (val >= 0.7) return 'rgba(34, 197, 94, 0.6)';
    if (val >= 0.3) return 'rgba(34, 197, 94, 0.3)';
    if (val >= -0.3) return 'rgba(156, 163, 175, 0.15)';
    if (val >= -0.7) return 'rgba(239, 68, 68, 0.3)';
    return 'rgba(239, 68, 68, 0.6)';
  };

  return (
    <ScrollArea>
      <Table withTableBorder style={{ minWidth: Math.max(300, n * 80) }}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ textAlign: 'center', minWidth: 60 }}></Table.Th>
            {assetNames.map((name, j) => (
              <Table.Th key={j} style={{ textAlign: 'center', minWidth: 60, fontSize: 11 }}>
                {name}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {corrMatrix.map((row, i) => (
            <Table.Tr key={i}>
              <Table.Td style={{ textAlign: 'center', fontWeight: 600, fontSize: 11 }}>
                {assetNames[i]}
              </Table.Td>
              {row.map((val, j) => (
                <Table.Td
                  key={j}
                  style={{
                    textAlign: 'center',
                    backgroundColor: cellColor(val),
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: 11,
                  }}
                >
                  {toPersianNum(val.toFixed(2))}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}

function PortfolioCard({ title, icon: Icon, iconColor, portfolio, assetNames }) {
  if (!portfolio) return null;
  return (
    <Card
      withBorder
      radius="md"
      p="md"
      style={{ height: '100%', borderInlineStart: `3px solid ${iconColor}` }}
    >
      <Group gap="xs" mb="sm">
        {Icon && <Icon size={16} color={iconColor} />}
        <Text fw={700} size="sm">{title}</Text>
      </Group>
      <SimpleGrid cols={3} spacing="xs" mb="sm">
        <Box>
          <Text size="xs" c="dimmed">بازده</Text>
          <Text size="sm" fw={600} c={portfolio.return >= 0 ? rallyColors.green : rallyColors.red}>
            {toPersianNum((portfolio.return * 100).toFixed(1))}٪
          </Text>
        </Box>
        <Box>
          <Text size="xs" c="dimmed">ریسک</Text>
          <Text size="sm" fw={600}>
            {toPersianNum((portfolio.risk * 100).toFixed(1))}٪
          </Text>
        </Box>
        <Box>
          <Text size="xs" c="dimmed">شارپ</Text>
          <Text size="sm" fw={600} c={rallyColors.purple}>
            {toPersianNum(portfolio.sharpe.toFixed(2))}
          </Text>
        </Box>
      </SimpleGrid>
      {portfolio.weights && portfolio.weights.length <= 10 && (
        <ResponsiveContainer width="100%" height={120}>
          <PieChart>
            <Pie
              data={portfolio.weights.map((w, i) => ({
                name: assetNames[i] || `#${i + 1}`,
                value: Math.max(w, 0),
              }))}
              cx="50%"
              cy="50%"
              innerRadius={25}
              outerRadius={50}
              dataKey="value"
              stroke="none"
            >
              {portfolio.weights.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v) => `${toPersianNum((v * 100).toFixed(1))}٪`}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

export default function PortfolioOptimization() {
  const [assets, setAssets] = useState(DEFAULT_ASSETS);
  const [minWeight, setMinWeight] = useState(0);
  const [maxWeight, setMaxWeight] = useState(1);
  const [rfRate, setRfRate] = useState(23);

  const { result, running, error, run } = useMarkowitzWorker();

  const addAsset = useCallback(() => {
    setAssets((prev) => [
      ...prev,
      { name: `دارایی ${prev.length + 1}`, expectedReturn: 0.20, risk: 0.25 },
    ]);
  }, []);

  const removeAsset = useCallback((idx) => {
    setAssets((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateAsset = useCallback((idx, field, value) => {
    setAssets((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)),
    );
  }, []);

  // Compute covariance and correlation matrices from asset parameters
  const { covMatrix, corrMatrix, expectedReturns, returnSeries } = useMemo(() => {
    if (assets.length < 2) {
      return { covMatrix: [], corrMatrix: [], expectedReturns: [], returnSeries: [] };
    }

    const series = assets.map((a) =>
      syntheticReturns(a.expectedReturn, a.risk),
    );
    const cov = covarianceMatrix(series);
    const corr = correlationMatrix(series);
    const expRets = assets.map((a) => a.expectedReturn);

    return { covMatrix: cov, corrMatrix: corr, expectedReturns: expRets, returnSeries: series };
  }, [assets]);

  const handleRun = useCallback(() => {
    if (expectedReturns.length < 2 || covMatrix.length < 2) return;
    run({
      mode: 'frontier',
      expectedReturns,
      covMatrix,
      constraints: {
        minWeight,
        maxWeight,
        numPortfolios: 100,
        rfRate: rfRate / 100,
      },
    });
  }, [expectedReturns, covMatrix, minWeight, maxWeight, rfRate, run]);

  // Prepare chart data
  const frontierData = useMemo(() => {
    if (!result?.frontier) return [];
    return result.frontier.map((pt) => ({
      risk: +(pt.risk * 100).toFixed(2),
      return: +(pt.return * 100).toFixed(2),
      sharpe: +pt.sharpe.toFixed(3),
    }));
  }, [result]);

  const specialPoints = useMemo(() => {
    if (!result) return [];
    const points = [];
    if (result.maxSharpe) {
      points.push({
        risk: +(result.maxSharpe.risk * 100).toFixed(2),
        return: +(result.maxSharpe.return * 100).toFixed(2),
        label: 'بیشترین شارپ',
        color: rallyColors.yellow,
      });
    }
    if (result.minVariance) {
      points.push({
        risk: +(result.minVariance.risk * 100).toFixed(2),
        return: +(result.minVariance.return * 100).toFixed(2),
        label: 'کمترین ریسک',
        color: rallyColors.blue,
      });
    }
    if (result.equalWeight) {
      points.push({
        risk: +(result.equalWeight.risk * 100).toFixed(2),
        return: +(result.equalWeight.return * 100).toFixed(2),
        label: 'وزن برابر',
        color: rallyColors.green,
      });
    }
    return points;
  }, [result]);

  // Weight comparison data
  const weightCompareData = useMemo(() => {
    if (!result) return [];
    const assetNames = assets.map((a) => a.name);
    return assetNames.map((name, i) => {
      const entry = { name };
      if (result.maxSharpe?.weights) entry['بیشترین شارپ'] = +(result.maxSharpe.weights[i] * 100).toFixed(1);
      if (result.minVariance?.weights) entry['کمترین ریسک'] = +(result.minVariance.weights[i] * 100).toFixed(1);
      if (result.equalWeight?.weights) entry['وزن برابر'] = +(result.equalWeight.weights[i] * 100).toFixed(1);
      return entry;
    });
  }, [result, assets]);

  const assetNames = assets.map((a) => a.name);

  return (
    <>
      <PageHeader title="بهینه‌سازی پرتفوی" />

      {/* Asset Input */}
      <Box className={animStyles.sectionEnter}>
        <RallyMainCard title="دارایی‌ها" mb="md">
          <ScrollArea>
            <Table withTableBorder style={{ minWidth: 500 }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ textAlign: 'center' }}>نام</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>بازده مورد انتظار (سالانه ٪)</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>ریسک (نوسان سالانه ٪)</Table.Th>
                  <Table.Th style={{ textAlign: 'center', width: 50 }}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {assets.map((a, i) => (
                  <Table.Tr key={i}>
                    <Table.Td style={{ textAlign: 'center' }}>
                      <input
                        value={a.name}
                        onChange={(e) => updateAsset(i, 'name', e.target.value)}
                        style={{
                          background: 'transparent',
                          border: `1px solid ${rallyColors.borderStrong}`,
                          borderRadius: 4,
                          color: rallyColors.textPrimary,
                          padding: '4px 8px',
                          textAlign: 'center',
                          width: '100%',
                          maxWidth: 140,
                        }}
                      />
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'center' }}>
                      <NumberInput
                        value={+(a.expectedReturn * 100).toFixed(1)}
                        onChange={(v) => updateAsset(i, 'expectedReturn', (v || 0) / 100)}
                        min={-100}
                        max={500}
                        step={1}
                        decimalScale={1}
                        size="xs"
                        style={{ maxWidth: 100, margin: '0 auto' }}
                      />
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'center' }}>
                      <NumberInput
                        value={+(a.risk * 100).toFixed(1)}
                        onChange={(v) => updateAsset(i, 'risk', (v || 0) / 100)}
                        min={1}
                        max={500}
                        step={1}
                        decimalScale={1}
                        size="xs"
                        style={{ maxWidth: 100, margin: '0 auto' }}
                      />
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'center' }}>
                      <Tooltip label="حذف">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => removeAsset(i)}
                          disabled={assets.length <= 2}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
          <Group mt="sm">
            <Button
              size="xs"
              variant="light"
              color="blue"
              leftSection={<IconPlus size={14} />}
              onClick={addAsset}
            >
              افزودن دارایی
            </Button>
          </Group>
        </RallyMainCard>
      </Box>

      {/* Constraints */}
      <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay1}`}>
        <RallyMainCard title="محدودیت‌ها" mb="md">
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Box>
              <Text size="sm" fw={500} mb={4}>
                حداقل وزن: {toPersianNum((minWeight * 100).toFixed(0))}٪
              </Text>
              <Slider
                value={minWeight}
                onChange={setMinWeight}
                min={0}
                max={0.3}
                step={0.01}
                color="blue"
                marks={[
                  { value: 0, label: '۰٪' },
                  { value: 0.1, label: '۱۰٪' },
                  { value: 0.2, label: '۲۰٪' },
                  { value: 0.3, label: '۳۰٪' },
                ]}
              />
            </Box>
            <Box>
              <Text size="sm" fw={500} mb={4}>
                حداکثر وزن: {toPersianNum((maxWeight * 100).toFixed(0))}٪
              </Text>
              <Slider
                value={maxWeight}
                onChange={setMaxWeight}
                min={0.3}
                max={1}
                step={0.01}
                color="blue"
                marks={[
                  { value: 0.3, label: '۳۰٪' },
                  { value: 0.5, label: '۵۰٪' },
                  { value: 0.7, label: '۷۰٪' },
                  { value: 1.0, label: '۱۰۰٪' },
                ]}
              />
            </Box>
            <Box>
              <NumberInput
                label="نرخ بدون ریسک (٪)"
                value={rfRate}
                onChange={(v) => setRfRate(v ?? 0)}
                min={0}
                max={50}
                step={0.5}
                decimalScale={1}
                size="sm"
              />
            </Box>
          </SimpleGrid>
          <Group mt="md">
            <Button
              leftSection={<IconPlayerPlay size={16} />}
              onClick={handleRun}
              color="blue"
              loading={running}
              disabled={assets.length < 2}
            >
              اجرای بهینه‌سازی
            </Button>
            {error && (
              <Badge color="red" variant="light">{error}</Badge>
            )}
          </Group>
        </RallyMainCard>
      </Box>

      {/* Results */}
      {result && (
        <>
          {/* Efficient Frontier Chart */}
          <Box mb="md" className={`${animStyles.sectionEnter} ${animStyles.sectionDelay2}`}>
            <RallyMainCard title="مرز کارایی (Efficient Frontier)" fullscreenable>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis
                    type="number"
                    dataKey="risk"
                    name="ریسک"
                    tick={axisTick(10)}
                    label={{ value: 'ریسک (٪)', position: 'insideBottom', offset: -15, fontSize: 11, fill: rallyColors.textSecondary }}
                  />
                  <YAxis
                    type="number"
                    dataKey="return"
                    name="بازده"
                    tick={axisTick(10)}
                    label={{ value: 'بازده (٪)', angle: -90, position: 'insideLeft', offset: -5, fontSize: 11, fill: rallyColors.textSecondary }}
                  />
                  <ZAxis range={[30, 30]} />
                  <RechartsTooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value, name) => {
                      const labels = { risk: 'ریسک', return: 'بازده', sharpe: 'شارپ' };
                      if (name === 'sharpe') return [toPersianNum(Number(value).toFixed(3)), labels[name]];
                      return [`${toPersianNum(Number(value).toFixed(1))}٪`, labels[name] || name];
                    }}
                  />
                  <Legend formatter={(v) => {
                    const labels = { 'مرز کارایی': 'مرز کارایی', 'بیشترین شارپ': 'بیشترین شارپ', 'کمترین ریسک': 'کمترین ریسک', 'وزن برابر': 'وزن برابر' };
                    return labels[v] || v;
                  }} />
                  {/* Frontier line */}
                  <Scatter
                    name="مرز کارایی"
                    data={frontierData}
                    fill={rallyColors.primary}
                    line={{ stroke: rallyColors.primary, strokeWidth: 2 }}
                    lineType="joint"
                    shape="circle"
                  />
                  {/* Special points */}
                  {specialPoints.map((pt, idx) => (
                    <Scatter
                      key={idx}
                      name={pt.label}
                      data={[pt]}
                      fill={pt.color}
                    >
                      <Cell fill={pt.color} />
                    </Scatter>
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </RallyMainCard>
          </Box>

          {/* Portfolio Cards */}
          <SimpleGrid
            cols={{ base: 1, sm: 2, lg: 3 }}
            spacing="md"
            mb="md"
            className={`${animStyles.sectionEnter} ${animStyles.sectionDelay2}`}
          >
            <PortfolioCard
              title="بیشترین شارپ"
              icon={IconStarFilled}
              iconColor={rallyColors.yellow}
              portfolio={result.maxSharpe}
              assetNames={assetNames}
            />
            <PortfolioCard
              title="کمترین ریسک"
              icon={IconDiamond}
              iconColor={rallyColors.blue}
              portfolio={result.minVariance}
              assetNames={assetNames}
            />
            <PortfolioCard
              title="وزن برابر"
              icon={IconCircle}
              iconColor={rallyColors.green}
              portfolio={result.equalWeight}
              assetNames={assetNames}
            />
          </SimpleGrid>

          {/* Weight Comparison Bar Chart */}
          {weightCompareData.length > 0 && (
            <Box mb="md" className={`${animStyles.sectionEnter} ${animStyles.sectionDelay2}`}>
              <RallyMainCard title="مقایسه وزن‌ها (٪)" fullscreenable>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weightCompareData} margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                    <defs>
                      {barGradientDef('wYellow', rallyColors.yellow)}
                      {barGradientDef('wBlue', rallyColors.blue)}
                      {barGradientDef('wGreen', rallyColors.green)}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="name" tick={axisTick(10)} />
                    <YAxis tick={axisTick(10)} tickFormatter={(v) => `${v}٪`} />
                    <RechartsTooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v) => `${toPersianNum(Number(v).toFixed(1))}٪`}
                    />
                    <Legend />
                    <Bar dataKey="بیشترین شارپ" fill="url(#wYellow)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="کمترین ریسک" fill="url(#wBlue)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="وزن برابر" fill="url(#wGreen)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </RallyMainCard>
            </Box>
          )}

          {/* Correlation Heatmap */}
          {corrMatrix.length > 0 && (
            <Box mb="md" className={`${animStyles.sectionEnter} ${animStyles.sectionDelay2}`}>
              <RallyMainCard title="ماتریس همبستگی">
                <CorrelationHeatmap corrMatrix={corrMatrix} assetNames={assetNames} />
              </RallyMainCard>
            </Box>
          )}
        </>
      )}
    </>
  );
}
