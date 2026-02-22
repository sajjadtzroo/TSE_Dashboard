import { useNavigate } from 'react-router-dom';
import { Box, Collapse, Group, Text, ActionIcon } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import RallyMainCard from '../../components/RallyMainCard';
import RallyTreemap from '../../components/charts/RallyTreemap';

export default function DashboardHeatmapSection({ expanded, onToggle, recentData }) {
  const navigate = useNavigate();
  const treemapData = recentData.filter(d => d.market_cap && d.market_cap > 0);

  return (
    <Box>
      <RallyMainCard
        title="نقشه گرمایی بازار"
        fullscreenable
        secondary={
          <Group gap="xs">
            <Text size="xs" c="dimmed">اندازه: ارزش بازار | رنگ: تغییر قیمت</Text>
            <ActionIcon variant="subtle" onClick={onToggle} size="sm">
              <IconChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </ActionIcon>
          </Group>
        }
        mb="md"
      >
        <Collapse in={expanded}>
          {treemapData.length > 0 ? (
            <RallyTreemap
              data={treemapData}
              groupBy="sector_name_fa"
              sizeAccessor="market_cap"
              colorAccessor="close_change_pct"
              onCellClick={(d) => navigate(`/dashboard/stock/${d.symbol}`)}
              height={500}
            />
          ) : (
            <Text c="dimmed" ta="center" py="xl">داده ارزش بازار موجود نیست</Text>
          )}
        </Collapse>
      </RallyMainCard>
    </Box>
  );
}
