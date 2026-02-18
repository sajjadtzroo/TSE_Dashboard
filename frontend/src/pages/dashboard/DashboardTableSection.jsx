import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Collapse, ActionIcon } from '@mantine/core';
import { IconChevronDown, IconStar, IconStarFilled } from '@tabler/icons-react';
import RallyMainCard from '../../components/RallyMainCard';
import RallyDataTable from '../../components/RallyDataTable';
import PercentChangeCell from '../../components/cells/PercentChangeCell';
import SparklineCell from '../../components/cells/SparklineCell';
import StockPreviewDrawer from '../../components/stock/StockPreviewDrawer';
import useWatchlist from '../../hooks/useWatchlist';
import usePagination from '../../hooks/usePagination';
import useSparklineData from '../../hooks/useSparklineData';
import rallyColors from '../../theme/rallyColors';
import { formatNum, toPersianNum } from '../../utils/formatUtils';
import { FILTER_OPTIONS } from '../../constants/dashboard';
import animStyles from '../../components/shared/animations.module.css';
import styles from '../Dashboard.module.css';

export default function DashboardTableSection({
  expanded, onToggle,
  recentData, filteredByCategory, filterCounts,
  activeFilter, onFilterChange, onRetry,
}) {
  const [previewSymbol, setPreviewSymbol] = useState(null);
  const navigate = useNavigate();
  const { toggleSymbol, isWatched } = useWatchlist();
  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(filteredByCategory);

  const pageSymbols = useMemo(() => paged.map((r) => r.symbol), [paged]);
  const { sparklines } = useSparklineData(pageSymbols);

  const columns = [
    {
      accessor: '_star', title: '', width: 36,
      render: (r) => {
        const watched = isWatched(r.symbol);
        const Icon = watched ? IconStarFilled : IconStar;
        return <Icon size={16} color={watched ? rallyColors.yellow : rallyColors.textDimmed} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); toggleSymbol(r.symbol); }} />;
      },
    },
    { accessor: 'symbol', title: 'نماد', width: 80 },
    { accessor: 'name_fa', title: 'نام', width: 150 },
    { accessor: 'close', title: 'قیمت پایانی', width: 100, textAlign: 'end', render: (r) => formatNum(r.close) },
    { accessor: 'close_change_pct', title: 'تغییر ٪', width: 90, textAlign: 'end', render: (r) => <PercentChangeCell value={r.close_change_pct} /> },
    { accessor: '_sparkline', title: 'روند ۷ روز', width: 80, render: (r) => <SparklineCell data={sparklines.get(r.symbol)} /> },
    { accessor: 'volume', title: 'حجم', width: 110, textAlign: 'end', render: (r) => formatNum(r.volume) },
  ];

  return (
    <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay4}`}>
      <RallyMainCard
        title={`نمادهای فعال (${formatNum(recentData.length)})`}
        noPadding
        secondary={
          <ActionIcon variant="subtle" onClick={onToggle} size="sm">
            <IconChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </ActionIcon>
        }
      >
        <Collapse in={expanded}>
          <div className={styles.filterGroup}>
            {FILTER_OPTIONS.map((opt) => {
              const isActive = activeFilter === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  className={`${styles.filterPill} ${isActive ? styles.filterPillActive : ''} ${isActive ? (styles[opt.colorClass] || styles.filterPillDefault) : ''}`}
                  onClick={() => onFilterChange(opt.key)}
                >
                  {opt.label}
                  <span className={styles.filterCount}>({toPersianNum(filterCounts[opt.key])})</span>
                </button>
              );
            })}
          </div>
          <RallyDataTable
            records={paged}
            columns={columns}
            idAccessor="ins_code"
            page={page}
            onPageChange={setPage}
            recordsPerPage={perPage}
            onRecordsPerPageChange={setPerPage}
            totalRecords={totalRecords}
            onRowClick={({ record }) => setPreviewSymbol(record.symbol)}
            emptyMessage="داده‌ای موجود نیست"
            onRetry={onRetry}
            minHeight={350}
          />
        </Collapse>
      </RallyMainCard>

      <StockPreviewDrawer symbol={previewSymbol} onClose={() => setPreviewSymbol(null)} />
    </Box>
  );
}
