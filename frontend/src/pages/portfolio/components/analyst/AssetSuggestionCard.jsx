import { motion } from 'motion/react';
import { Card, Text, Badge, Group, Stack } from '@mantine/core';
import rallyColors, { glassCard } from '../../../../theme/rallyColors';
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from '../../../../constants/riskQuestions';
import { toPersianNum } from '../../../../utils/formatUtils';

/**
 * Glass card for a single asset class showing allocation %, rationale,
 * and suggested symbols as badges.
 */
export default function AssetSuggestionCard({ assetClass, weight, symbols, rationale }) {
  const color = ASSET_CLASS_COLORS[assetClass] || rallyColors.blue;
  const label = ASSET_CLASS_LABELS[assetClass] || assetClass;

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
      <Card
        padding="lg"
        radius="md"
        h="100%"
        style={{
          ...glassCard,
          boxShadow: rallyColors.glassShadow,
          borderTop: `3px solid ${color}`,
        }}
      >
        <Stack gap="sm">
          {/* Header */}
          <Group justify="space-between" align="center">
            <Text fw={700} size="md" style={{ color: rallyColors.textPrimary }}>
              {label}
            </Text>
            <Badge
              size="lg"
              variant="light"
              style={{
                backgroundColor: `${color}15`,
                color,
                fontSize: 'var(--mantine-font-size-md)',
              }}
            >
              {toPersianNum(weight)}٪
            </Badge>
          </Group>

          {/* Rationale */}
          <Text size="xs" c="dimmed" lh={1.6}>
            {rationale}
          </Text>

          {/* Symbols */}
          {symbols?.length > 0 && (
            <Group gap={6} wrap="wrap">
              {symbols.map((s) => (
                <Badge
                  key={s}
                  variant="outline"
                  size="sm"
                  style={{ borderColor: rallyColors.border, color: rallyColors.textSecondary }}
                >
                  {s}
                </Badge>
              ))}
            </Group>
          )}
        </Stack>
      </Card>
    </motion.div>
  );
}
