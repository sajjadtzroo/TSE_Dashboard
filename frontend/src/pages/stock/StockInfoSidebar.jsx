import {
  Card, Divider, Group, Text,
} from '@mantine/core';
import {
  IconTrendingUp, IconTrendingDown, IconArrowUpRight, IconArrowDownRight,
  IconUsers, IconBuildingBank,
} from '@tabler/icons-react';
import RallyMainCard from '../../components/RallyMainCard';
import rallyColors from '../../theme/rallyColors';
import { formatNum, toPersianNum } from '../../utils/formatUtils';
import OrderBookCard from '../../components/cards/OrderBookCard';
import MoneyFlowCard from '../../components/cards/MoneyFlowCard';

function InfoRow({ label, value, color }) {
  return (
    <Group justify="space-between" py={4}>
      <Text size="sm" c="dimmed">{label}</Text>
      <Text size="sm" fw={500} c={color}>{value}</Text>
    </Group>
  );
}

/**
 * Sidebar showing price card, financial metrics, trader activity,
 * order book depth, and money flow.
 *
 * Props:
 *   stock       - { security, latest_ohlcv } from the stock API
 *   orderBook   - order book array
 *   history     - price history array (for MoneyFlowCard)
 *   loading     - boolean, if true nothing renders
 */
export default function StockInfoSidebar({ stock, orderBook, history, loading }) {
  if (loading || !stock) return null;

  const { latest_ohlcv } = stock;
  if (!latest_ohlcv) return null;

  const isPositive = latest_ohlcv.close_change >= 0;

  return (
    <>
      {/* Price Card */}
      <Card withBorder radius="md" mb="md">
        <Group gap="xs" mb="sm">
          {isPositive
            ? <IconTrendingUp size={24} color={rallyColors.green} />
            : <IconTrendingDown size={24} color={rallyColors.orange} />
          }
          <Text size="xl" fw={700} c={isPositive ? rallyColors.green : rallyColors.orange}>
            {formatNum(latest_ohlcv.close)}
          </Text>
        </Group>
        <Group gap={4} mb="sm">
          {isPositive
            ? <IconArrowUpRight size={16} color={rallyColors.green} />
            : <IconArrowDownRight size={16} color={rallyColors.orange} />
          }
          <Text size="sm" fw={600} c={isPositive ? rallyColors.green : rallyColors.orange}>
            {latest_ohlcv.close_change > 0 ? '+' : ''}
            {formatNum(latest_ohlcv.close_change)} ({toPersianNum((latest_ohlcv.close_change_pct ?? 0).toFixed(2))}%)
          </Text>
        </Group>
        <Divider mb="xs" color="rgba(148, 163, 184, 0.12)" />
        <InfoRow label="باز" value={formatNum(latest_ohlcv.open)} />
        <InfoRow label="بیشترین" value={formatNum(latest_ohlcv.high)} />
        <InfoRow label="کمترین" value={formatNum(latest_ohlcv.low)} />
        <InfoRow label="آخرین" value={formatNum(latest_ohlcv.last)} />
        <InfoRow label="حجم" value={formatNum(latest_ohlcv.volume)} />
        <InfoRow label="تعداد معاملات" value={formatNum(latest_ohlcv.trades)} />
      </Card>

      {/* Financial Metrics */}
      {(latest_ohlcv.pe_ratio || latest_ohlcv.eps || latest_ohlcv.market_cap) && (
        <RallyMainCard title="شاخص‌های مالی" mb="md">
          <InfoRow label="P/E Ratio" value={latest_ohlcv.pe_ratio != null ? toPersianNum(latest_ohlcv.pe_ratio.toFixed(2)) : 'N/A'} />
          <InfoRow label="EPS" value={formatNum(latest_ohlcv.eps)} />
          <InfoRow label="ارزش بازار" value={formatNum(latest_ohlcv.market_cap)} />
        </RallyMainCard>
      )}

      {/* Trader Activity */}
      {(latest_ohlcv.real_buy_count || latest_ohlcv.legal_buy_count) && (
        <RallyMainCard title="فعالیت معامله‌گران" mb="md">
          <Group gap="xs" mb={4}>
            <IconUsers size={18} color={rallyColors.blue} />
            <Text size="sm" fw={600}>حقیقی</Text>
          </Group>
          <InfoRow label="خریدار" value={formatNum(latest_ohlcv.real_buy_count)} color={rallyColors.green} />
          <InfoRow label="فروشنده" value={formatNum(latest_ohlcv.real_sell_count)} color={rallyColors.orange} />
          <Divider my="xs" color="rgba(148, 163, 184, 0.12)" />
          <Group gap="xs" mb={4}>
            <IconBuildingBank size={18} color={rallyColors.purple} />
            <Text size="sm" fw={600}>حقوقی</Text>
          </Group>
          <InfoRow label="خریدار" value={formatNum(latest_ohlcv.legal_buy_count)} color={rallyColors.green} />
          <InfoRow label="فروشنده" value={formatNum(latest_ohlcv.legal_sell_count)} color={rallyColors.orange} />
        </RallyMainCard>
      )}

      {/* Order Book Depth */}
      <OrderBookCard orderBook={orderBook} />

      {/* Money Flow */}
      <MoneyFlowCard history={history} />
    </>
  );
}
