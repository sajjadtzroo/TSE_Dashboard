import { useMemo } from 'react';
import { ActionIcon, Box, Collapse, Group, SimpleGrid, Text } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { IconChevronDown, IconCurrencyDollar, IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyKPICard from '../../../components/RallyKPICard';
import RallyDataTable from '../../../components/RallyDataTable';
import PercentChangeCell from '../../../components/cells/PercentChangeCell';
import { VolumeIcon, MarketCapIcon, SpreadIcon } from '../../../components/icons/KPIIcons';
import { useCryptoDetail, useCryptoMarket } from '../../../hooks/useCryptoData';
import { formatUsd, formatVol, formatBig, formatPercent } from '../../../utils/formatUtils';
import rallyColors from '../../../theme/rallyColors';
import animStyles from '../../../components/shared/animations.module.css';

const TABLE_COLUMNS = [
  { accessor: 'symbol', title: 'نماد', width: 80 },
  {
    accessor: 'last_price',
    title: 'قیمت',
    textAlign: 'end',
    width: 120,
    render: (r) => formatUsd(r.last_price),
  },
  {
    accessor: 'price_change_pct_24h',
    title: 'تغییر ۲۴h',
    textAlign: 'end',
    width: 100,
    render: (r) => <PercentChangeCell value={r.price_change_pct_24h} />,
  },
  {
    accessor: 'volume_24h',
    title: 'حجم',
    textAlign: 'end',
    width: 110,
    render: (r) => formatVol(r.volume_24h),
  },
];

export default function CoinLiveMarketSection({ symbol }) {
  const [expanded, setExpanded] = useLocalStorage({ key: 'coin-fund-live-market', defaultValue: true });
  const { data: detail } = useCryptoDetail(symbol);
  const { data: market } = useCryptoMarket();

  const top10 = useMemo(() => {
    if (!market?.length) return [];
    return [...market]
      .sort((a, b) => (b.market_cap_usd || 0) - (a.market_cap_usd || 0))
      .slice(0, 10)
      .map((c) => ({ ...c, id: c.symbol }));
  }, [market]);

  const change = detail?.price_change_pct_24h;
  const bid = detail?.best_bid;
  const ask = detail?.best_ask;
  const spread = bid && ask && bid > 0
    ? ((ask - bid) / bid * 100).toFixed(3) + '%'
    : '-';

  return (
    <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay1}`}>
      <RallyMainCard
        title={<Text>بازار لحظه‌ای</Text>}
        secondary={
          <ActionIcon variant="subtle" onClick={() => setExpanded(!expanded)} size="sm" aria-label={expanded ? 'بستن بخش' : 'باز کردن بخش'}>
            <IconChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </ActionIcon>
        }
        mb="md"
      >
        <Collapse in={expanded}>
          <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="sm" mb="md">
            <Box className={animStyles.cardEnter}>
              <RallyKPICard
                title="قیمت فعلی"
                value={formatUsd(detail?.last_price)}
                icon={IconCurrencyDollar}
                color={rallyColors.blue}
                animateValue
              />
            </Box>
            <Box className={animStyles.cardEnter}>
              <RallyKPICard
                title="تغییر ۲۴h"
                value={formatPercent(change)}
                icon={change >= 0 ? IconTrendingUp : IconTrendingDown}
                color={change >= 0 ? rallyColors.green : rallyColors.red}
                animateValue
              />
            </Box>
            <Box className={animStyles.cardEnter}>
              <RallyKPICard
                title="حجم ۲۴h"
                value={formatVol(detail?.volume_24h)}
                icon={VolumeIcon}
                color={rallyColors.purple}
              />
            </Box>
            <Box className={animStyles.cardEnter}>
              <RallyKPICard
                title="ارزش بازار"
                value={formatBig(detail?.market_cap_usd)}
                icon={MarketCapIcon}
                color={rallyColors.green}
              />
            </Box>
            <Box className={animStyles.cardEnter}>
              <RallyKPICard
                title="اسپرد"
                value={spread}
                icon={SpreadIcon}
                color={rallyColors.yellow}
              />
            </Box>
          </SimpleGrid>

          {top10.length > 0 && (
            <RallyDataTable
              records={top10}
              columns={TABLE_COLUMNS}
              minHeight={300}
              density="compact"
              rowStyle={(record) =>
                record.symbol === symbol
                  ? { background: 'rgba(59, 130, 246, 0.08)' }
                  : undefined
              }
            />
          )}
        </Collapse>
      </RallyMainCard>
    </Box>
  );
}
