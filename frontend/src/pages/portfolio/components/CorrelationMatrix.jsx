import { useMemo } from 'react';
import { Box, Text, ScrollArea } from '@mantine/core';
import RallyMainCard from '../../../components/RallyMainCard';
import { correlation } from '../../../utils/riskMetrics/capm.js';
import { computeSimpleReturns, alignReturnSeries } from '../../../utils/riskMetrics/returns.js';
import { toPersianNum } from '../../../utils/formatUtils';
import rallyColors from '../../../theme/rallyColors';
import { usePortfolioContext } from '../PortfolioProvider';

function getCellColor(val) {
  if (val == null) return 'transparent';
  // red (-1) → white (0) → green (+1)
  if (val >= 0) {
    const intensity = Math.min(val, 1);
    const r = Math.round(255 - intensity * 239);
    const g = Math.round(255 - intensity * 70);
    const b = Math.round(255 - intensity * 130);
    return `rgb(${r}, ${g}, ${b})`;
  }
  const intensity = Math.min(Math.abs(val), 1);
  const r = Math.round(255 - intensity * 17);
  const g = Math.round(255 - intensity * 187);
  const b = Math.round(255 - intensity * 187);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function CorrelationMatrix() {
  const { holdings, stockHistories } = usePortfolioContext();

  const matrix = useMemo(() => {
    if (holdings.length < 2) return null;

    // Build return series for each stock
    const returnSeries = holdings.map((h, i) => {
      const history = stockHistories[i]?.data;
      if (!history || history.length < 10) return [];
      return computeSimpleReturns(history);
    });

    const n = holdings.length;
    const corr = Array.from({ length: n }, () => Array(n).fill(null));

    for (let i = 0; i < n; i++) {
      corr[i][i] = 1;
      for (let j = i + 1; j < n; j++) {
        if (!returnSeries[i].length || !returnSeries[j].length) continue;
        const aligned = alignReturnSeries(returnSeries[i], returnSeries[j]);
        if (aligned.stockReturns.length >= 10) {
          const c = correlation(aligned.stockReturns, aligned.benchReturns);
          corr[i][j] = c;
          corr[j][i] = c;
        }
      }
    }

    return corr;
  }, [holdings, stockHistories]);

  if (!matrix || holdings.length < 2) {
    return (
      <RallyMainCard title="ماتریس همبستگی">
        <Text size="sm" c="dimmed" ta="center" py="xl">
          حداقل ۲ دارایی برای محاسبه همبستگی لازم است
        </Text>
      </RallyMainCard>
    );
  }

  const cellSize = 56;
  const headerSize = 60;

  return (
    <RallyMainCard title="ماتریس همبستگی">
      <ScrollArea>
        <Box style={{ display: 'inline-block', minWidth: 'fit-content' }}>
          <table style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ width: headerSize, minWidth: headerSize }} />
                {holdings.map((h) => (
                  <th
                    key={h.symbol}
                    style={{
                      width: cellSize,
                      minWidth: cellSize,
                      textAlign: 'center',
                      padding: 4,
                      fontSize: 11,
                      color: rallyColors.textSecondary,
                      fontWeight: 600,
                    }}
                  >
                    {h.symbol}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holdings.map((h, i) => (
                <tr key={h.symbol}>
                  <td
                    style={{
                      padding: '4px 8px',
                      fontSize: 11,
                      color: rallyColors.textSecondary,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h.symbol}
                  </td>
                  {holdings.map((_, j) => {
                    const val = matrix[i][j];
                    return (
                      <td
                        key={j}
                        style={{
                          width: cellSize,
                          height: cellSize,
                          textAlign: 'center',
                          background: getCellColor(val),
                          borderRadius: 4,
                          padding: 2,
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                          cursor: 'default',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.1)';
                          e.currentTarget.style.boxShadow = '0 0 8px rgba(148,163,184,0.3)';
                          e.currentTarget.style.zIndex = '1';
                          e.currentTarget.style.position = 'relative';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.zIndex = '';
                          e.currentTarget.style.position = '';
                        }}
                      >
                        <Text
                          size="xs"
                          fw={600}
                          c={val != null && Math.abs(val) > 0.5 ? '#fff' : rallyColors.textPrimary}
                        >
                          {val != null ? toPersianNum(val.toFixed(2)) : '-'}
                        </Text>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </ScrollArea>
    </RallyMainCard>
  );
}
