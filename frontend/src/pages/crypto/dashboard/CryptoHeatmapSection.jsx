import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Collapse, Group, Text, ActionIcon } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { IconChevronDown } from '@tabler/icons-react';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyTreemap from '../../../components/charts/RallyTreemap';
import ColorScaleLegend from '../../../components/charts/ColorScaleLegend';
import { getCryptoCategory } from '../../../constants/crypto';
import animStyles from '../../../components/shared/animations.module.css';

export default function CryptoHeatmapSection({ market = [] }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useLocalStorage({ key: 'crypto-section-heatmap', defaultValue: true });

  const treemapData = useMemo(() =>
    market.filter(c => c.market_cap_usd && c.market_cap_usd > 0).map(coin => ({
      symbol: coin.symbol,
      name_fa: coin.name_fa || coin.symbol,
      sector_name_fa: getCryptoCategory(coin.symbol),
      market_cap: coin.market_cap_usd,
      close_change_pct: coin.price_change_pct_24h ?? 0,
    })),
    [market]
  );

  return (
    <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay3}`}>
      <RallyMainCard
        title="نقشه گرمایی رمزارزها"
        fullscreenable
        secondary={
          <Group gap="xs">
            <Text size="xs" c="dimmed">اندازه: ارزش بازار | رنگ: تغییر ۲۴h</Text>
            <ActionIcon variant="subtle" onClick={() => setExpanded(!expanded)} size="sm" aria-label={expanded ? 'بستن بخش' : 'باز کردن بخش'}>
              <IconChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </ActionIcon>
          </Group>
        }
        mb="md"
      >
        <Collapse in={expanded}>
          {treemapData.length > 0 ? (
            <>
              <RallyTreemap
                data={treemapData}
                groupBy="sector_name_fa"
                sizeAccessor="market_cap"
                colorAccessor="close_change_pct"
                onCellClick={(d) => navigate(`/crypto/coin/${d.symbol}`)}
                height={400}
              />
              <ColorScaleLegend
                min={Math.min(...treemapData.map(d => d.close_change_pct), -1)}
                max={Math.max(...treemapData.map(d => d.close_change_pct), 1)}
              />
            </>
          ) : (
            <Text c="dimmed" ta="center" py="xl">داده ارزش بازار موجود نیست</Text>
          )}
        </Collapse>
      </RallyMainCard>
    </Box>
  );
}
