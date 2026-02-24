import { Box, Divider, Group, ScrollArea, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconHistory, IconPlus } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';
import useChatSessions from '../../../hooks/useChatSessions';
import { TEMPLATES } from '../../../constants/financialModeling';
import styles from './FinancialModeling.module.css';

export default function ModelSidebar({ onSelectPrompt, onNewChat }) {
  const { sessions, loading } = useChatSessions();

  return (
    <Stack gap={0} className={styles.sidebar}>
      {/* Header */}
      <Box p="sm" className={styles.sidebarHeader}>
        <Group justify="space-between" align="center">
          <Text fw={700} size="sm" c={rallyColors.textPrimary}>
            مدل‌ساز مالی
          </Text>
          <UnstyledButton
            onClick={onNewChat}
            className={styles.newChatBtn}
            aria-label="ایجاد گفتگوی جدید"
          >
            <IconPlus size={12} color={rallyColors.blue} />
            <Text size="xs" c={rallyColors.blue} fw={500}>
              جدید
            </Text>
          </UnstyledButton>
        </Group>
      </Box>

      <ScrollArea flex={1}>
        <Stack gap={0}>
          {/* Templates */}
          <Box p="sm" pb={4}>
            <Text size="xs" c="dimmed" fw={600} mb="xs" tt="uppercase">
              الگوها
            </Text>
            <Stack gap={4}>
              {TEMPLATES.map((t) => (
                <UnstyledButton
                  key={t.label}
                  onClick={() => onSelectPrompt?.(t.prompt)}
                  className={styles.templateBtn}
                  aria-label={t.label}
                >
                  <Group gap="xs" wrap="nowrap">
                    <t.icon size={14} color={t.color} style={{ flexShrink: 0 }} />
                    <Text size="xs" c={rallyColors.textPrimary}>
                      {t.label}
                    </Text>
                  </Group>
                </UnstyledButton>
              ))}
            </Stack>
          </Box>

          <Divider my="xs" color={rallyColors.border} />

          {/* Recent sessions */}
          <Box p="sm" pt={4}>
            <Group gap={4} mb="xs">
              <IconHistory size={12} color={rallyColors.textSecondary} />
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                اخیر
              </Text>
            </Group>
            {loading ? (
              <Text size="xs" c="dimmed" ta="center" py="sm">
                در حال بارگذاری...
              </Text>
            ) : sessions.length === 0 ? (
              <Text size="xs" c="dimmed" ta="center" py="sm">
                هنوز مکالمه‌ای ندارید
              </Text>
            ) : (
              <Stack gap={2}>
                {sessions.slice(0, 15).map((s) => (
                  <Box
                    key={s.id}
                    p="xs"
                    className={styles.sessionItem}
                    aria-label={s.title || 'مکالمه بدون عنوان'}
                  >
                    <Text size="xs" c="dimmed" truncate>
                      {s.title || 'مکالمه بدون عنوان'}
                    </Text>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
