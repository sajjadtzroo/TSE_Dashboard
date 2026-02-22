import { useMemo } from 'react';
import { ActionIcon, Badge, Box, Card, Collapse, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { IconAlertTriangle, IconChevronDown } from '@tabler/icons-react';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyEmptyState from '../../../components/RallyEmptyState';
import PercentChangeCell from '../../../components/cells/PercentChangeCell';
import { formatVol, toPersianNum } from '../../../utils/formatUtils';
import rallyColors from '../../../theme/rallyColors';
import animStyles from '../../../components/shared/animations.module.css';

export default function CoinWhaleDetectionSection({ monthMetrics }) {
  const [expanded, setExpanded] = useLocalStorage({ key: 'coin-fund-whale', defaultValue: true });

  const alerts = useMemo(() => {
    if (!monthMetrics || monthMetrics.length < 4) return [];

    const result = [];
    for (let i = 3; i < monthMetrics.length; i++) {
      const rollingAvg = (
        monthMetrics[i - 1].total_volume +
        monthMetrics[i - 2].total_volume +
        monthMetrics[i - 3].total_volume
      ) / 3;

      const current = monthMetrics[i].total_volume;
      if (rollingAvg > 0 && current > 2 * rollingAvg) {
        result.push({
          key: monthMetrics[i].key,
          jalaliLabel: monthMetrics[i].jalaliLabel,
          total_volume: current,
          rollingAvg,
          spikePct: ((current - rollingAvg) / rollingAvg) * 100,
          return_pct: monthMetrics[i].return_pct,
        });
      }
    }
    return result;
  }, [monthMetrics]);

  return (
    <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay3}`}>
      <RallyMainCard
        title={
          <Group gap="xs">
            <Text>تشخیص فعالیت نهنگ‌ها</Text>
            {alerts.length > 0 && (
              <Badge color="orange" variant="light" size="sm">
                {toPersianNum(alerts.length)}
              </Badge>
            )}
          </Group>
        }
        secondary={
          <ActionIcon variant="subtle" onClick={() => setExpanded(!expanded)} size="sm" aria-label={expanded ? 'بستن بخش' : 'باز کردن بخش'}>
            <IconChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </ActionIcon>
        }
        mb="md"
      >
        <Collapse in={expanded}>
          {alerts.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
              {alerts.map((alert) => (
                <Card
                  key={alert.key}
                  radius="md"
                  p="md"
                  style={{
                    background: rallyColors.glassBg,
                    backdropFilter: rallyColors.glassBlur,
                    border: `1px solid ${rallyColors.glassBorder}`,
                  }}
                >
                  <Stack gap="xs">
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="sm" fw={600}>{alert.jalaliLabel}</Text>
                      <Badge
                        color="orange"
                        variant="light"
                        size="sm"
                        leftSection={<IconAlertTriangle size={12} />}
                      >
                        هشدار نهنگ
                      </Badge>
                    </Group>

                    <Group gap="xs">
                      <Text size="xs" c="dimmed">جهش حجم:</Text>
                      <Text size="sm" fw={700} c={rallyColors.yellow}>
                        +{toPersianNum(alert.spikePct.toFixed(0))}%
                      </Text>
                    </Group>

                    <Group gap="xs">
                      <Text size="xs" c="dimmed">حجم ماه:</Text>
                      <Text size="sm" fw={600}>{formatVol(alert.total_volume)}</Text>
                    </Group>

                    <Group gap="xs">
                      <Text size="xs" c="dimmed">بازدهی ماه:</Text>
                      <PercentChangeCell value={alert.return_pct} />
                    </Group>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          ) : (
            <RallyEmptyState
              icon={IconAlertTriangle}
              message="فعالیت غیرعادی نهنگ‌ها شناسایی نشد"
            />
          )}
        </Collapse>
      </RallyMainCard>
    </Box>
  );
}
