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
  ComposedChart,
  Area,
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
import RallyMainCard from '../../components/RallyMainCard';
import RallyKPICard from '../../components/RallyKPICard';
import PageHeader from '../../components/PageHeader';
import { simulateHedging, runMultipleSimulations } from '../../utils/hedgingSimulator';
import { formatNum, toPersianNum } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';
import {
  GRID_STROKE, axisTick, TOOLTIP_STYLE,
  activeDotFor, CURSOR_STROKE, CURSOR_FILL,
  barGradientDef, glowFilterDef,
} from '../../components/charts/shared/chartStyles';
import { IconShieldCheck, IconChartBar, IconCash, IconRefresh, IconPlugConnected } from '@tabler/icons-react';
import useDeribitOptionsChain from '../../hooks/useDeribitOptionsChain';

export default function CryptoOptionsHedging() {
  const [stockPrice, setStockPrice]     = useState(50000);
  const [strikePrice, setStrikePrice]   = useState(50000);
  const [daysToExpiry, setDaysToExpiry] = useState(60);
  const [riskFreeRate, setRiskFreeRate] = useState(5); // USD SOFR
  const [volatility, setVolatility]     = useState(70);
  const [optionType, setOptionType]     = useState('call');
  const [rebalFreq, setRebalFreq]       = useState('daily');
  const [numSims, setNumSims]           = useState(30);
  const [seed, setSeed]                 = useState(42);

  // Market data connection
  const [selectedContract, setSelectedContract] = useState(null);

  const {
    currency, setCurrency,
    selectedExpiry, setSelectedExpiry,
    allOptions,
    expiries,
    underlyingPrice,
  } = useDeribitOptionsChain();

  // Reset on currency change
  useEffect(() => {
    setSelectedExpiry(null);
    setSelectedContract(null);
  }, [currency]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fill S
  useEffect(() => {
    if (underlyingPrice > 0) {
      setStockPrice(Math.round(underlyingPrice));
      setStrikePrice(Math.round(underlyingPrice));
    }
  }, [underlyingPrice]);

  // Auto-fill from selected contract
  useEffect(() => {
    if (!selectedContract) return;
    const contract = allOptions.find((c) => c.instrument_name === selectedContract);
    if (!contract) return;
    if (contract.strike_price) setStrikePrice(Math.round(contract.strike_price));
    if (contract.daysToExpiry > 0) setDaysToExpiry(Math.round(contract.daysToExpiry));
    if (contract.option_type) setOptionType(contract.option_type);
    if (contract.iv && contract.iv > 0) setVolatility(Math.round(contract.iv * 10) / 10);
  }, [selectedContract, allOptions]);

  const filteredContracts = useMemo(() => {
    if (!selectedExpiry) return allOptions;
    return allOptions.filter((c) => {
      const parts = c.instrument_name.split('-');
      return parts[1] === selectedExpiry;
    });
  }, [allOptions, selectedExpiry]);

  const contractSelectData = useMemo(() => filteredContracts.map((c) => ({
    value: c.instrument_name,
    label: `${c.instrument_name} | ${c.option_type === 'call' ? 'Call' : 'Put'} | K: ${formatNum(c.strike_price)}`,
  })), [filteredContracts]);

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

  const pnlData = singleSim?.hedgeLog || [];

  return (
    <>
      <PageHeader title="شبیه‌ساز پوشش دلتا — رمزارز Deribit" />

      {/* Market Data Connection */}
      <RallyMainCard
        title={
          <Group gap="xs">
            <IconPlugConnected size={18} color={rallyColors.blue} />
            <Text fw={600}>اتصال به داده Deribit</Text>
          </Group>
        }
        mb="md"
      >
        <Group gap="md" wrap="wrap" align="flex-end">
          <SegmentedControl
            value={currency}
            onChange={setCurrency}
            data={[{ value: 'BTC', label: 'BTC' }, { value: 'ETH', label: 'ETH' }]}
            size="sm"
          />
          {underlyingPrice > 0 && (
            <Badge color="rally-primary" variant="light" size="lg">
              {currency}: ${formatNum(underlyingPrice?.toFixed(2))}
            </Badge>
          )}
          {allOptions.length > 0 && (
            <Badge color="rally-blue" variant="light" size="lg">{allOptions.length} قرارداد</Badge>
          )}
        </Group>
        {expiries.length > 0 && (
          <Group gap="sm" mt="sm" wrap="wrap" align="center">
            <Text size="xs" c="dimmed" fw={600}>سررسید:</Text>
            <SegmentedControl
              value={selectedExpiry || ''}
              onChange={(v) => setSelectedExpiry(v || null)}
              data={[{ value: '', label: 'همه' }, ...expiries.map((d) => ({ value: d, label: d }))]}
              size="xs"
              styles={{ root: { background: 'rgba(42,46,62,0.5)' } }}
            />
          </Group>
        )}
        {contractSelectData.length > 0 && (
          <Select
            label="انتخاب قرارداد (اختیاری)"
            placeholder="قرارداد..."
            data={contractSelectData}
            value={selectedContract}
            onChange={setSelectedContract}
            searchable
            clearable
            size="sm"
            mt="sm"
            style={{ maxWidth: 520 }}
            nothingFoundMessage="قرارداد یافت نشد"
          />
        )}
        <Text size="xs" c="dimmed" mt="xs">
          با انتخاب قرارداد، قیمت دارایی، قیمت اعمال، سررسید و نوسان‌پذیری به‌روز می‌شوند.
        </Text>
      </RallyMainCard>

      {/* Parameters */}
      <RallyMainCard mb="md">
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="md">
          <div>
            <NumberInput label="قیمت دارایی (S) — USD" value={stockPrice} onChange={(v) => setStockPrice(v || 0)} min={1} step={100} size="sm" />
            <Slider value={stockPrice} onChange={setStockPrice} min={100} max={200000} step={100} mt="xs" size="xs" color="rally-primary" />
          </div>
          <div>
            <NumberInput label="قیمت اعمال (K) — USD" value={strikePrice} onChange={(v) => setStrikePrice(v || 0)} min={1} step={100} size="sm" />
            <Slider value={strikePrice} onChange={setStrikePrice} min={100} max={200000} step={100} mt="xs" size="xs" color="rally-primary" />
          </div>
          <div>
            <NumberInput label="روز تا سررسید" value={daysToExpiry} onChange={(v) => setDaysToExpiry(v || 1)} min={1} max={365} size="sm" />
            <Slider value={daysToExpiry} onChange={setDaysToExpiry} min={1} max={365} mt="xs" size="xs" color="rally-primary" />
          </div>
          <div>
            <NumberInput label="نوسان‌پذیری (٪)" value={volatility} onChange={(v) => setVolatility(v ?? 1)} min={1} max={500} step={1} size="sm" />
            <Slider value={volatility} onChange={setVolatility} min={1} max={300} mt="xs" size="xs" color="rally-primary" />
          </div>
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          <div>
            <NumberInput label="نرخ بدون ریسک (٪ USD)" value={riskFreeRate} onChange={(v) => setRiskFreeRate(v ?? 0)} min={0} max={20} step={0.25} decimalScale={2} size="sm" />
          </div>
          <div>
            <Text size="sm" fw={500} mb={4}>نوع اختیار</Text>
            <SegmentedControl value={optionType} onChange={setOptionType}
              data={[{ value: 'call', label: 'Call' }, { value: 'put', label: 'Put' }]} fullWidth size="sm" />
          </div>
          <div>
            <Text size="sm" fw={500} mb={4}>فرکانس بازتوزیع</Text>
            <SegmentedControl value={rebalFreq} onChange={setRebalFreq}
              data={[{ value: 'daily', label: 'روزانه' }, { value: 'weekly', label: 'هفتگی' }]} fullWidth size="sm" />
          </div>
          <div>
            <NumberInput label="بذر تصادفی" value={seed} onChange={(v) => setSeed(v || 1)} min={1} max={99999} size="sm" />
          </div>
        </SimpleGrid>
      </RallyMainCard>

      {/* KPI Cards */}
      {singleSim && (
        <SimpleGrid cols={{ base: 2, md: 4 }} mb="md">
          <RallyKPICard title="حق بیمه دریافتی" value={singleSim.premiumCollected?.toFixed(4)} icon={IconCash} color={rallyColors.primary} variant="accent-bar" />
          <RallyKPICard title="بازپرداخت نهایی" value={singleSim.finalPayoff?.toFixed(4)} color={rallyColors.red} variant="accent-bar" />
          <RallyKPICard
            title="سود/زیان کل پوشش"
            value={singleSim.totalPnL?.toFixed(4)}
            color={singleSim.totalPnL >= 0 ? rallyColors.green : rallyColors.red}
            variant="accent-bar"
          />
          <RallyKPICard title="هزینه پوشش" value={singleSim.hedgingCost?.toFixed(4)} icon={IconShieldCheck} color={rallyColors.yellow} variant="accent-bar" />
        </SimpleGrid>
      )}

      <Stack gap="md">
        {/* Price Path & Delta Chart */}
        {pnlData.length > 0 && (
          <RallyMainCard title="مسیر قیمت (GBM) و نسبت پوشش" fullscreenable>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={pnlData} margin={{ top: 10, right: 20, bottom: 20, left: 40 }}>
                <defs>
                  {glowFilterDef('priceGlow', rallyColors.blue)}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="day" tick={axisTick(10)} label={{ value: 'روز', position: 'insideBottom', offset: -10, fontSize: 11, fill: rallyColors.textSecondary }} />
                <YAxis yAxisId="price" tick={axisTick(10)} tickFormatter={(v) => `$${formatNum(v)}`} />
                <YAxis yAxisId="delta" orientation="right" tick={axisTick(10)} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={CURSOR_STROKE}
                  formatter={(v, name) => {
                    if (name === 'delta') return [`${(v * 100).toFixed(1)}%`, 'دلتا'];
                    return [typeof v === 'number' ? `$${v.toFixed(2)}` : v, 'قیمت'];
                  }}
                  labelFormatter={(v) => `روز ${v}`}
                />
                <Legend formatter={(v) => ({ price: 'قیمت دارایی', delta: 'نسبت پوشش (دلتا)' }[v] || v)} />
                <Line yAxisId="price" type="monotone" dataKey="price" stroke={rallyColors.blue} strokeWidth={2} dot={false} activeDot={activeDotFor(rallyColors.blue)} filter="url(#priceGlow)" />
                <Line yAxisId="delta" type="stepAfter" dataKey="delta" stroke={rallyColors.green} strokeWidth={1.5} dot={false} activeDot={activeDotFor(rallyColors.green)} />
                <ReferenceLine yAxisId="price" y={strikePrice} stroke={rallyColors.yellow} strokeDasharray="5 5" label={{ value: 'اعمال', position: 'insideTopLeft', fill: rallyColors.yellow, fontSize: 10 }} />
              </LineChart>
            </ResponsiveContainer>
          </RallyMainCard>
        )}

        {/* Cumulative P&L */}
        {pnlData.length > 0 && (
          <RallyMainCard title="سود/زیان تجمعی پوشش" fullscreenable>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={pnlData} margin={{ top: 10, right: 20, bottom: 20, left: 40 }}>
                <defs>
                  <linearGradient id="pnlFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(34,197,94,0.25)" />
                    <stop offset="100%" stopColor="rgba(34,197,94,0)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="day" tick={axisTick(10)} />
                <YAxis tick={axisTick(10)} tickFormatter={(v) => `$${v.toFixed(4)}`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={CURSOR_STROKE}
                  formatter={(v) => [`$${v.toFixed(4)}`, 'سود/زیان']}
                  labelFormatter={(v) => `روز ${v}`} />
                <ReferenceLine y={0} stroke={rallyColors.textSecondary} strokeDasharray="3 3" />
                <Area type="monotone" dataKey="pnl" fill="url(#pnlFill)" stroke={rallyColors.green} strokeWidth={2} dot={false} activeDot={activeDotFor(rallyColors.green)} />
              </ComposedChart>
            </ResponsiveContainer>
          </RallyMainCard>
        )}

        {/* Rebalance Table */}
        {pnlData.length > 0 && (
          <RallyMainCard title="جدول عملیات بازتوزیع" noPadding>
            <ScrollArea h={300}>
              <Table striped highlightOnHover withTableBorder style={{ minWidth: 700 }}>
                <Table.Thead>
                  <Table.Tr>
                    {['روز', 'قیمت دارایی', 'دلتا', 'نگه‌داشته', 'معامله', 'هزینه', 'سود/زیان'].map((h) => (
                      <Table.Th key={h} style={{ textAlign: 'center' }}>{h}</Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {pnlData.map((row) => (
                    <Table.Tr key={row.step}>
                      <Table.Td style={{ textAlign: 'center' }}>{row.day}</Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>${row.price?.toFixed(2)}</Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>{row.delta?.toFixed(4)}</Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>{row.sharesHeld?.toFixed(4)}</Table.Td>
                      <Table.Td style={{ textAlign: 'center', color: row.tradeShares > 0 ? rallyColors.green : row.tradeShares < 0 ? rallyColors.red : 'inherit' }}>
                        {row.tradeShares > 0 ? '+' : ''}{row.tradeShares?.toFixed(4)}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>${row.tradeCost?.toFixed(4)}</Table.Td>
                      <Table.Td style={{ textAlign: 'center', color: row.pnl >= 0 ? rallyColors.green : rallyColors.red }}>
                        ${row.pnl?.toFixed(4)}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </RallyMainCard>
        )}

        {/* Multi-Simulation */}
        <RallyMainCard
          title={
            <Group gap="sm">
              <Text fw={700} size="lg">شبیه‌سازی چندگانه</Text>
              <NumberInput value={numSims} onChange={(v) => setNumSims(v || 10)} min={10} max={200} step={10} size="xs" style={{ width: 80 }} />
              <Button size="xs" variant="light" color="rally-primary" leftSection={<IconRefresh size={14} />} onClick={runMultiSim}>اجرا</Button>
            </Group>
          }
        >
          {!multiResult ? (
            <Text size="sm" c="dimmed" ta="center" py="lg">برای مشاهده توزیع سود/زیان، دکمه اجرا را بزنید</Text>
          ) : (
            <Stack gap="md">
              <SimpleGrid cols={{ base: 2, md: 3 }}>
                <RallyKPICard title="میانگین سود/زیان" value={`$${multiResult.avgPnL?.toFixed(4)}`} color={multiResult.avgPnL >= 0 ? rallyColors.green : rallyColors.red} variant="accent-bar" />
                <RallyKPICard title="انحراف معیار" value={`$${multiResult.stdPnL?.toFixed(4)}`} color={rallyColors.blue} variant="accent-bar" />
                <RallyKPICard title="تعداد شبیه‌سازی" value={toPersianNum(numSims)} icon={IconChartBar} color={rallyColors.primary} variant="accent-bar" />
              </SimpleGrid>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={multiResult.histogram} margin={{ top: 10, right: 20, bottom: 20, left: 40 }}>
                  <defs>{barGradientDef('histFill', rallyColors.green)}</defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="range" tick={axisTick(10)} angle={-30} textAnchor="end" />
                  <YAxis tick={axisTick(10)} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={CURSOR_FILL}
                    formatter={(v) => [v, 'تعداد']}
                    labelFormatter={(v) => `سود/زیان: ${v}`} />
                  <ReferenceLine x={0} stroke={rallyColors.textSecondary} strokeDasharray="3 3" />
                  <Bar dataKey="count" fill="url(#histFill)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Stack>
          )}
        </RallyMainCard>
      </Stack>
    </>
  );
}
