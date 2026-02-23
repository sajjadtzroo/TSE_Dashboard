import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  SimpleGrid,
  NumberInput,
  Slider,
  SegmentedControl,
  Group,
  Text,
  Badge,
  Button,
  Stack,
  Table,
  ScrollArea,
  Select,
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
} from 'recharts';
import RallyMainCard from '../components/RallyMainCard';
import RallyKPICard from '../components/RallyKPICard';
import PageHeader from '../components/PageHeader';
import { simulateHedging, runMultipleSimulations } from '../utils/hedgingSimulator';
import { formatNum, toPersianNum } from '../utils/formatUtils';
import rallyColors from '../theme/rallyColors';
import { GRID_STROKE, axisTick, TOOLTIP_STYLE } from '../components/charts/shared/chartStyles';
import { IconShieldCheck, IconChartBar, IconCash, IconRefresh, IconPlugConnected } from '@tabler/icons-react';
import { useOptionsUnderlyings, useOptionsChain } from '../hooks/useMarketData';
import { computeT } from '../utils/dateUtils';
import { impliedVolatility } from '../utils/blackScholes';

export default function OptionsHedging() {
  const [stockPrice, setStockPrice] = useState(10000);
  const [strikePrice, setStrikePrice] = useState(10000);
  const [daysToExpiry, setDaysToExpiry] = useState(60);
  const [riskFreeRate, setRiskFreeRate] = useState(23);
  const [volatility, setVolatility] = useState(30);
  const [optionType, setOptionType] = useState('call');
  const [rebalFreq, setRebalFreq] = useState('daily');
  const [numSims, setNumSims] = useState(30);
  const [seed, setSeed] = useState(42);

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
    const T = days / 365;
    const r = riskFreeRate / 100;
    const premium = contract.last || contract.close;
    if (S > 0 && T > 0 && premium > 0 && contract.strike_price > 0) {
      const iv = impliedVolatility(contract.option_type, premium, S, contract.strike_price, T, r);
      if (iv && iv > 0.01 && iv < 5) setVolatility(Math.round(iv * 100 * 10) / 10);
    }
  }, [selectedContractSymbol, allContracts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Single simulation
  const singleSim = useMemo(() => {
    if (stockPrice <= 0 || strikePrice <= 0 || daysToExpiry <= 0 || volatility <= 0) return null;
    return simulateHedging({
      type: optionType,
      S0: stockPrice,
      K: strikePrice,
      T: daysToExpiry / 365,
      r: riskFreeRate / 100,
      sigma: volatility / 100,
      qty: 1,
      rebalFreq,
      seed,
    });
  }, [stockPrice, strikePrice, daysToExpiry, riskFreeRate, volatility, optionType, rebalFreq, seed]);

  // Multi simulation results (computed on demand)
  const [multiResult, setMultiResult] = useState(null);

  const runMultiSim = useCallback(() => {
    if (stockPrice <= 0 || strikePrice <= 0 || daysToExpiry <= 0 || volatility <= 0) return;
    const result = runMultipleSimulations({
      type: optionType,
      S0: stockPrice,
      K: strikePrice,
      T: daysToExpiry / 365,
      r: riskFreeRate / 100,
      sigma: volatility / 100,
      qty: 1,
      rebalFreq,
    }, numSims);
    setMultiResult(result);
  }, [stockPrice, strikePrice, daysToExpiry, riskFreeRate, volatility, optionType, rebalFreq, numSims]);

  // Price path chart data
  const priceData = singleSim?.prices?.filter((_, i) => i % Math.max(1, Math.floor(singleSim.prices.length / 100)) === 0 || i === singleSim.prices.length - 1) || [];

  // Hedge log for P&L chart
  const pnlData = singleSim?.hedgeLog || [];

  return (
    <>
      <PageHeader title="شبیه‌ساز پوشش دلتا (Delta Hedging Simulator)" />

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
            <Badge color="rally-green" variant="light" size="lg">
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
              styles={{ root: { background: 'rgba(148, 163, 184, 0.06)' } }}
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
            <Slider value={stockPrice} onChange={setStockPrice} min={100} max={100000} step={100} mt="xs" size="xs" color="rally-green" />
          </div>
          <div>
            <NumberInput label="قیمت اعمال (K)" value={strikePrice} onChange={(v) => setStrikePrice(v || 0)} min={1} step={100} size="sm" />
            <Slider value={strikePrice} onChange={setStrikePrice} min={100} max={100000} step={100} mt="xs" size="xs" color="rally-green" />
          </div>
          <div>
            <NumberInput label="روز تا سررسید" value={daysToExpiry} onChange={(v) => setDaysToExpiry(v || 1)} min={1} max={365} size="sm" />
            <Slider value={daysToExpiry} onChange={setDaysToExpiry} min={1} max={365} mt="xs" size="xs" color="rally-green" />
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
            <Text size="sm" fw={500} mb={4}>فرکانس بازتوزیع</Text>
            <SegmentedControl
              value={rebalFreq}
              onChange={setRebalFreq}
              data={[{ value: 'daily', label: 'روزانه' }, { value: 'weekly', label: 'هفتگی' }]}
              fullWidth
              size="sm"
            />
          </div>
          <div>
            <NumberInput label="بذر تصادفی" value={seed} onChange={(v) => setSeed(v || 1)} min={1} max={99999} size="sm" />
          </div>
        </SimpleGrid>
      </RallyMainCard>

      {/* KPI Cards */}
      {singleSim && (
        <SimpleGrid cols={{ base: 2, md: 4 }} mb="md">
          <RallyKPICard
            title="حق بیمه دریافتی"
            value={formatNum(singleSim.premiumCollected)}
            icon={IconCash}
            color={rallyColors.green}
            variant="accent-bar"
          />
          <RallyKPICard
            title="بازپرداخت نهایی"
            value={formatNum(singleSim.finalPayoff)}
            color={rallyColors.red}
            variant="accent-bar"
          />
          <RallyKPICard
            title="سود/زیان کل پوشش"
            value={formatNum(singleSim.totalPnL)}
            color={singleSim.totalPnL >= 0 ? rallyColors.green : rallyColors.red}
            variant="accent-bar"
          />
          <RallyKPICard
            title="هزینه پوشش"
            value={formatNum(singleSim.hedgingCost)}
            icon={IconShieldCheck}
            color={rallyColors.yellow}
            variant="accent-bar"
          />
        </SimpleGrid>
      )}

      <Stack gap="md">
        {/* Price Path Chart */}
        {priceData.length > 0 && (
          <RallyMainCard title="مسیر قیمت (GBM) و نسبت پوشش" fullscreenable>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={pnlData} margin={{ top: 10, right: 20, bottom: 20, left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis
                  dataKey="day"
                  tick={axisTick(10)}
                  label={{ value: 'روز', position: 'insideBottom', offset: -10, fontSize: 11, fill: rallyColors.textSecondary }}
                />
                <YAxis yAxisId="price" tick={axisTick(10)} tickFormatter={(v) => formatNum(v)} />
                <YAxis yAxisId="delta" orientation="right" tick={axisTick(10)} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v, name) => {
                    const labels = { price: 'قیمت سهم', delta: 'دلتا' };
                    return [typeof v === 'number' ? v.toFixed(2) : v, labels[name] || name];
                  }}
                  labelFormatter={(v) => `روز ${v}`}
                />
                <Legend formatter={(v) => {
                  const labels = { price: 'قیمت سهم', delta: 'نسبت پوشش (دلتا)' };
                  return labels[v] || v;
                }} />
                <Line yAxisId="price" type="monotone" dataKey="price" stroke={rallyColors.blue} strokeWidth={2} dot={false} />
                <Line yAxisId="delta" type="stepAfter" dataKey="delta" stroke={rallyColors.green} strokeWidth={1.5} dot={false} />
                <ReferenceLine yAxisId="price" y={strikePrice} stroke={rallyColors.yellow} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </RallyMainCard>
        )}

        {/* Cumulative P&L Chart */}
        {pnlData.length > 0 && (
          <RallyMainCard title="سود/زیان تجمعی پوشش" fullscreenable>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={pnlData} margin={{ top: 10, right: 20, bottom: 20, left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="day" tick={axisTick(10)} />
                <YAxis tick={axisTick(10)} tickFormatter={(v) => formatNum(v)} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [formatNum(v), 'سود/زیان']}
                  labelFormatter={(v) => `روز ${v}`}
                />
                <ReferenceLine y={0} stroke={rallyColors.textSecondary} strokeDasharray="3 3" />
                <Line type="monotone" dataKey="pnl" stroke={rallyColors.green} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </RallyMainCard>
        )}

        {/* Rebalance Actions Table */}
        {pnlData.length > 0 && (
          <RallyMainCard title="جدول عملیات بازتوزیع" noPadding>
            <ScrollArea h={300}>
              <Table striped highlightOnHover withTableBorder style={{ minWidth: 700 }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ textAlign: 'center' }}>روز</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>قیمت سهم</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>دلتا</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>سهام نگه‌داشته</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>سهام معامله</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>هزینه معامله</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>سود/زیان</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {pnlData.map((row) => (
                    <Table.Tr key={row.step}>
                      <Table.Td style={{ textAlign: 'center' }}>{row.day}</Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>{formatNum(row.price)}</Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>{row.delta.toFixed(4)}</Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>{row.sharesHeld.toFixed(4)}</Table.Td>
                      <Table.Td style={{ textAlign: 'center', color: row.tradeShares > 0 ? rallyColors.green : row.tradeShares < 0 ? rallyColors.red : 'inherit' }}>
                        {row.tradeShares > 0 ? '+' : ''}{row.tradeShares.toFixed(4)}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>{formatNum(row.tradeCost)}</Table.Td>
                      <Table.Td style={{ textAlign: 'center', color: row.pnl >= 0 ? rallyColors.green : rallyColors.red }}>
                        {formatNum(row.pnl)}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </RallyMainCard>
        )}

        {/* Multi-Simulation Section */}
        <RallyMainCard
          title={
            <Group gap="sm">
              <Text fw={700} size="lg">شبیه‌سازی چندگانه</Text>
              <NumberInput
                value={numSims}
                onChange={(v) => setNumSims(v || 10)}
                min={10}
                max={200}
                step={10}
                size="xs"
                style={{ width: 80 }}
              />
              <Button
                size="xs"
                variant="light"
                color="rally-green"
                leftSection={<IconRefresh size={14} />}
                onClick={runMultiSim}
              >
                اجرا
              </Button>
            </Group>
          }
        >
          {!multiResult && (
            <Text size="sm" c="dimmed" ta="center" py="lg">
              برای مشاهده توزیع سود/زیان، دکمه اجرا را بزنید
            </Text>
          )}

          {multiResult && (
            <Stack gap="md">
              <SimpleGrid cols={{ base: 2, md: 3 }}>
                <RallyKPICard
                  title="میانگین سود/زیان"
                  value={formatNum(multiResult.avgPnL)}
                  color={multiResult.avgPnL >= 0 ? rallyColors.green : rallyColors.red}
                  variant="accent-bar"
                />
                <RallyKPICard
                  title="انحراف معیار"
                  value={formatNum(multiResult.stdPnL)}
                  color={rallyColors.blue}
                  variant="accent-bar"
                />
                <RallyKPICard
                  title="تعداد شبیه‌سازی"
                  value={toPersianNum(numSims)}
                  icon={IconChartBar}
                  color={rallyColors.purple}
                  variant="accent-bar"
                />
              </SimpleGrid>

              {/* P&L Distribution Histogram */}
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={multiResult.histogram} margin={{ top: 10, right: 20, bottom: 20, left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="range" tick={axisTick(10)} angle={-30} textAnchor="end" />
                  <YAxis tick={axisTick(10)} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v) => [v, 'تعداد']}
                    labelFormatter={(v) => `سود/زیان: ${v}`}
                  />
                  <ReferenceLine x={0} stroke={rallyColors.textSecondary} strokeDasharray="3 3" />
                  <Bar dataKey="count" fill={rallyColors.green} opacity={0.8} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Stack>
          )}
        </RallyMainCard>
      </Stack>
    </>
  );
}
