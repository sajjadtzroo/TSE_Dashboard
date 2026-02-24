import { Box, Group, Text } from '@mantine/core';
import { formatTrillion } from '../utils/formatUtils';
import rallyColors from '../theme/rallyColors';
import animStyles from './shared/animations.module.css';
import styles from './FlowBalanceBar.module.css';

export default function FlowBalanceBar({ realBuy, realSell, legalBuy, legalSell, mb = 'md' }) {
  const total = realBuy + realSell + legalBuy + legalSell || 1;
  const rbPct = Math.round((realBuy / total) * 100);
  const rsPct = Math.round((realSell / total) * 100);
  const lbPct = Math.round((legalBuy / total) * 100);
  const lsPct = 100 - rbPct - rsPct - lbPct;

  return (
    <Box className={`${styles.flowBar} ${animStyles.sectionEnter}`} mb={mb} role="img" aria-label={`ترکیب جریان: خرید حقیقی ${formatTrillion(realBuy)}، فروش حقیقی ${formatTrillion(realSell)}، خرید حقوقی ${formatTrillion(legalBuy)}، فروش حقوقی ${formatTrillion(legalSell)}`}>
      <Group justify="space-between" mb={8} wrap="wrap">
        <Text size="sm" fw={600} c={rallyColors.textPrimary}>ترکیب جریان نقدینگی</Text>
        <Group gap="md" className={styles.legendGroup}>
          <Group gap={4}>
            <Box className={styles.legendDot} style={{ background: rallyColors.green }} />
            <Text size="xs" c={rallyColors.green} fw={600}>{formatTrillion(realBuy)} <span className={styles.legendLabel}>خرید حقیقی</span></Text>
          </Group>
          <Group gap={4}>
            <Box className={styles.legendDot} style={{ background: rallyColors.red }} />
            <Text size="xs" c={rallyColors.red} fw={600}>{formatTrillion(realSell)} <span className={styles.legendLabel}>فروش حقیقی</span></Text>
          </Group>
          <Group gap={4}>
            <Box className={styles.legendDot} style={{ background: rallyColors.purple }} />
            <Text size="xs" c={rallyColors.purple} fw={600}>{formatTrillion(legalBuy)} <span className={styles.legendLabel}>خرید حقوقی</span></Text>
          </Group>
          <Group gap={4}>
            <Box className={styles.legendDot} style={{ background: rallyColors.yellow }} />
            <Text size="xs" c={rallyColors.yellow} fw={600}>{formatTrillion(legalSell)} <span className={styles.legendLabel}>فروش حقوقی</span></Text>
          </Group>
        </Group>
      </Group>
      <div className={styles.flowProgress}>
        <div className={styles.segmentRealBuy} style={{ width: `${rbPct}%` }} />
        <div className={styles.segmentRealSell} style={{ width: `${rsPct}%` }} />
        <div className={styles.segmentLegalBuy} style={{ width: `${lbPct}%` }} />
        <div className={styles.segmentLegalSell} style={{ width: `${lsPct}%` }} />
      </div>
      <Group justify="space-between" mt={6}>
        <Text className={styles.flowLabel} c={rallyColors.green}>{rbPct}٪</Text>
        <Text className={styles.flowLabel} c={rallyColors.red}>{rsPct}٪</Text>
        <Text className={styles.flowLabel} c={rallyColors.purple}>{lbPct}٪</Text>
        <Text className={styles.flowLabel} c={rallyColors.yellow}>{lsPct}٪</Text>
      </Group>
    </Box>
  );
}
