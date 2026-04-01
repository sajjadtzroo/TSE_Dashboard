import { useState, useMemo, useCallback } from 'react';
import {
  Box,
  SimpleGrid,
  Text,
  Badge,
  Group,
  Stack,
  SegmentedControl,
  ActionIcon,
  Tooltip,
  Progress,
  Select,
  Card,
  RingProgress,
  Center,
  ThemeIcon,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useQueryClient } from '@tanstack/react-query';
import {
  IconNews,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconExternalLink,
  IconMoodHappy,
  IconMoodSad,
  IconMoodNeutral,
  IconBrandTelegram,
  IconRss,
  IconCurrencyBitcoin,
  IconShieldCheck,
  IconAlertTriangle,
  IconFlame,
} from '@tabler/icons-react';

import PageShell from '../../components/PageShell';
import PageHeader from '../../components/PageHeader';
import RallyMainCard from '../../components/RallyMainCard';
import RallyKPICard from '../../components/RallyKPICard';
import RallyKPISkeleton from '../../components/RallyKPISkeleton';
import DataFreshness from '../../components/DataFreshness';
import RefreshButton from '../../components/RefreshButton';
import RallyBreadcrumbs from '../../components/RallyBreadcrumbs';
import {
  useNewsSentimentArticles,
  useCoinSentimentSignals,
  useNewsCategoryStats,
} from '../../hooks/useCryptoData';
import rallyColors from '../../theme/rallyColors';
import { toPersianNum } from '../../utils/formatUtils';
import animStyles from '../../components/shared/animations.module.css';

// ── Helpers ─────────────────────────────────────────────────────────────────

const SIGNAL_COLORS = {
  strong: rallyColors.green,
  moderate: rallyColors.yellow,
  weak: rallyColors.textDimmed,
};

const SIGNAL_LABELS = {
  strong: 'قوی',
  moderate: 'متوسط',
  weak: 'ضعیف',
};

function sentimentColor(score) {
  if (score == null) return rallyColors.textDimmed;
  if (score > 0.1) return rallyColors.green;
  if (score < -0.1) return rallyColors.red;
  return rallyColors.textDimmed;
}

function sentimentIcon(score) {
  if (score == null) return IconMoodNeutral;
  if (score > 0.1) return IconMoodHappy;
  if (score < -0.1) return IconMoodSad;
  return IconMoodNeutral;
}

function sentimentLabel(score) {
  if (score == null) return 'نامشخص';
  if (score > 0.1) return 'مثبت';
  if (score < -0.1) return 'منفی';
  return 'خنثی';
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'همین الان';
  if (diff < 3600) return `${toPersianNum(Math.floor(diff / 60))} دقیقه پیش`;
  if (diff < 86400) return `${toPersianNum(Math.floor(diff / 3600))} ساعت پیش`;
  return `${toPersianNum(Math.floor(diff / 86400))} روز پیش`;
}

function strengthIcon(strength) {
  if (strength === 'strong') return IconFlame;
  if (strength === 'moderate') return IconAlertTriangle;
  return IconShieldCheck;
}

// ── Coin Signal Card ────────────────────────────────────────────────────────

function CoinSignalCard({ signal }) {
  const color = signal.score > 0.05 ? 'green' : signal.score < -0.05 ? 'red' : 'gray';
  const Icon = signal.score > 0.05 ? IconTrendingUp : signal.score < -0.05 ? IconTrendingDown : IconMinus;
  const StrIcon = strengthIcon(signal.signal_strength);

  return (
    <Card
      radius="md"
      padding="md"
      style={{
        backgroundColor: rallyColors.card,
        border: `1px solid ${rallyColors.border}`,
      }}
    >
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          <Text fw={700} size="lg" style={{ color: rallyColors.textPrimary }}>
            {signal.coin}
          </Text>
          <Badge size="xs" variant="light" color={color === 'green' ? 'teal' : color}>
            {signal.score > 0 ? '+' : ''}{(signal.score * 100).toFixed(1)}%
          </Badge>
        </Group>
        <Tooltip label={SIGNAL_LABELS[signal.signal_strength]}>
          <ThemeIcon
            size="sm"
            variant="light"
            color={signal.signal_strength === 'strong' ? 'green' : signal.signal_strength === 'moderate' ? 'yellow' : 'gray'}
          >
            <StrIcon size={14} />
          </ThemeIcon>
        </Tooltip>
      </Group>

      <Group gap="lg">
        <Center>
          <RingProgress
            size={60}
            thickness={5}
            roundCaps
            sections={[
              { value: Math.min(100, Math.abs(signal.score) * 100), color: sentimentColor(signal.score) },
            ]}
            label={
              <Center>
                <Icon size={18} color={sentimentColor(signal.score)} />
              </Center>
            }
          />
        </Center>
        <Stack gap={4} style={{ flex: 1 }}>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">اطمینان</Text>
            <Text size="xs" fw={500} style={{ color: rallyColors.textPrimary }}>
              {toPersianNum((signal.confidence * 100).toFixed(0))}%
            </Text>
          </Group>
          <Progress
            value={signal.confidence * 100}
            size="xs"
            color={signal.confidence > 0.7 ? 'green' : signal.confidence > 0.4 ? 'yellow' : 'red'}
          />
          <Group justify="space-between">
            <Text size="xs" c="dimmed">اخبار</Text>
            <Text size="xs" fw={500} style={{ color: rallyColors.textPrimary }}>
              {toPersianNum(signal.n_articles)}
            </Text>
          </Group>
        </Stack>
      </Group>
    </Card>
  );
}

// ── News Article Row ────────────────────────────────────────────────────────

function NewsArticleRow({ article }) {
  const Icon = sentimentIcon(article.article_score);
  const scoreColor = sentimentColor(article.article_score);

  return (
    <Card
      radius="md"
      padding="sm"
      style={{
        backgroundColor: rallyColors.card,
        border: `1px solid ${rallyColors.border}`,
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = rallyColors.borderStrong; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = rallyColors.border; }}
    >
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <ThemeIcon
          size="lg"
          variant="light"
          color={article.article_score > 0.1 ? 'green' : article.article_score < -0.1 ? 'red' : 'gray'}
          style={{ flexShrink: 0, marginTop: 2 }}
        >
          <Icon size={18} />
        </ThemeIcon>

        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Text fw={600} size="sm" lineClamp={2} style={{ color: rallyColors.textPrimary }}>
            {article.title}
          </Text>

          <Group gap="xs" wrap="wrap">
            <Badge size="xs" variant="light" color="blue">
              {article.source}
            </Badge>
            <Text size="xs" c="dimmed">{timeAgo(article.published_at)}</Text>
            {article.article_score != null && (
              <Badge
                size="xs"
                variant="light"
                color={article.article_score > 0.1 ? 'green' : article.article_score < -0.1 ? 'red' : 'gray'}
              >
                {sentimentLabel(article.article_score)}
                {' '}
                ({article.article_score > 0 ? '+' : ''}{article.article_score.toFixed(2)})
              </Badge>
            )}
            {article.article_confidence != null && (
              <Text size="xs" c="dimmed">
                اطمینان: {toPersianNum((article.article_confidence * 100).toFixed(0))}%
              </Text>
            )}
          </Group>

          {article.coins_mentioned?.length > 0 && (
            <Group gap={4} wrap="wrap">
              {article.coins_mentioned.map((coin) => (
                <Badge key={coin} size="xs" variant="outline" color="yellow">
                  {coin}
                </Badge>
              ))}
            </Group>
          )}
        </Stack>

        {article.url && (
          <ActionIcon
            variant="subtle"
            size="sm"
            color="gray"
            component="a"
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <IconExternalLink size={14} />
          </ActionIcon>
        )}
      </Group>
    </Card>
  );
}

// ── Source Stats Card ────────────────────────────────────────────────────────

function SourceStatsCard({ stat }) {
  return (
    <Card
      radius="md"
      padding="sm"
      style={{
        backgroundColor: rallyColors.card,
        border: `1px solid ${rallyColors.border}`,
      }}
    >
      <Group justify="space-between">
        <Group gap="xs">
          <IconRss size={16} color={rallyColors.textDimmed} />
          <Text size="sm" fw={600} style={{ color: rallyColors.textPrimary }}>
            {stat.source}
          </Text>
          <Badge size="xs" variant="light" color={stat.tier === 1 ? 'blue' : 'gray'}>
            Tier {stat.tier}
          </Badge>
        </Group>
        <Group gap="xs">
          <Text size="xs" c="dimmed">
            {toPersianNum(stat.article_count)} خبر
          </Text>
          <Badge
            size="xs"
            variant="light"
            color={stat.avg_sentiment > 0.1 ? 'green' : stat.avg_sentiment < -0.1 ? 'red' : 'gray'}
          >
            {stat.avg_sentiment > 0 ? '+' : ''}{stat.avg_sentiment.toFixed(2)}
          </Badge>
        </Group>
      </Group>
    </Card>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function CryptoNewsSentiment() {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const queryClient = useQueryClient();

  const [hoursWindow, setHoursWindow] = useState('24');
  const [sourceFilter, setSourceFilter] = useState(null);

  const hours = parseInt(hoursWindow, 10);

  const {
    data: articles = [],
    isLoading: articlesLoading,
    isError: articlesError,
    dataUpdatedAt,
  } = useNewsSentimentArticles({ limit: 100, source: sourceFilter });

  const {
    data: coinSignals = [],
    isLoading: signalsLoading,
  } = useCoinSentimentSignals(hours);

  const {
    data: categoryStats = [],
    isLoading: statsLoading,
  } = useNewsCategoryStats(hours);

  const isLoading = articlesLoading || signalsLoading || statsLoading;
  const isError = articlesError;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  const hasData = articles.length > 0 || coinSignals.length > 0;

  // Derived KPIs
  const kpis = useMemo(() => {
    const pos = articles.filter(a => a.article_score > 0.1).length;
    const neg = articles.filter(a => a.article_score < -0.1).length;
    const neu = articles.length - pos - neg;
    const avgScore = articles.length
      ? articles.reduce((s, a) => s + (a.article_score || 0), 0) / articles.length
      : 0;
    return { total: articles.length, pos, neg, neu, avgScore };
  }, [articles]);

  const sourceOptions = useMemo(() => {
    const sources = [...new Set(articles.map(a => a.source))].sort();
    return [
      { value: '', label: 'همه منابع' },
      ...sources.map(s => ({ value: s, label: s })),
    ];
  }, [articles]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['crypto-news-articles'] });
    queryClient.invalidateQueries({ queryKey: ['crypto-coin-signals'] });
    queryClient.invalidateQueries({ queryKey: ['crypto-news-category-stats'] });
  }, [queryClient]);

  // Skeleton
  const skeleton = (
    <>
      <PageHeader title="تحلیل احساسات اخبار" />
      <SimpleGrid cols={{ base: 1, xs: 2, sm: 4 }} mb="md">
        {[1, 2, 3, 4].map(i => <RallyKPISkeleton key={i} />)}
      </SimpleGrid>
    </>
  );

  // Empty state
  const emptyState = (
    <Box py="xl" ta="center">
      <IconNews size={48} color={rallyColors.textDimmed} style={{ opacity: 0.5, marginBottom: 12 }} />
      <Text size="lg" fw={600} style={{ color: rallyColors.textPrimary }} mb="xs">
        هنوز خبری پردازش نشده
      </Text>
      <Text size="sm" c="dimmed" maw={400} mx="auto">
        برای شروع، پایپلاین اخبار را اجرا کنید:
      </Text>
      <Box
        mt="sm"
        p="sm"
        style={{
          backgroundColor: rallyColors.elevated,
          borderRadius: 8,
          display: 'inline-block',
          fontFamily: 'monospace',
          direction: 'ltr',
        }}
      >
        <Text size="xs" c="dimmed">python -m crypto_news_pipeline run-once</Text>
      </Box>
    </Box>
  );

  return (
    <PageShell
      loading={isLoading}
      error={isError ? 'خطا در بارگذاری' : null}
      hasData={hasData}
      skeleton={skeleton}
      onRetry={handleRefresh}
      emptyState={emptyState}
    >
      <RallyBreadcrumbs items={[
        { label: 'رمزارزها', path: '/crypto' },
        { label: 'تحلیل احساسات اخبار' },
      ]} />

      <PageHeader title="تحلیل احساسات اخبار رمزارز">
        <DataFreshness lastUpdated={lastUpdated} />
        <RefreshButton onRefreshComplete={handleRefresh} />
      </PageHeader>

      {/* KPI Cards */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="md">
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="کل اخبار"
            value={toPersianNum(kpis.total)}
            icon={IconNews}
            color={rallyColors.blue}
            bgColor={rallyColors.blue}
          />
        </Box>
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="مثبت"
            value={toPersianNum(kpis.pos)}
            icon={IconTrendingUp}
            color={rallyColors.green}
            bgColor={rallyColors.green}
          />
        </Box>
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="منفی"
            value={toPersianNum(kpis.neg)}
            icon={IconTrendingDown}
            color={rallyColors.red}
            bgColor={rallyColors.red}
          />
        </Box>
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="میانگین احساس"
            value={kpis.avgScore > 0 ? `+${kpis.avgScore.toFixed(2)}` : kpis.avgScore.toFixed(2)}
            icon={kpis.avgScore > 0.05 ? IconMoodHappy : kpis.avgScore < -0.05 ? IconMoodSad : IconMoodNeutral}
            color={sentimentColor(kpis.avgScore)}
            bgColor={sentimentColor(kpis.avgScore)}
          />
        </Box>
      </SimpleGrid>

      {/* Controls */}
      <Group justify="space-between" mb="md" wrap="wrap">
        <SegmentedControl
          value={hoursWindow}
          onChange={setHoursWindow}
          data={[
            { label: toPersianNum(4) + ' ساعت', value: '4' },
            { label: toPersianNum(12) + ' ساعت', value: '12' },
            { label: toPersianNum(24) + ' ساعت', value: '24' },
            { label: toPersianNum(72) + ' ساعت', value: '72' },
          ]}
          size="xs"
        />
        <Select
          placeholder="فیلتر منبع"
          data={sourceOptions}
          value={sourceFilter || ''}
          onChange={(v) => setSourceFilter(v || null)}
          clearable
          size="xs"
          w={160}
        />
      </Group>

      {/* Coin Signals */}
      {coinSignals.length > 0 && (
        <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay1}`} mb="md">
          <RallyMainCard title="سیگنال احساس هر رمزارز" icon={IconCurrencyBitcoin}>
            <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="sm">
              {coinSignals.slice(0, 10).map((signal) => (
                <CoinSignalCard key={signal.coin} signal={signal} />
              ))}
            </SimpleGrid>
          </RallyMainCard>
        </Box>
      )}

      {/* Two column layout: News feed + Source stats */}
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        {/* News Feed - takes 2 columns */}
        <Box style={{ gridColumn: isMobile ? undefined : 'span 2' }}>
          <RallyMainCard
            title={`اخبار اخیر (${toPersianNum(articles.length)})`}
            icon={IconNews}
          >
            <Stack gap="sm">
              {articles.length === 0 ? (
                <Text c="dimmed" ta="center" py="lg">خبری یافت نشد</Text>
              ) : (
                articles.slice(0, 30).map((article) => (
                  <NewsArticleRow key={article.id} article={article} />
                ))
              )}
            </Stack>
          </RallyMainCard>
        </Box>

        {/* Source stats sidebar */}
        <Box>
          <RallyMainCard title="منابع خبری" icon={IconRss}>
            <Stack gap="sm">
              {categoryStats.length === 0 ? (
                <Text c="dimmed" ta="center" py="lg">آماری موجود نیست</Text>
              ) : (
                categoryStats.map((stat) => (
                  <SourceStatsCard key={stat.source} stat={stat} />
                ))
              )}
            </Stack>
          </RallyMainCard>
        </Box>
      </SimpleGrid>
    </PageShell>
  );
}
