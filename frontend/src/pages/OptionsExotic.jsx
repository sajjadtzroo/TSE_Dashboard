import { useState, useMemo, useEffect } from 'react';
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
  Loader,
  Table,
} from '@mantine/core';
import RallyMainCard from '../components/RallyMainCard';
import RallyKPICard from '../components/RallyKPICard';
import PageHeader from '../components/PageHeader';
import { blackScholesPrice, impliedVolatility } from '../utils/blackScholes';
import {
  binaryPrice,
  binaryGreeks,
  assetOrNothingPrice,
  barrierPrice,
  barrierGreeks,
  asianGeometricPrice,
} from '../utils/exoticOptions';
import useExoticOptionsWorker from '../hooks/useExoticOptionsWorker';
import { formatNum } from '../utils/formatUtils';
import { computeT } from '../utils/dateUtils';
import rallyColors from '../theme/rallyColors';
import { IconPlugConnected, IconDiamond } from '@tabler/icons-react';
import { useOptionsUnderlyings, useOptionsChain } from '../hooks/useMarketData';

const EXOTIC_MODES = [
  { value: 'binary', label: 'باینری (Binary)' },
  { value: 'barrier', label: 'مانع (Barrier)' },
  { value: 'asian', label: 'آسیایی (Asian)' },
  { value: 'lookback', label: 'بازگشتی (Lookback)' },
];

const BARRIER_TYPES = [
  { value: 'down-and-out', label: 'پایین-و-خارج (Down-and-Out)' },
  { value: 'down-and-in', label: 'پایین-و-داخل (Down-and-In)' },
  { value: 'up-and-out', label: 'بالا-و-خارج (Up-and-Out)' },
  { value: 'up-and-in', label: 'بالا-و-داخل (Up-and-In)' },
];

export default function OptionsExotic() {
  // Common parameters
  const [stockPrice, setStockPrice] = useState(10000);
  const [strikePrice, setStrikePrice] = useState(10000);
  const [daysToExpiry, setDaysToExpiry] = useState(90);
  const [riskFreeRate, setRiskFreeRate] = useState(23);
  const [volatility, setVolatility] = useState(30);
  const [optionType, setOptionType] = useState('call');
  const [exoticMode, setExoticMode] = useState('binary');

  // Binary-specific
  const [binarySubType, setBinarySubType] = useState('cash');
  const [payout, setPayout] = useState(1000);

  // Barrier-specific
  const [barrierLevel, setBarrierLevel] = useState(11000);
  const [barrierType, setBarrierType] = useState('down-and-out');
  const [rebate, setRebate] = useState(0);

  // Asian-specific
  const [avgType, setAvgType] = useState('average-price');
  const [asianNumPaths, setAsianNumPaths] = useState(50000);
  const [asianSteps, setAsianSteps] = useState(252);

  // Lookback-specific
  const [lookbackNumPaths, setLookbackNumPaths] = useState(50000);
  const [lookbackSteps, setLookbackSteps] = useState(252);

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

  // Auto-fill K, T, optionType, and sigma when contract is selected
  useEffect(() => {
    if (!selectedContractSymbol) return;
    const contract = allContracts.find((c) => c.symbol === selectedContractSymbol);
    if (!contract) return;

    if (contract.strike_price) setStrikePrice(Math.round(contract.strike_price));

    const days = Math.round(computeT(contract.expiry_date) * 365);
    if (days > 0) setDaysToExpiry(days);

    if (contract.option_type) setOptionType(contract.option_type);

    const S = underlyingPrice || stockPrice;
    const contractT = days / 365;
    const contractR = riskFreeRate / 100;
    const premium = contract.last || contract.close;
    if (S > 0 && contractT > 0 && premium > 0 && contract.strike_price > 0) {
      const iv = impliedVolatility(contract.option_type, premium, S, contract.strike_price, contractT, contractR);
      if (iv && iv > 0.01 && iv < 5) setVolatility(Math.round(iv * 100 * 10) / 10);
    }
  }, [selectedContractSymbol, allContracts]); // eslint-disable-line react-hooks/exhaustive-deps

  const T = daysToExpiry / 365;
  const r = riskFreeRate / 100;
  const sigma = volatility / 100;

  // ── Closed-form pricing: Binary ──
  const binaryResult = useMemo(() => {
    if (exoticMode !== 'binary') return null;
    if (stockPrice <= 0 || strikePrice <= 0 || T <= 0 || sigma <= 0) return null;

    let price;
    if (binarySubType === 'cash') {
      price = binaryPrice(optionType, stockPrice, strikePrice, T, r, sigma, payout);
    } else {
      price = assetOrNothingPrice(optionType, stockPrice, strikePrice, T, r, sigma);
    }

    const greeks = binarySubType === 'cash'
      ? binaryGreeks(optionType, stockPrice, strikePrice, T, r, sigma, payout)
      : binaryGreeks(optionType, stockPrice, strikePrice, T, r, sigma, 1);

    return { price, greeks };
  }, [exoticMode, binarySubType, optionType, stockPrice, strikePrice, T, r, sigma, payout]);

  // ── Closed-form pricing: Barrier ──
  const barrierResult = useMemo(() => {
    if (exoticMode !== 'barrier') return null;
    if (stockPrice <= 0 || strikePrice <= 0 || T <= 0 || sigma <= 0 || barrierLevel <= 0) return null;

    const price = barrierPrice(optionType, barrierType, stockPrice, strikePrice, T, r, sigma, barrierLevel, rebate);
    const greeks = barrierGreeks(optionType, barrierType, stockPrice, strikePrice, T, r, sigma, barrierLevel, rebate);

    return { price, greeks };
  }, [exoticMode, optionType, barrierType, stockPrice, strikePrice, T, r, sigma, barrierLevel, rebate]);

  // ── MC pricing: Asian ──
  const asianConfig = useMemo(() => {
    if (exoticMode !== 'asian') return null;
    if (stockPrice <= 0 || strikePrice <= 0 || T <= 0 || sigma <= 0) return null;
    return {
      type: optionType,
      avgType,
      S: stockPrice,
      K: strikePrice,
      T,
      r,
      sigma,
      numPaths: asianNumPaths,
      steps: asianSteps,
    };
  }, [exoticMode, optionType, avgType, stockPrice, strikePrice, T, r, sigma, asianNumPaths, asianSteps]);

  const { result: asianResult, running: asianRunning } = useExoticOptionsWorker('asian', asianConfig);

  // Asian geometric closed-form benchmark
  const asianGeoBenchmark = useMemo(() => {
    if (exoticMode !== 'asian') return null;
    if (stockPrice <= 0 || strikePrice <= 0 || T <= 0 || sigma <= 0) return null;
    return asianGeometricPrice(optionType, stockPrice, strikePrice, T, r, sigma, asianSteps);
  }, [exoticMode, optionType, stockPrice, strikePrice, T, r, sigma, asianSteps]);

  // ── MC pricing: Lookback ──
  const lookbackConfig = useMemo(() => {
    if (exoticMode !== 'lookback') return null;
    if (stockPrice <= 0 || T <= 0 || sigma <= 0) return null;
    return {
      type: optionType,
      S: stockPrice,
      T,
      r,
      sigma,
      numPaths: lookbackNumPaths,
      steps: lookbackSteps,
    };
  }, [exoticMode, optionType, stockPrice, T, r, sigma, lookbackNumPaths, lookbackSteps]);

  const { result: lookbackResult, running: lookbackRunning } = useExoticOptionsWorker('lookback', lookbackConfig);

  // ── BS vanilla for comparison ──
  const bsPrice = useMemo(() => {
    if (stockPrice <= 0 || strikePrice <= 0 || T <= 0 || sigma <= 0) return null;
    return blackScholesPrice(optionType, stockPrice, strikePrice, T, r, sigma);
  }, [stockPrice, strikePrice, T, r, sigma, optionType]);

  // ── Derived values per mode ──
  const currentExoticPrice = useMemo(() => {
    if (exoticMode === 'binary' && binaryResult) return binaryResult.price;
    if (exoticMode === 'barrier' && barrierResult) return barrierResult.price;
    if (exoticMode === 'asian' && asianResult) return asianResult.price;
    if (exoticMode === 'lookback' && lookbackResult) return lookbackResult.price;
    return null;
  }, [exoticMode, binaryResult, barrierResult, asianResult, lookbackResult]);

  const currentStderr = useMemo(() => {
    if (exoticMode === 'asian' && asianResult) return asianResult.stderr;
    if (exoticMode === 'lookback' && lookbackResult) return lookbackResult.stderr;
    return null;
  }, [exoticMode, asianResult, lookbackResult]);

  const currentGreeks = useMemo(() => {
    if (exoticMode === 'binary' && binaryResult) return binaryResult.greeks;
    if (exoticMode === 'barrier' && barrierResult) return barrierResult.greeks;
    return null;
  }, [exoticMode, binaryResult, barrierResult]);

  const priceDiff = currentExoticPrice != null && bsPrice != null
    ? Math.abs(currentExoticPrice - bsPrice)
    : null;

  const isMCMode = exoticMode === 'asian' || exoticMode === 'lookback';
  const mcRunning = (exoticMode === 'asian' && asianRunning) || (exoticMode === 'lookback' && lookbackRunning);

  const fmt = (v) => formatNum(Math.round(v * 100) / 100);

  return (
    <>
      <PageHeader title={'اختیار معامله عجیب (Exotic Options)'} />

      {/* Market Data Connection */}
      <RallyMainCard
        title={
          <Group gap="xs">
            <IconPlugConnected size={18} color={rallyColors.blue} />
            <Text fw={600}>{'اتصال به داده بازار'}</Text>
          </Group>
        }
        mb="md"
      >
        <Group gap="md" wrap="wrap" align="flex-end">
          <Select
            label={'دارایی پایه'}
            placeholder={'انتخاب دارایی...'}
            data={underlyingSelectData}
            value={selectedUnderlying}
            onChange={setSelectedUnderlying}
            searchable
            clearable
            size="sm"
            style={{ minWidth: 220, flex: 1, maxWidth: 360 }}
            nothingFoundMessage={'دارایی یافت نشد'}
          />
          {underlyingPrice > 0 && (
            <Badge color="rally-primary" variant="light" size="lg">
              {'قیمت پایه'}: {formatNum(underlyingPrice)}
            </Badge>
          )}
          {selectedUnderlying && allContracts.length > 0 && (
            <Badge color="rally-blue" variant="light" size="lg">
              {formatNum(allContracts.length)} {'قرارداد'}
            </Badge>
          )}
        </Group>
        {selectedUnderlying && expiryDates.length > 0 && (
          <Group gap="sm" mt="sm" wrap="wrap" align="center">
            <Text size="xs" c="dimmed" fw={600}>{'سررسید'}:</Text>
            <SegmentedControl
              value={selectedExpiry || ''}
              onChange={(v) => setSelectedExpiry(v || null)}
              data={[{ value: '', label: 'همه' }, ...expiryDates.map((d) => ({ value: d, label: d }))]}
              size="xs"
              styles={{ root: { background: 'rgba(42, 46, 62, 0.5)' } }}
            />
          </Group>
        )}
        {selectedUnderlying && contractSelectData.length > 0 && (
          <Select
            label={'انتخاب قرارداد'}
            placeholder={'قرارداد...'}
            data={contractSelectData}
            value={selectedContractSymbol}
            onChange={setSelectedContractSymbol}
            searchable
            clearable
            size="sm"
            mt="sm"
            style={{ maxWidth: 480 }}
            nothingFoundMessage={'قرارداد یافت نشد'}
          />
        )}
        <Text size="xs" c="dimmed" mt="xs">
          {'با انتخاب قرارداد، قیمت سهم، قیمت اعمال، سررسید و نوسان‌پذیری به‌روز می‌شوند.'}
        </Text>
      </RallyMainCard>

      {/* Exotic Type Selector */}
      <RallyMainCard mb="md">
        <Group gap="sm" align="center" mb="md">
          <IconDiamond size={18} color={rallyColors.purple} />
          <Text fw={600}>{'نوع اختیار اگزاتیک'}</Text>
        </Group>
        <SegmentedControl
          value={exoticMode}
          onChange={setExoticMode}
          data={EXOTIC_MODES}
          fullWidth
          size="sm"
        />
      </RallyMainCard>

      {/* Parameters */}
      <RallyMainCard mb="md">
        {/* Common params: S, K, T, sigma */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="md">
          <div>
            <NumberInput label={'قیمت سهم (S)'} value={stockPrice} onChange={(v) => setStockPrice(v || 0)} min={1} step={100} size="sm" />
            <Slider value={stockPrice} onChange={setStockPrice} min={100} max={100000} step={100} mt="xs" size="xs" color="rally-primary" />
          </div>
          <div>
            <NumberInput label={'قیمت اعمال (K)'} value={strikePrice} onChange={(v) => setStrikePrice(v || 0)} min={1} step={100} size="sm" />
            <Slider value={strikePrice} onChange={setStrikePrice} min={100} max={100000} step={100} mt="xs" size="xs" color="rally-primary" />
          </div>
          <div>
            <NumberInput label={'روز تا سررسید'} value={daysToExpiry} onChange={(v) => setDaysToExpiry(v || 1)} min={1} max={730} size="sm" />
            <Slider value={daysToExpiry} onChange={setDaysToExpiry} min={1} max={730} mt="xs" size="xs" color="rally-primary" />
          </div>
          <div>
            <NumberInput label={'نوسان‌پذیری (٪)'} value={volatility} onChange={(v) => setVolatility(v ?? 1)} min={1} max={200} step={1} size="sm" />
            <Slider value={volatility} onChange={setVolatility} min={1} max={200} mt="xs" size="xs" color="rally-primary" />
          </div>
        </SimpleGrid>

        {/* Second row: risk-free rate, option type, and type-specific params */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          <div>
            <NumberInput label={'نرخ بدون ریسک (٪)'} value={riskFreeRate} onChange={(v) => setRiskFreeRate(v ?? 0)} min={0} max={50} step={0.5} decimalScale={1} size="sm" />
          </div>
          <div>
            <Text size="sm" fw={500} mb={4}>{'نوع اختیار'}</Text>
            <SegmentedControl
              value={optionType}
              onChange={setOptionType}
              data={[{ value: 'call', label: 'خرید (Call)' }, { value: 'put', label: 'فروش (Put)' }]}
              fullWidth
              size="sm"
            />
          </div>

          {/* Binary-specific */}
          {exoticMode === 'binary' && (
            <>
              <div>
                <Text size="sm" fw={500} mb={4}>{'نوع باینری'}</Text>
                <SegmentedControl
                  value={binarySubType}
                  onChange={setBinarySubType}
                  data={[
                    { value: 'cash', label: 'نقدی-یا-هیچ' },
                    { value: 'asset', label: 'دارایی-یا-هیچ' },
                  ]}
                  fullWidth
                  size="sm"
                />
              </div>
              {binarySubType === 'cash' && (
                <div>
                  <NumberInput label={'مبلغ پرداخت (Q)'} value={payout} onChange={(v) => setPayout(v || 0)} min={1} step={100} size="sm" />
                  <Slider value={payout} onChange={setPayout} min={100} max={50000} step={100} mt="xs" size="xs" color="rally-primary" />
                </div>
              )}
            </>
          )}

          {/* Barrier-specific */}
          {exoticMode === 'barrier' && (
            <>
              <div>
                <Select
                  label={'نوع مانع'}
                  data={BARRIER_TYPES}
                  value={barrierType}
                  onChange={setBarrierType}
                  size="sm"
                />
              </div>
              <div>
                <NumberInput label={'سطح مانع (H)'} value={barrierLevel} onChange={(v) => setBarrierLevel(v || 0)} min={1} step={100} size="sm" />
                <Slider value={barrierLevel} onChange={setBarrierLevel} min={100} max={100000} step={100} mt="xs" size="xs" color="rally-primary" />
              </div>
            </>
          )}

          {/* Asian-specific */}
          {exoticMode === 'asian' && (
            <>
              <div>
                <Text size="sm" fw={500} mb={4}>{'نوع میانگین'}</Text>
                <SegmentedControl
                  value={avgType}
                  onChange={setAvgType}
                  data={[
                    { value: 'average-price', label: 'میانگین قیمت' },
                    { value: 'average-strike', label: 'میانگین اعمال' },
                  ]}
                  fullWidth
                  size="sm"
                />
              </div>
              <div>
                <NumberInput label={'نقاط نمونه‌برداری'} value={asianSteps} onChange={(v) => setAsianSteps(v || 1)} min={10} max={500} step={1} size="sm" />
              </div>
            </>
          )}

          {/* Lookback-specific */}
          {exoticMode === 'lookback' && (
            <div>
              <NumberInput label={'نقاط نمونه‌برداری'} value={lookbackSteps} onChange={(v) => setLookbackSteps(v || 1)} min={10} max={500} step={1} size="sm" />
            </div>
          )}
        </SimpleGrid>

        {/* Barrier rebate (extra row) */}
        {exoticMode === 'barrier' && (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mt="md">
            <div>
              <NumberInput label={'جریمه / بازپرداخت (Rebate)'} value={rebate} onChange={(v) => setRebate(v ?? 0)} min={0} step={10} size="sm" />
            </div>
          </SimpleGrid>
        )}

        {/* MC numPaths slider for Asian/Lookback */}
        {exoticMode === 'asian' && (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mt="md">
            <div style={{ gridColumn: 'span 2' }}>
              <Text size="sm" fw={500} mb={4}>{'تعداد مسیرها'}</Text>
              <Slider
                value={asianNumPaths}
                onChange={setAsianNumPaths}
                min={10000}
                max={200000}
                step={10000}
                size="sm"
                color="rally-primary"
                marks={[
                  { value: 10000, label: '10K' },
                  { value: 50000, label: '50K' },
                  { value: 100000, label: '100K' },
                  { value: 200000, label: '200K' },
                ]}
              />
              <Text size="xs" c="dimmed" mt={4} ta="center">{formatNum(asianNumPaths)}</Text>
            </div>
            <div>
              {asianRunning && (
                <Group gap="xs" mt="md" justify="center">
                  <Loader size="sm" color={rallyColors.primary} />
                  <Text size="sm" c="dimmed">{'در حال شبیه‌سازی...'}</Text>
                </Group>
              )}
            </div>
          </SimpleGrid>
        )}

        {exoticMode === 'lookback' && (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mt="md">
            <div style={{ gridColumn: 'span 2' }}>
              <Text size="sm" fw={500} mb={4}>{'تعداد مسیرها'}</Text>
              <Slider
                value={lookbackNumPaths}
                onChange={setLookbackNumPaths}
                min={10000}
                max={200000}
                step={10000}
                size="sm"
                color="rally-primary"
                marks={[
                  { value: 10000, label: '10K' },
                  { value: 50000, label: '50K' },
                  { value: 100000, label: '100K' },
                  { value: 200000, label: '200K' },
                ]}
              />
              <Text size="xs" c="dimmed" mt={4} ta="center">{formatNum(lookbackNumPaths)}</Text>
            </div>
            <div>
              {lookbackRunning && (
                <Group gap="xs" mt="md" justify="center">
                  <Loader size="sm" color={rallyColors.primary} />
                  <Text size="sm" c="dimmed">{'در حال شبیه‌سازی...'}</Text>
                </Group>
              )}
            </div>
          </SimpleGrid>
        )}
      </RallyMainCard>

      {/* KPI Cards */}
      {currentExoticPrice != null && (
        <SimpleGrid cols={{ base: 2, md: 4 }} mb="md">
          <RallyKPICard
            title={'قیمت اگزاتیک'}
            value={fmt(currentExoticPrice)}
            icon={IconDiamond}
            color={rallyColors.primary}
            animateValue
          />
          <RallyKPICard
            title={'قیمت بلک‌شولز'}
            value={bsPrice != null ? fmt(bsPrice) : '-'}
            color={rallyColors.blue}
            animateValue
          />
          <RallyKPICard
            title={'اختلاف'}
            value={priceDiff != null ? fmt(priceDiff) : '-'}
            color={rallyColors.yellow}
            animateValue
          />
          {isMCMode ? (
            <RallyKPICard
              title={'خطای استاندارد'}
              value={currentStderr != null ? formatNum(Math.round(currentStderr * 10000) / 10000) : '-'}
              color={rallyColors.purple}
              animateValue
            />
          ) : (
            <RallyKPICard
              title={'دلتا (Δ)'}
              value={currentGreeks ? formatNum(Math.round(currentGreeks.delta * 10000) / 10000) : '-'}
              color={rallyColors.purple}
              animateValue
            />
          )}
        </SimpleGrid>
      )}

      <Stack gap="md">
        {/* Greeks Table for Binary / Barrier */}
        {(exoticMode === 'binary' || exoticMode === 'barrier') && currentGreeks && (
          <RallyMainCard title={'یونانی‌ها (Greeks)'}>
            <Table
              striped
              highlightOnHover
              withTableBorder
              withColumnBorders
              styles={{
                table: { background: 'transparent' },
                th: { color: rallyColors.textSecondary, fontSize: 13 },
                td: { fontSize: 13 },
              }}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{'یونانی'}</Table.Th>
                  <Table.Th>{'نماد'}</Table.Th>
                  <Table.Th>{'مقدار'}</Table.Th>
                  <Table.Th>{'توضیح'}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td>{'دلتا'}</Table.Td>
                  <Table.Td>{'Δ'}</Table.Td>
                  <Table.Td>{formatNum(Math.round(currentGreeks.delta * 10000) / 10000)}</Table.Td>
                  <Table.Td>{'حساسیت به تغییر قیمت سهم'}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>{'گاما'}</Table.Td>
                  <Table.Td>{'Γ'}</Table.Td>
                  <Table.Td>{formatNum(Math.round(currentGreeks.gamma * 1000000) / 1000000)}</Table.Td>
                  <Table.Td>{'تغییر دلتا به ازای تغییر قیمت'}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>{'تتا'}</Table.Td>
                  <Table.Td>{'Θ'}</Table.Td>
                  <Table.Td>{formatNum(Math.round(currentGreeks.theta * 10000) / 10000)}</Table.Td>
                  <Table.Td>{'کاهش ارزش به ازای گذشت زمان (روزانه)'}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>{'وگا'}</Table.Td>
                  <Table.Td>{'ν'}</Table.Td>
                  <Table.Td>{formatNum(Math.round(currentGreeks.vega * 10000) / 10000)}</Table.Td>
                  <Table.Td>{'حساسیت به تغییر نوسان‌پذیری'}</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </RallyMainCard>
        )}

        {/* Asian benchmark comparison */}
        {exoticMode === 'asian' && asianResult && asianGeoBenchmark != null && (
          <RallyMainCard title={'مقایسه با قیمت هندسی (Geometric Benchmark)'}>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <div>
                <Text size="xs" c="dimmed">{'قیمت MC (حسابی)'}</Text>
                <Text size="lg" fw={700} c={rallyColors.primary}>
                  {fmt(asianResult.price)}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">{'قیمت هندسی (فرم بسته)'}</Text>
                <Text size="lg" fw={700} c={rallyColors.green}>
                  {fmt(asianGeoBenchmark)}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">{'اختلاف MC و هندسی'}</Text>
                <Text size="lg" fw={700} c={rallyColors.yellow}>
                  {fmt(Math.abs(asianResult.price - asianGeoBenchmark))}
                </Text>
              </div>
            </SimpleGrid>
            <Text size="xs" c="dimmed" mt="md">
              {'قیمت هندسی فرم بسته برای میانگین هندسی است و به‌عنوان معیار سنجش مونت‌کارلو استفاده می‌شود. میانگین حسابی (مونت‌کارلو) معمولاً بالاتر از میانگین هندسی است.'}
            </Text>
          </RallyMainCard>
        )}

        {/* Lookback info card */}
        {exoticMode === 'lookback' && lookbackResult && (
          <RallyMainCard title={'جزئیات قیمت‌گذاری بازگشتی (Lookback Details)'}>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <div>
                <Text size="xs" c="dimmed">{'قیمت بازگشتی (MC)'}</Text>
                <Text size="lg" fw={700} c={rallyColors.primary}>
                  {fmt(lookbackResult.price)}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">{'خطای استاندارد'}</Text>
                <Text size="lg" fw={700} c={rallyColors.purple}>
                  {formatNum(Math.round(lookbackResult.stderr * 10000) / 10000)}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">{'قیمت بلک‌شولز (ونیلی)'}</Text>
                <Text size="lg" fw={700} c={rallyColors.blue}>
                  {bsPrice != null ? fmt(bsPrice) : '-'}
                </Text>
              </div>
            </SimpleGrid>
            <Text size="xs" c="dimmed" mt="md">
              {optionType === 'call'
                ? 'اختیار بازگشتی خرید: خرید در کمترین قیمت مسیر — پی‌آف = S_T − S_min'
                : 'اختیار بازگشتی فروش: فروش در بیشترین قیمت مسیر — پی‌آف = S_max − S_T'}
            </Text>
          </RallyMainCard>
        )}
      </Stack>
    </>
  );
}
