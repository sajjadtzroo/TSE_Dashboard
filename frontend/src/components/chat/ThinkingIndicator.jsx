import { Box, Group, Paper, Text } from '@mantine/core';
import { IconRobot } from '@tabler/icons-react';
import styles from './ChatDrawer.module.css';

export default function ThinkingIndicator({ label = 'Thinking' }) {
  return (
    <Box mb="sm" style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <Paper p="sm" radius="md" style={{ background: 'var(--mantine-color-dark-5)' }}>
        <Group gap={8} align="center">
          <IconRobot size={15} style={{ flexShrink: 0 }} />
          <div className={styles.thinkingWrapper}>
            <Text size="sm" c="dimmed">{label}</Text>
            <div className={styles.thinkingDots}>
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </div>
          </div>
        </Group>
      </Paper>
    </Box>
  );
}
