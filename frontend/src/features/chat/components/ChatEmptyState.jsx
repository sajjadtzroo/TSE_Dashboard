import { Box, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import {
  IconBuildingBank,
  IconChartLine,
  IconCoin,
  IconRobot,
  IconSchool,
  IconTrendingUp,
} from '@tabler/icons-react';
import styles from './ChatDrawer.module.css';
import { CHAT_CATEGORIES } from '../../../constants/chat';

const ICON_MAP = {
  green: IconTrendingUp,
  purple: IconBuildingBank,
  blue: IconChartLine,
  orange: IconCoin,
  pink: IconSchool,
};

const CATEGORIES = CHAT_CATEGORIES.map((cat) => ({
  ...cat,
  icon: ICON_MAP[cat.colorName] ?? IconTrendingUp,
  className:
    styles[`category${cat.colorName.charAt(0).toUpperCase() + cat.colorName.slice(1)}`] ??
    styles.categoryGreen,
}));

export default function ChatEmptyState({ onSendPrompt, section, contextSymbol }) {
  // Re-order categories based on current page section
  const orderedCategories = (() => {
    if (!section || section === 'general') return CATEGORIES;
    const sectionMap = {
      stock: 'green',
      crypto: 'orange',
      loans: 'purple',
    };
    const targetColor = sectionMap[section];
    if (!targetColor) return CATEGORIES;
    const prioritized = CATEGORIES.filter((c) => c.colorName === targetColor);
    const rest = CATEGORIES.filter((c) => c.colorName !== targetColor);
    return [...prioritized, ...rest];
  })();

  // Template symbol into prompts when contextSymbol is available
  const getPrompt = (cat) => {
    if (!contextSymbol) return cat.prompt;
    if (cat.colorName === 'green' && section === 'stock') {
      return `قیمت ${contextSymbol} چقدره؟`;
    }
    if (cat.colorName === 'blue' && section === 'stock') {
      return `حمایت و مقاومت ${contextSymbol}`;
    }
    if (cat.colorName === 'orange' && section === 'crypto') {
      return `قیمت ${contextSymbol} چقدره؟`;
    }
    return cat.prompt;
  };

  return (
    <Stack align="center" py="xl" gap="md">
      <Box className={styles.emptyStateIcon}>
        <IconRobot size={28} stroke={1.5} style={{ color: '#10B981' }} />
      </Box>
      <Text fw={700} size="md" ta="center" style={{ direction: 'rtl' }}>
        دستیار هوشمند بازار سرمایه
      </Text>
      <Text size="xs" c="dimmed" ta="center" style={{ direction: 'rtl', maxWidth: 280 }}>
        سوالات خود را درباره بورس، تسهیلات و تحلیل تکنیکال بپرسید
      </Text>
      <Stack gap={8} mt="xs" w="100%" px="md">
        {orderedCategories.map((cat) => {
          const prompt = getPrompt(cat);
          return (
            <UnstyledButton
              key={cat.label}
              className={`${styles.categoryCard} ${cat.className}`}
              onClick={() => onSendPrompt(prompt)}
            >
              <Group gap="sm" wrap="nowrap">
                <cat.icon size={18} style={{ color: cat.color, flexShrink: 0 }} />
                <Box>
                  <Text size="sm" fw={600} style={{ direction: 'rtl', color: cat.color }}>
                    {cat.label}
                  </Text>
                  <Text size="xs" c="dimmed" style={{ direction: 'rtl' }}>
                    {prompt}
                  </Text>
                </Box>
              </Group>
            </UnstyledButton>
          );
        })}
      </Stack>
    </Stack>
  );
}
