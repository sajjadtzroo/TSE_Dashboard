import { useState, useCallback } from 'react';
import { Box, Group, Text, ActionIcon, Collapse, Divider } from '@mantine/core';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useMarketQuickStats } from '../../../hooks/useSidebarMarketData';
import { toPersianNum } from '../../../utils/formatUtils';
import rallyColors from '../../../theme/rallyColors';
import animStyles from '../../../components/shared/animations.module.css';
import styles from './SidebarQuickStats.module.css';

const LS_KEY = 'sidebar-quick-stats-open';

function readOpen() {
  try { return localStorage.getItem(LS_KEY) !== 'false'; } catch { return true; }
}

export default function SidebarQuickStats({ collapsed }) {
  const [open, setOpen] = useState(readOpen);
  const { advancers, decliners, unchanged, totalVolume } = useMarketQuickStats();

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      try { localStorage.setItem(LS_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  if (collapsed) return null;

  const volStr = totalVolume >= 1e9
    ? toPersianNum((totalVolume / 1e9).toFixed(1)) + 'B'
    : totalVolume >= 1e6
      ? toPersianNum((totalVolume / 1e6).toFixed(0)) + 'M'
      : toPersianNum(totalVolume);

  return (
    <Box className={`${styles.widget} ${animStyles.widgetSlideIn}`} px="sm" py={8}>
      <Group justify="space-between" mb={open ? 6 : 0}>
        <Text size="xs" fw={600} c={rallyColors.textSecondary}>
          وضعیت بازار
        </Text>
        <ActionIcon variant="subtle" size="xs" color="gray" onClick={toggle}>
          {open ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        </ActionIcon>
      </Group>

      <Collapse in={open}>
        <Box className={styles.rows}>
          <Group gap={6} className={styles.row}>
            <Box className={styles.dot} style={{ background: rallyColors.green }} />
            <Text size="xs" c={rallyColors.textPrimary} fw={500}>مثبت</Text>
            <Text size="xs" c={rallyColors.green} fw={700} ml="auto" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {toPersianNum(advancers)}
            </Text>
          </Group>
          <Group gap={6} className={styles.row}>
            <Box className={styles.dot} style={{ background: rallyColors.red }} />
            <Text size="xs" c={rallyColors.textPrimary} fw={500}>منفی</Text>
            <Text size="xs" c={rallyColors.red} fw={700} ml="auto" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {toPersianNum(decliners)}
            </Text>
          </Group>
          <Group gap={6} className={styles.row}>
            <Box className={styles.dot} style={{ background: rallyColors.textDimmed }} />
            <Text size="xs" c={rallyColors.textPrimary} fw={500}>بدون تغییر</Text>
            <Text size="xs" c={rallyColors.textDimmed} fw={700} ml="auto" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {toPersianNum(unchanged)}
            </Text>
          </Group>

          <Divider color={rallyColors.border} my={4} />

          <Group justify="space-between">
            <Text size="xs" c={rallyColors.textDimmed}>حجم کل</Text>
            <Text size="xs" c={rallyColors.textPrimary} fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {volStr}
            </Text>
          </Group>
        </Box>
      </Collapse>
    </Box>
  );
}
