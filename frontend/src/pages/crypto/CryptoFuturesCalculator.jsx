import { useState, useMemo } from 'react';
import {
  SimpleGrid,
  NumberInput,
  Slider,
  Group,
  Text,
  Badge,
  Stack,
  Select,
  Divider,
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
import RefreshButton from '../../components/RefreshButton';
import useDeribitFutures from '../../hooks/useDeribitFutures';
import rallyColors from '../../theme/rallyColors';
import { formatNum, toPersianNum } from '../../utils/formatUtils';
import { GRID_STROKE, axisTick, TOOLTIP_STYLE } from '../../components/charts/shared/chartStyles';
import { IconChartLine, IconCurrencyBitcoin, IconTrendingUp } from '@tabler/icons-react';

function KV({ label, value, color }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed">{label}</Text>
      <Text size="sm" fw={600} c={color}>{value}</Text>
    </Stack>
  );
}

export default function CryptoFuturesCalculator() {
  const { perpetuals, dated, loading, refetch } = useDeribitFutures();

  // Manual inputs (can override from live data)
  const [spotPrice, setSpotPrice] = useState(50000);
  const [futuresPrice, setFuturesPrice] = useState(50500);
  const [daysToExpiry, setDaysToExpiry] = useState(30);
  const [riskFreeRate, setRiskFreeRate] = useState(5);  // USD SOFR

  // Fill from live data
  const btcPerp = perpetuals.find((p) => p.symbol === 'BTC');

  const handleFillBTC = () => {
    if (btcPerp?.index_price) setSpotPrice(Math.round(btcPerp.index_price));
    if (btcPerp?.mark_price) setFuturesPrice(Math.round(btcPerp.mark_price));
  };

  // Computations
  const T = daysToExpiry / 365;
  const r = riskFreeRate / 100;

  const computations = useMemo(() => {
    if (spotPrice <= 0 || futuresPrice <= 0 || T <= 0) return null;

    const basis = futuresPrice - spotPrice;
    const basisPct = (basis / spotPrice) * 100;

    // Fair value based on cost-of-carry (simple: no dividends)
    const fairValue = spotPrice * Math.exp(r * T);
    const mispricing = futuresPrice - fairValue;
    const mispricingPct = (mispricing / fairValue) * 100;

    // Annualized basis rate — guard against overflow when T is very small
    const rawBasis = (Math.pow(futuresPrice / spotPrice, 1 / T) - 1) * 100;
    const annualizedBasis = isFinite(rawBasis) ? rawBasis : basisPct * (365 / daysToExpiry);

    // Implied funding: how much annualized carry is priced in
    const impliedFunding = annualizedBasis - riskFreeRate;

    // Carry P&L scenarios: how much carry costs at various holding periods
    const carryScenarios = [1, 7, 14, 30, 60, 90].map((days) => {
      const t = days / 365;
      const fairV = spotPrice * Math.exp(r * t);
      // Guard exp overflow — clamp annualized basis to ±1000%
      const clampedBasis = Math.max(-1000, Math.min(1000, annualizedBasis));
      const futureP = spotPrice * Math.exp(clampedBasis / 100 * t);
      return {
        days,
        fairValue: Math.round(fairV * 100) / 100,
        futurePrice: Math.round(futureP * 100) / 100,
        premium: Math.round((futureP - fairV) * 100) / 100,
      };
    });

    // Basis chart: basis at different spot prices
    const clampedAnnualized = Math.max(-1000, Math.min(1000, annualizedBasis));
    const basisChart = [];
    for (let i = -20; i <= 20; i += 2) {
      const pct = i / 100;
      const s = spotPrice * (1 + pct);
      const f = s * Math.exp(clampedAnnualized / 100 * T);
      basisChart.push({
        spot: Math.round(s),
        basis: Math.round((f - s) * 10) / 10,
        pct: i,
      });
    }

    return { basis, basisPct, fairValue, mispricing, mispricingPct, annualizedBasis, impliedFunding, carryScenarios, basisChart };
  }, [spotPrice, futuresPrice, T, r, riskFreeRate]);

  // Dated futures for reference table
  const datedBTC = useMemo(() => dated.filter((d) => d.base_currency === 'BTC'), [dated]);

  return (
    <>
      <PageHeader title="محاسبه‌گر فیوچرز رمزارز — Deribit">
        <RefreshButton onRefreshComplete={refetch} />
      </PageHeader>

      {/* Market data quick fill */}
      {btcPerp && (
        <RallyMainCard mb="md" noPadding>
          <Group p="md" gap="md" wrap="wrap">
            <Text size="sm" c="dimmed">داده زنده Deribit:</Text>
            <Badge color="rally-primary" variant="light">BTC Spot: ${formatNum(btcPerp.index_price?.toFixed(0))}</Badge>
            <Badge color="rally-blue" variant="light">BTC Perp: ${formatNum(btcPerp.mark_price?.toFixed(0))}</Badge>
            {btcPerp.funding_8h != null && (
              <Badge color={btcPerp.funding_8h >= 0 ? 'green' : 'red'} variant="light">
                فاندینگ: {(btcPerp.funding_8h * 100).toFixed(4)}%
              </Badge>
            )}
            <Badge
              color="rally-primary"
              variant="filled"
              style={{ cursor: 'pointer' }}
              onClick={handleFillBTC}
            >
              پر کردن با داده BTC
            </Badge>
          </Group>
        </RallyMainCard>
      )}

      {/* Parameters */}
      <RallyMainCard mb="md" title="پارامترها">
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          <div>
            <NumberInput
              label="قیمت اسپات (S) — USD"
              value={spotPrice}
              onChange={(v) => setSpotPrice(v || 0)}
              min={1}
              step={100}
              size="sm"
              prefix="$"
              thousandSeparator=","
            />
            <Slider value={spotPrice} onChange={setSpotPrice} min={1000} max={200000} step={100} mt="xs" size="xs" color="rally-primary" />
          </div>
          <div>
            <NumberInput
              label="قیمت فیوچرز (F) — USD"
              value={futuresPrice}
              onChange={(v) => setFuturesPrice(v || 0)}
              min={1}
              step={100}
              size="sm"
              prefix="$"
              thousandSeparator=","
            />
            <Slider value={futuresPrice} onChange={setFuturesPrice} min={1000} max={200000} step={100} mt="xs" size="xs" color="rally-blue" />
          </div>
          <div>
            <NumberInput
              label="روز تا سررسید"
              value={daysToExpiry}
              onChange={(v) => setDaysToExpiry(v || 1)}
              min={1}
              max={730}
              size="sm"
            />
            <Slider value={daysToExpiry} onChange={setDaysToExpiry} min={1} max={365} mt="xs" size="xs" color="rally-primary" />
          </div>
          <div>
            <NumberInput
              label="نرخ بدون ریسک (٪ USD SOFR)"
              value={riskFreeRate}
              onChange={(v) => setRiskFreeRate(v ?? 5)}
              min={0}
              max={20}
              step={0.25}
              decimalScale={2}
              size="sm"
            />
            <Slider value={riskFreeRate} onChange={setRiskFreeRate} min={0} max={15} step={0.25} mt="xs" size="xs" color="rally-primary" />
          </div>
        </SimpleGrid>
      </RallyMainCard>

      {computations && (
        <>
          {/* KPI Cards */}
          <SimpleGrid cols={{ base: 2, md: 4 }} mb="md">
            <RallyKPICard
              title="بیسیس"
              value={`$${formatNum(computations.basis?.toFixed(2))}`}
              subtitle={`${computations.basisPct?.toFixed(3)}%`}
              icon={IconChartLine}
              color={computations.basis >= 0 ? rallyColors.green : rallyColors.red}
              variant="accent-bar"
            />
            <RallyKPICard
              title="ارزش منصفانه"
              value={`$${formatNum(computations.fairValue?.toFixed(2))}`}
              icon={IconCurrencyBitcoin}
              color={rallyColors.primary}
              variant="accent-bar"
            />
            <RallyKPICard
              title="بیسیس سالانه"
              value={`${computations.annualizedBasis?.toFixed(2)}%`}
              icon={IconTrendingUp}
              color={computations.annualizedBasis >= 0 ? rallyColors.blue : rallyColors.red}
              variant="accent-bar"
            />
            <RallyKPICard
              title="فاندینگ ضمنی"
              value={`${computations.impliedFunding?.toFixed(2)}%`}
              subtitle={computations.impliedFunding >= 0 ? 'بازار صعودی' : 'بازار نزولی'}
              icon={IconTrendingUp}
              color={computations.impliedFunding >= 0 ? rallyColors.green : rallyColors.red}
              variant="accent-bar"
            />
          </SimpleGrid>

          {/* Carry Scenarios Table */}
          <RallyMainCard mb="md" title="سناریوهای کری کاست">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['روز نگهداری', 'ارزش منصفانه', 'قیمت فیوچرز', 'پریمیوم'].map((h) => (
                      <th key={h} style={{ padding: '6px 12px', textAlign: 'end', color: 'rgba(156,163,175,0.8)', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {computations.carryScenarios.map((s) => (
                    <tr key={s.days} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '6px 12px', textAlign: 'end' }}>{s.days} روز</td>
                      <td style={{ padding: '6px 12px', textAlign: 'end' }}>${formatNum(s.fairValue)}</td>
                      <td style={{ padding: '6px 12px', textAlign: 'end' }}>${formatNum(s.futurePrice)}</td>
                      <td style={{ padding: '6px 12px', textAlign: 'end', color: s.premium >= 0 ? rallyColors.green : rallyColors.red, fontWeight: 600 }}>
                        ${formatNum(s.premium)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </RallyMainCard>

          {/* Basis Chart */}
          <RallyMainCard mb="md" title="بیسیس به ازای قیمت اسپات" fullscreenable>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={computations.basisChart} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="pct" tickFormatter={(v) => `${v}%`} tick={axisTick()} />
                <YAxis tickFormatter={(v) => `$${v}`} tick={axisTick()} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [`$${v}`, 'بیسیس']}
                  labelFormatter={(l) => `تغییر اسپات: ${l}%`}
                />
                <ReferenceLine x={0} stroke={rallyColors.primary} strokeDasharray="4 4" />
                <ReferenceLine y={0} stroke={rallyColors.yellow} strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="basis"
                  stroke={rallyColors.blue}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </RallyMainCard>
        </>
      )}

      {/* Live dated futures table for reference */}
      {datedBTC.length > 0 && (
        <RallyMainCard title="فیوچرز تاریخ‌دار BTC — مرجع">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['قرارداد', 'سررسید', 'مارک پرایس', 'بازده ۲۴h', 'بهره باز'].map((h) => (
                    <th key={h} style={{ padding: '6px 12px', textAlign: 'end', color: 'rgba(156,163,175,0.8)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datedBTC.map((f) => (
                  <tr key={f.instrument_name} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '6px 12px', fontFamily: 'monospace' }}>{f.instrument_name}</td>
                    <td style={{ padding: '6px 12px', textAlign: 'end' }}>{f.expiry}</td>
                    <td style={{ padding: '6px 12px', textAlign: 'end' }}>{f.mark_price != null ? `$${formatNum(f.mark_price?.toFixed(0))}` : '-'}</td>
                    <td style={{ padding: '6px 12px', textAlign: 'end', color: f.price_change >= 0 ? rallyColors.green : rallyColors.red, fontWeight: 600 }}>
                      {f.price_change != null ? `${f.price_change > 0 ? '+' : ''}${f.price_change.toFixed(2)}%` : '-'}
                    </td>
                    <td style={{ padding: '6px 12px', textAlign: 'end' }}>{f.open_interest != null ? formatNum(Math.round(f.open_interest)) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </RallyMainCard>
      )}
    </>
  );
}
