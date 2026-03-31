import { useState, useMemo } from 'react';
import {
  Autocomplete, Box, Center, Group, Loader, SimpleGrid, Stack, Text, Title,
} from '@mantine/core';
import { IconSearch, IconShieldCheck } from '@tabler/icons-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ErrorBar, ReferenceLine,
} from 'recharts';
import RallyMainCard from '../../components/RallyMainCard';
import RallyKPICard from '../../components/RallyKPICard';
import CryptoIcon from '../../components/CryptoIcon';
import ChartEmptyState from '../../components/charts/shared/ChartEmptyState';
import { useCryptoMarket, useCryptoHistory } from '../../hooks/useCryptoData';
import useCryptoRiskMetrics from '../../hooks/useCryptoRiskMetrics';
import { computeVolatilityCone } from '../../utils/riskMetrics/volCone';
import { computeDrawdown, calmarRatio } from '../../utils/riskMetrics/drawdown';
import { backtestVaR, kupiecPOF, baselTrafficLight } from '../../utils/riskMetrics/varBacktest';
import { formatNum, toPersianNum } from '../../utils/formatUtils';
import { GRID_STROKE, axisTick, TOOLTIP_STYLE } from '../../components/charts/shared/chartStyles';
import rallyColors from '../../theme/rallyColors';

const ACCENT = '#F59E0B';

export default function CryptoRiskAnalytics() {
  const [inputValue, setInputValue] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('');

  const { data: market = [] } = useCryptoMarket();
  const autocompleteData = useMemo(
    () => market.map((c) => ({
      value: c.symbol,
      label: c.name_fa ? `${c.symbol} — ${c.name_fa}` : c.symbol,
    })),
    [market],
  );

  const { data: rawHistory = [], isLoading } = useCryptoHistory(
    selectedSymbol, { interval: '1day', limit: 365 },
  );

  const benchSymbol = selectedSymbol?.toUpperCase() === 'BTC' ? 'ETH' : 'BTC';
  const { data: benchHistory = [] } = useCryptoHistory(benchSymbol, { interval: '1day', limit: 365 });

  const normalizedDaily = useMemo(() => {
    if (!rawHistory?.length) return [];
    return rawHistory.map((c) => ({
      date: (c.open_time || '').split('T')[0],
      open: Number(c.open), high: Number(c.high), low: Number(c.low),
      close: Number(c.close), volume: Number(c.volume),
    })).filter((c) => c.date);
  }, [rawHistory]);

  const normalizedBench = useMemo(() => {
    if (!benchHistory?.length) return [];
    return benchHistory.map((c) => ({
      date: (c.open_time || '').split('T')[0],
      close: Number(c.close),
    })).filter((c) => c.date);
  }, [benchHistory]);

  const { metrics } = useCryptoRiskMetrics(normalizedDaily, normalizedBench, 0.05);

  // Returns array
  const returns = useMemo(() => {
    if (normalizedDaily.length < 2) return [];
    return normalizedDaily.slice(1).map((d, i) => {
      const prev = normalizedDaily[i].close;
      return prev ? (d.close - prev) / prev : 0;
    });
  }, [normalizedDaily]);

  const dates = useMemo(() => normalizedDaily.slice(1).map((d) => d.date), [normalizedDaily]);

  // Volatility Cone
  const coneData = useMemo(() => {
    if (returns.length < 20) return [];
    return computeVolatilityCone(returns);
  }, [returns]);

  // Drawdown
  const drawdownResult = useMemo(() => {
    if (returns.length < 5) return null;
    const dd = computeDrawdown(returns);
    return {
      chartData: dd.series.map((v, i) => ({ date: dates[i] || i, drawdown: +(v * 100).toFixed(2) })),
      maxDD: dd.maxDrawdown,
      maxDDDuration: dd.maxDuration,
      calmar: calmarRatio(returns),
    };
  }, [returns, dates]);

  // VaR Backtest
  const varResult = useMemo(() => {
    if (returns.length < 60) return null;
    const bt = backtestVaR(returns, dates, 250);
    const pof = kupiecPOF(bt.violations, bt.totalDays, 0.05);
    const traffic = baselTrafficLight(bt.violations, bt.totalDays);
    return { ...bt, pof, traffic };
  }, [returns, dates]);

  const WINDOW_LABELS = { 20: '۲۰ روز', 60: '۶۰ روز', 90: '۹۰ روز', 120: '۱۲۰ روز', 250: '۱ سال' };

  return (
    <Stack gap="md">
      <RallyMainCard>
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Group gap="xs">
            <IconShieldCheck size={20} color={ACCENT} />
            <Title order={4} fw={700}>تحلیل ریسک رمزارز</Title>
          </Group>
          <Autocomplete
            placeholder="انتخاب رمزارز…"
            leftSection={<IconSearch size={16} />}
            data={autocompleteData}
            value={inputValue}
            onChange={(val) => { setInputValue(val); if (!val) setSelectedSymbol(''); }}
            onOptionSubmit={(val) => {
              setSelectedSymbol(val);
              const item = autocompleteData.find((d) => d.value === val);
              setInputValue(item?.label || val);
            }}
            limit={12}
            w={{ base: 240, sm: 340 }}
            styles={{ input: { textAlign: 'right' } }}
          />
        </Group>
      </RallyMainCard>

      {!selectedSymbol && (
        <Center mih={520} style={{ flexDirection: 'column', gap: 16 }}>
          <Box style={{
            width: 72, height: 72, borderRadius: 20,
            background: `linear-gradient(135deg, ${ACCENT}18, ${ACCENT}06)`,
            border: `1px solid ${ACCENT}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconShieldCheck size={36} color={ACCENT} stroke={1.5} />
          </Box>
          <Stack align="center" gap={4}>
            <Text fw={600} c={rallyColors.textPrimary}>رمزارزی انتخاب نشده</Text>
            <Text size="sm" c={rallyColors.textSecondary}>رمزارز مورد نظر را انتخاب کنید</Text>
          </Stack>
        </Center>
      )}

      {selectedSymbol && isLoading && (
        <Center mih={400}><Loader color={ACCENT} size="sm" /></Center>
      )}

      {selectedSymbol && !isLoading && metrics && (
        <>
          {/* KPI Row */}
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
            <RallyKPICard title="نوسان‌پذیری سالانه" value={`${toPersianNum((metrics.volatility * 100).toFixed(1))}٪`} color={ACCENT} />
            <RallyKPICard title="شارپ" value={toPersianNum(metrics.sharpe?.toFixed(2) ?? '-')} color={rallyColors.blue} />
            <RallyKPICard title="VaR 95٪" value={`${toPersianNum(((metrics.var95 || 0) * 100).toFixed(1))}٪`} color={rallyColors.red} />
            <RallyKPICard title="بتا (vs {benchSymbol})" value={toPersianNum(metrics.beta?.toFixed(2) ?? '-')} color={rallyColors.purple} />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            {/* Volatility Cone */}
            <RallyMainCard title="مخروط نوسان‌پذیری" fullscreenable>
              {coneData.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={coneData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="window" tickFormatter={(w) => WINDOW_LABELS[w] || w} tick={axisTick(10)} />
                    <YAxis tick={axisTick()} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="current" name="فعلی" radius={[4, 4, 0, 0]}>
                      {coneData.map((entry, i) => {
                        const pct = (entry.current - entry.p25) / Math.max(entry.p75 - entry.p25, 0.01);
                        const fill = pct > 0.75 ? rallyColors.red : pct > 0.5 ? ACCENT : rallyColors.green;
                        return <Cell key={i} fill={fill} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <ChartEmptyState message="داده کافی نیست (حداقل ۲۰ روز)" />}
            </RallyMainCard>

            {/* Drawdown */}
            <RallyMainCard title="حداکثر افت سرمایه" fullscreenable>
              {drawdownResult ? (
                <>
                  <Group gap="md" mb="sm">
                    <Text size="xs" c={rallyColors.red}>Max DD: {toPersianNum((drawdownResult.maxDD * 100).toFixed(1))}٪</Text>
                    <Text size="xs" c={rallyColors.textSecondary}>مدت: {toPersianNum(drawdownResult.maxDDDuration)} روز</Text>
                    <Text size="xs" c={ACCENT}>Calmar: {toPersianNum(drawdownResult.calmar?.toFixed(2) ?? '-')}</Text>
                  </Group>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={drawdownResult.chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                      <XAxis dataKey="date" tick={axisTick(9)} interval="preserveStartEnd" />
                      <YAxis tick={axisTick()} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <defs>
                        <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={rallyColors.red} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={rallyColors.red} stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="drawdown" stroke={rallyColors.red} fill="url(#ddGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </>
              ) : <ChartEmptyState message="داده کافی نیست" />}
            </RallyMainCard>
          </SimpleGrid>

          {/* VaR Backtest */}
          {varResult && (
            <RallyMainCard title="آزمون پس‌نگر VaR" fullscreenable>
              <Group gap="md" mb="sm">
                <Text size="xs" c={rallyColors.red}>نقض‌ها: {toPersianNum(varResult.violations)}</Text>
                <Text size="xs" c={rallyColors.textSecondary}>نرخ: {toPersianNum((varResult.violationRate * 100).toFixed(1))}٪ (انتظار: ۵٪)</Text>
                <Text size="xs" c={varResult.traffic === 'green' ? rallyColors.green : varResult.traffic === 'yellow' ? ACCENT : rallyColors.red}>
                  Basel: {varResult.traffic === 'green' ? 'سبز' : varResult.traffic === 'yellow' ? 'زرد' : 'قرمز'}
                </Text>
              </Group>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={varResult.data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="date" tick={axisTick(9)} interval="preserveStartEnd" />
                  <YAxis tick={axisTick()} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <ReferenceLine y={0} stroke={rallyColors.textDimmed} />
                  <Bar dataKey="return" name="بازده">
                    {(varResult.data || []).map((entry, i) => (
                      <Cell key={i} fill={entry.violation ? rallyColors.red : rallyColors.blue} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </RallyMainCard>
          )}

          {/* Additional KPIs */}
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
            <RallyKPICard title="سورتینو" value={toPersianNum(metrics.sortino?.toFixed(2) ?? '-')} color={rallyColors.green} />
            <RallyKPICard title="CVaR 95٪" value={`${toPersianNum(((metrics.cvar95 || 0) * 100).toFixed(1))}٪`} color={rallyColors.red} />
            <RallyKPICard title="حداکثر افت" value={`${toPersianNum(((metrics.maxDrawdown || 0) * 100).toFixed(1))}٪`} color={rallyColors.orange} />
            <RallyKPICard title="آلفا (Jensen)" value={toPersianNum(metrics.alpha?.toFixed(3) ?? '-')} color={rallyColors.purple} />
          </SimpleGrid>
        </>
      )}
    </Stack>
  );
}
