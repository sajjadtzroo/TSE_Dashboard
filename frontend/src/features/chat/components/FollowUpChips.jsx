import { Group, UnstyledButton, Text } from '@mantine/core';
import { IconArrowForwardUp } from '@tabler/icons-react';
import { getFollowUpSuggestions } from '../utils/followUpTemplates';
import styles from './ChatDrawer.module.css';

export default function FollowUpChips({ toolsUsed, sources, symbol, onSelect }) {
  const suggestions = getFollowUpSuggestions({ toolsUsed, sources, symbol });
  if (suggestions.length === 0) return null;

  return (
    <Group gap={6} mb="sm" wrap="wrap" style={{ direction: 'rtl' }}>
      {suggestions.map((text) => (
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
