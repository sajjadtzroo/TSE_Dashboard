import { motion } from 'motion/react';
import { SimpleGrid, Card, Text, Group, Button, Stack, Progress, Badge } from '@mantine/core';
import { IconDeviceFloppy } from '@tabler/icons-react';
import RiskGauge from './RiskGauge';
import rallyColors, { glassCard } from '../../../../theme/rallyColors';
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from '../../../../constants/riskQuestions';
import { toPersianNum } from '../../../../utils/formatUtils';

/**
 * Result screen after completing the questionnaire.
 * Shows gauge, category label, description, allocation preview, and save button.
 */
export default function QuestionnaireResult({ scoreResult, onSave }) {
  const { normalizedScore, abilityScore, willingnessScore, config } = scoreResult;

  return (
    <Stack gap="lg">
      {/* Gauge + Category */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <Card padding="xl" radius="md" style={{ ...glassCard, boxShadow: rallyColors.glassShadow }}>
          <Stack align="center" gap="md">
            <RiskGauge
              score={normalizedScore}
              label={config.label}
              color={config.color}
              size={220}
            />
            <Text size="sm" c="dimmed" ta="center" maw={400}>
              {config.description}
            </Text>

            {/* Ability vs Willingness breakdown */}
            <SimpleGrid cols={2} spacing="md" style={{ width: '100%', maxWidth: 360 }}>
              <Card padding="sm" radius="md" style={{ backgroundColor: rallyColors.elevated }}>
                <Text size="xs" c="dimmed" ta="center">توانایی ریسک‌پذیری</Text>
                <Text size="lg" fw={700} ta="center" style={{ color: rallyColors.blue }}>
                  {toPersianNum(abilityScore)}٪
                </Text>
              </Card>
              <Card padding="sm" radius="md" style={{ backgroundColor: rallyColors.elevated }}>
                <Text size="xs" c="dimmed" ta="center">تمایل به ریسک</Text>
                <Text size="lg" fw={700} ta="center" style={{ color: rallyColors.purple }}>
                  {toPersianNum(willingnessScore)}٪
                </Text>
              </Card>
            </SimpleGrid>
          </Stack>
        </Card>
      </motion.div>

      {/* Allocation Preview */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <Card padding="lg" radius="md" style={{ ...glassCard, boxShadow: rallyColors.glassShadow }}>
          <Text fw={600} size="md" mb="md" style={{ color: rallyColors.textPrimary }}>
            تخصیص پیشنهادی دارایی‌ها
          </Text>
          <Stack gap="sm">
            {Object.entries(config.allocation)
              .filter(([, pct]) => pct > 0)
              .map(([cls, pct]) => (
                <Group key={cls} gap="sm" wrap="nowrap">
                  <Text size="sm" w={120} style={{ color: rallyColors.textSecondary }}>
                    {ASSET_CLASS_LABELS[cls]}
                  </Text>
                  <Progress
                    value={pct}
                    color={ASSET_CLASS_COLORS[cls]}
                    size="lg"
                    radius="xl"
                    style={{ flex: 1 }}
                  />
                  <Badge
                    variant="light"
                    size="sm"
                    style={{
                      backgroundColor: `${ASSET_CLASS_COLORS[cls]}15`,
                      color: ASSET_CLASS_COLORS[cls],
                      minWidth: 48,
                    }}
                  >
                    {toPersianNum(pct)}٪
                  </Badge>
                </Group>
              ))}
          </Stack>
        </Card>
      </motion.div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <Group justify="center">
          <Button
            size="lg"
            leftSection={<IconDeviceFloppy size={20} />}
            onClick={onSave}
            style={{
              backgroundColor: config.color,
              '&:hover': { backgroundColor: config.color },
            }}
          >
            ذخیره پروفایل ریسک
          </Button>
        </Group>
      </motion.div>
    </Stack>
  );
}
