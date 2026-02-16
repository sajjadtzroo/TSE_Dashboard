import { useState, useMemo, useRef, useCallback } from 'react';
import {
  Grid,
  SimpleGrid,
  Group,
  Stack,
  Badge,
  Button,
  Select,
  NumberInput,
  Slider,
  SegmentedControl,
  ActionIcon,
  Text,
  Table,
  Card,
} from '@mantine/core';
import {
  IconTrash,
  IconPlus,
  IconDownload,
  IconPhoto,
  IconTriangle,
  IconWaveSine,
  IconClock,
  IconFlame,
  IconPercentage,
} from '@tabler/icons-react';
import RallyMainCard from '../components/RallyMainCard';
import RallyKPICard from '../components/RallyKPICard';
import PageHeader from '../components/PageHeader';
import PayoffChart from '../components/charts/PayoffChart';
import rallyColors from '../theme/rallyColors';
import {
  blackScholesPrice,
  strategyPayoff,
  strategyGreeks,
  findBreakevens,
  maxProfitLoss,
  STRATEGY_PRESETS,
  STRATEGY_LABELS,
} from '../utils/blackScholes';

const STRATEGY_OPTIONS = Object.entries(STRATEGY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const POPULAR = ['covered-call', 'straddle', 'iron-condor', 'bull-call-spread'];

function autoFillPremiums(legs, S, T, r, sigma) {
  return legs.map((leg) => {
    if (leg.type === 'stock') return leg;
    const premium = blackScholesPrice(leg.type, S, leg.strike, T, r, sigma);
    return { ...leg, premium: Math.round(premium * 100) / 100 };
  });
}

export default function OptionsCalculator() {
  const [strategy, setStrategy] = useState('straddle');
  const [stockPrice, setStockPrice] = useState(10000);
  const [daysToExpiry, setDaysToExpiry] = useState(30);
  const [riskFreeRate, setRiskFreeRate] = useState(20);
  const [volatility, setVolatility] = useState(30);
  const [legs, setLegs] = useState(() => {
    const T = 30 / 365;
    const r = 0.20;
    const sigma = 0.30;
    return autoFillPremiums(STRATEGY_PRESETS['straddle'](10000), 10000, T, r, sigma);
  });
  const chartRef = useRef(null);

  const T = daysToExpiry / 365;
  const r = riskFreeRate / 100;
  const sigma = volatility / 100;

  // Price range: +-40% around stock price
  const priceRange = useMemo(
    () => [Math.max(0, Math.round(stockPrice * 0.6)), Math.round(stockPrice * 1.4)],
    [stockPrice],
  );

  // Computed analytics
  const computed = useMemo(() => {
    if (!legs.length) {
      return {
        breakevens: [],
        maxProfit: 0,
        maxLoss: 0,
        riskRewardRatio: null,
        netPremium: 0,
        greeks: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 },
      };
    }
    const breakevens = findBreakevens(legs, priceRange);
    const { maxProfit, maxLoss, riskRewardRatio } = maxProfitLoss(legs, priceRange);
    const gr = strategyGreeks(legs, stockPrice, T, r, sigma);
    const netPremium = legs.reduce((sum, l) => {
      if (l.type === 'stock') return sum;
      return sum + l.direction * l.qty * l.premium;
    }, 0);
    return { breakevens, maxProfit, maxLoss, riskRewardRatio, netPremium: Math.round(netPremium * 100) / 100, greeks: gr };
  }, [legs, priceRange, stockPrice, T, r, sigma]);

  // Strategy selection
  const handleStrategyChange = useCallback(
    (key) => {
      if (!key) return;
      setStrategy(key);
      const preset = STRATEGY_PRESETS[key];
      if (preset) {
        const newLegs = autoFillPremiums(preset(stockPrice), stockPrice, T, r, sigma);
        setLegs(newLegs);
      }
    },
    [stockPrice, T, r, sigma],
  );

  // Leg management
  const updateLeg = useCallback((index, field, value) => {
    setLegs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setStrategy('custom');
  }, []);

  const removeLeg = useCallback((index) => {
    setLegs((prev) => prev.filter((_, i) => i !== index));
    setStrategy('custom');
  }, []);

  const addLeg = useCallback(() => {
    setLegs((prev) => {
      if (prev.length >= 4) return prev;
      const premium = blackScholesPrice('call', stockPrice, stockPrice, T, r, sigma);
      return [
        ...prev,
        { type: 'call', direction: 1, strike: stockPrice, premium: Math.round(premium * 100) / 100, qty: 1 },
      ];
    });
    setStrategy('custom');
  }, [stockPrice, T, r, sigma]);

  // Export CSV
  const exportCSV = useCallback(() => {
    const [lo, hi] = priceRange;
    const step = (hi - lo) / 500;
    let csv = 'Price,Payoff\n';
    for (let i = 0; i <= 500; i++) {
      const x = lo + i * step;
      const y = strategyPayoff(legs, x);
      csv += `${x.toFixed(2)},${y.toFixed(2)}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payoff_data.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [legs, priceRange]);

  // Export PNG
  const exportPNG = useCallback(() => {
    const svgEl = chartRef.current?.querySelector('svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    const rect = svgEl.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = rallyColors.card;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'payoff_chart.png';
        a.click();
        URL.revokeObjectURL(url);
      });
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, []);

  const formatNum = (n) => {
    if (n === Infinity) return 'Unlimited';
    if (n === -Infinity) return 'Unlimited';
    return n?.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <>
      <PageHeader title="Options Payoff Calculator" />

      {/* Strategy Selection */}
      <RallyMainCard title="Strategy" mb="md">
        <Group gap="md" wrap="wrap">
          <Select
            data={STRATEGY_OPTIONS}
            value={strategy}
            onChange={handleStrategyChange}
            w={220}
            size="sm"
          />
          {POPULAR.map((key) => (
            <Badge
              key={key}
              variant={strategy === key ? 'filled' : 'light'}
              color="rally-green"
              size="lg"
              style={{ cursor: 'pointer' }}
              styles={strategy === key ? { root: { color: '#000' } } : undefined}
              onClick={() => handleStrategyChange(key)}
            >
              {STRATEGY_LABELS[key]}
            </Badge>
          ))}
        </Group>
      </RallyMainCard>

      <Grid gutter="md">
        {/* Left column */}
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Stack gap="md">
            {/* Parameters */}
            <RallyMainCard title="Parameters">
              <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                <div>
                  <NumberInput
                    label="Stock Price (S)"
                    value={stockPrice}
                    onChange={(v) => setStockPrice(v || 0)}
                    min={1}
                    step={100}
                    size="sm"
                  />
                  <Slider
                    value={stockPrice}
                    onChange={setStockPrice}
                    min={100}
                    max={100000}
                    step={100}
                    mt="xs"
                    size="xs"
                    color="rally-green"
                  />
                </div>
                <div>
                  <NumberInput
                    label="Days to Expiry"
                    value={daysToExpiry}
                    onChange={(v) => setDaysToExpiry(v || 1)}
                    min={1}
                    max={730}
                    size="sm"
                  />
                  <Slider
                    value={daysToExpiry}
                    onChange={setDaysToExpiry}
                    min={1}
                    max={730}
                    mt="xs"
                    size="xs"
                    color="rally-green"
                  />
                </div>
                <div>
                  <NumberInput
                    label="Risk-Free Rate (%)"
                    value={riskFreeRate}
                    onChange={(v) => setRiskFreeRate(v ?? 0)}
                    min={0}
                    max={50}
                    step={0.5}
                    decimalScale={1}
                    size="sm"
                  />
                  <Slider
                    value={riskFreeRate}
                    onChange={setRiskFreeRate}
                    min={0}
                    max={50}
                    step={0.5}
                    mt="xs"
                    size="xs"
                    color="rally-green"
                  />
                </div>
                <div>
                  <NumberInput
                    label="Volatility (%)"
                    value={volatility}
                    onChange={(v) => setVolatility(v ?? 1)}
                    min={1}
                    max={200}
                    step={1}
                    size="sm"
                  />
                  <Slider
                    value={volatility}
                    onChange={setVolatility}
                    min={1}
                    max={200}
                    mt="xs"
                    size="xs"
                    color="rally-green"
                  />
                </div>
              </SimpleGrid>
            </RallyMainCard>

            {/* Position Legs */}
            <RallyMainCard title="Position Legs">
              <Table highlightOnHover={false} withTableBorder={false}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Side</Table.Th>
                    <Table.Th>Strike</Table.Th>
                    <Table.Th>Premium</Table.Th>
                    <Table.Th>Qty</Table.Th>
                    <Table.Th w={40}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {legs.map((leg, i) => (
                    <Table.Tr key={i}>
                      <Table.Td>
                        <Select
                          data={[
                            { value: 'call', label: 'Call' },
                            { value: 'put', label: 'Put' },
                            { value: 'stock', label: 'Stock' },
                          ]}
                          value={leg.type}
                          onChange={(v) => updateLeg(i, 'type', v)}
                          size="xs"
                          w={90}
                        />
                      </Table.Td>
                      <Table.Td>
                        <SegmentedControl
                          data={[
                            { label: 'Long', value: '1' },
                            { label: 'Short', value: '-1' },
                          ]}
                          value={String(leg.direction)}
                          onChange={(v) => updateLeg(i, 'direction', Number(v))}
                          size="xs"
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          value={leg.strike}
                          onChange={(v) => updateLeg(i, 'strike', v || 0)}
                          min={0}
                          step={100}
                          size="xs"
                          w={100}
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          value={leg.premium}
                          onChange={(v) => updateLeg(i, 'premium', v ?? 0)}
                          min={0}
                          step={1}
                          decimalScale={2}
                          size="xs"
                          w={90}
                          disabled={leg.type === 'stock'}
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          value={leg.qty}
                          onChange={(v) => updateLeg(i, 'qty', v || 1)}
                          min={1}
                          max={100}
                          size="xs"
                          w={60}
                        />
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => removeLeg(i)}
                          disabled={legs.length <= 1}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              <Button
                variant="light"
                color="rally-green"
                size="xs"
                mt="sm"
                leftSection={<IconPlus size={14} />}
                onClick={addLeg}
                disabled={legs.length >= 4}
              >
                Add Leg
              </Button>
            </RallyMainCard>

            {/* Payoff Chart */}
            <RallyMainCard title="Payoff Diagram" fullscreenable>
              <div ref={chartRef}>
                <PayoffChart
                  legs={legs}
                  stockPrice={stockPrice}
                  priceRange={priceRange}
                  height={350}
                />
              </div>
            </RallyMainCard>
          </Stack>
        </Grid.Col>

        {/* Right column */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Stack gap="md">
            {/* Summary */}
            <RallyMainCard title="Summary">
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Breakeven</Text>
                  <Text size="sm" fw={600}>
                    {computed.breakevens.length
                      ? computed.breakevens.map((b) => b.toLocaleString()).join(', ')
                      : '—'}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Max Profit</Text>
                  <Text size="sm" fw={600} c={rallyColors.green}>
                    {computed.maxProfit === Infinity ? 'Unlimited' : `+${formatNum(computed.maxProfit)}`}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Max Loss</Text>
                  <Text size="sm" fw={600} c={rallyColors.orange}>
                    {computed.maxLoss === -Infinity ? 'Unlimited' : formatNum(computed.maxLoss)}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Risk-Reward</Text>
                  <Text size="sm" fw={600}>
                    {computed.riskRewardRatio != null ? `${computed.riskRewardRatio}:1` : '—'}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Net Premium</Text>
                  <Text
                    size="sm"
                    fw={600}
                    c={computed.netPremium >= 0 ? rallyColors.green : rallyColors.orange}
                  >
                    {computed.netPremium >= 0 ? '+' : ''}{formatNum(computed.netPremium)}
                  </Text>
                </Group>
              </Stack>
            </RallyMainCard>

            {/* Greeks */}
            <RallyMainCard title="Greeks">
              <Stack gap="xs">
                <RallyKPICard
                  variant="accent-bar"
                  title="Delta"
                  value={computed.greeks.delta.toFixed(4)}
                  icon={IconTriangle}
                  color={rallyColors.green}
                  subtitle="Price sensitivity"
                />
                <RallyKPICard
                  variant="accent-bar"
                  title="Gamma"
                  value={computed.greeks.gamma.toFixed(4)}
                  icon={IconWaveSine}
                  color={rallyColors.blue}
                  subtitle="Delta rate of change"
                />
                <RallyKPICard
                  variant="accent-bar"
                  title="Theta (daily)"
                  value={computed.greeks.theta.toFixed(4)}
                  icon={IconClock}
                  color={rallyColors.purple}
                  subtitle="Time decay per day"
                />
                <RallyKPICard
                  variant="accent-bar"
                  title="Vega (per 1%)"
                  value={computed.greeks.vega.toFixed(4)}
                  icon={IconFlame}
                  color={rallyColors.yellow}
                  subtitle="Volatility sensitivity"
                />
                <RallyKPICard
                  variant="accent-bar"
                  title="Rho (per 1%)"
                  value={computed.greeks.rho.toFixed(4)}
                  icon={IconPercentage}
                  color={rallyColors.orange}
                  subtitle="Interest rate sensitivity"
                />
              </Stack>
            </RallyMainCard>

            {/* Export */}
            <Card withBorder radius="md" p="md">
              <Text fw={600} size="sm" mb="sm">
                Export
              </Text>
              <Group gap="sm">
                <Button
                  variant="light"
                  color="rally-green"
                  size="xs"
                  leftSection={<IconDownload size={14} />}
                  onClick={exportCSV}
                >
                  CSV
                </Button>
                <Button
                  variant="light"
                  color="rally-blue"
                  size="xs"
                  leftSection={<IconPhoto size={14} />}
                  onClick={exportPNG}
                >
                  PNG
                </Button>
              </Group>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>
    </>
  );
}
