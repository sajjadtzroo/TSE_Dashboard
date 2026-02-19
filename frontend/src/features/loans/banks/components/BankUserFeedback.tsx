/**
 * Bank User Feedback Card
 * Two-column layout: green positives / yellow complaints
 */

import { Card, Text, SimpleGrid, Stack, List, ThemeIcon } from '@mantine/core';
import { IconThumbUp, IconAlertTriangle, IconCheck, IconX } from '@tabler/icons-react';
import rallyColors from '../../../../theme/rallyColors';
import type { BankUserFeedback as BankUserFeedbackType } from '@/types';

interface BankUserFeedbackProps {
  feedback: BankUserFeedbackType;
}

export function BankUserFeedbackCard({ feedback }: BankUserFeedbackProps) {
  const hasPositives = feedback.positives && feedback.positives.length > 0;
  const hasComplaints = feedback.complaints && feedback.complaints.length > 0;

  if (!hasPositives && !hasComplaints) return null;

  return (
    <Card withBorder radius="md">
      <Text fw={600} size="md" c={rallyColors.textPrimary} mb="md">
        بازخورد کاربران
        {feedback.rating && (
          <Text span size="sm" c={rallyColors.textDimmed} mr="xs">
            {' '}(امتیاز: {feedback.rating})
          </Text>
        )}
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {hasPositives && (
          <Stack
            gap="xs"
            p="md"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              borderRadius: 8,
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            <Text size="sm" fw={600} c="#10b981">
              <IconThumbUp size={16} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
              {' '}نقاط قوت
            </Text>
            <List
              spacing="xs"
              size="sm"
              icon={
                <ThemeIcon color="teal" size={18} radius="xl" variant="light">
                  <IconCheck size={12} />
                </ThemeIcon>
              }
            >
              {feedback.positives!.map((item, i) => (
                <List.Item key={i}>
                  <Text size="sm" c={rallyColors.textSecondary}>
                    {item}
                  </Text>
                </List.Item>
              ))}
            </List>
          </Stack>
        )}
        {hasComplaints && (
          <Stack
            gap="xs"
            p="md"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              borderRadius: 8,
              border: '1px solid rgba(245, 158, 11, 0.2)',
            }}
          >
            <Text size="sm" fw={600} c="#f59e0b">
              <IconAlertTriangle size={16} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
              {' '}نقاط ضعف
            </Text>
            <List
              spacing="xs"
              size="sm"
              icon={
                <ThemeIcon color="yellow" size={18} radius="xl" variant="light">
                  <IconX size={12} />
                </ThemeIcon>
              }
            >
              {feedback.complaints!.map((item, i) => (
                <List.Item key={i}>
                  <Text size="sm" c={rallyColors.textSecondary}>
                    {item}
                  </Text>
                </List.Item>
              ))}
            </List>
          </Stack>
        )}
      </SimpleGrid>
    </Card>
  );
}
