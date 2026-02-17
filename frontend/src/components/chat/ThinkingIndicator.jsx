import { Box, Group, Paper, Text } from '@mantine/core';
import { IconPencil, IconRoute, IconTool } from '@tabler/icons-react';
import styles from './ChatDrawer.module.css';

const STAGE_CONFIG = {
  routing: { icon: IconRoute, label: 'در حال بررسی سوال...' },
  tool_call: { icon: IconTool, label: 'در حال دریافت داده...' },
  tool_result: { icon: IconTool, label: 'در حال دریافت داده...' },
  generating: { icon: IconPencil, label: 'در حال نوشتن پاسخ...' },
};

export default function ThinkingIndicator({ stage, activeTool }) {
  const config = STAGE_CONFIG[stage] || STAGE_CONFIG.routing;
  const Icon = config.icon;

  return (
    <Box mb="sm" style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <Paper p="sm" radius="md" className={styles.thinkingBubble}>
        <Group gap={8} align="center">
          <Box className={styles.thinkingIconWrap}>
            <Icon size={15} style={{ flexShrink: 0 }} />
          </Box>
          <div className={styles.thinkingWrapper}>
            <Text size="sm" c="dimmed" style={{ direction: 'rtl' }}>
              {config.label}
            </Text>
            {stage === 'tool_call' && activeTool && (
              <Text size="xs" c="dimmed" style={{ opacity: 0.7 }}>
                {activeTool}
              </Text>
            )}
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
