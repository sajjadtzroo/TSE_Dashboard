import { useState, useCallback, useMemo } from 'react';
import { Box, Group, Text, ActionIcon, Collapse, Divider } from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconBriefcase } from '@tabler/icons-react';
import { useMarketOverview } from '../../../hooks/useMarketData';
import { toPersianNum, formatTrillion } from '../../../utils/formatUtils';
import rallyColors from '../../../theme/rallyColors';
import animStyles from '../../../components/shared/animations.module.css';
import styles from './SidebarPortfolioSummary.module.css';

const LS_KEY = 'sidebar-portfolio-summary-open';
const PORTFOLIO_KEY = 'tse-portfolio';

function readOpen() {
  try { return localStorage.getItem(LS_KEY) !== 'false'; } catch { return true; }
}

function readHoldings() {
  try {
    const saved = localStorage.getItem(PORTFOLIO_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

export default function SidebarPortfolioSummary({ collapsed }) {
  const [open, setOpen] = useState(readOpen);
  const holdings = useMemo(readHoldings, []);
  const { data: marketData } = useMarketOverview({ enabled: holdings.length > 0 });

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      try { localStorage.setItem(LS_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  const stats = useMemo(() => {
    if (!holdings.length) return null;
    const priceMap = {};
    if (Array.isArray(marketData)) {
      marketData.forEach((s) => { priceMap[s.symbol] = s; });
    }

    let totalValue = 0;
    let todayPnl = 0;
    let topGainer = null;
    let topLoser = null;

    holdings.forEach((h) => {
      const stock = priceMap[h.symbol];
      const price = stock?.close ?? stock?.last_price ?? h.buyPrice;
      const changePct = stock?.close_change_pct ?? 0;
      const value = h.quantity * price;
      totalValue += value;
      todayPnl += h.quantity * price * (changePct / 100);

      if (!topGainer || changePct > (topGainer.pct ?? 0)) topGainer = { symbol: h.symbol, pct: changePct };
      if (!topLoser || changePct < (topLoser.pct ?? 0)) topLoser = { symbol: h.symbol, pct: changePct };
    });

    return { totalValue, todayPnl, assetCount: holdings.length, topGainer, topLoser };
  }, [holdings, marketData]);

  if (collapsed || !stats) return null;

  const pnlColor = stats.todayPnl >= 0 ? rallyColors.green : rallyColors.red;
  const pnlPrefix = stats.todayPnl >= 0 ? '+' : '';

  return (
    <Box className={`${styles.widget} ${animStyles.widgetSlideIn}`} px="sm" py={8}>
      <Group justify="space-between" mb={open ? 6 : 0}>
        <Group gap={6}>
          <IconBriefcase size={14} color={rallyColors.textSecondary} />
          <Text size="xs" fw={600} c={rallyColors.textSecondary}>
            خلاصه پورتفو
          </Text>
        </Group>
        <ActionIcon variant="subtle" size="xs" color="gray" onClick={toggle}>
          {open ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        </ActionIcon>
      </Group>

      <Collapse in={open}>
        <Box className={styles.rows}>
          <Group justify="space-between" className={styles.row}>
            <Text size="xs" c={rallyColors.textDimmed}>ارزش کل</Text>
            <Text size="xs" c={rallyColors.textPrimary} fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatTrillion(stats.totalValue)}
            </Text>
          </Group>
          <Group justify="space-between" className={styles.row}>
            <Text size="xs" c={rallyColors.textDimmed}>سود/زیان امروز</Text>
            <Text size="xs" c={pnlColor} fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {pnlPrefix}{toPersianNum(Math.round(stats.todayPnl).toLocaleString())}
            </Text>
          </Group>
          <Group justify="space-between" className={styles.row}>
            <Text size="xs" c={rallyColors.textDimmed}>تعداد دارایی</Text>
            <Text size="xs" c={rallyColors.textPrimary} fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {toPersianNum(stats.assetCount)}
            </Text>
          </Group>

          <Divider color={rallyColors.border} my={4} />

          {stats.topGainer && (
            <Group justify="space-between" className={styles.row}>
              <Text size="xs" c={rallyColors.textDimmed}>بهترین</Text>
              <Group gap={4}>
                <Text size="xs" c={rallyColors.green} fw={600}>{stats.topGainer.symbol}</Text>
                <Text size="xs" c={rallyColors.green} fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {pnlPrefix}{toPersianNum(stats.topGainer.pct?.toFixed(1) ?? '0')}٪
                </Text>
              </Group>
            </Group>
          )}
          {stats.topLoser && stats.topLoser.symbol !== stats.topGainer?.symbol && (
            <Group justify="space-between" className={styles.row}>
              <Text size="xs" c={rallyColors.textDimmed}>ضعیف‌ترین</Text>
              <Group gap={4}>
                <Text size="xs" c={rallyColors.red} fw={600}>{stats.topLoser.symbol}</Text>
                <Text size="xs" c={rallyColors.red} fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {toPersianNum(stats.topLoser.pct?.toFixed(1) ?? '0')}٪
                </Text>
              </Group>
            </Group>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
