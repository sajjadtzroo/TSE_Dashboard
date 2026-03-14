import { useEffect, useRef, useState } from 'react';
import { Box, Collapse, Group, Paper, Text } from '@mantine/core';
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconPencil,
  IconRoute,
  IconTool,
  IconWorld,
} from '@tabler/icons-react';
import styles from './chat.module.css';

const STAGE_CONFIG = {
  routing: { icon: IconRoute, label: 'در حال بررسی سوال...' },
  tool_call: { icon: IconTool, label: 'در حال دریافت داده...' },
  tool_result: { icon: IconTool, label: 'در حال دریافت داده...' },
  generating: { icon: IconPencil, label: 'در حال نوشتن پاسخ...' },
  answering: { icon: IconPencil, label: 'در حال نوشتن پاسخ...' },
};

export default function StreamingIndicator({
  stage,
  activeTool,
  showReasoning = false,
  reasoningSteps = [],
}) {
  const isWebSearch = stage === 'tool_call' && activeTool === 'web_search';
  const config = isWebSearch
    ? { icon: IconWorld, label: 'در حال جستجوی اینترنت...' }
    : (STAGE_CONFIG[stage] || STAGE_CONFIG.routing);
  const Icon = config.icon;

  // Elapsed time counter
  const startRef = useRef(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [reasoningOpen, setReasoningOpen] = useState(true);

  useEffect(() => {
    if (!startRef.current) startRef.current = Date.now();
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Simple mode (no reasoning steps)
  if (!showReasoning || reasoningSteps.length === 0) {
    return (
      <Box mb="sm" style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <Paper p="sm" radius="md" className={styles.thinkingBubble}>
          <Group gap={8} align="center">
            <Box className={styles.thinkingIconWrap}>
              <Icon
                size={15}
                style={{ flexShrink: 0, color: isWebSearch ? '#14B8A6' : undefined }}
              />
            </Box>
            <div className={styles.thinkingWrapper}>
              <Text size="sm" c="dimmed" style={{ direction: 'rtl' }}>
                {config.label}
              </Text>
              {stage === 'tool_call' && activeTool && activeTool !== 'web_search' && (
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
            {elapsedSec > 0 && (
              <Text className={styles.elapsedTimer}>{elapsedSec} ثانیه</Text>
            )}
          </Group>
        </Paper>
      </Box>
    );
  }

  // Reasoning mode with steps
  return (
    <Box mb="sm" className={styles.messageEnter}>
      <Box className={styles.reasoningBlock}>
        <div
          className={styles.reasoningHeader}
          onClick={() => setReasoningOpen((o) => !o)}
        >
          {reasoningOpen ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
          <Text size="xs" c="dimmed" style={{ flex: 1 }}>
            {config.label}
          </Text>
          {elapsedSec > 0 && (
            <Text className={styles.elapsedTimer}>{elapsedSec} ثانیه</Text>
          )}
        </div>
        <Collapse in={reasoningOpen}>
          <Box className={styles.reasoningBody}>
            {reasoningSteps.map((step, si) => (
              <div key={si} className={styles.reasoningStep}>
                <Box className={styles.thinkingDots} style={{ transform: 'scale(0.7)' }}>
                  {si === reasoningSteps.length - 1 ? (
                    <>
                      <span className={styles.dot} />
                      <span className={styles.dot} />
                      <span className={styles.dot} />
                    </>
                  ) : (
                    <IconCheck size={10} color="#22C55E" />
                  )}
                </Box>
                <Text size="xs" c="dimmed">{step.label}</Text>
              </div>
            ))}
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
}
