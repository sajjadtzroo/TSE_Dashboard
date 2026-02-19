import { Badge, Group } from '@mantine/core';
import { IconCheck, IconLoader2 } from '@tabler/icons-react';
import { TOOL_LABELS, TOOL_CATEGORIES } from '../../../constants/chat';

/**
 * Shows active tool call badges during a voice call.
 * Reuses TOOL_LABELS and TOOL_CATEGORIES from chat constants.
 */
export default function VoiceToolActivity({ toolCalls = [] }) {
  if (toolCalls.length === 0) return null;

  // Show last 3 tool calls
  const recent = toolCalls.slice(-3);

  return (
    <Group gap={4}>
      {recent.map((tc, i) => (
        <Badge
          key={`${tc.name}-${i}`}
          size="xs"
          variant="dot"
          color={TOOL_CATEGORIES[tc.name] || 'gray'}
          leftSection={
            tc.status === 'running' ? (
              <IconLoader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <IconCheck size={10} />
            )
          }
        >
          {TOOL_LABELS[tc.name] || tc.name}
        </Badge>
      ))}
    </Group>
  );
}
