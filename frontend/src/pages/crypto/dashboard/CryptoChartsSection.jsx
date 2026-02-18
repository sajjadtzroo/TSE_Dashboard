import { useState } from 'react';
import { Box, Collapse, SimpleGrid, Text, ActionIcon } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyBarChart from '../../../components/charts/RallyBarChart';
import RallyPieChart, { RALLY_COLOR_SCALE } from '../../../components/charts/RallyPieChart';
import RallyListCard from '../../../components/RallyListCard';
import CryptoIcon from '../../../components/CryptoIcon';
import Reveal from '../../../features/landing/components/Reveal';
import rallyColors from '../../../theme/rallyColors';

export default function CryptoChartsSection({ chartData = {}, market = [], movers = { gainers: [], losers: [] } }) {
  const [expanded, setExpanded] = useState(true);

  // Bar data: top gainers + losers
  const barData = [...market]
    .sort((a, b) => (b.price_change_pct_24h ?? 0) - (a.price_change_pct_24h ?? 0));
  const top5 = barData.filter(c => (c.price_change_pct_24h ?? 0) > 0).slice(0, 5);
  const bottom5 = barData.filter(c => (c.price_change_pct_24h ?? 0) < 0).reverse().slice(0, 5);
  const changeBars = [...top5, ...bottom5].map(c => ({ x: c.symbol, y: Number((c.price_change_pct_24h ?? 0).toFixed(2)) }));

  return (
    <Reveal>
      <RallyMainCard
        title="نمودارها و آمار"
        secondary={
          <ActionIcon variant="subtle" onClick={() => setExpanded(!expanded)} size="sm">
            <IconChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </ActionIcon>
        }
        mb="md"
      >
        <Collapse in={expanded}>
          <SimpleGrid cols={{ base: 1, sm: 1, md: 2, lg: 3, xl: 4 }} spacing="md">
            <RallyMainCard title="بیشترین رشد و افت" fullscreenable>
              {changeBars.length > 0 ? (
                <RallyBarChart data={changeBars} autoColorByValue height={280} tooltipFormatter={d => `${d.x}: ${d.y > 0 ? '+' : ''}${d.y}%`} />
              ) : (
                <Text c="dimmed" ta="center" py="xl">داده قیمتی موجود نیست</Text>
              )}
            </RallyMainCard>

            <RallyMainCard title="حجم معاملات ۲۴h (میلیون $)" fullscreenable>
              {(chartData.volumeBar || []).length > 0 ? (
                <RallyBarChart data={chartData.volumeBar} horizontal height={280} barColor={rallyColors.blue} tooltipFormatter={d => `${d.x}: $${d.y}M`} />
              ) : (
                <Text c="dimmed" ta="center" py="xl">داده حجم موجود نیست</Text>
              )}
            </RallyMainCard>

            <RallyMainCard title="توزیع ارزش بازار" fullscreenable>
              {(chartData.marketCapPie || []).length > 0 ? (
                <RallyPieChart data={chartData.marketCapPie} colorScale={RALLY_COLOR_SCALE.concat(['#4FC3F7', '#AED581', '#FFB74D'])} centerLabel="مجموع" centerValue={chartData.marketCapPie.reduce((s, d) => s + d.y, 0).toLocaleString() + 'M'} height={280} width={280} />
              ) : (
                <Text c="dimmed" ta="center" py="xl">داده ارزش بازار موجود نیست</Text>
              )}
            </RallyMainCard>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mantine-spacing-md)' }}>
              <RallyListCard
                title="بیشترین رشد"
                items={(movers.gainers || []).slice(0, 5).map(c => ({
                  key: c.symbol,
                  label: c.symbol,
                  value: `+${(c.price_change_pct_24h ?? 0).toFixed(2)}%`,
                  color: rallyColors.green,
                  icon: <CryptoIcon symbol={c.symbol} size={18} />,
                }))}
                accentColor={rallyColors.green}
                emptyMessage="بدون رمزارز مثبت"
              />
              <RallyListCard
                title="بیشترین افت"
                items={(movers.losers || []).slice(0, 5).map(c => ({
                  key: c.symbol,
                  label: c.symbol,
                  value: `${(c.price_change_pct_24h ?? 0).toFixed(2)}%`,
                  color: rallyColors.orange,
                  icon: <CryptoIcon symbol={c.symbol} size={18} />,
                }))}
                accentColor={rallyColors.orange}
                emptyMessage="بدون رمزارز منفی"
              />
            </div>
          </SimpleGrid>
        </Collapse>
      </RallyMainCard>
    </Reveal>
  );
}
