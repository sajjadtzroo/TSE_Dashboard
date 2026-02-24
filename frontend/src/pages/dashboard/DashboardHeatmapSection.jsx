import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Collapse, Group, Text, ActionIcon, SegmentedControl } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import RallyMainCard from '../../components/RallyMainCard';
import RallyTreemap from '../../components/charts/RallyTreemap';
import HeatmapGrid from '../../components/charts/HeatmapGrid';

export default function DashboardHeatmapSection({ expanded, onToggle, recentData }) {
  const navigate = useNavigate();
  const [logScale, setLogScale] = useState(false);
  const [viewMode, setViewMode] = useState('treemap');

  const treemapData = recentData.filter(d => d.market_cap && d.market_cap > 0);

  return (
    <Box>
      <RallyMainCard
        title="نقشه گرمایی بازار"
        fullscreenable
        secondary={
          <Group gap="xs" wrap="nowrap">
            <SegmentedControl
              size="xs"
              value={viewMode}
              onChange={setViewMode}
              data={[
                { label: 'نقشه درختی', value: 'treemap' },
                { label: 'شبکه', value: 'grid' },
              ]}
            />
            {viewMode === 'treemap' && (
              <SegmentedControl
                size="xs"
                value={logScale ? 'log' : 'linear'}
                onChange={(v) => setLogScale(v === 'log')}
                data={[
                  { label: 'خطی', value: 'linear' },
                  { label: 'لگاریتمی', value: 'log' },
                ]}
              />
            )}
            <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
              {viewMode === 'treemap' ? 'اندازه: ارزش بازار | رنگ: تغییر' : 'رنگ: تغییر قیمت'}
            </Text>
            <ActionIcon variant="subtle" onClick={onToggle} size="sm">
              <IconChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </ActionIcon>
          </Group>
        }
        mb="md"
      >
        <Collapse in={expanded}>
          {treemapData.length > 0 ? (
            viewMode === 'grid' ? (
              <HeatmapGrid
                data={treemapData}
                groupBy="sector_name_fa"
                colorAccessor="close_change_pct"
                onCellClick={(d) => navigate(`/dashboard/stock/${d.symbol}`)}
              />
            ) : (
              <RallyTreemap
                data={treemapData}
                groupBy="sector_name_fa"
                sizeAccessor="market_cap"
                colorAccessor="close_change_pct"
                onCellClick={(d) => navigate(`/dashboard/stock/${d.symbol}`)}
                height={500}
                logScale={logScale}
              />
            )
          ) : (
            <Text c="dimmed" ta="center" py="xl">داده ارزش بازار موجود نیست</Text>
          )}
        </Collapse>
      </RallyMainCard>
    </Box>
  );
}
