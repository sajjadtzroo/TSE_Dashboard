import { SimpleGrid, Card, Text, Group, Stack, Progress, Box } from '@mantine/core';
import RallyMainCard from '../../../../components/RallyMainCard';
import RiskGauge from './RiskGauge';
import GapAnalysis from './GapAnalysis';
import { RISK_CATEGORIES } from '../../../../constants/riskQuestions';
import rallyColors, { glassCard } from '../../../../theme/rallyColors';
import { toPersianNum } from '../../../../utils/formatUtils';
import animStyles from '../../../../components/shared/animations.module.css';

/**
 * Profile summary tab: gauge + all-categories comparison + gap analysis.
 */
export default function ProfileSummary({ profile, enrichedHoldings }) {
  if (!profile) {
    return (
      <RallyMainCard title="پروفایل ریسک">
        <Text size="sm" c="dimmed" ta="center" py="xl">
          پروفایل ریسکی ثبت نشده است
        </Text>
      </RallyMainCard>
    );
  }

  const activeCategory = RISK_CATEGORIES.find((c) => c.key === profile.category);

  return (
    <Stack gap="md">
      {/* Gauge + Info */}
      <Box className={animStyles.sectionEnter}>
        <RallyMainCard title="پروفایل ریسک شما">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            <Stack align="center">
              <RiskGauge
                score={profile.normalizedScore}
                label={activeCategory?.label}
                color={activeCategory?.color}
                size={200}
              />
              <Text size="sm" c="dimmed" ta="center" maw={300}>
                {activeCategory?.description}
              </Text>
            </Stack>

            <Stack gap="xs">
              <Text fw={600} size="sm" style={{ color: rallyColors.textPrimary }} mb="xs">
                مقایسه با سایر دسته‌ها
              </Text>
              {RISK_CATEGORIES.map((cat) => {
                const isActive = cat.key === profile.category;
                return (
                  <Card
                    key={cat.key}
                    padding="xs"
                    radius="sm"
                    style={{
                      backgroundColor: isActive ? `${cat.color}10` : 'transparent',
                      border: isActive ? `1px solid ${cat.color}40` : `1px solid transparent`,
                    }}
                  >
                    <Group justify="space-between" gap="sm" wrap="nowrap">
                      <Group gap="xs" wrap="nowrap" style={{ flex: 1 }}>
                        <Box
                          w={10}
                          h={10}
                          style={{
                            borderRadius: '50%',
                            backgroundColor: cat.color,
                            flexShrink: 0,
                          }}
                        />
                        <Text
                          size="xs"
                          fw={isActive ? 700 : 400}
                          style={{ color: isActive ? cat.color : rallyColors.textSecondary }}
                        >
                          {cat.label}
                        </Text>
                      </Group>
                      <Text size="xs" c="dimmed" style={{ minWidth: 60, textAlign: 'left' }}>
                        {toPersianNum(cat.range[0])}–{toPersianNum(cat.range[1])}
                      </Text>
                      <Progress
                        value={
                          isActive
                            ? ((profile.normalizedScore - cat.range[0]) / (cat.range[1] - cat.range[0])) * 100
                            : 0
                        }
                        color={cat.color}
                        size="sm"
                        radius="xl"
                        style={{ width: 80 }}
                      />
                    </Group>
                  </Card>
                );
              })}
            </Stack>
          </SimpleGrid>
        </RallyMainCard>
      </Box>

      {/* Gap Analysis */}
      <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay1}`}>
        <GapAnalysis
          enrichedHoldings={enrichedHoldings}
          suggestedAllocation={activeCategory?.allocation}
        />
      </Box>
    </Stack>
  );
}
