import { Box, Collapse, ActionIcon, Group, Text, Stack, Badge, Skeleton } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import RallyMainCard from '../../components/RallyMainCard';
import { useNewsTrending } from '../../hooks/useNewsData';
import rallyColors from '../../theme/rallyColors';

const SENTIMENT_COLORS = {
  positive: rallyColors.green,
  negative: rallyColors.red,
  neutral: rallyColors.textDimmed,
};

const SOURCE_LABELS = {
  telegram: 'تلگرام',
  rss: 'RSS',
  cryptopanic: 'CryptoPanic',
  newsapi: 'NewsAPI',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'الان';
  if (minutes < 60) return `${minutes}د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}س`;
  const days = Math.floor(hours / 24);
  return `${days}ر`;
}

export default function DashboardNewsSection({ expanded, onToggle }) {
  const navigate = useNavigate();
  const { data, isLoading } = useNewsTrending();

  const articles = (data?.items ?? data ?? []).slice(0, 5);

  return (
    <Box>
      <RallyMainCard
        title="آخرین اخبار"
        secondary={
          <ActionIcon variant="subtle" onClick={onToggle} size="sm">
            <IconChevronDown
              size={16}
              style={{
                transform: expanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            />
          </ActionIcon>
        }
        mb="md"
      >
        <Collapse in={expanded}>
          {isLoading ? (
            <Stack gap="xs">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} height={32} radius="sm" />
              ))}
            </Stack>
          ) : articles.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl" size="sm">
              خبری موجود نیست
            </Text>
          ) : (
            <Stack gap={4}>
              {articles.map((article) => (
                <Group
                  key={article.id}
                  gap="xs"
                  wrap="nowrap"
                  py={6}
                  px="xs"
                  onClick={() => navigate('/dashboard/news')}
                  style={{
                    cursor: 'pointer',
                    borderRadius: 'var(--mantine-radius-sm)',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = rallyColors.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Sentiment dot */}
                  <Box
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: SENTIMENT_COLORS[article.sentiment_label] || SENTIMENT_COLORS.neutral,
                      flexShrink: 0,
                    }}
                  />

                  <Text
                    size="xs"
                    lineClamp={1}
                    style={{ flex: 1, color: rallyColors.textPrimary }}
                  >
                    {article.title}
                  </Text>

                  <Badge size="xs" variant="light" color="gray" style={{ flexShrink: 0 }}>
                    {SOURCE_LABELS[article.source_type] || article.source_type}
                  </Badge>

                  <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                    {timeAgo(article.published_at)}
                  </Text>
                </Group>
              ))}
            </Stack>
          )}
        </Collapse>
      </RallyMainCard>
    </Box>
  );
}
