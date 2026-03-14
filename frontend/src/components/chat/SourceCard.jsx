import { Anchor, Badge, Box, Group, Text } from '@mantine/core';
import { IconFileText, IconWorld } from '@tabler/icons-react';
import { toPersianNum } from '../../utils/formatUtils';
import styles from './chat.module.css';

function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

export default function SourceCard({ src, index }) {
  const isWeb = src.type === 'web';

  if (isWeb) {
    return (
      <Box className={`${styles.sourceCard} ${styles.sourceWeb}`}>
        <Group gap={4} mb={2} wrap="nowrap">
          {index != null && <span className={styles.sourceIndex}>{index}</span>}
          <IconWorld size={12} style={{ flexShrink: 0, color: '#14B8A6' }} />
          {src.source_url ? (
            <Anchor
              href={src.source_url}
              target="_blank"
              rel="noopener noreferrer"
              size="xs"
              fw={600}
              lineClamp={1}
              style={{ direction: 'auto', color: '#14B8A6' }}
            >
              {src.title || src.source_url}
            </Anchor>
          ) : (
            <Text size="xs" fw={600} style={{ direction: 'auto' }} truncate>
              {src.title}
            </Text>
          )}
        </Group>
        {src.content_preview && (
          <Text size="xs" c="dimmed" mb={4} style={{ direction: 'auto', lineHeight: 1.5 }} lineClamp={2}>
            {src.content_preview}
          </Text>
        )}
        {src.source_url && (
          <Badge size="xs" variant="light" color="teal">
            {getDomain(src.source_url)}
          </Badge>
        )}
      </Box>
    );
  }

  const similarityClass =
    src.similarity > 0.7 ? styles.sourceHigh :
    src.similarity > 0.4 ? styles.sourceMedium :
    styles.sourceLow;

  const dotClass =
    src.similarity > 0.7 ? styles.similarityHigh :
    src.similarity > 0.4 ? styles.similarityMedium :
    styles.similarityLow;

  return (
    <Box className={`${styles.sourceCard} ${similarityClass}`}>
      <Group gap={6} mb={2} wrap="nowrap" align="center">
        {index != null && <span className={styles.sourceIndex}>{index}</span>}
        {src.similarity > 0 && <span className={`${styles.similarityDot} ${dotClass}`} />}
        {src.title && (
          <Text size="xs" fw={600} style={{ direction: 'auto' }} truncate>
            {src.title}
          </Text>
        )}
      </Group>
      {src.content_preview && (
        <Text size="xs" c="dimmed" mb={4} style={{ direction: 'auto', lineHeight: 1.5 }} lineClamp={2}>
          {src.content_preview}
        </Text>
      )}
      <Group gap={4} wrap="wrap">
        {src.symbol && <Badge size="xs" variant="light">{src.symbol}</Badge>}
        {src.page_numbers && (
          <Badge size="xs" variant="light" color="gray">ص. {src.page_numbers}</Badge>
        )}
        {src.similarity > 0 && (
          <Badge size="xs" color={src.similarity > 0.7 ? 'green' : 'yellow'}>
            {toPersianNum((src.similarity * 100).toFixed(0))}%
          </Badge>
        )}
        {src.source_url && (
          <Badge
            size="xs"
            color="red"
            component="a"
            href={src.source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ cursor: 'pointer' }}
          >
            PDF
          </Badge>
        )}
      </Group>
    </Box>
  );
}
