import { useCallback, useRef } from 'react';
import { ActionIcon, Box, Group, Text } from '@mantine/core';
import { IconArrowRight, IconMathFunction } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import rallyColors from '../../../theme/rallyColors';
import ModelSidebar from './ModelSidebar';
import ModelChatArea from './ModelChatArea';

const SIDEBAR_WIDTH = 270;

export default function ModelingLayout() {
  const navigate = useNavigate();
  const chatRef = useRef(null);

  const handleSelectPrompt = useCallback((prompt) => {
    chatRef.current?.sendPrompt(prompt);
  }, []);

  const handleNewChat = useCallback(() => {
    chatRef.current?.resetMessages();
  }, []);

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        background: rallyColors.bg,
        direction: 'rtl',
        overflow: 'hidden',
      }}
    >
      {/* Top bar */}
      <Box
        px="md"
        py={10}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: `1px solid ${rallyColors.glassBorder}`,
          background: 'rgba(11, 14, 17, 0.96)',
          backdropFilter: 'blur(16px)',
          flexShrink: 0,
        }}
      >
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          onClick={() => navigate('/dashboard')}
          aria-label="بازگشت به داشبورد"
        >
          <IconArrowRight size={16} />
        </ActionIcon>
        <Group gap={6}>
          <IconMathFunction size={16} color={rallyColors.blue} />
          <Text fw={700} size="sm" c={rallyColors.textPrimary}>
            مدل‌ساز مالی هوشمند
          </Text>
        </Group>
      </Box>

      {/* Body: sidebar + chat */}
      <Box style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <Box style={{ width: SIDEBAR_WIDTH, flexShrink: 0, overflow: 'hidden' }}>
          <ModelSidebar onSelectPrompt={handleSelectPrompt} onNewChat={handleNewChat} />
        </Box>

        {/* Chat area */}
        <Box style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ModelChatArea ref={chatRef} />
        </Box>
      </Box>
    </Box>
  );
}
