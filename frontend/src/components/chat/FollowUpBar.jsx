import { Group, Text, UnstyledButton } from '@mantine/core';
import { IconArrowForwardUp } from '@tabler/icons-react';
import styles from './chat.module.css';

export default function FollowUpBar({ suggestions = [], onSelect }) {
  if (suggestions.length === 0) return null;

  // Support up to 4 chips
  const chips = suggestions.slice(0, 4);

  return (
    <Group gap={6} mb="sm" wrap="wrap" style={{ direction: 'rtl' }}>
      {chips.map((text) => (
        <UnstyledButton
          key={text}
          className={styles.followUpChip}
          onClick={() => onSelect(text)}
        >
          <Group gap={4} wrap="nowrap">
            <IconArrowForwardUp size={12} style={{ flexShrink: 0, opacity: 0.7 }} />
            <Text size="xs">{text}</Text>
          </Group>
        </UnstyledButton>
      ))}
    </Group>
  );
}
