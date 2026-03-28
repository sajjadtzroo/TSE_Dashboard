import { useState, useMemo, useCallback } from 'react';
import { SimpleGrid, Group, Badge, Pagination, Skeleton, Stack } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import {
  IconNews,
  IconCalendar,
  IconMoodSmile,
  IconFlame,
} from '@tabler/icons-react';
import PageHeader from '../components/PageHeader';
import RefreshButton from '../components/RefreshButton';
import RallyMainCard from '../components/RallyMainCard';
import RallyKPICard from '../components/RallyKPICard';
import RallyKPISkeleton from '../components/RallyKPISkeleton';
import RallyEmptyState from '../components/RallyEmptyState';
import NewsFilterBar from '../components/news/NewsFilterBar';
import NewsArticleCard from '../components/news/NewsArticleCard';
import { useNewsFeed, useMarkNewsRead } from '../hooks/useNewsData';
import { formatNum } from '../utils/formatUtils';
import rallyColors from '../theme/rallyColors';

const PAGE_SIZE = 20;

export default function NewsPage() {
  const [filters, setFilters] = useState({
    source_type: '',
    category: '',
    language: '',
    search: '',
  });
  const [page, setPage] = useState(1);
  const [debouncedSearch] = useDebouncedValue(filters.search, 300);

  const queryParams = useMemo(() => ({
    source_type: filters.source_type || undefined,
    category: filters.category || undefined,
    language: filters.language || undefined,
    search: debouncedSearch || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  }), [filters.source_type, filters.category, filters.language, debouncedSearch, page]);

  const {
    data,
    isLoading,
    refetch,
  } = useNewsFeed(queryParams);

  const markRead = useMarkNewsRead();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // KPI computations
  const kpis = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCount = items.filter((a) => a.published_at?.startsWith(todayStr)).length;
    const sentiments = items.filter((a) => a.sentiment_score != null).map((a) => a.sentiment_score);
    const avgSentiment = sentiments.length > 0
      ? (sentiments.reduce((s, v) => s + v, 0) / sentiments.length).toFixed(2)
      : '-';
    const maxImpact = items.reduce((mx, a) => Math.max(mx, a.impact_score ?? 0), 0);
    return { todayCount, avgSentiment, maxImpact };
  }, [items]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handleRead = useCallback((id) => {
    markRead.mutate(id);
  }, [markRead]);

  return (
    <>
      <PageHeader title="اخبار بازار">
        <RefreshButton onRefreshComplete={refetch} />
      </PageHeader>

      <RallyMainCard mb="md">
        <NewsFilterBar filters={filters} onChange={handleFilterChange} />
      </RallyMainCard>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="md">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => <RallyKPISkeleton key={i} />)
        ) : (
          <>
            <RallyKPICard
              title="کل اخبار"
              value={formatNum(total)}
              icon={IconNews}
              color={rallyColors.primary}
            />
            <RallyKPICard
              title="اخبار امروز"
              value={formatNum(kpis.todayCount)}
              icon={IconCalendar}
              color={rallyColors.blue}
            />
            <RallyKPICard
              title="میانگین احساسات"
              value={kpis.avgSentiment}
              icon={IconMoodSmile}
              color={Number(kpis.avgSentiment) >= 0 ? rallyColors.green : rallyColors.red}
            />
            <RallyKPICard
              title="بیشترین تاثیر"
              value={formatNum(kpis.maxImpact)}
              icon={IconFlame}
              color={rallyColors.yellow}
            />
          </>
        )}
      </SimpleGrid>

      {isLoading ? (
        <RallyMainCard>
          <Stack gap="sm">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} height={80} radius="md" />
            ))}
          </Stack>
        </RallyMainCard>
      ) : items.length === 0 ? (
        <RallyMainCard>
          <RallyEmptyState message="خبری موجود نیست" onRetry={refetch} />
        </RallyMainCard>
      ) : (
        <>
          <Stack gap="sm" mb="md">
            {items.map((article) => (
              <NewsArticleCard
                key={article.id}
                article={article}
                onRead={handleRead}
              />
            ))}
          </Stack>

          {totalPages > 1 && (
            <Group justify="center" mb="md">
              <Pagination
                total={totalPages}
                value={page}
                onChange={setPage}
                size="sm"
              />
            </Group>
          )}
        </>
      )}
    </>
  );
}
