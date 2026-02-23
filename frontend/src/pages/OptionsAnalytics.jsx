import { useState, useMemo } from 'react';
import useIVSmile from '../hooks/useIVSmile';
import useVolumeOI from '../hooks/useVolumeOI';
import useGreeksData from '../hooks/useGreeksData';
import useSensitivityMatrix from '../hooks/useSensitivityMatrix';
import useMaxPain from '../hooks/useMaxPain';
import { deltaColor, ivSurfaceColor, sensHeatColor } from '../utils/optionsColors';
import { PARITY_VIOLATION_THRESHOLD, GREEKS_DECAY_DAYS } from '../constants/options';
import {
  Alert,
  Badge,
  Group,
  Select,
  SegmentedControl,
  SimpleGrid,
  Text,
  Table,
  ScrollArea,
  Stack,
} from '@mantine/core';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Legend,
  ComposedChart,
} from 'recharts';
import {
  IconChartLine,
  IconChartDonut,
  IconArrowsExchange,
  IconTargetArrow,
} from '@tabler/icons-react';
import RallyMainCard from '../components/RallyMainCard';
import RallyKPICard from '../components/RallyKPICard';
import PageHeader from '../components/PageHeader';
import RefreshButton from '../components/RefreshButton';
import RiskFreeRateSlider, { useRiskFreeRate } from '../components/options/RiskFreeRateSlider';
import useOptionsChainData from '../hooks/useOptionsChainData';
import { useEnrichedOptions } from '../hooks/useOptionsAnalytics';
import { greeks } from '../utils/blackScholes';
import { formatNum, toPersianNum } from '../utils/formatUtils';
import rallyColors from '../theme/rallyColors';
import { GRID_STROKE, axisTick, TOOLTIP_STYLE, activeDotFor, CURSOR_STROKE, CURSOR_FILL, barGradientDef } from '../components/charts/shared/chartStyles';

export default function OptionsAnalytics() {
  const {
    underlyings,
    selectedUnderlying,
    setSelectedUnderlying,
    selectedExpiry,
    setSelectedExpiry,
    options,
    info,
    expiryDates,
    callCount,
    putCount,
    loading,
    loadingUnderlyings,
    loadingChain,
    refresh,
  } = useOptionsChainData();

  const [riskFreeRate, setRiskFreeRate] = useRiskFreeRate();
  const underlyingPrice = info?.close || 0;

  // Toggle for Greeks heatmap: 1st-order vs 2nd-order
  const [greeksOrder, setGreeksOrder] = useState('1st');
  // Sensitivity matrix: which Greek to display
  const [sensGreek, setSensGreek] = useState('price');
  // Greeks decay: which Greek to chart
  const [decayGreek, setDecayGreek] = useState('theta');

  // Enrich options with Greeks/IV
  const enrichedOptions = useEnrichedOptions(options, underlyingPrice, riskFreeRate);

  // Separate calls and puts
  const calls = useMemo(() => enrichedOptions.filter((o) => o.option_type === 'call'), [enrichedOptions]);
  const puts = useMemo(() => enrichedOptions.filter((o) => o.option_type === 'put'), [enrichedOptions]);

  // KPI computations
  const kpis = useMemo(() => {
    const callIVs = calls.filter((c) => c.iv != null).map((c) => c.iv);
    const putIVs = puts.filter((p) => p.iv != null).map((p) => p.iv);
    const avgCallIV = callIVs.length > 0 ? callIVs.reduce((a, b) => a + b, 0) / callIVs.length : null;
    const avgPutIV = putIVs.length > 0 ? putIVs.reduce((a, b) => a + b, 0) / putIVs.length : null;

    const callVol = calls.reduce((s, c) => s + (c.volume || 0), 0);
    const putVol = puts.reduce((s, p) => s + (p.volume || 0), 0);
    const pcRatio = callVol > 0 ? putVol / callVol : null;

    let maxOIStrike = null;
    let maxOI = 0;
    enrichedOptions.forEach((o) => {
      if ((o.open_interest || 0) > maxOI) {
        maxOI = o.open_interest;
        maxOIStrike = o.strike_price;
      }
    });

    return {
      totalOptions: enrichedOptions.length,
      avgCallIV,
      avgPutIV,
      pcRatio,
      maxOIStrike,
      maxOI,
    };
  }, [enrichedOptions, calls, puts]);

  const ivSmileData = useIVSmile(enrichedOptions);

  const volumeOIData = useVolumeOI(enrichedOptions);

  const greeksData = useGreeksData(enrichedOptions);

  // Put-Call Parity check
  const parityData = useMemo(() => {
    if (!underlyingPrice || underlyingPrice <= 0) return [];
    const r = riskFreeRate / 100;
    const strikeMap = new Map();
    enrichedOptions.forEach((o) => {
      if (!o.strike_price) return;
      if (!strikeMap.has(o.strike_price)) strikeMap.set(o.strike_price, {});
      const e = strikeMap.get(o.strike_price);
      if (o.option_type === 'call') {
        e.callPrice = o.last || o.close;
        e.callT = o.time_to_expiry;
      } else {
        e.putPrice = o.last || o.close;
        e.putT = o.time_to_expiry;
      }
    });
    const results = [];
    for (const [strike, { callPrice, putPrice, callT, putT }] of strikeMap.entries()) {
      if (!callPrice || !putPrice) continue;
      const T = callT || putT || 0;
      if (T <= 0) continue;
      const lhs = callPrice - putPrice;
      const rhs = underlyingPrice - strike * Math.exp(-r * T);
      const diff = Math.abs(lhs - rhs);
      const violation = diff > underlyingPrice * PARITY_VIOLATION_THRESHOLD;
      results.push({
        strike,
        callPrice: Math.round(callPrice),
        putPrice: Math.round(putPrice),
        lhs: Math.round(lhs),
        rhs: Math.round(rhs * 100) / 100,
        diff: Math.round(diff),
        violation,
      });
    }
    return results.sort((a, b) => a.strike - b.strike);
  }, [enrichedOptions, underlyingPrice, riskFreeRate]);

  const sensitivityMatrix = useSensitivityMatrix(calls, underlyingPrice, riskFreeRate, sensGreek);

  // ── Step 4a: IV Term Structure (ATM IV per expiry) ──
  const ivTermData = useMemo(() => {
    if (!underlyingPrice || underlyingPrice <= 0 || expiryDates.length < 2) return [];
    // Group by expiry, find nearest ATM strike IV
    const expiryMap = new Map();
    enrichedOptions.forEach((o) => {
      if (!o.expiry_date || o.iv == null || o.strike_price == null) return;
      if (!expiryMap.has(o.expiry_date)) expiryMap.set(o.expiry_date, []);
      expiryMap.get(o.expiry_date).push(o);
    });

    const result = [];
    for (const [expiry, opts] of expiryMap.entries()) {
      // Find nearest ATM for calls and puts
      let bestCall = null, bestPut = null, bestCallDist = Infinity, bestPutDist = Infinity;
      opts.forEach((o) => {
        const dist = Math.abs(o.strike_price - underlyingPrice);
        if (o.option_type === 'call' && dist < bestCallDist) {
          bestCall = o;
          bestCallDist = dist;
        }
        if (o.option_type === 'put' && dist < bestPutDist) {
          bestPut = o;
          bestPutDist = dist;
        }
      });
      result.push({
        expiry,
        callIV: bestCall?.iv != null ? Math.round(bestCall.iv * 10) / 10 : null,
        putIV: bestPut?.iv != null ? Math.round(bestPut.iv * 10) / 10 : null,
      });
    }
    return result.sort((a, b) => a.expiry.localeCompare(b.expiry));
  }, [enrichedOptions, underlyingPrice, expiryDates]);

  // ── Step 4b: Volatility Surface Heatmap ──
  const volSurface = useMemo(() => {
    if (!underlyingPrice || expiryDates.length < 2) return null;
    const expiryMap = new Map();
    enrichedOptions.forEach((o) => {
      if (!o.expiry_date || o.iv == null || o.strike_price == null) return;
      if (!expiryMap.has(o.expiry_date)) expiryMap.set(o.expiry_date, new Map());
      const strikeMap = expiryMap.get(o.expiry_date);
      // Average call/put IV at each strike
      if (!strikeMap.has(o.strike_price)) strikeMap.set(o.strike_price, []);
      strikeMap.get(o.strike_price).push(o.iv);
    });

    if (expiryMap.size < 2) return null;

    // Collect all strikes across all expiries
    const allStrikes = new Set();
    for (const sm of expiryMap.values()) {
      for (const k of sm.keys()) allStrikes.add(k);
    }
    const strikes = [...allStrikes].sort((a, b) => a - b);
    const expiries = [...expiryMap.keys()].sort();

    // Build rows: one per expiry
    let minIV = Infinity, maxIV = -Infinity;
    const rows = expiries.map((exp) => {
      const sm = expiryMap.get(exp);
      const cells = strikes.map((k) => {
        const ivs = sm.get(k);
        if (!ivs || ivs.length === 0) return null;
        const avg = ivs.reduce((a, b) => a + b, 0) / ivs.length;
        if (avg < minIV) minIV = avg;
        if (avg > maxIV) maxIV = avg;
        return Math.round(avg * 10) / 10;
      });
      return { expiry: exp, cells };
    });

    return { strikes, expiries, rows, minIV, maxIV };
  }, [enrichedOptions, underlyingPrice, expiryDates]);

  const maxPainData = useMaxPain(volumeOIData);

  // ── Step 6: Greeks Decay Over Time ──
  const greeksDecayData = useMemo(() => {
    if (!underlyingPrice || underlyingPrice <= 0) return [];
    const r = riskFreeRate / 100;
    // Pick 3 representative strikes: ATM, OTM (+5%), ITM (-5%)
    const atmK = underlyingPrice;
    const otmK = Math.round(underlyingPrice * 1.05);
    const itmK = Math.round(underlyingPrice * 0.95);
    const sigma = (kpis.avgCallIV || 30) / 100;

    const data = [];
    for (let day = GREEKS_DECAY_DAYS; day >= 1; day--) {
      const T = day / 365;
      const gAtm = greeks('call', underlyingPrice, atmK, T, r, sigma);
      const gOtm = greeks('call', underlyingPrice, otmK, T, r, sigma);
      const gItm = greeks('call', underlyingPrice, itmK, T, r, sigma);
      data.push({
        day,
        atm: gAtm[decayGreek] || 0,
        otm: gOtm[decayGreek] || 0,
        itm: gItm[decayGreek] || 0,
      });
    }
    return data;
  }, [underlyingPrice, riskFreeRate, kpis.avgCallIV, decayGreek]);

  // Underlying selector data
  const underlyingSelectData = underlyings
    .filter((u) => u.underlying)
    .map((u) => ({
      value: u.underlying,
      label: `${u.underlying}${u.name_fa ? ` - ${u.name_fa}` : ''} (${u.total_options} اختیار)`,
    }));

  const expirySegments = expiryDates.filter(Boolean).map((d) => ({ value: d, label: d }));

  if (!loadingUnderlyings && underlyings.length === 0) {
    return <Alert color="red" title="خطا">اطلاعات دارایی‌های پایه در دسترس نیست</Alert>;
  }

  return (
    <>
      <PageHeader title="تحلیل اختیار معامله">
        <RefreshButton onRefreshComplete={refresh} />
      </PageHeader>

      {/* Top bar: selectors */}
      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md" wrap="wrap">
          <Select
            placeholder="دارایی پایه..."
            data={underlyingSelectData}
            value={selectedUnderlying}
            onChange={setSelectedUnderlying}
            searchable
            clearable
            style={{ flex: 1, minWidth: 200, maxWidth: 360 }}
            size="sm"
            nothingFoundMessage="دارایی یافت نشد"
          />
          <RiskFreeRateSlider value={riskFreeRate} onChange={setRiskFreeRate} />
          {underlyingPrice > 0 && (
            <Badge color="rally-green" variant="light">
              قیمت پایه: {formatNum(underlyingPrice)}
            </Badge>
          )}
        </Group>
      </RallyMainCard>

      {/* Expiry date tabs */}
      {selectedUnderlying && expirySegments.length > 0 && (
        <RallyMainCard mb="md" noPadding>
          <Group p="sm" gap="sm" wrap="wrap">
            <Text size="xs" c="dimmed" fw={600}>سررسید:</Text>
            <SegmentedControl
              value={selectedExpiry || ''}
              onChange={(v) => setSelectedExpiry(v || null)}
              data={[{ value: '', label: 'همه' }, ...expirySegments]}
              size="xs"
              styles={{ root: { background: 'rgba(148, 163, 184, 0.06)' } }}
            />
          </Group>
        </RallyMainCard>
      )}

      {!selectedUnderlying && (
        <RallyMainCard>
          <Text size="sm" c="dimmed" ta="center" py="xl">
            دارایی پایه را انتخاب کنید تا تحلیل اختیار نمایش داده شود
          </Text>
        </RallyMainCard>
      )}

      {selectedUnderlying && enrichedOptions.length > 0 && (
        <Stack gap="md">
          {/* Row 1: KPI Cards */}
          <SimpleGrid cols={{ base: 2, md: 4 }}>
            <RallyKPICard
              title="تعداد اختیار"
              value={formatNum(kpis.totalOptions)}
              icon={IconChartDonut}
              color={rallyColors.green}
              variant="accent-bar"
            />
            <RallyKPICard
              title="میانگین IV"
              value={
                kpis.avgCallIV != null
                  ? `${toPersianNum(kpis.avgCallIV.toFixed(1))}٪ / ${kpis.avgPutIV != null ? toPersianNum(kpis.avgPutIV.toFixed(1)) + '٪' : '-'}`
                  : '-'
              }
              subtitle="خرید / فروش"
              icon={IconChartLine}
              color={rallyColors.blue}
              variant="accent-bar"
            />
            <RallyKPICard
              title="نسبت فروش/خرید"
              value={kpis.pcRatio != null ? toPersianNum(kpis.pcRatio.toFixed(2)) : '-'}
              subtitle="حجمی"
              icon={IconArrowsExchange}
              color={kpis.pcRatio > 1 ? rallyColors.red : rallyColors.green}
              variant="accent-bar"
            />
            <RallyKPICard
              title="بیشترین OI"
              value={kpis.maxOIStrike ? formatNum(kpis.maxOIStrike) : '-'}
              subtitle={kpis.maxOI ? `OI: ${formatNum(kpis.maxOI)}` : ''}
              icon={IconTargetArrow}
              color={rallyColors.purple}
              variant="accent-bar"
            />
          </SimpleGrid>

          {/* Row 2: IV Smile Chart */}
          {ivSmileData.length > 0 && (
            <RallyMainCard title="لبخند نوسان (IV Smile)" fullscreenable>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={ivSmileData} margin={{ top: 10, right: 20, bottom: 40, left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis
                    dataKey="strike"
                    tick={axisTick(10)}
                    angle={-45}
                    textAnchor="end"
                    tickFormatter={(v) => formatNum(v)}
                  />
                  <YAxis tick={axisTick(10)} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={CURSOR_STROKE}
                    formatter={(v, name) => [`${v}%`, name === 'callIV' ? 'IV خرید' : 'IV فروش']}
                    labelFormatter={(v) => `اعمال: ${formatNum(v)}`}
                  />
                  <Legend
                    verticalAlign="top"
                    formatter={(v) => (v === 'callIV' ? 'IV خرید' : 'IV فروش')}
                  />
                  {underlyingPrice > 0 && (
                    <ReferenceLine
                      x={underlyingPrice}
                      stroke={rallyColors.yellow}
                      strokeDasharray="5 5"
                      label={{ value: 'قیمت', position: 'insideTopLeft', fill: rallyColors.yellow, fontSize: 10 }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="callIV"
                    stroke={rallyColors.green}
                    strokeWidth={2}
                    dot={{ r: 3, fill: rallyColors.green }}
                    activeDot={activeDotFor(rallyColors.green)}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="putIV"
                    stroke={rallyColors.red}
                    strokeWidth={2}
                    dot={{ r: 3, fill: rallyColors.red }}
                    activeDot={activeDotFor(rallyColors.red)}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </RallyMainCard>
          )}

          {/* IV Term Structure (Step 4a) */}
          {ivTermData.length >= 2 && (
            <RallyMainCard title="ساختار زمانی نوسان (IV Term Structure)" fullscreenable>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={ivTermData} margin={{ top: 10, right: 20, bottom: 40, left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="expiry" tick={axisTick(10)} angle={-30} textAnchor="end" />
                  <YAxis tick={axisTick(10)} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={CURSOR_STROKE}
                    formatter={(v, name) => [`${v}%`, name === 'callIV' ? 'ATM IV خرید' : 'ATM IV فروش']}
                    labelFormatter={(v) => `سررسید: ${v}`}
                  />
                  <Legend verticalAlign="top" formatter={(v) => (v === 'callIV' ? 'ATM IV خرید' : 'ATM IV فروش')} />
                  <Line type="monotone" dataKey="callIV" stroke={rallyColors.green} strokeWidth={2} dot={{ r: 4 }} activeDot={activeDotFor(rallyColors.green)} connectNulls />
                  <Line type="monotone" dataKey="putIV" stroke={rallyColors.red} strokeWidth={2} dot={{ r: 4 }} activeDot={activeDotFor(rallyColors.red)} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </RallyMainCard>
          )}

          {/* Volatility Surface Heatmap (Step 4b) */}
          {volSurface && (
            <RallyMainCard title="سطح نوسان (Volatility Surface)" noPadding>
              <ScrollArea>
                <Table striped withTableBorder style={{ minWidth: 500 }}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th style={{ textAlign: 'center', position: 'sticky', left: 0, background: rallyColors.elevated, zIndex: 1 }}>سررسید \ اعمال</Table.Th>
                      {volSurface.strikes.map((k) => (
                        <Table.Th key={k} style={{ textAlign: 'center', fontSize: 11 }}>{formatNum(k)}</Table.Th>
                      ))}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {volSurface.rows.map((row) => (
                      <Table.Tr key={row.expiry}>
                        <Table.Td style={{ textAlign: 'center', fontWeight: 600, fontSize: 11, position: 'sticky', left: 0, background: rallyColors.elevated, zIndex: 1 }}>
                          {row.expiry}
                        </Table.Td>
                        {row.cells.map((iv, i) => (
                          <Table.Td key={i} style={{ textAlign: 'center', fontSize: 11, background: iv != null ? ivSurfaceColor(iv, volSurface.minIV, volSurface.maxIV) : 'transparent' }}>
                            {iv != null ? `${iv}%` : '-'}
                          </Table.Td>
                        ))}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
              <Group justify="space-between" px="md" py="xs" style={{ borderTop: `1px solid ${rallyColors.border}` }}>
                <Text size="xs" c="dimmed">کم‌ترین IV</Text>
                <div style={{ flex: 1, height: 6, margin: '0 8px', borderRadius: 3, background: 'linear-gradient(to right, #3B82F6, #F59E0B, #EF4444)' }} />
                <Text size="xs" c="dimmed">بیشترین IV</Text>
              </Group>
            </RallyMainCard>
          )}

          {/* Row 3: Greeks Heatmap + Volume/OI */}
          <SimpleGrid cols={{ base: 1, lg: 2 }}>
            {/* Greeks Heatmap with 1st/2nd order toggle */}
            <RallyMainCard
              title={
                <Group gap="sm">
                  <Text fw={700} size="lg">نقشه حرارتی یونانی‌ها</Text>
                  <SegmentedControl
                    value={greeksOrder}
                    onChange={setGreeksOrder}
                    data={[{ value: '1st', label: 'مرتبه اول' }, { value: '2nd', label: 'مرتبه دوم' }]}
                    size="xs"
                  />
                </Group>
              }
              noPadding
            >
              <ScrollArea>
                <Table striped highlightOnHover withTableBorder style={{ minWidth: 400 }}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th style={{ textAlign: 'center' }}>اعمال</Table.Th>
                      {greeksOrder === '1st' ? (
                        <>
                          <Table.Th style={{ textAlign: 'center' }}>دلتا خرید</Table.Th>
                          <Table.Th style={{ textAlign: 'center' }}>گاما خرید</Table.Th>
                          <Table.Th style={{ textAlign: 'center' }}>دلتا فروش</Table.Th>
                          <Table.Th style={{ textAlign: 'center' }}>گاما فروش</Table.Th>
                        </>
                      ) : (
                        <>
                          <Table.Th style={{ textAlign: 'center' }}>Vanna خرید</Table.Th>
                          <Table.Th style={{ textAlign: 'center' }}>Volga خرید</Table.Th>
                          <Table.Th style={{ textAlign: 'center' }}>Charm خرید</Table.Th>
                          <Table.Th style={{ textAlign: 'center' }}>Vanna فروش</Table.Th>
                          <Table.Th style={{ textAlign: 'center' }}>Volga فروش</Table.Th>
                          <Table.Th style={{ textAlign: 'center' }}>Charm فروش</Table.Th>
                        </>
                      )}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {greeksData.map((row) => (
                      <Table.Tr key={row.strike}>
                        <Table.Td style={{ textAlign: 'center', fontWeight: 600 }}>
                          {formatNum(row.strike)}
                        </Table.Td>
                        {greeksOrder === '1st' ? (
                          <>
                            <Table.Td style={{ textAlign: 'center', background: deltaColor(row.callDelta, 'call') }}>
                              {row.callDelta != null ? row.callDelta.toFixed(3) : '-'}
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'center', fontSize: 11 }}>
                              {row.callGamma != null ? row.callGamma.toFixed(6) : '-'}
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'center', background: deltaColor(row.putDelta, 'put') }}>
                              {row.putDelta != null ? row.putDelta.toFixed(3) : '-'}
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'center', fontSize: 11 }}>
                              {row.putGamma != null ? row.putGamma.toFixed(6) : '-'}
                            </Table.Td>
                          </>
                        ) : (
                          <>
                            <Table.Td style={{ textAlign: 'center', fontSize: 11 }}>
                              {row.callVanna != null ? row.callVanna.toFixed(4) : '-'}
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'center', fontSize: 11 }}>
                              {row.callVolga != null ? row.callVolga.toFixed(2) : '-'}
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'center', fontSize: 11 }}>
                              {row.callCharm != null ? row.callCharm.toFixed(6) : '-'}
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'center', fontSize: 11 }}>
                              {row.putVanna != null ? row.putVanna.toFixed(4) : '-'}
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'center', fontSize: 11 }}>
                              {row.putVolga != null ? row.putVolga.toFixed(2) : '-'}
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'center', fontSize: 11 }}>
                              {row.putCharm != null ? row.putCharm.toFixed(6) : '-'}
                            </Table.Td>
                          </>
                        )}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
              <Group justify="space-between" px="md" py="xs" style={{ borderTop: `1px solid ${rallyColors.border}` }}>
                <Text size="xs" c="dimmed">خرید کم</Text>
                <div style={{ flex: 1, height: 6, margin: '0 8px', borderRadius: 3, background: 'linear-gradient(to right, transparent, rgba(16,185,129,0.8))' }} />
                <div style={{ flex: 1, height: 6, margin: '0 8px', borderRadius: 3, background: 'linear-gradient(to right, rgba(239,68,68,0.8), transparent)' }} />
                <Text size="xs" c="dimmed">فروش کم</Text>
              </Group>
            </RallyMainCard>

            {/* Volume & OI Chart */}
            {volumeOIData.length > 0 && (
              <RallyMainCard title="حجم و موقعیت‌های باز" fullscreenable>
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={volumeOIData} margin={{ top: 10, right: 20, bottom: 40, left: 40 }}>
                    <defs>
                      {barGradientDef('callVolFill', rallyColors.green)}
                      {barGradientDef('putVolFill', rallyColors.red)}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis
                      dataKey="strike"
                      tick={axisTick(10)}
                      angle={-45}
                      textAnchor="end"
                      tickFormatter={(v) => formatNum(v)}
                    />
                    <YAxis yAxisId="vol" tick={axisTick(10)} />
                    <YAxis yAxisId="oi" orientation="right" tick={axisTick(10)} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      cursor={CURSOR_STROKE}
                      formatter={(v, name) => {
                        const labels = {
                          callVol: 'حجم خرید',
                          putVol: 'حجم فروش',
                          totalOI: 'OI کل',
                        };
                        return [formatNum(v), labels[name] || name];
                      }}
                      labelFormatter={(v) => `اعمال: ${formatNum(v)}`}
                    />
                    <Legend formatter={(v) => {
                      const labels = { callVol: 'حجم خرید', putVol: 'حجم فروش', totalOI: 'OI کل' };
                      return labels[v] || v;
                    }} />
                    <Bar yAxisId="vol" dataKey="callVol" fill="url(#callVolFill)" />
                    <Bar yAxisId="vol" dataKey="putVol" fill="url(#putVolFill)" />
                    <Line
                      yAxisId="oi"
                      type="monotone"
                      dataKey="totalOI"
                      stroke={rallyColors.yellow}
                      strokeWidth={2}
                      dot={false}
                      activeDot={activeDotFor(rallyColors.yellow)}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </RallyMainCard>
            )}
          </SimpleGrid>

          {/* Sensitivity Matrix (Step 3) */}
          {sensitivityMatrix && (
            <RallyMainCard
              title={
                <Group gap="sm">
                  <Text fw={700} size="lg">ماتریس حساسیت (Sensitivity Matrix)</Text>
                  <Select
                    value={sensGreek}
                    onChange={setSensGreek}
                    data={[
                      { value: 'price', label: 'قیمت' },
                      { value: 'delta', label: 'دلتا' },
                      { value: 'gamma', label: 'گاما' },
                      { value: 'vega', label: 'وگا' },
                      { value: 'theta', label: 'تتا' },
                    ]}
                    size="xs"
                    style={{ width: 100 }}
                  />
                </Group>
              }
              noPadding
            >
              <ScrollArea>
                <Table withTableBorder style={{ minWidth: 600 }}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th style={{ textAlign: 'center', fontSize: 10 }}>Vol \ Spot</Table.Th>
                      {sensitivityMatrix.spots.map((s) => (
                        <Table.Th key={s} style={{ textAlign: 'center', fontSize: 10 }}>{formatNum(s)}</Table.Th>
                      ))}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {sensitivityMatrix.rows.map((row) => (
                      <Table.Tr key={row.vol}>
                        <Table.Td style={{ textAlign: 'center', fontWeight: 600, fontSize: 10 }}>
                          {(row.vol * 100).toFixed(0)}%
                        </Table.Td>
                        {row.cells.map((val, i) => (
                          <Table.Td key={i} style={{
                            textAlign: 'center',
                            fontSize: 10,
                            background: sensHeatColor(val, row.cells),
                          }}>
                            {sensGreek === 'price' ? formatNum(Math.round(val)) : val.toFixed(4)}
                          </Table.Td>
                        ))}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
              <Group justify="space-between" px="md" py="xs" style={{ borderTop: `1px solid ${rallyColors.border}` }}>
                <Text size="xs" c="dimmed">پایین</Text>
                <div style={{ flex: 1, height: 6, margin: '0 8px', borderRadius: 3, background: 'linear-gradient(to right, #EF4444, rgba(255,255,255,0.15), #10B981)' }} />
                <Text size="xs" c="dimmed">بالا</Text>
              </Group>
            </RallyMainCard>
          )}

          {/* Max Pain Analysis (Step 5) */}
          {maxPainData && maxPainData.data.length > 0 && (
            <RallyMainCard
              title={
                <Group gap="sm">
                  <Text fw={700} size="lg">تحلیل حداکثر درد (Max Pain)</Text>
                  {maxPainData.maxPainStrike && (
                    <Badge color="yellow" variant="light">
                      Max Pain: {formatNum(maxPainData.maxPainStrike)}
                      {underlyingPrice > 0 && ` (${((maxPainData.maxPainStrike / underlyingPrice - 1) * 100).toFixed(1)}%)`}
                    </Badge>
                  )}
                </Group>
              }
              fullscreenable
            >
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={maxPainData.data} margin={{ top: 10, right: 20, bottom: 40, left: 40 }}>
                  <defs>
                    {barGradientDef('callPainFill', rallyColors.green)}
                    {barGradientDef('putPainFill', rallyColors.red)}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis
                    dataKey="strike"
                    tick={axisTick(10)}
                    angle={-45}
                    textAnchor="end"
                    tickFormatter={(v) => formatNum(v)}
                  />
                  <YAxis tick={axisTick(10)} tickFormatter={(v) => formatNum(v)} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={CURSOR_STROKE}
                    formatter={(v, name) => {
                      const labels = { callPain: 'درد خرید', putPain: 'درد فروش', totalPain: 'درد کل' };
                      return [formatNum(v), labels[name] || name];
                    }}
                    labelFormatter={(v) => `اعمال: ${formatNum(v)}`}
                  />
                  <Legend formatter={(v) => {
                    const labels = { callPain: 'درد خرید', putPain: 'درد فروش' };
                    return labels[v] || v;
                  }} />
                  <Bar dataKey="callPain" stackId="pain" fill="url(#callPainFill)" />
                  <Bar dataKey="putPain" stackId="pain" fill="url(#putPainFill)" />
                  {maxPainData.maxPainStrike && (
                    <ReferenceLine
                      x={maxPainData.maxPainStrike}
                      stroke={rallyColors.yellow}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      label={{ value: 'بیشترین درد', position: 'insideTopRight', fill: rallyColors.yellow, fontSize: 10 }}
                    />
                  )}
                  {underlyingPrice > 0 && (
                    <ReferenceLine
                      x={underlyingPrice}
                      stroke={rallyColors.blue}
                      strokeDasharray="3 3"
                      label={{ value: 'قیمت', position: 'insideTopLeft', fill: rallyColors.blue, fontSize: 10 }}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </RallyMainCard>
          )}

          {/* Greeks Decay Over Time (Step 6) */}
          {greeksDecayData.length > 0 && (
            <RallyMainCard
              title={
                <Group gap="sm">
                  <Text fw={700} size="lg">تغییرات یونانی‌ها با زمان (Greeks Decay)</Text>
                  <Select
                    value={decayGreek}
                    onChange={setDecayGreek}
                    data={[
                      { value: 'theta', label: 'تتا' },
                      { value: 'delta', label: 'دلتا' },
                      { value: 'gamma', label: 'گاما' },
                      { value: 'vega', label: 'وگا' },
                    ]}
                    size="xs"
                    style={{ width: 100 }}
                  />
                </Group>
              }
              fullscreenable
            >
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={greeksDecayData} margin={{ top: 10, right: 20, bottom: 20, left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis
                    dataKey="day"
                    tick={axisTick(10)}
                    reversed
                    label={{ value: 'روز تا سررسید', position: 'insideBottom', offset: -10, fontSize: 11, fill: rallyColors.textSecondary }}
                  />
                  <YAxis tick={axisTick(10)} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={CURSOR_STROKE}
                    formatter={(v, name) => {
                      const labels = { atm: 'ATM', otm: 'OTM (+5%)', itm: 'ITM (-5%)' };
                      return [v.toFixed(4), labels[name] || name];
                    }}
                    labelFormatter={(v) => `${v} روز مانده`}
                  />
                  <Legend formatter={(v) => {
                    const labels = { atm: 'ATM', otm: 'OTM (+5%)', itm: 'ITM (-5%)' };
                    return labels[v] || v;
                  }} />
                  <Line type="monotone" dataKey="atm" stroke={rallyColors.blue} strokeWidth={2} dot={false} activeDot={activeDotFor(rallyColors.blue)} />
                  <Line type="monotone" dataKey="otm" stroke={rallyColors.green} strokeWidth={2} dot={false} activeDot={activeDotFor(rallyColors.green)} />
                  <Line type="monotone" dataKey="itm" stroke={rallyColors.red} strokeWidth={2} dot={false} activeDot={activeDotFor(rallyColors.red)} />
                </LineChart>
              </ResponsiveContainer>
            </RallyMainCard>
          )}

          {/* Put-Call Parity Check */}
          {parityData.length > 0 && (
            <RallyMainCard title="بررسی برابری خرید-فروش (Put-Call Parity)" noPadding>
              <ScrollArea>
                <Table striped highlightOnHover withTableBorder style={{ minWidth: 600 }}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th style={{ textAlign: 'center' }}>اعمال</Table.Th>
                      <Table.Th style={{ textAlign: 'center' }}>C (خرید)</Table.Th>
                      <Table.Th style={{ textAlign: 'center' }}>P (فروش)</Table.Th>
                      <Table.Th style={{ textAlign: 'center' }}>C - P</Table.Th>
                      <Table.Th style={{ textAlign: 'center' }}>S - Ke⁻ʳᵀ</Table.Th>
                      <Table.Th style={{ textAlign: 'center' }}>اختلاف</Table.Th>
                      <Table.Th style={{ textAlign: 'center' }}>وضعیت</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {parityData.map((row) => (
                      <Table.Tr key={row.strike}>
                        <Table.Td style={{ textAlign: 'center', fontWeight: 600 }}>
                          {formatNum(row.strike)}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>{formatNum(row.callPrice)}</Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>{formatNum(row.putPrice)}</Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>{formatNum(row.lhs)}</Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>{formatNum(row.rhs)}</Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>{formatNum(row.diff)}</Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>
                          {row.violation ? (
                            <Badge color="red" variant="light" size="sm">آربیتراژ</Badge>
                          ) : (
                            <Badge color="green" variant="light" size="sm">عادی</Badge>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </RallyMainCard>
          )}
        </Stack>
      )}
    </>
  );
}

