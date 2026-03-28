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
  { value: 'binary', label: '\u0628\u0627\u06CC\u0646\u0631\u06CC (Binary)' },
  { value: 'barrier', label: '\u0645\u0627\u0646\u0639 (Barrier)' },
  { value: 'asian', label: '\u0622\u0633\u06CC\u0627\u06CC\u06CC (Asian)' },
  { value: 'lookback', label: '\u0628\u0627\u0632\u06AF\u0634\u062A\u06CC (Lookback)' },
];

const BARRIER_TYPES = [
  { value: 'down-and-out', label: '\u067E\u0627\u06CC\u06CC\u0646-\u0648-\u062E\u0627\u0631\u062C (Down-and-Out)' },
  { value: 'down-and-in', label: '\u067E\u0627\u06CC\u06CC\u0646-\u0648-\u062F\u0627\u062E\u0644 (Down-and-In)' },
  { value: 'up-and-out', label: '\u0628\u0627\u0644\u0627-\u0648-\u062E\u0627\u0631\u062C (Up-and-Out)' },
  { value: 'up-and-in', label: '\u0628\u0627\u0644\u0627-\u0648-\u062F\u0627\u062E\u0644 (Up-and-In)' },
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
      label: `${c.symbol} | ${c.option_type === 'call' ? '\u062E\u0631\u06CC\u062F' : '\u0641\u0631\u0648\u0634'} | \u0627\u0639\u0645\u0627\u0644: ${formatNum(c.strike_price)}`,
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
      <PageHeader title={'\u0627\u062E\u062A\u06CC\u0627\u0631 \u0645\u0639\u0627\u0645\u0644\u0647 \u0639\u062C\u06CC\u0628 (Exotic Options)'} />

      {/* Market Data Connection */}
      <RallyMainCard
        title={
          <Group gap="xs">
            <IconPlugConnected size={18} color={rallyColors.blue} />
            <Text fw={600}>{'\u0627\u062A\u0635\u0627\u0644 \u0628\u0647 \u062F\u0627\u062F\u0647 \u0628\u0627\u0632\u0627\u0631'}</Text>
          </Group>
        }
        mb="md"
      >
        <Group gap="md" wrap="wrap" align="flex-end">
          <Select
            label={'\u062F\u0627\u0631\u0627\u06CC\u06CC \u067E\u0627\u06CC\u0647'}
            placeholder={'\u0627\u0646\u062A\u062E\u0627\u0628 \u062F\u0627\u0631\u0627\u06CC\u06CC...'}
            data={underlyingSelectData}
            value={selectedUnderlying}
            onChange={setSelectedUnderlying}
            searchable
            clearable
            size="sm"
            style={{ minWidth: 220, flex: 1, maxWidth: 360 }}
            nothingFoundMessage={'\u062F\u0627\u0631\u0627\u06CC\u06CC \u06CC\u0627\u0641\u062A \u0646\u0634\u062F'}
          />
          {underlyingPrice > 0 && (
            <Badge color="rally-primary" variant="light" size="lg">
              {'\u0642\u06CC\u0645\u062A \u067E\u0627\u06CC\u0647'}: {formatNum(underlyingPrice)}
            </Badge>
          )}
          {selectedUnderlying && allContracts.length > 0 && (
            <Badge color="rally-blue" variant="light" size="lg">
              {formatNum(allContracts.length)} {'\u0642\u0631\u0627\u0631\u062F\u0627\u062F'}
            </Badge>
          )}
        </Group>
        {selectedUnderlying && expiryDates.length > 0 && (
          <Group gap="sm" mt="sm" wrap="wrap" align="center">
            <Text size="xs" c="dimmed" fw={600}>{'\u0633\u0631\u0631\u0633\u06CC\u062F'}:</Text>
            <SegmentedControl
              value={selectedExpiry || ''}
              onChange={(v) => setSelectedExpiry(v || null)}
              data={[{ value: '', label: '\u0647\u0645\u0647' }, ...expiryDates.map((d) => ({ value: d, label: d }))]}
              size="xs"
              styles={{ root: { background: 'rgba(42, 46, 62, 0.5)' } }}
            />
          </Group>
        )}
        {selectedUnderlying && contractSelectData.length > 0 && (
          <Select
            label={'\u0627\u0646\u062A\u062E\u0627\u0628 \u0642\u0631\u0627\u0631\u062F\u0627\u062F'}
            placeholder={'\u0642\u0631\u0627\u0631\u062F\u0627\u062F...'}
            data={contractSelectData}
            value={selectedContractSymbol}
            onChange={setSelectedContractSymbol}
            searchable
            clearable
            size="sm"
            mt="sm"
            style={{ maxWidth: 480 }}
            nothingFoundMessage={'\u0642\u0631\u0627\u0631\u062F\u0627\u062F \u06CC\u0627\u0641\u062A \u0646\u0634\u062F'}
          />
        )}
        <Text size="xs" c="dimmed" mt="xs">
          {'\u0628\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u0642\u0631\u0627\u0631\u062F\u0627\u062F\u060C \u0642\u06CC\u0645\u062A \u0633\u0647\u0645\u060C \u0642\u06CC\u0645\u062A \u0627\u0639\u0645\u0627\u0644\u060C \u0633\u0631\u0631\u0633\u06CC\u062F \u0648 \u0646\u0648\u0633\u0627\u0646\u200C\u067E\u0630\u06CC\u0631\u06CC \u0628\u0647\u200C\u0631\u0648\u0632 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F.'}
        </Text>
      </RallyMainCard>

      {/* Exotic Type Selector */}
      <RallyMainCard mb="md">
        <Group gap="sm" align="center" mb="md">
          <IconDiamond size={18} color={rallyColors.purple} />
          <Text fw={600}>{'\u0646\u0648\u0639 \u0627\u062E\u062A\u06CC\u0627\u0631 \u0627\u06AF\u0632\u0627\u062A\u06CC\u06A9'}</Text>
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
            <NumberInput label={'\u0642\u06CC\u0645\u062A \u0633\u0647\u0645 (S)'} value={stockPrice} onChange={(v) => setStockPrice(v || 0)} min={1} step={100} size="sm" />
            <Slider value={stockPrice} onChange={setStockPrice} min={100} max={100000} step={100} mt="xs" size="xs" color="rally-primary" />
          </div>
          <div>
            <NumberInput label={'\u0642\u06CC\u0645\u062A \u0627\u0639\u0645\u0627\u0644 (K)'} value={strikePrice} onChange={(v) => setStrikePrice(v || 0)} min={1} step={100} size="sm" />
            <Slider value={strikePrice} onChange={setStrikePrice} min={100} max={100000} step={100} mt="xs" size="xs" color="rally-primary" />
          </div>
          <div>
            <NumberInput label={'\u0631\u0648\u0632 \u062A\u0627 \u0633\u0631\u0631\u0633\u06CC\u062F'} value={daysToExpiry} onChange={(v) => setDaysToExpiry(v || 1)} min={1} max={730} size="sm" />
            <Slider value={daysToExpiry} onChange={setDaysToExpiry} min={1} max={730} mt="xs" size="xs" color="rally-primary" />
          </div>
          <div>
            <NumberInput label={'\u0646\u0648\u0633\u0627\u0646\u200C\u067E\u0630\u06CC\u0631\u06CC (\u066A)'} value={volatility} onChange={(v) => setVolatility(v ?? 1)} min={1} max={200} step={1} size="sm" />
            <Slider value={volatility} onChange={setVolatility} min={1} max={200} mt="xs" size="xs" color="rally-primary" />
          </div>
        </SimpleGrid>

        {/* Second row: risk-free rate, option type, and type-specific params */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          <div>
            <NumberInput label={'\u0646\u0631\u062E \u0628\u062F\u0648\u0646 \u0631\u06CC\u0633\u06A9 (\u066A)'} value={riskFreeRate} onChange={(v) => setRiskFreeRate(v ?? 0)} min={0} max={50} step={0.5} decimalScale={1} size="sm" />
          </div>
          <div>
            <Text size="sm" fw={500} mb={4}>{'\u0646\u0648\u0639 \u0627\u062E\u062A\u06CC\u0627\u0631'}</Text>
            <SegmentedControl
              value={optionType}
              onChange={setOptionType}
              data={[{ value: 'call', label: '\u062E\u0631\u06CC\u062F (Call)' }, { value: 'put', label: '\u0641\u0631\u0648\u0634 (Put)' }]}
              fullWidth
              size="sm"
            />
          </div>

          {/* Binary-specific */}
          {exoticMode === 'binary' && (
            <>
              <div>
                <Text size="sm" fw={500} mb={4}>{'\u0646\u0648\u0639 \u0628\u0627\u06CC\u0646\u0631\u06CC'}</Text>
                <SegmentedControl
                  value={binarySubType}
                  onChange={setBinarySubType}
                  data={[
                    { value: 'cash', label: '\u0646\u0642\u062F\u06CC-\u06CC\u0627-\u0647\u06CC\u0686' },
                    { value: 'asset', label: '\u062F\u0627\u0631\u0627\u06CC\u06CC-\u06CC\u0627-\u0647\u06CC\u0686' },
                  ]}
                  fullWidth
                  size="sm"
                />
              </div>
              {binarySubType === 'cash' && (
                <div>
                  <NumberInput label={'\u0645\u0628\u0644\u063A \u067E\u0631\u062F\u0627\u062E\u062A (Q)'} value={payout} onChange={(v) => setPayout(v || 0)} min={1} step={100} size="sm" />
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
                  label={'\u0646\u0648\u0639 \u0645\u0627\u0646\u0639'}
                  data={BARRIER_TYPES}
                  value={barrierType}
                  onChange={setBarrierType}
                  size="sm"
                />
              </div>
              <div>
                <NumberInput label={'\u0633\u0637\u062D \u0645\u0627\u0646\u0639 (H)'} value={barrierLevel} onChange={(v) => setBarrierLevel(v || 0)} min={1} step={100} size="sm" />
                <Slider value={barrierLevel} onChange={setBarrierLevel} min={100} max={100000} step={100} mt="xs" size="xs" color="rally-primary" />
              </div>
            </>
          )}

          {/* Asian-specific */}
          {exoticMode === 'asian' && (
            <>
              <div>
                <Text size="sm" fw={500} mb={4}>{'\u0646\u0648\u0639 \u0645\u06CC\u0627\u0646\u06AF\u06CC\u0646'}</Text>
                <SegmentedControl
                  value={avgType}
                  onChange={setAvgType}
                  data={[
                    { value: 'average-price', label: '\u0645\u06CC\u0627\u0646\u06AF\u06CC\u0646 \u0642\u06CC\u0645\u062A' },
                    { value: 'average-strike', label: '\u0645\u06CC\u0627\u0646\u06AF\u06CC\u0646 \u0627\u0639\u0645\u0627\u0644' },
                  ]}
                  fullWidth
                  size="sm"
                />
              </div>
              <div>
                <NumberInput label={'\u0646\u0642\u0627\u0637 \u0646\u0645\u0648\u0646\u0647\u200C\u0628\u0631\u062F\u0627\u0631\u06CC'} value={asianSteps} onChange={(v) => setAsianSteps(v || 1)} min={10} max={500} step={1} size="sm" />
              </div>
            </>
          )}

          {/* Lookback-specific */}
          {exoticMode === 'lookback' && (
            <div>
              <NumberInput label={'\u0646\u0642\u0627\u0637 \u0646\u0645\u0648\u0646\u0647\u200C\u0628\u0631\u062F\u0627\u0631\u06CC'} value={lookbackSteps} onChange={(v) => setLookbackSteps(v || 1)} min={10} max={500} step={1} size="sm" />
            </div>
          )}
        </SimpleGrid>

        {/* Barrier rebate (extra row) */}
        {exoticMode === 'barrier' && (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mt="md">
            <div>
              <NumberInput label={'\u062C\u0631\u06CC\u0645\u0647 / \u0628\u0627\u0632\u067E\u0631\u062F\u0627\u062E\u062A (Rebate)'} value={rebate} onChange={(v) => setRebate(v ?? 0)} min={0} step={10} size="sm" />
            </div>
          </SimpleGrid>
        )}

        {/* MC numPaths slider for Asian/Lookback */}
        {exoticMode === 'asian' && (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mt="md">
            <div style={{ gridColumn: 'span 2' }}>
              <Text size="sm" fw={500} mb={4}>{'\u062A\u0639\u062F\u0627\u062F \u0645\u0633\u06CC\u0631\u0647\u0627'}</Text>
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
                  <Text size="sm" c="dimmed">{'\u062F\u0631 \u062D\u0627\u0644 \u0634\u0628\u06CC\u0647\u200C\u0633\u0627\u0632\u06CC...'}</Text>
                </Group>
              )}
            </div>
          </SimpleGrid>
        )}

        {exoticMode === 'lookback' && (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mt="md">
            <div style={{ gridColumn: 'span 2' }}>
              <Text size="sm" fw={500} mb={4}>{'\u062A\u0639\u062F\u0627\u062F \u0645\u0633\u06CC\u0631\u0647\u0627'}</Text>
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
                  <Text size="sm" c="dimmed">{'\u062F\u0631 \u062D\u0627\u0644 \u0634\u0628\u06CC\u0647\u200C\u0633\u0627\u0632\u06CC...'}</Text>
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
            title={'\u0642\u06CC\u0645\u062A \u0627\u06AF\u0632\u0627\u062A\u06CC\u06A9'}
            value={fmt(currentExoticPrice)}
            icon={IconDiamond}
            color={rallyColors.primary}
            animateValue
          />
          <RallyKPICard
            title={'\u0642\u06CC\u0645\u062A \u0628\u0644\u06A9\u200C\u0634\u0648\u0644\u0632'}
            value={bsPrice != null ? fmt(bsPrice) : '-'}
            color={rallyColors.blue}
            animateValue
          />
          <RallyKPICard
            title={'\u0627\u062E\u062A\u0644\u0627\u0641'}
            value={priceDiff != null ? fmt(priceDiff) : '-'}
            color={rallyColors.yellow}
            animateValue
          />
          {isMCMode ? (
            <RallyKPICard
              title={'\u062E\u0637\u0627\u06CC \u0627\u0633\u062A\u0627\u0646\u062F\u0627\u0631\u062F'}
              value={currentStderr != null ? formatNum(Math.round(currentStderr * 10000) / 10000) : '-'}
              color={rallyColors.purple}
              animateValue
            />
          ) : (
            <RallyKPICard
              title={'\u062F\u0644\u062A\u0627 (\u0394)'}
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
          <RallyMainCard title={'\u06CC\u0648\u0646\u0627\u0646\u06CC\u200C\u0647\u0627 (Greeks)'}>
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
                  <Table.Th>{'\u06CC\u0648\u0646\u0627\u0646\u06CC'}</Table.Th>
                  <Table.Th>{'\u0646\u0645\u0627\u062F'}</Table.Th>
                  <Table.Th>{'\u0645\u0642\u062F\u0627\u0631'}</Table.Th>
                  <Table.Th>{'\u062A\u0648\u0636\u06CC\u062D'}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td>{'\u062F\u0644\u062A\u0627'}</Table.Td>
                  <Table.Td>{'\u0394'}</Table.Td>
                  <Table.Td>{formatNum(Math.round(currentGreeks.delta * 10000) / 10000)}</Table.Td>
                  <Table.Td>{'\u062D\u0633\u0627\u0633\u06CC\u062A \u0628\u0647 \u062A\u063A\u06CC\u06CC\u0631 \u0642\u06CC\u0645\u062A \u0633\u0647\u0645'}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>{'\u06AF\u0627\u0645\u0627'}</Table.Td>
                  <Table.Td>{'\u0393'}</Table.Td>
                  <Table.Td>{formatNum(Math.round(currentGreeks.gamma * 1000000) / 1000000)}</Table.Td>
                  <Table.Td>{'\u062A\u063A\u06CC\u06CC\u0631 \u062F\u0644\u062A\u0627 \u0628\u0647 \u0627\u0632\u0627\u06CC \u062A\u063A\u06CC\u06CC\u0631 \u0642\u06CC\u0645\u062A'}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>{'\u062A\u062A\u0627'}</Table.Td>
                  <Table.Td>{'\u0398'}</Table.Td>
                  <Table.Td>{formatNum(Math.round(currentGreeks.theta * 10000) / 10000)}</Table.Td>
                  <Table.Td>{'\u06A9\u0627\u0647\u0634 \u0627\u0631\u0632\u0634 \u0628\u0647 \u0627\u0632\u0627\u06CC \u06AF\u0630\u0634\u062A \u0632\u0645\u0627\u0646 (\u0631\u0648\u0632\u0627\u0646\u0647)'}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>{'\u0648\u06AF\u0627'}</Table.Td>
                  <Table.Td>{'\u03BD'}</Table.Td>
                  <Table.Td>{formatNum(Math.round(currentGreeks.vega * 10000) / 10000)}</Table.Td>
                  <Table.Td>{'\u062D\u0633\u0627\u0633\u06CC\u062A \u0628\u0647 \u062A\u063A\u06CC\u06CC\u0631 \u0646\u0648\u0633\u0627\u0646\u200C\u067E\u0630\u06CC\u0631\u06CC'}</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </RallyMainCard>
        )}

        {/* Asian benchmark comparison */}
        {exoticMode === 'asian' && asianResult && asianGeoBenchmark != null && (
          <RallyMainCard title={'\u0645\u0642\u0627\u06CC\u0633\u0647 \u0628\u0627 \u0642\u06CC\u0645\u062A \u0647\u0646\u062F\u0633\u06CC (Geometric Benchmark)'}>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <div>
                <Text size="xs" c="dimmed">{'\u0642\u06CC\u0645\u062A MC (\u062D\u0633\u0627\u0628\u06CC)'}</Text>
                <Text size="lg" fw={700} c={rallyColors.primary}>
                  {fmt(asianResult.price)}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">{'\u0642\u06CC\u0645\u062A \u0647\u0646\u062F\u0633\u06CC (\u0641\u0631\u0645 \u0628\u0633\u062A\u0647)'}</Text>
                <Text size="lg" fw={700} c={rallyColors.green}>
                  {fmt(asianGeoBenchmark)}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">{'\u0627\u062E\u062A\u0644\u0627\u0641 MC \u0648 \u0647\u0646\u062F\u0633\u06CC'}</Text>
                <Text size="lg" fw={700} c={rallyColors.yellow}>
                  {fmt(Math.abs(asianResult.price - asianGeoBenchmark))}
                </Text>
              </div>
            </SimpleGrid>
            <Text size="xs" c="dimmed" mt="md">
              {'\u0642\u06CC\u0645\u062A \u0647\u0646\u062F\u0633\u06CC \u0641\u0631\u0645 \u0628\u0633\u062A\u0647 \u0628\u0631\u0627\u06CC \u0645\u06CC\u0627\u0646\u06AF\u06CC\u0646 \u0647\u0646\u062F\u0633\u06CC \u0627\u0633\u062A \u0648 \u0628\u0647\u200C\u0639\u0646\u0648\u0627\u0646 \u0645\u0639\u06CC\u0627\u0631 \u0633\u0646\u062C\u0634 \u0645\u0648\u0646\u062A\u200C\u06A9\u0627\u0631\u0644\u0648 \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F. \u0645\u06CC\u0627\u0646\u06AF\u06CC\u0646 \u062D\u0633\u0627\u0628\u06CC (\u0645\u0648\u0646\u062A\u200C\u06A9\u0627\u0631\u0644\u0648) \u0645\u0639\u0645\u0648\u0644\u0627\u064B \u0628\u0627\u0644\u0627\u062A\u0631 \u0627\u0632 \u0645\u06CC\u0627\u0646\u06AF\u06CC\u0646 \u0647\u0646\u062F\u0633\u06CC \u0627\u0633\u062A.'}
            </Text>
          </RallyMainCard>
        )}

        {/* Lookback info card */}
        {exoticMode === 'lookback' && lookbackResult && (
          <RallyMainCard title={'\u062C\u0632\u0626\u06CC\u0627\u062A \u0642\u06CC\u0645\u062A\u200C\u06AF\u0630\u0627\u0631\u06CC \u0628\u0627\u0632\u06AF\u0634\u062A\u06CC (Lookback Details)'}>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <div>
                <Text size="xs" c="dimmed">{'\u0642\u06CC\u0645\u062A \u0628\u0627\u0632\u06AF\u0634\u062A\u06CC (MC)'}</Text>
                <Text size="lg" fw={700} c={rallyColors.primary}>
                  {fmt(lookbackResult.price)}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">{'\u062E\u0637\u0627\u06CC \u0627\u0633\u062A\u0627\u0646\u062F\u0627\u0631\u062F'}</Text>
                <Text size="lg" fw={700} c={rallyColors.purple}>
                  {formatNum(Math.round(lookbackResult.stderr * 10000) / 10000)}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">{'\u0642\u06CC\u0645\u062A \u0628\u0644\u06A9\u200C\u0634\u0648\u0644\u0632 (\u0648\u0646\u06CC\u0644\u06CC)'}</Text>
                <Text size="lg" fw={700} c={rallyColors.blue}>
                  {bsPrice != null ? fmt(bsPrice) : '-'}
                </Text>
              </div>
            </SimpleGrid>
            <Text size="xs" c="dimmed" mt="md">
              {optionType === 'call'
                ? '\u0627\u062E\u062A\u06CC\u0627\u0631 \u0628\u0627\u0632\u06AF\u0634\u062A\u06CC \u062E\u0631\u06CC\u062F: \u062E\u0631\u06CC\u062F \u062F\u0631 \u06A9\u0645\u062A\u0631\u06CC\u0646 \u0642\u06CC\u0645\u062A \u0645\u0633\u06CC\u0631 \u2014 \u067E\u06CC\u200C\u0622\u0641 = S_T \u2212 S_min'
                : '\u0627\u062E\u062A\u06CC\u0627\u0631 \u0628\u0627\u0632\u06AF\u0634\u062A\u06CC \u0641\u0631\u0648\u0634: \u0641\u0631\u0648\u0634 \u062F\u0631 \u0628\u06CC\u0634\u062A\u0631\u06CC\u0646 \u0642\u06CC\u0645\u062A \u0645\u0633\u06CC\u0631 \u2014 \u067E\u06CC\u200C\u0622\u0641 = S_max \u2212 S_T'}
            </Text>
          </RallyMainCard>
        )}
      </Stack>
    </>
  );
}
