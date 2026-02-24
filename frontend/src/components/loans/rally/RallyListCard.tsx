import { type ReactNode } from 'react';
import { Card, Group, Text, Anchor, Stack, Box, Divider } from '@mantine/core';
import rallyColors from '../../../theme/rallyColors';

interface ListItem {
  key?: string;
  label: string;
  value: string | number;
  icon?: ReactNode;
  color?: string;
  valueColor?: string;
}

interface RallyListCardProps {
  title?: string;
  value?: string | number;
  items?: ListItem[];
  accentColor?: string;
  seeAllLink?: { onClick: () => void };
  onItemClick?: (item: ListItem) => void;
  emptyMessage?: string;
}

export default function RallyListCard({
  title,
  value,
  items = [],
  accentColor = rallyColors.primary,
  seeAllLink,
  onItemClick,
  emptyMessage = 'No items',
}: RallyListCardProps) {
  return (
    <Card withBorder radius="md" p="md">
      {(title || value) && (
        <Group justify="space-between" mb="sm">
          <Text size="sm" c="dimmed" fw={500}>
            {title}
          </Text>
          {value && (
            <Text size="lg" fw={700}>
              {value}
            </Text>
          )}
        </Group>
      )}

      {items.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="md">
          {emptyMessage}
        </Text>
      ) : (
        <Stack gap={0}>
          {items.map((item, i) => (
            <Box
              key={item.key || i}
              onClick={() => onItemClick?.(item)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                borderInlineStart: `3px solid ${item.color || accentColor}`,
                marginBottom: 2,
                borderRadius: '0 4px 4px 0',
                cursor: onItemClick ? 'pointer' : 'default',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) =>
                (e.currentTarget.style.background = 'rgba(156, 163, 175, 0.06)')
              }
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <Group gap="xs" style={{ minWidth: 0 }}>
                {item.icon}
                <Text size="sm" fw={500} truncate="end">
                  {item.label}
                </Text>
              </Group>
              <Text
                size="sm"
                fw={600}
                style={{ color: item.valueColor || item.color || accentColor, flexShrink: 0 }}
              >
                {item.value}
              </Text>
            </Box>
          ))}
        </Stack>
      )}

      {seeAllLink && (
        <>
          <Divider mt="sm" mb="xs" color={rallyColors.border} />
          <Anchor
            size="xs"
            fw={600}
            c="rally-primary"
            onClick={seeAllLink.onClick}
            style={{ cursor: 'pointer' }}
          >
            مشاهده همه
          </Anchor>
        </>
      )}
    </Card>
  );
}
