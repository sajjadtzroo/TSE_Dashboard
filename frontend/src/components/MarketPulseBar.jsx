import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Group, Text, Box, Divider } from '@mantine/core';
import { IconTrendingUp, IconTrendingDown, IconActivity } from '@tabler/icons-react';
import rallyColors from '../theme/rallyColors';
import { toPersianNum } from '../utils/formatUtils';
import styles from './MarketPulseBar.module.css';

function isMarketOpen() {
  const now = new Date();
  // Tehran is UTC+3:30
  const tehranOffset = 3.5 * 60;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const tehranMinutes = utcMinutes + tehranOffset;
  const tehranHour = Math.floor((tehranMinutes % 1440) / 60);
  const tehranMin = Math.floor(tehranMinutes % 60);
  const day = now.getUTCDay();
  // Adjust day for Tehran timezone
  const tehranDay = (tehranMinutes >= 1440) ? (day + 1) % 7 : day;
  // Sat=6, Sun=0, Mon=1, Tue=2, Wed=3 are trading days
  const tradingDays = [6, 0, 1, 2, 3];
  if (!tradingDays.includes(tehranDay)) return false;
  const timeNum = tehranHour * 100 + tehranMin;
  return timeNum >= 900 && timeNum <= 1230;
}

export default function MarketPulseBar({ stats, tedpixValue, tedpixChange, advancers, decliners, totalVolume }) {
  const marketOpen = useMemo(() => isMarketOpen(), []);

  const volumeDisplay = useMemo(() => {
    if (!totalVolume) return toPersianNum('0');
    if (totalVolume >= 1e12) return toPersianNum((totalVolume / 1e12).toFixed(1)) + 'T';
    if (totalVolume >= 1e9) return toPersianNum((totalVolume / 1e9).toFixed(1)) + 'B';
    if (totalVolume >= 1e6) return toPersianNum((totalVolume / 1e6).toFixed(0)) + 'M';
    return toPersianNum(totalVolume);
  }, [totalVolume]);

  const changePositive = Number(tedpixChange) > 0;
  const TrendIcon = changePositive ? IconTrendingUp : IconTrendingDown;
  const changeColor = changePositive ? rallyColors.green : rallyColors.red;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Box className={styles.pulseBar} mb="md">
        <Group gap="lg" justify="center" wrap="wrap" className={styles.pulseContent}>
          {/* Market Status */}
          <Group gap={6} wrap="nowrap">
            <span className={`${styles.statusDot} ${marketOpen ? styles.statusOpen : styles.statusClosed}`} />
            <Text size="xs" fw={600} c={marketOpen ? rallyColors.green : rallyColors.textDimmed}>
              {marketOpen ? 'بازار باز' : 'بازار بسته'}
            </Text>
          </Group>

          <Divider orientation="vertical" color={rallyColors.border} className={styles.divider} />

          {/* TEDPIX */}
          <Group gap={6} wrap="nowrap">
            <IconActivity size={14} color={rallyColors.blue} />
            <Text size="xs" c="dimmed">شاخص کل</Text>
            <Text size="xs" fw={700} c={rallyColors.textPrimary} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {tedpixValue ? toPersianNum(Number(tedpixValue).toLocaleString()) : '—'}
            </Text>
            {tedpixChange != null && (
              <Group gap={2} wrap="nowrap">
                <TrendIcon size={12} color={changeColor} />
                <Text size="xs" fw={600} c={changeColor} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {changePositive ? '+' : ''}{toPersianNum(tedpixChange)}٪
                </Text>
              </Group>
            )}
          </Group>

          <Divider orientation="vertical" color={rallyColors.border} className={styles.divider} />

          {/* Volume */}
          <Group gap={6} wrap="nowrap">
            <Text size="xs" c="dimmed">حجم</Text>
            <Text size="xs" fw={600} c={rallyColors.textPrimary} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {volumeDisplay}
            </Text>
          </Group>

          <Divider orientation="vertical" color={rallyColors.border} className={styles.divider} />

          {/* Advancers / Decliners */}
          <Group gap={8} wrap="nowrap">
            <Text size="xs" c={rallyColors.green} fw={600}>
              ▲ {toPersianNum(advancers || 0)}
            </Text>
            <Text size="xs" c={rallyColors.red} fw={600}>
              ▼ {toPersianNum(decliners || 0)}
            </Text>
          </Group>
        </Group>
      </Box>
    </motion.div>
  );
}
