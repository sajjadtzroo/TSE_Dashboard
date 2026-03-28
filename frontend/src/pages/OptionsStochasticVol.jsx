import { useState, useMemo, useCallback } from 'react';
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
  Button,
  Loader,
  Paper,
  Table,
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
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import RallyMainCard from '../components/RallyMainCard';
import RallyKPICard from '../components/RallyKPICard';
import PageHeader from '../components/PageHeader';
import { blackScholesPrice } from '../utils/blackScholes';
import useStochasticVolWorker from '../hooks/useStochasticVolWorker';
import { formatNum } from '../utils/formatUtils';
import rallyColors from '../theme/rallyColors';
import { GRID_STROKE, axisTick, TOOLTIP_STYLE } from '../components/charts/shared/chartStyles';
import { IconWaveSine, IconChartLine } from '@tabler/icons-react';

export default function OptionsStochasticVol() {
  /* ── Model selector ────────────────────────────────────────── */
  const [model, setModel] = useState('heston');
  const [lastMode, setLastMode] = useState(null);

  /* ── Heston parameters ─────────────────────────────────────── */
  const [hS, setHS] = useState(10000);
  const [hK, setHK] = useState(10000);
  const [hDays, setHDays] = useState(90);
  const [hR, setHR] = useState(23);
  const [hV0, setHV0] = useState(0.04);
  const [hKappa, setHKappa] = useState(2.0);
  const [hTheta, setHTheta] = useState(0.04);
  const [hXi, setHXi] = useState(0.5);
  const [hRho, setHRho] = useState(-0.7);
  const [hType, setHType] = useState('call');

  /* ── SABR parameters ───────────────────────────────────────── */
  const [sF, setSF] = useState(10000);
  const [sDays, setSDays] = useState(90);
  const [sAlpha, setSAlpha] = useState(0.3);
  const [sBeta, setSBeta] = useState(0.5);
  const [sRho, setSRho] = useState(-0.3);
  const [sNu, setSNu] = useState(0.4);

  /* ── Worker ────────────────────────────────────────────────── */
  const { result, running, error, run, cancel } = useStochasticVolWorker();

  /* ── Derived Heston values ─────────────────────────────────── */
  const hT = hDays / 365;
  const hRDec = hR / 100;

  /* ── BS price for comparison ───────────────────────────────── */
  const bsPrice = useMemo(() => {
    if (hS <= 0 || hK <= 0 || hT <= 0) return null;
    // Approximate sigma from sqrt(v0) for BS comparison
    const sigma = Math.sqrt(hV0);
    if (sigma <= 0) return null;
    return blackScholesPrice(hType, hS, hK, hT, hRDec, sigma);
  }, [hS, hK, hT, hRDec, hV0, hType]);

  /* ── Handlers ──────────────────────────────────────────────── */
  const handleHestonRun = useCallback(() => {
    setLastMode('hestonPrice');
    run('hestonPrice', {
      type: hType,
      params: { S: hS, K: hK, T: hT, r: hRDec, v0: hV0, kappa: hKappa, theta: hTheta, xi: hXi, rho: hRho },
    });
  }, [run, hType, hS, hK, hT, hRDec, hV0, hKappa, hTheta, hXi, hRho]);

  const handleHestonSurface = useCallback(() => {
    setLastMode('hestonSurface');
    run('hestonSurface', {
      baseParams: { S: hS, r: hRDec, v0: hV0, kappa: hKappa, theta: hTheta, xi: hXi, rho: hRho },
      strikes: [
        Math.round(hS * 0.8),
        Math.round(hS * 0.85),
        Math.round(hS * 0.9),
        Math.round(hS * 0.95),
        hS,
        Math.round(hS * 1.05),
        Math.round(hS * 1.1),
        Math.round(hS * 1.15),
        Math.round(hS * 1.2),
      ],
      expiries: [30 / 365, 60 / 365, 90 / 365, 180 / 365, 365 / 365],
    });
  }, [run, hS, hRDec, hV0, hKappa, hTheta, hXi, hRho]);

  const handleSabrRun = useCallback(() => {
    setLastMode('sabrSmile');
    const strikes = [];
    for (let i = -10; i <= 10; i++) strikes.push(Math.round(sF * (1 + i * 0.02)));
    run('sabrSmile', {
      F: sF,
      T: sDays / 365,
      alpha: sAlpha,
      beta: sBeta,
      rho: sRho,
      nu: sNu,
      strikes,
    });
  }, [run, sF, sDays, sAlpha, sBeta, sRho, sNu]);

  /* ── Surface table data ────────────────────────────────────── */
  const surfaceData = useMemo(() => {
    if (lastMode !== 'hestonSurface' || !result || !Array.isArray(result)) return null;
    // Group by expiry → { expiry, [strike]: iv }
    const strikeSet = [...new Set(result.map((r) => r.strike))].sort((a, b) => a - b);
    const expirySet = [...new Set(result.map((r) => r.expiry))].sort((a, b) => a - b);
    const rows = expirySet.map((exp) => {
      const row = { expiry: exp, expiryDays: Math.round(exp * 365) };
      for (const s of strikeSet) {
        const match = result.find((r) => r.strike === s && r.expiry === exp);
        row[`k_${s}`] = match ? (match.iv * 100).toFixed(2) : '-';
      }
      return row;
    });
    return { strikes: strikeSet, rows };
  }, [result, lastMode]);

  /* ── SABR smile chart data ─────────────────────────────────── */
  const smileData = useMemo(() => {
    if (lastMode !== 'sabrSmile' || !result || !Array.isArray(result)) return [];
    return result.map((r) => ({
      strike: r.strike,
      iv: Math.round(r.iv * 100 * 100) / 100, // percent with 2 decimals
    }));
  }, [result, lastMode]);

  /* ── Heston result accessors ───────────────────────────────── */
  const hestonPrice = lastMode === 'hestonPrice' && result ? result.price : null;
  const hestonGreeks = lastMode === 'hestonPrice' && result?.greeks ? result.greeks : null;
  const priceDiff =
    hestonPrice != null && bsPrice != null ? Math.abs(hestonPrice - bsPrice) : null;

  return (
    <>
      <PageHeader title={'مدل\u200Cهای نوسان تصادفی (Stochastic Volatility)'} />

      {/* Model Selector */}
      <RallyMainCard mb="md">
        <Group gap="md" align="center">
          <Text size="sm" fw={600}>{'انتخاب مدل'}</Text>
          <SegmentedControl
            value={model}
            onChange={setModel}
            data={[
              { value: 'heston', label: 'هستون (Heston)' },
              { value: 'sabr', label: 'SABR' },
            ]}
            size="sm"
          />
        </Group>
      </RallyMainCard>

      {/* ═══════════════════ HESTON MODE ═══════════════════ */}
      {model === 'heston' && (
        <>
          {/* Parameters */}
          <RallyMainCard mb="md">
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="md">
              <div>
                <NumberInput label={'قیمت سهم (S)'} value={hS} onChange={(v) => setHS(v || 0)} min={1} step={100} size="sm" />
                <Slider value={hS} onChange={setHS} min={100} max={100000} step={100} mt="xs" size="xs" color="rally-primary" />
              </div>
              <div>
                <NumberInput label={'قیمت اعمال (K)'} value={hK} onChange={(v) => setHK(v || 0)} min={1} step={100} size="sm" />
                <Slider value={hK} onChange={setHK} min={100} max={100000} step={100} mt="xs" size="xs" color="rally-primary" />
              </div>
              <div>
                <NumberInput label={'روز تا سررسید'} value={hDays} onChange={(v) => setHDays(v || 1)} min={1} max={730} size="sm" />
                <Slider value={hDays} onChange={setHDays} min={1} max={730} mt="xs" size="xs" color="rally-primary" />
              </div>
              <div>
                <NumberInput label={'نرخ بدون ریسک (٪)'} value={hR} onChange={(v) => setHR(v ?? 0)} min={0} max={50} step={0.5} decimalScale={1} size="sm" />
              </div>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="md">
              <div>
                <NumberInput label={'واریانس اولیه (v₀)'} value={hV0} onChange={(v) => setHV0(v ?? 0.04)} min={0.001} step={0.01} decimalScale={4} size="sm" />
                <Slider value={hV0} onChange={setHV0} min={0.001} max={0.5} step={0.001} mt="xs" size="xs" color="rally-primary" />
              </div>
              <div>
                <NumberInput label={'سرعت بازگشت به میانگین (κ)'} value={hKappa} onChange={(v) => setHKappa(v ?? 2.0)} min={0.01} step={0.1} decimalScale={2} size="sm" />
                <Slider value={hKappa} onChange={setHKappa} min={0.01} max={10} step={0.1} mt="xs" size="xs" color="rally-primary" />
              </div>
              <div>
                <NumberInput label={'واریانس بلندمدت (θ)'} value={hTheta} onChange={(v) => setHTheta(v ?? 0.04)} min={0.001} step={0.01} decimalScale={4} size="sm" />
                <Slider value={hTheta} onChange={setHTheta} min={0.001} max={0.5} step={0.001} mt="xs" size="xs" color="rally-primary" />
              </div>
              <div>
                <NumberInput label={'نوسان نوسان (ξ)'} value={hXi} onChange={(v) => setHXi(v ?? 0.5)} min={0.01} step={0.1} decimalScale={2} size="sm" />
                <Slider value={hXi} onChange={setHXi} min={0.01} max={3} step={0.05} mt="xs" size="xs" color="rally-primary" />
              </div>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
              <div>
                <NumberInput label={'همبستگی (ρ)'} value={hRho} onChange={(v) => setHRho(v ?? -0.7)} min={-1} max={1} step={0.05} decimalScale={2} size="sm" />
                <Slider value={hRho} onChange={setHRho} min={-1} max={1} step={0.05} mt="xs" size="xs" color="rally-primary" />
              </div>
              <div>
                <Text size="sm" fw={500} mb={4}>{'نوع اختیار'}</Text>
                <SegmentedControl
                  value={hType}
                  onChange={setHType}
                  data={[
                    { value: 'call', label: 'خرید (Call)' },
                    { value: 'put', label: 'فروش (Put)' },
                  ]}
                  fullWidth
                  size="sm"
                />
              </div>
              <div>
                <Group gap="sm" mt="xl" wrap="wrap">
                  <Button
                    onClick={handleHestonRun}
                    loading={running && lastMode === 'hestonPrice'}
                    color="rally-primary"
                    size="sm"
                    leftSection={<IconWaveSine size={16} />}
                  >
                    {'محاسبه قیمت هستون'}
                  </Button>
                  <Button
                    onClick={handleHestonSurface}
                    loading={running && lastMode === 'hestonSurface'}
                    variant="light"
                    color="rally-blue"
                    size="sm"
                    leftSection={<IconChartLine size={16} />}
                  >
                    {'تولید سطح نوسان'}
                  </Button>
                </Group>
              </div>
              <div>
                {running && (
                  <Group gap="xs" mt="md" justify="center">
                    <Loader size="sm" color={rallyColors.primary} />
                    <Text size="sm" c="dimmed">{'در حال محاسبه...'}</Text>
                  </Group>
                )}
              </div>
            </SimpleGrid>
          </RallyMainCard>

          {/* KPI Cards — Heston Price Result */}
          {lastMode === 'hestonPrice' && hestonPrice != null && (
            <SimpleGrid cols={{ base: 2, md: 4 }} mb="md">
              <RallyKPICard
                title={'قیمت هستون'}
                value={formatNum(Math.round(hestonPrice * 100) / 100)}
                icon={IconWaveSine}
                color={rallyColors.primary}
                animateValue
              />
              <RallyKPICard
                title={'قیمت بلک\u200Cشولز'}
                value={bsPrice != null ? formatNum(Math.round(bsPrice * 100) / 100) : '-'}
                icon={IconChartLine}
                color={rallyColors.blue}
                animateValue
              />
              <RallyKPICard
                title={'اختلاف'}
                value={priceDiff != null ? formatNum(Math.round(priceDiff * 100) / 100) : '-'}
                color={rallyColors.yellow}
                animateValue
              />
              <RallyKPICard
                title={'یونانی\u200Cها'}
                value={hestonGreeks ? `Δ ${(hestonGreeks.delta ?? 0).toFixed(4)}` : '-'}
                subtitle={
                  hestonGreeks
                    ? `Γ ${(hestonGreeks.gamma ?? 0).toFixed(6)} | V ${(hestonGreeks.vega ?? 0).toFixed(4)} | ρ ${(hestonGreeks.rho ?? 0).toFixed(4)}`
                    : undefined
                }
                color={rallyColors.purple}
                animateValue
              />
            </SimpleGrid>
          )}

          {/* Greeks Detail */}
          {lastMode === 'hestonPrice' && hestonGreeks && (
            <RallyMainCard title={'یونانی\u200Cهای هستون'} mb="md">
              <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="md">
                <Paper p="md" radius="md" style={{ background: 'rgba(42, 46, 62, 0.3)' }}>
                  <Text size="xs" c="dimmed">Delta (Δ)</Text>
                  <Text size="lg" fw={700} c={rallyColors.primary}>{(hestonGreeks.delta ?? 0).toFixed(4)}</Text>
                </Paper>
                <Paper p="md" radius="md" style={{ background: 'rgba(42, 46, 62, 0.3)' }}>
                  <Text size="xs" c="dimmed">Gamma (Γ)</Text>
                  <Text size="lg" fw={700} c={rallyColors.green}>{(hestonGreeks.gamma ?? 0).toFixed(6)}</Text>
                </Paper>
                <Paper p="md" radius="md" style={{ background: 'rgba(42, 46, 62, 0.3)' }}>
                  <Text size="xs" c="dimmed">Vega (V)</Text>
                  <Text size="lg" fw={700} c={rallyColors.blue}>{(hestonGreeks.vega ?? 0).toFixed(4)}</Text>
                </Paper>
                <Paper p="md" radius="md" style={{ background: 'rgba(42, 46, 62, 0.3)' }}>
                  <Text size="xs" c="dimmed">Rho (ρ)</Text>
                  <Text size="lg" fw={700} c={rallyColors.yellow}>{(hestonGreeks.rho ?? 0).toFixed(4)}</Text>
                </Paper>
                <Paper p="md" radius="md" style={{ background: 'rgba(42, 46, 62, 0.3)' }}>
                  <Text size="xs" c="dimmed">Theta (Θ)</Text>
                  <Text size="lg" fw={700} c={rallyColors.red}>{(hestonGreeks.theta ?? 0).toFixed(4)}</Text>
                </Paper>
              </SimpleGrid>
            </RallyMainCard>
          )}

          {/* Implied Volatility Surface Table */}
          {lastMode === 'hestonSurface' && surfaceData && (
            <RallyMainCard title={'سطح نوسان ضمنی (Implied Volatility Surface)'} mb="md" fullscreenable>
              <Paper p="md" radius="md" style={{ background: 'rgba(42, 46, 62, 0.3)', overflowX: 'auto' }}>
                <Table striped highlightOnHover withTableBorder withColumnBorders>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th style={{ textAlign: 'center' }}>{'سررسید (روز)'}</Table.Th>
                      {surfaceData.strikes.map((k) => (
                        <Table.Th key={k} style={{ textAlign: 'center' }}>
                          {formatNum(k)}
                        </Table.Th>
                      ))}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {surfaceData.rows.map((row) => (
                      <Table.Tr key={row.expiryDays}>
                        <Table.Td style={{ textAlign: 'center', fontWeight: 600 }}>
                          {formatNum(row.expiryDays)}
                        </Table.Td>
                        {surfaceData.strikes.map((k) => {
                          const val = row[`k_${k}`];
                          return (
                            <Table.Td key={k} style={{ textAlign: 'center' }}>
                              {val !== '-' ? `${val}٪` : '-'}
                            </Table.Td>
                          );
                        })}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>
              <Text size="xs" c="dimmed" mt="sm">
                {'مقادیر نوسان ضمنی (IV) بر حسب درصد نمایش داده شده\u200Cاند. ستون\u200Cها: قیمت اعمال، ردیف\u200Cها: سررسید.'}
              </Text>
            </RallyMainCard>
          )}

          {/* Error display */}
          {error && lastMode?.startsWith('heston') && (
            <RallyMainCard mb="md">
              <Paper p="md" radius="md" style={{ background: 'rgba(239, 68, 68, 0.1)', border: `1px solid ${rallyColors.red}30` }}>
                <Text size="sm" c={rallyColors.red} fw={600}>{'خطا در محاسبه'}</Text>
                <Text size="xs" c="dimmed" mt="xs">{error}</Text>
              </Paper>
            </RallyMainCard>
          )}
        </>
      )}

      {/* ═══════════════════ SABR MODE ════════════════════ */}
      {model === 'sabr' && (
        <>
          {/* Parameters */}
          <RallyMainCard mb="md">
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md" mb="md">
              <div>
                <NumberInput label={'قیمت آتی (F)'} value={sF} onChange={(v) => setSF(v || 0)} min={1} step={100} size="sm" />
                <Slider value={sF} onChange={setSF} min={100} max={100000} step={100} mt="xs" size="xs" color="rally-primary" />
              </div>
              <div>
                <NumberInput label={'روز تا سررسید'} value={sDays} onChange={(v) => setSDays(v || 1)} min={1} max={730} size="sm" />
                <Slider value={sDays} onChange={setSDays} min={1} max={730} mt="xs" size="xs" color="rally-primary" />
              </div>
              <div>
                <NumberInput label={'آلفا (α)'} value={sAlpha} onChange={(v) => setSAlpha(v ?? 0.3)} min={0.01} step={0.01} decimalScale={3} size="sm" />
                <Slider value={sAlpha} onChange={setSAlpha} min={0.01} max={2} step={0.01} mt="xs" size="xs" color="rally-primary" />
              </div>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md" mb="md">
              <div>
                <NumberInput label={'بتا (β)'} value={sBeta} onChange={(v) => setSBeta(v ?? 0.5)} min={0} max={1} step={0.1} decimalScale={2} size="sm" />
                <Slider value={sBeta} onChange={setSBeta} min={0} max={1} step={0.05} mt="xs" size="xs" color="rally-primary" />
              </div>
              <div>
                <NumberInput label={'همبستگی (ρ)'} value={sRho} onChange={(v) => setSRho(v ?? -0.3)} min={-1} max={1} step={0.05} decimalScale={2} size="sm" />
                <Slider value={sRho} onChange={setSRho} min={-1} max={1} step={0.05} mt="xs" size="xs" color="rally-primary" />
              </div>
              <div>
                <NumberInput label={'نوسان نوسان (ν)'} value={sNu} onChange={(v) => setSNu(v ?? 0.4)} min={0.01} step={0.05} decimalScale={2} size="sm" />
                <Slider value={sNu} onChange={setSNu} min={0.01} max={3} step={0.05} mt="xs" size="xs" color="rally-primary" />
              </div>
            </SimpleGrid>

            <Group gap="md" align="center">
              <Button
                onClick={handleSabrRun}
                loading={running && lastMode === 'sabrSmile'}
                color="rally-primary"
                size="sm"
                leftSection={<IconWaveSine size={16} />}
              >
                {'محاسبه لبخند SABR'}
              </Button>
              {running && lastMode === 'sabrSmile' && (
                <Group gap="xs">
                  <Loader size="sm" color={rallyColors.primary} />
                  <Text size="sm" c="dimmed">{'در حال محاسبه...'}</Text>
                </Group>
              )}
            </Group>
          </RallyMainCard>

          {/* SABR Volatility Smile Chart */}
          {lastMode === 'sabrSmile' && smileData.length > 0 && (
            <RallyMainCard title={'لبخند نوسان SABR (Volatility Smile)'} mb="md" fullscreenable>
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={smileData} margin={{ top: 10, right: 20, bottom: 20, left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis
                    dataKey="strike"
                    tick={axisTick(10)}
                    tickFormatter={(v) => formatNum(v)}
                    label={{
                      value: 'قیمت اعمال',
                      position: 'insideBottom',
                      offset: -10,
                      fontSize: 11,
                      fill: rallyColors.textSecondary,
                    }}
                  />
                  <YAxis
                    tick={axisTick(10)}
                    tickFormatter={(v) => `${v}٪`}
                    label={{
                      value: 'نوسان ضمنی (٪)',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 0,
                      fontSize: 11,
                      fill: rallyColors.textSecondary,
                    }}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v) => [`${v}٪`, 'نوسان ضمنی']}
                    labelFormatter={(v) => `اعمال: ${formatNum(v)}`}
                  />
                  <ReferenceLine
                    x={sF}
                    stroke={rallyColors.yellow}
                    strokeDasharray="5 5"
                    label={{
                      value: `F: ${formatNum(sF)}`,
                      fill: rallyColors.yellow,
                      fontSize: 10,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="iv"
                    stroke={rallyColors.primary}
                    strokeWidth={2}
                    dot={{ r: 3, fill: rallyColors.primary }}
                    activeDot={{ r: 5, fill: rallyColors.primary, stroke: rallyColors.elevated }}
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* Data table below chart */}
              <Paper p="md" radius="md" mt="md" style={{ background: 'rgba(42, 46, 62, 0.3)', overflowX: 'auto' }}>
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th style={{ textAlign: 'center' }}>{'قیمت اعمال'}</Table.Th>
                      <Table.Th style={{ textAlign: 'center' }}>{'نوسان ضمنی (٪)'}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {smileData.map((row) => (
                      <Table.Tr key={row.strike}>
                        <Table.Td style={{ textAlign: 'center' }}>{formatNum(row.strike)}</Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>{row.iv}٪</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>

              <Text size="xs" c="dimmed" mt="sm">
                {'لبخند نوسان SABR نشان\u200Cدهنده نوسان ضمنی در قیمت\u200Cهای اعمال مختلف است. خط عمودی زرد: قیمت آتی (F).'}
              </Text>
            </RallyMainCard>
          )}

          {/* Error display */}
          {error && lastMode === 'sabrSmile' && (
            <RallyMainCard mb="md">
              <Paper p="md" radius="md" style={{ background: 'rgba(239, 68, 68, 0.1)', border: `1px solid ${rallyColors.red}30` }}>
                <Text size="sm" c={rallyColors.red} fw={600}>{'خطا در محاسبه'}</Text>
                <Text size="xs" c="dimmed" mt="xs">{error}</Text>
              </Paper>
            </RallyMainCard>
          )}
        </>
      )}
    </>
  );
}
