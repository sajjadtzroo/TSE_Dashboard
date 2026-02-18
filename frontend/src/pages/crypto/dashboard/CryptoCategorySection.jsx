import { useState } from 'react';
import { Box, Collapse, SimpleGrid, Text, ActionIcon, Group } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyBarChart from '../../../components/charts/RallyBarChart';
import rallyColors from '../../../theme/rallyColors';
import animStyles from '../../../components/shared/animations.module.css';

export default function CryptoCategorySection({ categoryPerformance = [] }) {
  const [expanded, setExpanded] = useState(true);

  const barData = categoryPerformance
    .filter(c => c.count > 0)
    .map(c => ({ x: c.category, y: c.avgChange }));

  return (
    <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay2}`}>
      <RallyMainCard
        title="عملکرد دسته‌بندی‌ها"
        secondary={
          <ActionIcon variant="subtle" onClick={() => setExpanded(!expanded)} size="sm">
            <IconChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </ActionIcon>
        }
        mb="md"
      >
        <Collapse in={expanded}>
          <RallyMainCard title="میانگین تغییر ۲۴h هر دسته" fullscreenable mb="md">
            {barData.length > 0 ? (
              <RallyBarChart
                data={barData}
                horizontal
                autoColorByValue
                height={240}
                tooltipFormatter={d => `${d.x}: ${d.y > 0 ? '+' : ''}${d.y}%`}
              />
            ) : (
              <Text c="dimmed" ta="center" py="xl">داده‌ای موجود نیست</Text>
            )}
          </RallyMainCard>

          <SimpleGrid cols={{ base: 2, sm: 3, md: 3, lg: 6 }} spacing="md">
            {categoryPerformance.filter(c => c.count > 0).map(cat => (
              <RallyMainCard key={cat.category}>
                <Text size="xs" c="dimmed" mb={4}>{cat.category}</Text>
                <Group justify="space-between" align="baseline">
                  <Text
                    size="lg"
                    fw={700}
                    style={{ color: cat.avgChange >= 0 ? rallyColors.green : rallyColors.red }}
                  >
                    {cat.avgChange > 0 ? '+' : ''}{cat.avgChange}%
                  </Text>
                  <Text size="xs" c="dimmed">{cat.count} رمزارز</Text>
                </Group>
                <Text size="xs" c="dimmed" mt={2}>
                  حجم: ${cat.totalVolume >= 1e9
                    ? (cat.totalVolume / 1e9).toFixed(1) + 'B'
                    : cat.totalVolume >= 1e6
                      ? (cat.totalVolume / 1e6).toFixed(0) + 'M'
                      : Number(cat.totalVolume).toLocaleString()}
                </Text>
              </RallyMainCard>
            ))}
          </SimpleGrid>
        </Collapse>
      </RallyMainCard>
    </Box>
  );
}
