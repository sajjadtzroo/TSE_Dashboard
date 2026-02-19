import { Box, Group, Text } from '@mantine/core';
import { toPersianNum } from '../utils/formatUtils';
import rallyColors from '../theme/rallyColors';
import animStyles from './shared/animations.module.css';
import styles from './MarketBreadthBar.module.css';

export default function MarketBreadthBar({ advancers, decliners, unchanged, mb = 'md' }) {
  const total = advancers + decliners + unchanged || 1;
  const advPct = Math.round((advancers / total) * 100);
  const decPct = Math.round((decliners / total) * 100);
  const unchPct = 100 - advPct - decPct;

  return (
    <Box className={`${styles.breadthBar} ${animStyles.sectionEnter}`} mb={mb} role="img" aria-label={`وسعت بازار: ${advancers} مثبت، ${unchanged} بدون تغییر، ${decliners} منفی`}>
      <Group justify="space-between" mb={8} wrap="wrap">
        <Text size="sm" fw={600} c={rallyColors.textPrimary}>وسعت بازار</Text>
        <Group gap="md" className={styles.legendGroup}>
          <Group gap={4}>
            <Box className={styles.legendDot} style={{ background: rallyColors.green }} />
            <Text size="xs" c={rallyColors.green} fw={600}>{toPersianNum(advancers)} <span className={styles.legendLabel}>مثبت</span></Text>
          </Group>
          <Group gap={4}>
            <Box className={styles.legendDot} style={{ background: rallyColors.textDimmed }} />
            <Text size="xs" c="dimmed">{toPersianNum(unchanged)} <span className={styles.legendLabel}>بدون تغییر</span></Text>
          </Group>
          <Group gap={4}>
            <Box className={styles.legendDot} style={{ background: rallyColors.red }} />
            <Text size="xs" c={rallyColors.red} fw={600}>{toPersianNum(decliners)} <span className={styles.legendLabel}>منفی</span></Text>
          </Group>
        </Group>
      </Group>
      <div className={styles.breadthProgress}>
        <div className={styles.breadthSegmentGreen} style={{ width: `${advPct}%` }} />
        <div className={styles.breadthSegmentGray} style={{ width: `${unchPct}%` }} />
        <div className={styles.breadthSegmentRed} style={{ width: `${decPct}%` }} />
      </div>
      <Group justify="space-between" mt={6}>
        <Text className={styles.breadthLabel} c={rallyColors.green}>{toPersianNum(advPct)}٪</Text>
        <Text className={styles.breadthLabel} c="dimmed">{toPersianNum(unchPct)}٪</Text>
        <Text className={styles.breadthLabel} c={rallyColors.red}>{toPersianNum(decPct)}٪</Text>
      </Group>
    </Box>
  );
}
