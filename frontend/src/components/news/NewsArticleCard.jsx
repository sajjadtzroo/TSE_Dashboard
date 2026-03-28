import { Card, Group, Text, Badge, Stack, ActionIcon, Image, Progress } from '@mantine/core';
import {
  IconBrandTelegram,
  IconRss,
  IconCurrencyBitcoin,
  IconWorld,
  IconExternalLink,
} from '@tabler/icons-react';
import NewsSentimentBadge from './NewsSentimentBadge';
import rallyColors from '../../theme/rallyColors';

const SOURCE_ICONS = {
  telegram: IconBrandTelegram,
  rss: IconRss,
  cryptopanic: IconCurrencyBitcoin,
  newsapi: IconWorld,
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
  if (minutes < 1) return 'همین الان';
  if (minutes < 60) return `${minutes} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  const days = Math.floor(hours / 24);
  return `${days} روز پیش`;
}

export default function NewsArticleCard({ article, onRead }) {
  const {
    id, title, source, source_type, published_at,
    sentiment_label, sentiment_score, impact_score,
    related_symbols, image_url, url,
  } = article;

  const SourceIcon = SOURCE_ICONS[source_type] || IconWorld;

  return (
    <Card
      radius="md"
      padding="sm"
      onClick={() => onRead?.(id)}
      style={{
        backgroundColor: rallyColors.card,
        border: `1px solid ${rallyColors.border}`,
        cursor: 'pointer',
        transition: 'border-color 0.2s, background-color 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = rallyColors.borderStrong;
        e.currentTarget.style.backgroundColor = rallyColors.hover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = rallyColors.border;
        e.currentTarget.style.backgroundColor = rallyColors.card;
      }}
    >
      <Group gap="sm" wrap="nowrap" align="flex-start">
        {image_url && (
          <Image
            src={image_url}
            alt=""
            w={64}
            h={64}
            radius="sm"
            fit="cover"
            style={{ flexShrink: 0 }}
          />
        )}

        <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
          <Text fw={600} size="sm" lineClamp={2} style={{ color: rallyColors.textPrimary }}>
            {title}
          </Text>

          <Group gap="xs" wrap="wrap">
            <Badge
              size="xs"
              variant="light"
              color="blue"
              leftSection={<SourceIcon size={10} />}
            >
              {SOURCE_LABELS[source_type] || source || source_type}
            </Badge>

            <Text size="xs" c="dimmed">{timeAgo(published_at)}</Text>

            <NewsSentimentBadge sentiment={sentiment_label} score={sentiment_score} />
          </Group>

          {impact_score != null && (
            <Group gap="xs" align="center">
              <Text size="xs" c="dimmed">تاثیر:</Text>
              <Progress
                value={Math.min(100, Math.max(0, impact_score))}
                size="xs"
                color={impact_score >= 70 ? 'red' : impact_score >= 40 ? 'yellow' : 'blue'}
                style={{ flex: 1, maxWidth: 80 }}
              />
            </Group>
          )}

          {related_symbols?.length > 0 && (
            <Group gap={4} wrap="wrap">
              {related_symbols.map((sym) => (
                <Badge key={sym} size="xs" variant="outline" color="gray">
                  {sym}
                </Badge>
              ))}
            </Group>
          )}
        </Stack>

        {url && (
          <ActionIcon
            variant="subtle"
            size="sm"
            color="gray"
            component="a"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label="لینک خبر"
          >
            <IconExternalLink size={14} />
          </ActionIcon>
        )}
      </Group>
    </Card>
  );
}
