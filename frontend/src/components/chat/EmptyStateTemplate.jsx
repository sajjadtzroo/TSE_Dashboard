import { Box, Group, SimpleGrid, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconRobot } from '@tabler/icons-react';
import styles from './chat.module.css';

/** Derive bg/border rgba from a hex color */
function colorAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function EmptyStateTemplate({
  icon: IconComponent = IconRobot,
  title,
  subtitle,
  templates = [],
  onSelect,
  cols,
}) {
  const gridCols = cols || (templates.length > 5 ? { base: 1, xs: 2 } : 1);

  return (
    <Stack align="center" py="xl" gap="md">
      <Box className={styles.emptyStateIcon}>
        <IconComponent size={28} stroke={1.5} style={{ color: '#22C55E' }} />
      </Box>
      {title && (
        <Text fw={700} size="md" ta="center" style={{ direction: 'rtl' }}>
          {title}
        </Text>
      )}
      {subtitle && (
        <Text size="xs" c="dimmed" ta="center" style={{ direction: 'rtl', maxWidth: 320 }}>
          {subtitle}
        </Text>
      )}

      {templates.length > 0 && (
        gridCols === 1 ? (
          <Stack gap={8} mt="xs" w="100%" px="md">
            {templates.map((t) => {
              const Icon = t.icon;
              const color = t.color || '#22C55E';
              const catClassName = t.className || '';
              return (
                <UnstyledButton
                  key={t.label}
                  className={`${styles.categoryCard} ${catClassName}`}
                  style={
                    !catClassName
                      ? {
                          background: colorAlpha(color, 0.06),
                          border: `1px solid ${colorAlpha(color, 0.15)}`,
                        }
                      : undefined
                  }
                  onClick={() => onSelect(t.prompt)}
                >
                  <Group gap="sm" wrap="nowrap">
                    {Icon && <Icon size={18} style={{ color, flexShrink: 0 }} />}
                    <Box>
                      <Text size="sm" fw={600} style={{ direction: 'rtl', color }}>
                        {t.shortLabel || t.label}
                      </Text>
                      <Text size="xs" c="dimmed" style={{ direction: 'rtl' }}>
                        {t.prompt.length > 55 ? t.prompt.substring(0, 55) + '...' : t.prompt}
                      </Text>
                    </Box>
                  </Group>
                </UnstyledButton>
              );
            })}
          </Stack>
        ) : (
          <SimpleGrid cols={gridCols} spacing={8} w="100%" px="md" mt="xs">
            {templates.map((t) => {
              const Icon = t.icon;
              const color = t.color || '#22C55E';
              return (
                <UnstyledButton
                  key={t.label}
                  className={styles.categoryCard}
                  style={{
                    background: colorAlpha(color, 0.06),
                    border: `1px solid ${colorAlpha(color, 0.15)}`,
                  }}
                  onClick={() => onSelect(t.prompt)}
                >
                  <Group gap="sm" wrap="nowrap">
                    {Icon && <Icon size={16} style={{ color, flexShrink: 0, marginTop: 2 }} />}
                    <Box>
                      <Text size="sm" fw={600} c={color}>
                        {t.shortLabel || t.label}
                      </Text>
                      <Text size="xs" c="dimmed" mt={2} style={{ direction: 'rtl', lineHeight: 1.5 }}>
                        {t.prompt.length > 55 ? t.prompt.substring(0, 55) + '...' : t.prompt}
                      </Text>
                    </Box>
                  </Group>
                </UnstyledButton>
              );
            })}
          </SimpleGrid>
        )
      )}
    </Stack>
  );
}
