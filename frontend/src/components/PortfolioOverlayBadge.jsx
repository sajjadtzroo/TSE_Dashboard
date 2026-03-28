import { useMemo } from 'react';
import { Badge, Tooltip } from '@mantine/core';
import { IconBriefcase } from '@tabler/icons-react';
import { toPersianNum, formatNum } from '../utils/formatUtils';
import rallyColors from '../theme/rallyColors';

function getHoldings() {
  try {
    const raw = localStorage.getItem('tse-portfolio');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/**
 * Shows a small P&L badge next to stocks the user owns.
 * Place this next to the symbol in any market data table.
 *
 * @param {string} symbol - The stock symbol to check
 * @param {number} currentPrice - Current market price
 */
export default function PortfolioOverlayBadge({ symbol, currentPrice }) {
  const holding = useMemo(() => {
    const holdings = getHoldings();
    return holdings.find((h) => h.symbol === symbol);
  }, [symbol]);

  if (!holding || !currentPrice) return null;

  const qty = holding.quantity;
  const buyPrice = holding.buyPrice;
  const pnl = qty * (currentPrice - buyPrice);
  const pnlPct = buyPrice > 0 ? ((currentPrice - buyPrice) / buyPrice) * 100 : 0;
  const isPos = pnl >= 0;
  const color = isPos ? rallyColors.green : rallyColors.red;

  return (
    <Tooltip
      label={
        <div style={{ textAlign: 'center', fontSize: 11 }}>
          <div>{toPersianNum(qty.toLocaleString())} سهم</div>
          <div>خرید: {formatNum(buyPrice)}</div>
          <div style={{ color }}>
            سود: {isPos ? '+' : ''}{formatNum(Math.round(pnl))} ({isPos ? '+' : ''}{toPersianNum(pnlPct.toFixed(1))}٪)
          </div>
        </div>
      }
      withArrow
      position="top"
    >
      <Badge
        size="xs"
        variant="light"
        color={isPos ? 'green' : 'red'}
        leftSection={<IconBriefcase size={9} />}
        style={{ cursor: 'default', fontVariantNumeric: 'tabular-nums' }}
      >
        {isPos ? '+' : ''}{toPersianNum(pnlPct.toFixed(1))}٪
      </Badge>
    </Tooltip>
  );
}

/**
 * Hook to check if a symbol is in the user's portfolio.
 */
export function useIsInPortfolio(symbol) {
  return useMemo(() => {
    const holdings = getHoldings();
    return holdings.some((h) => h.symbol === symbol);
  }, [symbol]);
}
