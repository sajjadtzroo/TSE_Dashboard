import { Badge, Box, Group, Text } from '@mantine/core';

export default function SourceItem({ src }) {
  return (
    <Box
      p="xs"
      mb={4}
      style={{
        borderRadius: 6,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <Group gap={4} mb={2} wrap="wrap">
        {src.symbol && <Badge size="xs">{src.symbol}</Badge>}
        {src.page_numbers && (
          <Text size="xs" c="dimmed">Page {src.page_numbers}</Text>
        )}
        {src.similarity > 0 && (
          <Badge size="xs" color={src.similarity > 0.7 ? 'green' : 'yellow'}>
            {(src.similarity * 100).toFixed(0)}%
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
      {src.content_preview && (
        <Text size="xs" c="dimmed" style={{ direction: 'auto' }}>
          {src.content_preview}
        </Text>
      )}
    </Box>
  );
}
