import { useMemo, useState } from 'react';
import {
  Tabs, Grid, Group, Text, Stack, Alert, Badge, Table, Tooltip as MantineTooltip, Loader, Center,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, Cell, ReferenceLine, LineChart, Line,
} from 'recharts';
import { IconInfoCircle } from '@tabler/icons-react';
import RallyKPICard from './RallyKPICard';
import RallyMainCard from './RallyMainCard';
import rallyColors from '../theme/rallyColors';
import { formatMetric, toPersianNum, formatPercent } from '../utils/formatUtils';
import { GRID_STROKE, axisTick } from './charts/shared/chartStyles';

const TRAFFIC_LIGHT_LABELS = {
  green: { label: 'سبز', color: 'green', tip: 'مدل VaR قابل اعتماد' },
  yellow: { label: 'زرد', color: 'yellow', tip: 'مدل VaR نیاز به بررسی دارد' },
  red: { label: 'قرمز', color: 'red', tip: 'مدل VaR ناکافی — بازنگری لازم' },
};

const METRIC_LABELS = {
  beta: { label: 'بتا (β)', tip: 'حساسیت سهم نسبت به بازار' },
  alpha: { label: 'آلفای جنسن', tip: 'بازده مازاد نسبت به CAPM' },
  sharpe: { label: 'نسبت شارپ', tip: 'بازده تعدیل‌شده با ریسک' },
  treynor: { label: 'نسبت ترینور', tip: 'بازده به ازای ریسک سیستماتیک' },
  rSquared: { label: 'R²', tip: 'ضریب تعیین — تناسب مدل' },
  trackingError: { label: 'خطای ردیابی', tip: 'انحراف عملکرد از شاخص' },
  informationRatio: { label: 'نسبت اطلاعات', tip: 'بازده فعال به ازای ریسک فعال' },
  mSquared: { label: 'M² (مودیلیانی)', tip: 'بازده تعدیل‌شده با ریسک کل — مقایسه مستقیم با شاخص' },
  var95: { label: 'VaR ۹۵٪', tip: 'حداکثر زیان روزانه با اطمینان ۹۵٪' },
  var99: { label: 'VaR ۹۹٪', tip: 'حداکثر زیان روزانه با اطمینان ۹۹٪' },
  cvar95: { label: 'ریزش مورد انتظار', tip: 'میانگین زیان فراتر از VaR' },
  maxDrawdown: { label: 'حداکثر افت', tip: 'بزرگترین کاهش از قله تا دره' },
  calmar: { label: 'نسبت کالمار', tip: 'بازده سالانه تقسیم بر حداکثر افت' },
  sortino: { label: 'نسبت سورتینو', tip: 'بازده به ازای ریسک نزولی' },
  volatility: { label: 'نوسان‌پذیری (σ)', tip: 'انحراف معیار سالانه بازده' },
  downsideDeviation: { label: 'انحراف نزولی', tip: 'انحراف معیار بازده‌های منفی' },
  skewness: { label: 'چولگی', tip: 'عدم تقارن توزیع بازده' },
  kurtosis: { label: 'کشیدگی', tip: 'ریسک دنباله توزیع' },
  coefficientOfVariation: { label: 'ضریب تغییرات', tip: 'نسبت انحراف معیار به میانگین' },
  omega: { label: 'نسبت امگا', tip: 'نسبت سود به زیان' },
  cfVaR95: { label: 'CF-VaR ۹۵٪', tip: 'VaR تعدیل‌شده کورنیش-فیشر (چولگی+کشیدگی)' },
  cfVaR99: { label: 'CF-VaR ۹۹٪', tip: 'VaR تعدیل‌شده کورنیش-فیشر با اطمینان ۹۹٪' },
  tailRatio: { label: 'نسبت دنباله', tip: '|P95 / P5| — تقارن دنباله‌ها' },
  gainToLossRatio: { label: 'سود/زیان', tip: 'میانگین سود تقسیم بر میانگین زیان' },
  hitRate: { label: 'نرخ برد', tip: 'درصد روزهای با بازده مثبت' },
  upsideCapture: { label: 'جذب صعودی', tip: 'مشارکت در روزهای مثبت بازار' },
  downsideCapture: { label: 'جذب نزولی', tip: 'مشارکت در روزهای منفی بازار' },
  captureRatio: { label: 'نسبت جذب', tip: 'جذب صعودی / جذب نزولی — بالای ۱ مطلوب' },
};

function KPI({ metricKey, value, decimals = 2, suffix = '', color }) {
  const meta = METRIC_LABELS[metricKey] || { label: metricKey, tip: '' };
  return (
    <MantineTooltip label={meta.tip} position="top" withArrow>
      <div>
        <RallyKPICard
          title={meta.label}
          value={formatMetric(value, decimals, suffix)}
          variant="accent-bar"
          color={color || rallyColors.blue}
        />
      </div>
    </MantineTooltip>
  );
}

export default function RiskMetricsPanel({ metrics, benchmarkLoading, insufficientData, monteCarloResult, monteCarloRunning, scenarios, varBacktestData }) {
  const [activeTab, setActiveTab] = useState('capm');
  const isMobile = useMediaQuery('(max-width: 48em)');
  const chartMargin = isMobile
    ? { top: 5, right: 10, bottom: 15, left: 10 }
    : { top: 10, right: 20, bottom: 20, left: 20 };
  const chartHeight = isMobile ? 180 : 220;
  const mainChartHeight = isMobile ? 220 : 280;

  if (!metrics) {
    return (
      <RallyMainCard title="تحلیل ریسک و عملکرد" mb="md">
        <Center mih={200}><Text c="dimmed">داده کافی برای محاسبه موجود نیست</Text></Center>
      </RallyMainCard>
    );
  }

  // Scatter plot data for beta regression
  const scatterData = useMemo(() => {
    if (!metrics.alignedStock || !metrics.alignedBench) return [];
    return metrics.alignedStock.map((s, i) => ({
      stock: +(s * 100).toFixed(2),
      bench: +(metrics.alignedBench[i] * 100).toFixed(2),
    }));
  }, [metrics.alignedStock, metrics.alignedBench]);

  // Drawdown chart data
  const ddData = useMemo(() => {
    if (!metrics.drawdownSeries) return [];
    return metrics.drawdownSeries.map((d) => ({
      date: d.date,
      drawdown: +(d.drawdown * 100).toFixed(2),
    }));
  }, [metrics.drawdownSeries]);

  // Return histogram
  const histData = useMemo(() => {
    if (!metrics.stockReturns || !metrics.stockReturns.length) return [];
    const bins = {};
    const binSize = 0.005; // 0.5%
    for (const r of metrics.stockReturns) {
      const binKey = Math.floor(r / binSize) * binSize;
      const label = (binKey * 100).toFixed(1);
      bins[label] = (bins[label] || 0) + 1;
    }
    return Object.entries(bins)
      .map(([k, v]) => ({ bin: k, count: v, value: parseFloat(k) }))
      .sort((a, b) => a.value - b.value);
  }, [metrics.stockReturns]);

  // Monte Carlo fan chart data
  const mcData = useMemo(() => {
    if (!monteCarloResult || !monteCarloResult.percentiles) return [];
    const { percentiles, days } = monteCarloResult;
    const step = Math.max(1, Math.floor(days / 60));
    const data = [];
    for (let t = 0; t <= days; t += step) {
      data.push({
        day: t,
        p5: percentiles.p5[t],
        p25: percentiles.p25[t],
        p50: percentiles.p50[t],
        p75: percentiles.p75[t],
        p95: percentiles.p95[t],
      });
    }
    return data;
  }, [monteCarloResult]);

  return (
    <RallyMainCard
      title="تحلیل ریسک و عملکرد"
      mb="md"
    >
      {insufficientData && (
        <Alert icon={<IconInfoCircle size={16} />} color="yellow" mb="sm" variant="light">
          داده کمتر از ۳۰ روز — نتایج ممکن است دقیق نباشد
        </Alert>
      )}

      <Tabs value={activeTab} onChange={setActiveTab}>
        <div style={{
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          maskImage: 'linear-gradient(to right, black 90%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, black 90%, transparent)',
        }}>
          <Tabs.List mb="md" style={{ flexWrap: 'nowrap' }}>
            <Tabs.Tab value="capm">CAPM و عملکرد</Tabs.Tab>
            <Tabs.Tab value="risk">ریسک</Tabs.Tab>
            <Tabs.Tab value="tail">ریسک دنباله و جذب</Tabs.Tab>
            <Tabs.Tab value="backtest">بک‌تست VaR</Tabs.Tab>
            <Tabs.Tab value="distribution">توزیع بازده</Tabs.Tab>
            <Tabs.Tab value="simulation">شبیه‌سازی</Tabs.Tab>
          </Tabs.List>
        </div>

        {/* Tab 1: CAPM & Performance */}
        <Tabs.Panel value="capm">
          <Grid gutter="sm" mb="md">
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <KPI metricKey="beta" value={metrics.beta} color={rallyColors.purple} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <KPI metricKey="alpha" value={metrics.alpha} decimals={4} color={rallyColors.green} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <KPI metricKey="sharpe" value={metrics.sharpe} color={rallyColors.blue} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <KPI metricKey="treynor" value={metrics.treynor} decimals={4} color={rallyColors.yellow} />
            </Grid.Col>
          </Grid>
          <Grid gutter="sm" mb="md">
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <KPI metricKey="rSquared" value={metrics.rSquared} color={rallyColors.purple} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <KPI metricKey="trackingError" value={metrics.trackingError} decimals={4} color={rallyColors.blue} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <KPI metricKey="informationRatio" value={metrics.informationRatio} color={rallyColors.green} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <KPI metricKey="mSquared" value={metrics.mSquared != null ? metrics.mSquared * 100 : null} decimals={2} suffix="٪" color={rallyColors.yellow} />
            </Grid.Col>
          </Grid>

          {scatterData.length > 0 && (
            <div>
              <Text size="sm" fw={600} mb="xs">پراکندگی بازده سهم در مقابل شاخص (%)</Text>
              <ResponsiveContainer width="100%" height={mainChartHeight}>
                <ScatterChart margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis type="number" dataKey="bench" name="شاخص" tick={axisTick(10)} />
                  <YAxis type="number" dataKey="stock" name="سهم" tick={axisTick(10)} />
                  <Tooltip
                    formatter={(val) => toPersianNum(val.toFixed(2)) + '٪'}
                    contentStyle={{ background: rallyColors.elevated, border: `1px solid ${rallyColors.border}`, borderRadius: 4, fontSize: 11 }}
                    labelStyle={{ color: rallyColors.textSecondary }}
                  />
                  <Scatter data={scatterData} fill={rallyColors.blue} fillOpacity={0.5} r={3} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </Tabs.Panel>

        {/* Tab 2: Risk */}
        <Tabs.Panel value="risk">
          <Grid gutter="sm" mb="md">
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <KPI metricKey="var95" value={metrics.var95 != null ? metrics.var95 * 100 : null} decimals={2} suffix="٪" color={rallyColors.red} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <KPI metricKey="var99" value={metrics.var99 != null ? metrics.var99 * 100 : null} decimals={2} suffix="٪" color={rallyColors.red} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <KPI metricKey="cvar95" value={metrics.cvar95 != null ? metrics.cvar95 * 100 : null} decimals={2} suffix="٪" color={rallyColors.red} />
            </Grid.Col>
          </Grid>
          <Grid gutter="sm" mb="md">
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <KPI metricKey="cfVaR95" value={metrics.cfVaR95 != null ? metrics.cfVaR95 * 100 : null} decimals={2} suffix="٪" color={rallyColors.purple} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <KPI metricKey="cfVaR99" value={metrics.cfVaR99 != null ? metrics.cfVaR99 * 100 : null} decimals={2} suffix="٪" color={rallyColors.purple} />
            </Grid.Col>
          </Grid>
          <Grid gutter="sm" mb="md">
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <KPI metricKey="maxDrawdown" value={metrics.maxDrawdown ? metrics.maxDrawdown * 100 : null} decimals={2} suffix="٪" color={rallyColors.red} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <KPI metricKey="calmar" value={metrics.calmar} color={rallyColors.yellow} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <KPI metricKey="sortino" value={metrics.sortino} color={rallyColors.green} />
            </Grid.Col>
          </Grid>

          {ddData.length > 0 && (
            <div>
              <Text size="sm" fw={600} mb="xs">نمودار افت سرمایه (%)</Text>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <AreaChart data={ddData} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="date" tick={axisTick(9)} tickCount={6} />
                  <YAxis tick={axisTick(10)} />
                  <Tooltip
                    formatter={(val) => toPersianNum(val.toFixed(2)) + '٪'}
                    contentStyle={{ background: rallyColors.elevated, border: `1px solid ${rallyColors.border}`, borderRadius: 4, fontSize: 11 }}
                  />
                  <Area type="monotone" dataKey="drawdown" stroke={rallyColors.red} fill={rallyColors.red} fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Tabs.Panel>

        {/* Tab 3: Tail Risk & Capture */}
        <Tabs.Panel value="tail">
          <Grid gutter="sm" mb="md">
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <KPI metricKey="tailRatio" value={metrics.tailRatio} color={rallyColors.purple} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <KPI metricKey="gainToLossRatio" value={metrics.gainToLossRatio} color={rallyColors.green} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <KPI metricKey="hitRate" value={metrics.hitRate != null ? metrics.hitRate * 100 : null} decimals={1} suffix="٪" color={rallyColors.blue} />
            </Grid.Col>
          </Grid>
          <Grid gutter="sm" mb="md">
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <KPI metricKey="upsideCapture" value={metrics.upsideCapture} decimals={1} suffix="٪" color={rallyColors.green} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <KPI metricKey="downsideCapture" value={metrics.downsideCapture} decimals={1} suffix="٪" color={rallyColors.red} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <KPI metricKey="captureRatio" value={metrics.captureRatio} color={rallyColors.yellow} />
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        {/* Tab 4: VaR Backtesting */}
        <Tabs.Panel value="backtest">
          {!varBacktestData ? (
            <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
              حداقل ۲۵۰ روز داده لازم است
            </Alert>
          ) : (
            <>
              <Grid gutter="sm" mb="md">
                <Grid.Col span={{ base: 6, sm: 3 }}>
                  <RallyKPICard
                    title="تعداد نقض"
                    value={toPersianNum(varBacktestData.violations)}
                    variant="accent-bar"
                    color={rallyColors.red}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 6, sm: 3 }}>
                  <RallyKPICard
                    title="نرخ نقض"
                    value={formatMetric(varBacktestData.violationRate * 100, 2, '٪')}
                    variant="accent-bar"
                    color={rallyColors.yellow}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 6, sm: 3 }}>
                  <MantineTooltip label={TRAFFIC_LIGHT_LABELS[varBacktestData.trafficLight]?.tip || ''} position="top" withArrow>
                    <div>
                      <RallyKPICard
                        title="چراغ راهنمای بازل"
                        value={TRAFFIC_LIGHT_LABELS[varBacktestData.trafficLight]?.label || '-'}
                        variant="accent-bar"
                        color={TRAFFIC_LIGHT_LABELS[varBacktestData.trafficLight]?.color === 'green' ? rallyColors.green : TRAFFIC_LIGHT_LABELS[varBacktestData.trafficLight]?.color === 'yellow' ? rallyColors.yellow : rallyColors.red}
                      />
                    </div>
                  </MantineTooltip>
                </Grid.Col>
                <Grid.Col span={{ base: 6, sm: 3 }}>
                  <MantineTooltip label={varBacktestData.kupiec?.reject ? 'مدل رد شد (LR > ۳.۸۴۱)' : 'مدل رد نشد'} position="top" withArrow>
                    <div>
                      <RallyKPICard
                        title="آزمون Kupiec"
                        value={varBacktestData.kupiec ? (varBacktestData.kupiec.reject ? 'رد' : 'تأیید') : 'N/A'}
                        variant="accent-bar"
                        color={varBacktestData.kupiec?.reject ? rallyColors.red : rallyColors.green}
                      />
                    </div>
                  </MantineTooltip>
                </Grid.Col>
              </Grid>

              {varBacktestData.series?.length > 0 && (
                <div>
                  <Text size="sm" fw={600} mb="xs">بازده واقعی در مقابل آستانه VaR (%)</Text>
                  <ResponsiveContainer width="100%" height={mainChartHeight}>
                    <LineChart data={varBacktestData.series} margin={chartMargin}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                      <XAxis dataKey="date" tick={axisTick(9)} tickCount={6} />
                      <YAxis tick={axisTick(10)} />
                      <Tooltip
                        formatter={(val) => toPersianNum(val.toFixed(2)) + '٪'}
                        contentStyle={{ background: rallyColors.elevated, border: `1px solid ${rallyColors.border}`, borderRadius: 4, fontSize: 11 }}
                      />
                      <Line type="monotone" dataKey="varThreshold" stroke={rallyColors.yellow} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="آستانه VaR" />
                      <Line
                        type="monotone"
                        dataKey="actualReturn"
                        stroke={rallyColors.blue}
                        strokeWidth={1}
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          if (!payload.isViolation) return null;
                          return <circle cx={cx} cy={cy} r={3} fill={rallyColors.red} stroke="none" />;
                        }}
                        name="بازده واقعی"
                      />
                      <ReferenceLine y={0} stroke={rallyColors.textDimmed} strokeDasharray="2 2" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </Tabs.Panel>

        {/* Tab 5: Distribution */}
        <Tabs.Panel value="distribution">
          <Grid gutter="sm" mb="md">
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <KPI metricKey="volatility" value={metrics.volatility ? metrics.volatility * 100 : null} decimals={2} suffix="٪" color={rallyColors.yellow} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <KPI metricKey="downsideDeviation" value={metrics.downsideDeviation ? metrics.downsideDeviation * 100 : null} decimals={2} suffix="٪" color={rallyColors.red} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <KPI metricKey="coefficientOfVariation" value={metrics.coefficientOfVariation} color={rallyColors.purple} />
            </Grid.Col>
          </Grid>
          <Grid gutter="sm" mb="md">
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <KPI metricKey="skewness" value={metrics.skewness} color={rallyColors.blue} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <KPI metricKey="kurtosis" value={metrics.kurtosis} color={rallyColors.purple} />
            </Grid.Col>
          </Grid>

          {histData.length > 0 && (
            <div>
              <Text size="sm" fw={600} mb="xs">هیستوگرام بازده روزانه (%)</Text>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={histData} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="bin" tick={axisTick(9)} />
                  <YAxis tick={axisTick(10)} />
                  <Tooltip
                    contentStyle={{ background: rallyColors.elevated, border: `1px solid ${rallyColors.border}`, borderRadius: 4, fontSize: 11 }}
                  />
                  {metrics.var95 != null && (
                    <ReferenceLine x={((-metrics.var95) * 100).toFixed(1)} stroke={rallyColors.red} strokeDasharray="4 4" label={{ value: 'VaR', fill: rallyColors.red, fontSize: 10 }} />
                  )}
                  <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                    {histData.map((entry, i) => (
                      <Cell key={i} fill={entry.value >= 0 ? rallyColors.green : rallyColors.red} fillOpacity={0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Tabs.Panel>

        {/* Tab 4: Simulation */}
        <Tabs.Panel value="simulation">
          {monteCarloRunning && (
            <Center mih={100}><Loader color="rally-green" size="sm" /><Text c="dimmed" ml="xs">شبیه‌سازی...</Text></Center>
          )}

          {mcData.length > 0 && (
            <div>
              <Text size="sm" fw={600} mb="xs">شبیه‌سازی مونت‌کارلو — نمودار بادبزنی (۱۰۰۰ مسیر)</Text>
              <ResponsiveContainer width="100%" height={mainChartHeight}>
                <AreaChart data={mcData} margin={isMobile ? { top: 5, right: 10, bottom: 15, left: 20 } : { top: 10, right: 20, bottom: 20, left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="day" tick={axisTick(10)} label={{ value: 'روز', position: 'insideBottom', offset: -10, fill: rallyColors.textSecondary, fontSize: 10 }} />
                  <YAxis tick={axisTick(10)} tickFormatter={(v) => v.toLocaleString()} />
                  <Tooltip
                    formatter={(val) => toPersianNum(Math.round(val).toLocaleString())}
                    contentStyle={{ background: rallyColors.elevated, border: `1px solid ${rallyColors.border}`, borderRadius: 4, fontSize: 11 }}
                  />
                  <Area type="monotone" dataKey="p95" stroke="transparent" fill={rallyColors.green} fillOpacity={0.08} />
                  <Area type="monotone" dataKey="p75" stroke="transparent" fill={rallyColors.green} fillOpacity={0.12} />
                  <Line type="monotone" dataKey="p50" stroke={rallyColors.green} strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="p25" stroke="transparent" fill={rallyColors.green} fillOpacity={0.12} />
                  <Area type="monotone" dataKey="p5" stroke="transparent" fill={rallyColors.green} fillOpacity={0.08} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {monteCarloResult && (
            <Grid gutter="sm" mt="md" mb="md">
              <Grid.Col span={{ base: 6, sm: 4 }}>
                <RallyKPICard
                  title="احتمال سود"
                  value={formatMetric(monteCarloResult.probProfit * 100, 1, '٪')}
                  variant="accent-bar"
                  color={rallyColors.green}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 6, sm: 4 }}>
                <RallyKPICard
                  title="بازده مورد انتظار"
                  value={formatMetric(monteCarloResult.expectedReturn * 100, 1, '٪')}
                  variant="accent-bar"
                  color={rallyColors.blue}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 6, sm: 4 }}>
                <KPI metricKey="omega" value={metrics.omega} color={rallyColors.yellow} />
              </Grid.Col>
            </Grid>
          )}

          {scenarios && scenarios.length > 0 && (
            <div>
              <Text size="sm" fw={600} mb="xs">تحلیل سناریو (بر اساس بتا)</Text>
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <Table striped highlightOnHover withTableBorder={false} style={{ fontSize: '0.85rem', minWidth: 360 }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>سناریو</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>حرکت بازار</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>حرکت سهم</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>قیمت هدف</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {scenarios.map((s, i) => (
                    <Table.Tr key={i} style={{ color: s.returnPct >= 0 ? rallyColors.green : rallyColors.red }}>
                      <Table.Td>{s.name}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>{formatPercent(s.marketMove * 100)}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>{formatPercent(s.stockMove * 100)}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>{toPersianNum(Math.round(s.targetPrice).toLocaleString())}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              </div>
            </div>
          )}
        </Tabs.Panel>
      </Tabs>
    </RallyMainCard>
  );
}
