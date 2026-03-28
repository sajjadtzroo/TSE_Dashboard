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
  Paper,
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
} from 'recharts';
import RallyMainCard from '../components/RallyMainCard';
import RallyKPICard from '../components/RallyKPICard';
import PageHeader from '../components/PageHeader';
import { blackScholesPrice, impliedVolatility } from '../utils/blackScholes';
import { formatNum, toPersianNum } from '../utils/formatUtils';
import { computeT } from '../utils/dateUtils';
import rallyColors from '../theme/rallyColors';
import { GRID_STROKE, axisTick, TOOLTIP_STYLE } from '../components/charts/shared/chartStyles';
import { IconChartLine, IconChartBar, IconPlugConnected, IconDice } from '@tabler/icons-react';
import { useOptionsUnderlyings, useOptionsChain } from '../hooks/useMarketData';
import useMCOptionsWorker from '../hooks/useMCOptionsWorker';

export default function OptionsMonteCarlo() {
  const [stockPrice, setStockPrice] = useState(10000);
  const [strikePrice, setStrikePrice] = useState(10000);
  const [daysToExpiry, setDaysToExpiry] = useState(90);
  const [riskFreeRate, setRiskFreeRate] = useState(23);
  const [volatility, setVolatility] = useState(30);
  const [numPaths, setNumPaths] = useState(100000);
  const [optionType, setOptionType] = useState('call');

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

  // MC Worker config
  const mcConfig = useMemo(() => {
    if (stockPrice <= 0 || strikePrice <= 0 || T <= 0 || sigma <= 0) return null;
    return {
      type: optionType,
      S: stockPrice,
      K: strikePrice,
      T,
      r,
      sigma,
      numPaths,
      antithetic: true,
      controlVariate: true,
    };
  }, [optionType, stockPrice, strikePrice, T, r, sigma, numPaths]);

  const { result: mcResult, running } = useMCOptionsWorker('european', mcConfig);

  // BS price for comparison
  const bsPrice = useMemo(() => {
    if (stockPrice <= 0 || strikePrice <= 0 || T <= 0 || sigma <= 0) return null;
    return blackScholesPrice(optionType, stockPrice, strikePrice, T, r, sigma);
  }, [stockPrice, strikePrice, T, r, sigma, optionType]);

  // Convergence chart data from MC result
  const convergenceData = useMemo(() => {
    if (!mcResult?.convergence) return [];
    return mcResult.convergence.map((c) => ({
      n: c.n,
      price: Math.round(c.price * 100) / 100,
    }));
  }, [mcResult]);

  const priceDiff = mcResult && bsPrice != null
    ? Math.abs(mcResult.price - bsPrice)
    : null;

  return (
    <>
      <PageHeader title={'\u0642\u06CC\u0645\u062A\u200C\u06AF\u0630\u0627\u0631\u06CC \u0645\u0648\u0646\u062A\u200C\u06A9\u0627\u0631\u0644\u0648 (Monte Carlo Pricing)'} />

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

      {/* Parameters */}
      <RallyMainCard mb="md">
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

        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          <div>
            <NumberInput label={'\u0646\u0631\u062E \u0628\u062F\u0648\u0646 \u0631\u06CC\u0633\u06A9 (\u066A)'} value={riskFreeRate} onChange={(v) => setRiskFreeRate(v ?? 0)} min={0} max={50} step={0.5} decimalScale={1} size="sm" />
          </div>
          <div>
            <Text size="sm" fw={500} mb={4}>{'\u062A\u0639\u062F\u0627\u062F \u0645\u0633\u06CC\u0631\u0647\u0627'}</Text>
            <Slider
              value={numPaths}
              onChange={setNumPaths}
              min={10000}
              max={500000}
              step={10000}
              size="sm"
              color="rally-primary"
              marks={[
                { value: 10000, label: '10K' },
                { value: 100000, label: '100K' },
                { value: 250000, label: '250K' },
                { value: 500000, label: '500K' },
              ]}
            />
            <Text size="xs" c="dimmed" mt={4} ta="center">{formatNum(numPaths)}</Text>
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
          <div>
            {running && (
              <Group gap="xs" mt="md" justify="center">
                <Loader size="sm" color={rallyColors.primary} />
                <Text size="sm" c="dimmed">{'\u062F\u0631 \u062D\u0627\u0644 \u0634\u0628\u06CC\u0647\u200C\u0633\u0627\u0632\u06CC...'}</Text>
              </Group>
            )}
          </div>
        </SimpleGrid>
      </RallyMainCard>

      {/* KPI Cards */}
      {mcResult && (
        <SimpleGrid cols={{ base: 2, md: 4 }} mb="md">
          <RallyKPICard
            title={'\u0642\u06CC\u0645\u062A \u0645\u0648\u0646\u062A\u200C\u06A9\u0627\u0631\u0644\u0648'}
            value={formatNum(Math.round(mcResult.price * 100) / 100)}
            icon={IconDice}
            color={rallyColors.primary}
            animateValue
          />
          <RallyKPICard
            title={'\u0642\u06CC\u0645\u062A \u0628\u0644\u06A9\u200C\u0634\u0648\u0644\u0632'}
            value={bsPrice != null ? formatNum(Math.round(bsPrice * 100) / 100) : '-'}
            icon={IconChartLine}
            color={rallyColors.blue}
            animateValue
          />
          <RallyKPICard
            title={'\u0627\u062E\u062A\u0644\u0627\u0641'}
            value={priceDiff != null ? formatNum(Math.round(priceDiff * 100) / 100) : '-'}
            color={rallyColors.yellow}
            animateValue
          />
          <RallyKPICard
            title={'\u062E\u0637\u0627\u06CC \u0627\u0633\u062A\u0627\u0646\u062F\u0627\u0631\u062F'}
            value={formatNum(Math.round(mcResult.stderr * 10000) / 10000)}
            subtitle={`CI 95%: [${formatNum(Math.round(mcResult.ci95[0] * 100) / 100)}, ${formatNum(Math.round(mcResult.ci95[1] * 100) / 100)}]`}
            color={rallyColors.purple}
            animateValue
          />
        </SimpleGrid>
      )}

      <Stack gap="md">
        {/* Convergence Chart */}
        {convergenceData.length > 0 && (
          <RallyMainCard title={'\u0647\u0645\u06AF\u0631\u0627\u06CC\u06CC \u0642\u06CC\u0645\u062A (Convergence)'} fullscreenable>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={convergenceData} margin={{ top: 10, right: 20, bottom: 20, left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis
                  dataKey="n"
                  tick={axisTick(10)}
                  label={{ value: '\u062A\u0639\u062F\u0627\u062F \u0645\u0633\u06CC\u0631', position: 'insideBottom', offset: -10, fontSize: 11, fill: rallyColors.textSecondary }}
                />
                <YAxis tick={axisTick(10)} tickFormatter={(v) => formatNum(v)} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [formatNum(v), '\u0642\u06CC\u0645\u062A MC']}
                  labelFormatter={(v) => `${formatNum(v)} \u0645\u0633\u06CC\u0631`}
                />
                {bsPrice != null && (
                  <ReferenceLine
                    y={Math.round(bsPrice * 100) / 100}
                    stroke={rallyColors.blue}
                    strokeDasharray="5 5"
                    label={{ value: `BS: ${formatNum(Math.round(bsPrice * 100) / 100)}`, fill: rallyColors.blue, fontSize: 10 }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={rallyColors.primary}
                  strokeWidth={2}
                  dot={{ r: 3, fill: rallyColors.primary }}
                />
              </LineChart>
            </ResponsiveContainer>
          </RallyMainCard>
        )}

        {/* Payoff Distribution (if strategy MC has been run — for single option, show basic histogram concept) */}
        {mcResult && mcResult.convergence && mcResult.convergence.length > 0 && (
          <RallyMainCard title={'\u062A\u0648\u0632\u06CC\u0639 \u0642\u06CC\u0645\u062A \u062A\u062E\u0645\u06CC\u0646\u06CC (Price Estimates)'} fullscreenable>
            <Paper p="md" radius="md" style={{ background: 'rgba(42, 46, 62, 0.3)' }}>
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                <div>
                  <Text size="xs" c="dimmed">{'\u0642\u06CC\u0645\u062A MC'}</Text>
                  <Text size="lg" fw={700} c={rallyColors.primary}>
                    {formatNum(Math.round(mcResult.price * 100) / 100)}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">{'\u062D\u062F \u067E\u0627\u06CC\u06CC\u0646 CI 95%'}</Text>
                  <Text size="lg" fw={700} c={rallyColors.green}>
                    {formatNum(Math.round(mcResult.ci95[0] * 100) / 100)}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">{'\u062D\u062F \u0628\u0627\u0644\u0627\u06CC\u06CC CI 95%'}</Text>
                  <Text size="lg" fw={700} c={rallyColors.red}>
                    {formatNum(Math.round(mcResult.ci95[1] * 100) / 100)}
                  </Text>
                </div>
              </SimpleGrid>
            </Paper>

            <Text size="xs" c="dimmed" mt="md">
              {'\u0628\u0627\u0632\u0647 \u0627\u0637\u0645\u06CC\u0646\u0627\u0646 \u06F9\u06F5\u066A \u0628\u0627 '}{formatNum(numPaths)}{' \u0645\u0633\u06CC\u0631 \u0634\u0628\u06CC\u0647\u200C\u0633\u0627\u0632\u06CC \u0634\u062F\u0647 | \u06A9\u0627\u0647\u0634 \u0648\u0627\u0631\u06CC\u0627\u0646\u0633: Antithetic + Control Variate'}
            </Text>
          </RallyMainCard>
        )}
      </Stack>
    </>
  );
}
