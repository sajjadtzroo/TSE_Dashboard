import { useNavigate } from 'react-router-dom';
import { Drawer, Group, Text, Stack, Box, ActionIcon, Button, ScrollArea, Skeleton } from '@mantine/core';
import { IconX, IconStar, IconStarFilled, IconExternalLink } from '@tabler/icons-react';
import RallyAreaChart from '../charts/RallyAreaChart';
import PercentChangeCell from '../cells/PercentChangeCell';
import { useStockDetail, useStockHistory, useOrderBook } from '../../hooks/useMarketData';
import useWatchlist from '../../hooks/useWatchlist';
import rallyColors from '../../theme/rallyColors';
import { formatNum, toPersianNum, formatTrillion, formatSymbol } from '../../utils/formatUtils';
import styles from './StockPreviewDrawer.module.css';

export default function StockPreviewDrawer({ symbol, onClose }) {
  const navigate = useNavigate();
  const { toggleSymbol, isWatched } = useWatchlist();
  const watched = isWatched(symbol);

  const { data: detail, isLoading: detailLoading } = useStockDetail(symbol);
  const { data: historyRaw = [], isLoading: historyLoading } = useStockHistory(symbol, { days: 30 });
  const { data: orderBookData, isLoading: obLoading } = useOrderBook(symbol, { limit: 3 });

  const chartData = historyRaw.map?.((d) => ({ x: d.date, y: d.close })) || [];
  const orderBook = orderBookData?.rows || orderBookData || [];

  const handleViewDetail = () => {
    onClose();
    navigate(`/dashboard/stock/${symbol}`);
  };

  return (
    <Drawer
      opened={!!symbol}
      onClose={onClose}
      position="right"
      size={500}
      withCloseButton={false}
      trapFocus={false}
      overlayProps={{ backgroundOpacity: 0.35, blur: 4 }}
      styles={{
        body: { padding: 0, height: '100%', display: 'flex', flexDirection: 'column' },
        content: { backgroundColor: rallyColors.card },
      }}
      className={styles.drawerContent}
    >
      {/* Glassmorphic Header */}
      <div className={styles.header}>
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <span className={styles.symbolBadge}>{formatSymbol(symbol, detail?.security?.type)}</span>
            {detail?.name_fa && (
              <Text size="sm" c="dimmed">{detail.name_fa}</Text>
            )}
          </Group>
          <Group gap={4}>
            <ActionIcon
              variant="subtle"
              color={watched ? 'yellow' : 'gray'}
              onClick={() => toggleSymbol(symbol)}
              size="sm"
              aria-label={watched ? 'حذف از دیده‌بان' : 'افزودن به دیده‌بان'}
            >
              {watched ? <IconStarFilled size={16} /> : <IconStar size={16} />}
            </ActionIcon>
            <ActionIcon variant="subtle" color="gray" onClick={onClose} size="sm" aria-label="بستن">
              <IconX size={16} />
            </ActionIcon>
          </Group>
        </Group>
      </div>

      {/* Body */}
      <ScrollArea style={{ flex: 1 }} p="md">
        <Stack gap="md">
          {/* Price Card */}
          <div className={styles.priceCard}>
            {detailLoading ? (
              <Skeleton height={48} />
            ) : detail ? (
              <Group justify="space-between" align="flex-end">
                <Box>
                  <Text size="xs" c="dimmed">قیمت پایانی</Text>
                  <Text size="xl" fw={700} c={rallyColors.textPrimary} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatNum(detail.close)}
                  </Text>
                </Box>
                <PercentChangeCell value={detail.close_change_pct} />
              </Group>
            ) : (
              <Text c="dimmed" size="sm">اطلاعاتی در دسترس نیست</Text>
            )}
          </div>

          {/* 30-day Chart */}
          <Box>
            <Text size="xs" c="dimmed" mb={4}>روند ۳۰ روزه</Text>
            {historyLoading ? (
              <Skeleton height={160} radius="md" />
            ) : chartData.length > 1 ? (
              <RallyAreaChart
                data={chartData}
                height={160}
                fillColor={
                  chartData.length > 1 && chartData[chartData.length - 1].y >= chartData[0].y
                    ? rallyColors.green
                    : rallyColors.red
                }
              />
            ) : (
              <Text c="dimmed" size="xs" ta="center" py="md">داده تاریخی ناکافی</Text>
            )}
          </Box>

          {/* Metrics Grid */}
          <div className={styles.metricGrid}>
            <div className={styles.metricItem}>
              <Text size="xs" c="dimmed">P/E</Text>
              <Text size="sm" fw={600} c={rallyColors.textPrimary}>
                {detail?.pe_ratio != null ? toPersianNum(detail.pe_ratio.toFixed(2)) : '-'}
              </Text>
            </div>
            <div className={styles.metricItem}>
              <Text size="xs" c="dimmed">EPS</Text>
              <Text size="sm" fw={600} c={rallyColors.textPrimary}>
                {formatNum(detail?.eps)}
              </Text>
            </div>
            <div className={styles.metricItem}>
              <Text size="xs" c="dimmed">ارزش بازار</Text>
              <Text size="sm" fw={600} c={rallyColors.textPrimary}>
                {formatTrillion(detail?.market_cap)}
              </Text>
            </div>
            <div className={styles.metricItem}>
              <Text size="xs" c="dimmed">حجم</Text>
              <Text size="sm" fw={600} c={rallyColors.textPrimary}>
                {formatNum(detail?.volume)}
              </Text>
            </div>
          </div>

          {/* Order Book Summary */}
          {orderBook.length > 0 && (
            <Box>
              <Text size="xs" c="dimmed" mb={4}>دفتر سفارش</Text>
              <Stack gap={4}>
                {orderBook.slice(0, 3).map((row, i) => (
                  <Box key={i}>
                    <div className={`${styles.orderRow} ${styles.orderRowBid}`}>
                      <Text size="xs" c={rallyColors.green} fw={600}>{formatNum(row.bid_volume_1 || row.bid_volume)}</Text>
                      <Text size="xs" c={rallyColors.green}>{formatNum(row.bid_price_1 || row.bid_price)}</Text>
                    </div>
                    <div className={`${styles.orderRow} ${styles.orderRowAsk}`}>
                      <Text size="xs" c={rallyColors.red}>{formatNum(row.ask_price_1 || row.ask_price)}</Text>
                      <Text size="xs" c={rallyColors.red} fw={600}>{formatNum(row.ask_volume_1 || row.ask_volume)}</Text>
                    </div>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {/* View Full Detail Button */}
          <Button
            variant="light"
            color="rally-primary"
            rightSection={<IconExternalLink size={14} />}
            onClick={handleViewDetail}
            className={styles.detailButton}
          >
            مشاهده جزئیات
          </Button>
        </Stack>
      </ScrollArea>
    </Drawer>
  );
}
