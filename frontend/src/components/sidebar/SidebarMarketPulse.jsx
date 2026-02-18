import { useState, useCallback } from 'react';
import { Box, Group, Text, ActionIcon, Collapse } from '@mantine/core';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { useTedpixSummary } from '../../hooks/useSidebarMarketData';
import { toPersianNum } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';
import animStyles from '../shared/animations.module.css';
import styles from './SidebarMarketPulse.module.css';

const LS_KEY = 'sidebar-market-pulse-open';

function readOpen() {
  try { return localStorage.getItem(LS_KEY) !== 'false'; } catch { return true; }
}

export default function SidebarMarketPulse({ collapsed }) {
  const [open, setOpen] = useState(readOpen);
  const { value, changePct, history7d } = useTedpixSummary();

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      try { localStorage.setItem(LS_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  if (collapsed) return null;

  const isPositive = changePct > 0;
  const changeColor = changePct > 0 ? rallyColors.green : changePct < 0 ? rallyColors.red : rallyColors.textDimmed;
  const chartData = history7d.map((v, i) => ({ i, v }));

  return (
    <Box className={`${styles.widget} ${animStyles.widgetSlideIn}`} px="sm" py={8}>
      <Group justify="space-between" mb={open ? 6 : 0}>
        <Text size="xs" fw={600} c={rallyColors.textSecondary}>
          TEDPIX
        </Text>
        <ActionIcon variant="subtle" size="xs" color="gray" onClick={toggle}>
          {open ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        </ActionIcon>
      </Group>

      <Collapse in={open}>
        <Group justify="space-between" align="flex-end" gap={4}>
          <Box>
            <Text size="md" fw={700} c={rallyColors.textPrimary} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {value != null ? toPersianNum(Math.round(value).toLocaleString()) : '-'}
            </Text>
            {changePct != null && (
              <Text size="xs" fw={600} c={changeColor} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {isPositive ? '+' : ''}{toPersianNum(Number(changePct).toFixed(2))}%
              </Text>
            )}
          </Box>
          {chartData.length > 1 && (
            <Box style={{ width: 80, height: 32 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="tedpixGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={changeColor} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={changeColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={changeColor}
                    strokeWidth={1.5}
                    fill="url(#tedpixGrad)"
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Group>
      </Collapse>
    </Box>
  );
}
