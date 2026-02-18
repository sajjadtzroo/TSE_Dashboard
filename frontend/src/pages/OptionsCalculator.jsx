import { Grid, Stack, Group, Button, Card, Text } from '@mantine/core';
import { IconDownload, IconPhoto } from '@tabler/icons-react';
import RallyMainCard from '../components/RallyMainCard';
import PageHeader from '../components/PageHeader';
import PayoffChart from '../components/charts/PayoffChart';
import useOptionsState from '../hooks/useOptionsState';
import StrategySelector from './options/StrategySelector';
import OptionsParameters from './options/OptionsParameters';
import PositionLegsTable from './options/PositionLegsTable';
import OptionsSummary from './options/OptionsSummary';
import OptionsGreeks from './options/OptionsGreeks';

export default function OptionsCalculator() {
  const {
    strategy,
    stockPrice,
    daysToExpiry,
    riskFreeRate,
    volatility,
    legs,
    chartRef,
    priceRange,
    setStockPrice,
    setDaysToExpiry,
    setRiskFreeRate,
    setVolatility,
    computed,
    handleStrategyChange,
    updateLeg,
    removeLeg,
    addLeg,
    exportCSV,
    exportPNG,
    formatLocalNum,
  } = useOptionsState();

  return (
    <>
      <PageHeader title="محاسبه‌گر سود و زیان اختیار" />

      <RallyMainCard title="استراتژی" mb="md">
        <StrategySelector strategy={strategy} onStrategyChange={handleStrategyChange} />
      </RallyMainCard>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Stack gap="md">
            <RallyMainCard title="پارامترها">
              <OptionsParameters
                stockPrice={stockPrice}
                daysToExpiry={daysToExpiry}
                riskFreeRate={riskFreeRate}
                volatility={volatility}
                onStockPriceChange={setStockPrice}
                onDaysChange={setDaysToExpiry}
                onRateChange={setRiskFreeRate}
                onVolatilityChange={setVolatility}
              />
            </RallyMainCard>

            <RallyMainCard title="پاهای موقعیت">
              <PositionLegsTable
                legs={legs}
                onLegChange={updateLeg}
                onAddLeg={addLeg}
                onRemoveLeg={removeLeg}
              />
            </RallyMainCard>

            <RallyMainCard title="نمودار سود و زیان" fullscreenable>
              <div ref={chartRef}>
                <PayoffChart legs={legs} stockPrice={stockPrice} priceRange={priceRange} height={350} />
              </div>
            </RallyMainCard>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Stack gap="md">
            <RallyMainCard title="خلاصه">
              <OptionsSummary
                breakeven={computed.breakevens}
                maxProfit={computed.maxProfit}
                maxLoss={computed.maxLoss}
                riskReward={computed.riskRewardRatio}
                netPremium={computed.netPremium}
                formatLocalNum={formatLocalNum}
              />
            </RallyMainCard>

            <RallyMainCard title="یونانی‌ها">
              <OptionsGreeks greeks={computed.greeks} />
            </RallyMainCard>

            <Card withBorder radius="md" p="md">
              <Text fw={600} size="sm" mb="sm">خروجی</Text>
              <Group gap="sm">
                <Button variant="light" color="rally-green" size="xs" leftSection={<IconDownload size={14} />} onClick={exportCSV}>
                  CSV
                </Button>
                <Button variant="light" color="rally-blue" size="xs" leftSection={<IconPhoto size={14} />} onClick={exportPNG}>
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
