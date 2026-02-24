import { Box, SimpleGrid, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconCalculator } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';
import { TEMPLATES } from '../../../constants/financialModeling';
import styles from './FinancialModeling.module.css';

/** Derive bg/border rgba from a hex color */
function colorAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function ModelEmptyState({ onSendPrompt }) {
  return (
    <Stack align="center" py={40} gap="lg" px="md" maw={560} mx="auto" className={styles.messageEnter}>
      <Box className={styles.emptyIcon}>
        <IconCalculator size={26} stroke={1.5} color={rallyColors.blue} />
      </Box>

      <Stack gap={4} align="center">
        <Text fw={700} size="lg" c={rallyColors.textPrimary} ta="center" style={{ direction: 'rtl' }}>
          مدل‌ساز مالی هوشمند
        </Text>
        <Text size="sm" c="dimmed" ta="center" style={{ direction: 'rtl', maxWidth: 320, lineHeight: 1.6 }}>
          مدل‌های مالی خود را از طریق گفتگو بسازید. DCF، DDM، WACC، CAPM، اوراق، وام و بیشتر.
        </Text>
      </Stack>

      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing={8} w="100%">
        {TEMPLATES.map((t) => (
          <UnstyledButton
            key={t.label}
            onClick={() => onSendPrompt(t.prompt)}
            className={styles.quickStartCard}
            aria-label={t.shortLabel || t.label}
            style={{
              background: colorAlpha(t.color, 0.06),
              border: `1px solid ${colorAlpha(t.color, 0.15)}`,
            }}
          >
            <Box style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <t.icon size={16} color={t.color} style={{ flexShrink: 0, marginTop: 2 }} />
              <Box>
                <Text size="sm" fw={600} c={t.color}>
                  {t.shortLabel || t.label}
                </Text>
                <Text size="xs" c="dimmed" mt={2} style={{ direction: 'rtl', lineHeight: 1.5 }}>
                  {t.prompt.substring(0, 55)}...
                </Text>
              </Box>
            </Box>
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
