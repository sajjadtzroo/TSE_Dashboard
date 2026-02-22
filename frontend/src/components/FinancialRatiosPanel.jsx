import { useMemo, useState } from 'react';
import {
  Tabs, Grid, Group, Text, Center, Badge, Stack, Table,
  Tooltip as MantineTooltip,
} from '@mantine/core';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine,
} from 'recharts';
import RallyKPICard from './RallyKPICard';
import RallyMainCard from './RallyMainCard';
import rallyColors from '../theme/rallyColors';
import { formatMetric, toPersianNum, formatPercent } from '../utils/formatUtils';
import { RATIO_LABELS } from '../utils/financialRatios';
import { GRID_STROKE, axisTick } from './charts/shared/chartStyles';

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtRatio(value, format, decimals = 2) {
  if (value == null || !isFinite(value)) return 'N/A';
  switch (format) {
    case 'pct':
      return toPersianNum((value * 100).toFixed(decimals)) + '٪';
    case 'x':
      return toPersianNum(value.toFixed(decimals)) + 'x';
    case 'day':
      return toPersianNum(Math.round(value).toString()) + ' روز';
    case 'num':
      return toPersianNum(Math.round(value).toLocaleString());
    default:
      return toPersianNum(value.toFixed(decimals));
  }
}

function RatioKPI({ metricKey, value, color }) {
  const meta = RATIO_LABELS[metricKey] || { label: metricKey, tip: '', format: 'x' };
  return (
    <MantineTooltip label={meta.tip} position="top" withArrow>
      <div>
        <RallyKPICard
          title={meta.label}
          value={fmtRatio(value, meta.format)}
          variant="accent-bar"
          color={color || rallyColors.blue}
        />
      </div>
    </MantineTooltip>
  );
}

// ── Tooltip for charts ──────────────────────────────────────────────────

const chartTooltipStyle = {
  background: rallyColors.elevated,
  border: `1px solid ${rallyColors.border}`,
  borderRadius: 4,
  fontSize: 11,
};

// ── Time-series chart for a set of ratio keys ──────────────────────────

function RatioTrendChart({ timeSeries, ratioKeys, category, colors, height = 200, asPct = false }) {
  const data = useMemo(() => {
    return timeSeries.map((period) => {
      const point = { period: period.period || '' };
      for (const key of ratioKeys) {
        const val = period[category]?.[key];
        point[key] = val != null ? (asPct ? val * 100 : val) : null;
      }
      return point;
    });
  }, [timeSeries, ratioKeys, category, asPct]);

  if (data.length < 2) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey="period" tick={axisTick(9)} />
        <YAxis tick={axisTick(10)} />
        <Tooltip
          contentStyle={chartTooltipStyle}
          labelStyle={{ color: rallyColors.textSecondary }}
          formatter={(val, name) => {
            const meta = RATIO_LABELS[name];
            const label = meta?.label || name;
            const formatted = asPct
              ? toPersianNum(val?.toFixed(2)) + '٪'
              : toPersianNum(val?.toFixed(2));
            return [formatted, label];
          }}
        />
        {ratioKeys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[i % colors.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── DuPont Waterfall ────────────────────────────────────────────────────

function DuPontWaterfall({ dupont }) {
  const { threeFactor } = dupont;
  if (!threeFactor || threeFactor.roe == null) return null;

  const factors = [
    { name: 'حاشیه سود', value: threeFactor.netMargin, color: rallyColors.green },
    { name: 'گردش دارایی', value: threeFactor.assetTurnover, color: rallyColors.blue },
    { name: 'اهرم مالی', value: threeFactor.leverage, color: rallyColors.purple },
    { name: 'ROE', value: threeFactor.roe, color: rallyColors.yellow },
  ];

  return (
    <Table striped highlightOnHover withTableBorder={false} style={{ fontSize: '0.85rem' }}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>عامل</Table.Th>
          <Table.Th style={{ textAlign: 'right' }}>مقدار</Table.Th>
          <Table.Th style={{ textAlign: 'right' }}>فرمول</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        <Table.Tr>
          <Table.Td>حاشیه سود خالص</Table.Td>
          <Table.Td style={{ textAlign: 'right', color: rallyColors.green }}>
            {fmtRatio(threeFactor.netMargin, 'pct')}
          </Table.Td>
          <Table.Td style={{ textAlign: 'right', color: rallyColors.textDimmed, fontSize: '0.75rem' }}>
            سود خالص / درآمد
          </Table.Td>
        </Table.Tr>
        <Table.Tr>
          <Table.Td style={{ textAlign: 'center', color: rallyColors.textDimmed }}>x</Table.Td>
          <Table.Td />
          <Table.Td />
        </Table.Tr>
        <Table.Tr>
          <Table.Td>گردش دارایی</Table.Td>
          <Table.Td style={{ textAlign: 'right', color: rallyColors.blue }}>
            {fmtRatio(threeFactor.assetTurnover, 'x')}
          </Table.Td>
          <Table.Td style={{ textAlign: 'right', color: rallyColors.textDimmed, fontSize: '0.75rem' }}>
            درآمد / کل دارایی
          </Table.Td>
        </Table.Tr>
        <Table.Tr>
          <Table.Td style={{ textAlign: 'center', color: rallyColors.textDimmed }}>x</Table.Td>
          <Table.Td />
          <Table.Td />
        </Table.Tr>
        <Table.Tr>
          <Table.Td>اهرم مالی</Table.Td>
          <Table.Td style={{ textAlign: 'right', color: rallyColors.purple }}>
            {fmtRatio(threeFactor.leverage, 'x')}
          </Table.Td>
          <Table.Td style={{ textAlign: 'right', color: rallyColors.textDimmed, fontSize: '0.75rem' }}>
            کل دارایی / حقوق صاحبان سهام
          </Table.Td>
        </Table.Tr>
        <Table.Tr>
          <Table.Td style={{ textAlign: 'center', color: rallyColors.textDimmed }}>=</Table.Td>
          <Table.Td />
          <Table.Td />
        </Table.Tr>
        <Table.Tr style={{ fontWeight: 700 }}>
          <Table.Td>ROE (بازده حقوق صاحبان سهام)</Table.Td>
          <Table.Td style={{ textAlign: 'right', color: rallyColors.yellow }}>
            {fmtRatio(threeFactor.roe, 'pct')}
          </Table.Td>
          <Table.Td style={{ textAlign: 'right', color: rallyColors.textDimmed, fontSize: '0.75rem' }}>
            حاشیه × گردش × اهرم
          </Table.Td>
        </Table.Tr>
      </Table.Tbody>
    </Table>
  );
}

function DuPontFiveFactor({ dupont }) {
  const { fiveFactor } = dupont;
  if (!fiveFactor || fiveFactor.roe == null) return null;

  const rows = [
    { label: 'بار مالیاتی', value: fiveFactor.taxBurden, format: 'pct', formula: 'سود خالص / سود قبل از مالیات', color: rallyColors.green },
    { label: 'بار بهره', value: fiveFactor.interestBurden, format: 'pct', formula: 'سود قبل از مالیات / سود عملیاتی', color: rallyColors.blue },
    { label: 'حاشیه EBIT', value: fiveFactor.ebitMargin, format: 'pct', formula: 'سود عملیاتی / درآمد', color: rallyColors.purple },
    { label: 'گردش دارایی', value: fiveFactor.assetTurnover, format: 'x', formula: 'درآمد / کل دارایی', color: rallyColors.yellow },
    { label: 'اهرم مالی', value: fiveFactor.leverage, format: 'x', formula: 'کل دارایی / حقوق صاحبان سهام', color: rallyColors.red },
  ];

  return (
    <Table striped highlightOnHover withTableBorder={false} style={{ fontSize: '0.85rem' }}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>عامل</Table.Th>
          <Table.Th style={{ textAlign: 'right' }}>مقدار</Table.Th>
          <Table.Th style={{ textAlign: 'right' }}>فرمول</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((r, i) => (
          <Table.Tr key={i}>
            <Table.Td>{r.label}</Table.Td>
            <Table.Td style={{ textAlign: 'right', color: r.color }}>
              {fmtRatio(r.value, r.format)}
            </Table.Td>
            <Table.Td style={{ textAlign: 'right', color: rallyColors.textDimmed, fontSize: '0.75rem' }}>
              {r.formula}
            </Table.Td>
          </Table.Tr>
        ))}
        <Table.Tr style={{ fontWeight: 700 }}>
          <Table.Td>ROE</Table.Td>
          <Table.Td style={{ textAlign: 'right', color: rallyColors.yellow }}>
            {fmtRatio(fiveFactor.roe, 'pct')}
          </Table.Td>
          <Table.Td style={{ textAlign: 'right', color: rallyColors.textDimmed, fontSize: '0.75rem' }}>
            حاصل‌ضرب ۵ عامل
          </Table.Td>
        </Table.Tr>
      </Table.Tbody>
    </Table>
  );
}

// ── Main Panel Component ────────────────────────────────────────────────

export default function FinancialRatiosPanel({ ratioTimeSeries, loading }) {
  const [activeTab, setActiveTab] = useState('profitability');

  if (loading) {
    return (
      <RallyMainCard title="تحلیل نسبت‌های مالی (CFA)" mb="md">
        <Center mih={200}><Text c="dimmed">در حال بارگذاری...</Text></Center>
      </RallyMainCard>
    );
  }

  if (!ratioTimeSeries || ratioTimeSeries.length === 0) {
    return null; // No financial data available — don't show panel
  }

  // Latest period ratios
  const latest = ratioTimeSeries[ratioTimeSeries.length - 1];
  const { profitability, solvency, liquidity, efficiency, valuation, dupont, cashFlow } = latest;

  return (
    <RallyMainCard title="تحلیل نسبت‌های مالی (CFA)" mb="md">
      {latest.isAudited && (
        <Badge color="rally-green" variant="light" size="sm" mb="sm">حسابرسی شده</Badge>
      )}
      {latest.period && (
        <Text size="xs" c="dimmed" mb="sm">
          آخرین دوره: {toPersianNum(latest.period)}
          {latest.periodMonths && ` (${toPersianNum(latest.periodMonths)} ماهه)`}
        </Text>
      )}

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="md">
          <Tabs.Tab value="profitability">سودآوری</Tabs.Tab>
          <Tabs.Tab value="solvency">اهرم و نقدینگی</Tabs.Tab>
          <Tabs.Tab value="efficiency">کارایی و ارزش‌گذاری</Tabs.Tab>
          <Tabs.Tab value="dupont">تحلیل دوپونت</Tabs.Tab>
          <Tabs.Tab value="cashflow">جریان نقدی</Tabs.Tab>
        </Tabs.List>

        {/* Tab 1: Profitability */}
        <Tabs.Panel value="profitability">
          <Grid gutter="sm" mb="md">
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <RatioKPI metricKey="grossMargin" value={profitability.grossMargin} color={rallyColors.green} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <RatioKPI metricKey="operatingMargin" value={profitability.operatingMargin} color={rallyColors.blue} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <RatioKPI metricKey="netMargin" value={profitability.netMargin} color={rallyColors.purple} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <RatioKPI metricKey="ebitdaMargin" value={profitability.ebitdaMargin} color={rallyColors.yellow} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <RatioKPI metricKey="pretaxMargin" value={profitability.pretaxMargin} color={rallyColors.red} />
            </Grid.Col>
          </Grid>
          <Grid gutter="sm" mb="md">
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <RatioKPI metricKey="roe" value={profitability.roe} color={rallyColors.green} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <RatioKPI metricKey="roa" value={profitability.roa} color={rallyColors.blue} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <RatioKPI metricKey="roic" value={profitability.roic} color={rallyColors.purple} />
            </Grid.Col>
          </Grid>

          {ratioTimeSeries.length > 1 && (
            <div>
              <Text size="sm" fw={600} mb="xs">روند حاشیه سود (%)</Text>
              <RatioTrendChart
                timeSeries={ratioTimeSeries}
                ratioKeys={['grossMargin', 'operatingMargin', 'netMargin']}
                category="profitability"
                colors={[rallyColors.green, rallyColors.blue, rallyColors.purple]}
                asPct
              />
            </div>
          )}

          {ratioTimeSeries.length > 1 && (
            <div style={{ marginTop: 16 }}>
              <Text size="sm" fw={600} mb="xs">روند بازده (ROE، ROA) (%)</Text>
              <RatioTrendChart
                timeSeries={ratioTimeSeries}
                ratioKeys={['roe', 'roa']}
                category="profitability"
                colors={[rallyColors.green, rallyColors.blue]}
                asPct
              />
            </div>
          )}
        </Tabs.Panel>

        {/* Tab 2: Solvency & Liquidity */}
        <Tabs.Panel value="solvency">
          <Text size="sm" fw={600} mb="sm" c="dimmed">نسبت‌های اهرمی</Text>
          <Grid gutter="sm" mb="md">
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <RatioKPI metricKey="debtToEquity" value={solvency.debtToEquity} color={rallyColors.red} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <RatioKPI metricKey="debtToAssets" value={solvency.debtToAssets} color={rallyColors.yellow} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <RatioKPI metricKey="financialLeverage" value={solvency.financialLeverage} color={rallyColors.purple} />
            </Grid.Col>
          </Grid>
          <Grid gutter="sm" mb="md">
            <Grid.Col span={{ base: 6, sm: 6 }}>
              <RatioKPI metricKey="equityRatio" value={solvency.equityRatio} color={rallyColors.green} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 6 }}>
              <RatioKPI metricKey="interestCoverage" value={solvency.interestCoverage} color={rallyColors.blue} />
            </Grid.Col>
          </Grid>
          <Grid gutter="sm" mb="md">
            <Grid.Col span={{ base: 6, sm: 6 }}>
              <RatioKPI metricKey="debtToCapital" value={solvency.debtToCapital} color={rallyColors.red} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 6 }}>
              <RatioKPI metricKey="fixedChargeCoverage" value={solvency.fixedChargeCoverage} color={rallyColors.yellow} />
            </Grid.Col>
          </Grid>

          <Text size="sm" fw={600} mb="sm" mt="md" c="dimmed">نسبت‌های نقدینگی</Text>
          <Grid gutter="sm" mb="md">
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <RatioKPI metricKey="currentRatio" value={liquidity.currentRatio} color={rallyColors.green} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <RatioKPI metricKey="quickRatio" value={liquidity.quickRatio} color={rallyColors.blue} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <RatioKPI metricKey="cashRatio" value={liquidity.cashRatio} color={rallyColors.purple} />
            </Grid.Col>
          </Grid>
          <Grid gutter="sm" mb="md">
            <Grid.Col span={{ base: 6, sm: 6 }}>
              <RatioKPI metricKey="defensiveInterval" value={liquidity.defensiveInterval} color={rallyColors.yellow} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 6 }}>
              <RatioKPI metricKey="cashConversionCycle" value={liquidity.cashConversionCycle} color={rallyColors.red} />
            </Grid.Col>
          </Grid>

          {ratioTimeSeries.length > 1 && (
            <div>
              <Text size="sm" fw={600} mb="xs">روند نسبت بدهی به حقوق صاحبان سهام</Text>
              <RatioTrendChart
                timeSeries={ratioTimeSeries}
                ratioKeys={['debtToEquity', 'financialLeverage']}
                category="solvency"
                colors={[rallyColors.red, rallyColors.purple]}
              />
            </div>
          )}
        </Tabs.Panel>

        {/* Tab 3: Efficiency & Valuation */}
        <Tabs.Panel value="efficiency">
          <Text size="sm" fw={600} mb="sm" c="dimmed">نسبت‌های کارایی</Text>
          <Grid gutter="sm" mb="md">
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <RatioKPI metricKey="assetTurnover" value={efficiency.assetTurnover} color={rallyColors.blue} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <RatioKPI metricKey="inventoryTurnover" value={efficiency.inventoryTurnover} color={rallyColors.green} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <RatioKPI metricKey="receivablesTurnover" value={efficiency.receivablesTurnover} color={rallyColors.purple} />
            </Grid.Col>
          </Grid>
          <Grid gutter="sm" mb="md">
            <Grid.Col span={{ base: 6, sm: 6 }}>
              <RatioKPI metricKey="daysInventory" value={efficiency.daysInventory} color={rallyColors.yellow} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 6 }}>
              <RatioKPI metricKey="daysSalesOutstanding" value={efficiency.daysSalesOutstanding} color={rallyColors.red} />
            </Grid.Col>
          </Grid>
          <Grid gutter="sm" mb="md">
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <RatioKPI metricKey="payablesTurnover" value={efficiency.payablesTurnover} color={rallyColors.purple} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <RatioKPI metricKey="daysPayable" value={efficiency.daysPayable} color={rallyColors.green} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <RatioKPI metricKey="workingCapitalTurnover" value={efficiency.workingCapitalTurnover} color={rallyColors.blue} />
            </Grid.Col>
          </Grid>

          <Text size="sm" fw={600} mb="sm" mt="md" c="dimmed">نسبت‌های ارزش‌گذاری</Text>
          <Grid gutter="sm" mb="md">
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <RatioKPI metricKey="peRatio" value={valuation.peRatio} color={rallyColors.blue} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <RatioKPI metricKey="priceToBook" value={valuation.priceToBook} color={rallyColors.green} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <RatioKPI metricKey="priceToSales" value={valuation.priceToSales} color={rallyColors.purple} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <RatioKPI metricKey="evToEbitda" value={valuation.evToEbitda} color={rallyColors.yellow} />
            </Grid.Col>
          </Grid>
          <Grid gutter="sm" mb="md">
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <RatioKPI metricKey="earningsYield" value={valuation.earningsYield} color={rallyColors.green} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <RatioKPI metricKey="bookValuePerShare" value={valuation.bookValuePerShare} color={rallyColors.blue} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <RatioKPI metricKey="dividendYield" value={valuation.dividendYield} color={rallyColors.purple} />
            </Grid.Col>
          </Grid>
          <Grid gutter="sm" mb="md">
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <RatioKPI metricKey="evToEbit" value={valuation.evToEbit} color={rallyColors.red} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <RatioKPI metricKey="dividendPayout" value={valuation.dividendPayout} color={rallyColors.yellow} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <RatioKPI metricKey="retentionRate" value={valuation.retentionRate} color={rallyColors.green} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <RatioKPI metricKey="sustainableGrowthRate" value={valuation.sustainableGrowthRate} color={rallyColors.green} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <RatioKPI metricKey="priceToCashFlow" value={valuation.priceToCashFlow} color={rallyColors.blue} />
            </Grid.Col>
          </Grid>

          {ratioTimeSeries.length > 1 && (
            <div>
              <Text size="sm" fw={600} mb="xs">روند گردش دارایی</Text>
              <RatioTrendChart
                timeSeries={ratioTimeSeries}
                ratioKeys={['assetTurnover']}
                category="efficiency"
                colors={[rallyColors.blue]}
              />
            </div>
          )}
        </Tabs.Panel>

        {/* Tab 4: DuPont Analysis */}
        <Tabs.Panel value="dupont">
          <Text size="sm" fw={600} mb="sm">تجزیه دوپونت ۳ عاملی</Text>
          <Text size="xs" c="dimmed" mb="sm">
            ROE = حاشیه سود خالص × گردش دارایی × اهرم مالی
          </Text>
          <DuPontWaterfall dupont={dupont} />

          {dupont.fiveFactor?.roe != null && (
            <div style={{ marginTop: 24 }}>
              <Text size="sm" fw={600} mb="sm">تجزیه دوپونت ۵ عاملی</Text>
              <Text size="xs" c="dimmed" mb="sm">
                ROE = بار مالیاتی × بار بهره × حاشیه EBIT × گردش دارایی × اهرم مالی
              </Text>
              <DuPontFiveFactor dupont={dupont} />
            </div>
          )}

          {ratioTimeSeries.length > 1 && (
            <div style={{ marginTop: 24 }}>
              <Text size="sm" fw={600} mb="xs">روند ROE دوپونت (%)</Text>
              <RatioTrendChart
                timeSeries={ratioTimeSeries.map((p) => ({
                  ...p,
                  _dupont: {
                    roe: p.dupont?.threeFactor?.roe,
                    netMargin: p.dupont?.threeFactor?.netMargin,
                  },
                }))}
                ratioKeys={['roe', 'netMargin']}
                category="_dupont"
                colors={[rallyColors.yellow, rallyColors.green]}
                asPct
              />
            </div>
          )}
        </Tabs.Panel>

        {/* Tab 5: Cash Flow Quality */}
        <Tabs.Panel value="cashflow">
          <Text size="sm" fw={600} mb="sm" c="dimmed">کیفیت سود و جریان نقدی</Text>
          <Grid gutter="sm" mb="md">
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <RatioKPI metricKey="cfoToNetIncome" value={cashFlow?.cfoToNetIncome} color={rallyColors.green} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <RatioKPI metricKey="cfoToRevenue" value={cashFlow?.cfoToRevenue} color={rallyColors.blue} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <RatioKPI metricKey="cashToIncome" value={cashFlow?.cashToIncome} color={rallyColors.purple} />
            </Grid.Col>
          </Grid>

          <Text size="sm" fw={600} mb="sm" mt="md" c="dimmed">جریان نقدی آزاد و سرمایه‌گذاری</Text>
          <Grid gutter="sm" mb="md">
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <RatioKPI metricKey="fcfMargin" value={cashFlow?.fcfMargin} color={rallyColors.green} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <RatioKPI metricKey="capexToCfo" value={cashFlow?.capexToCfo} color={rallyColors.red} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <RatioKPI metricKey="reinvestmentRatio" value={cashFlow?.reinvestmentRatio} color={rallyColors.yellow} />
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <RatioKPI metricKey="fcf" value={cashFlow?.fcf} color={rallyColors.blue} />
            </Grid.Col>
          </Grid>

          {ratioTimeSeries.length > 1 && (
            <div>
              <Text size="sm" fw={600} mb="xs">روند کیفیت سود (CFO/NI)</Text>
              <RatioTrendChart
                timeSeries={ratioTimeSeries}
                ratioKeys={['cfoToNetIncome', 'cfoToRevenue']}
                category="cashFlow"
                colors={[rallyColors.green, rallyColors.blue]}
              />
            </div>
          )}
        </Tabs.Panel>
      </Tabs>
    </RallyMainCard>
  );
}
