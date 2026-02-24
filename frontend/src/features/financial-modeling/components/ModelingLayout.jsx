import { useCallback, useRef } from 'react';
import { ActionIcon, Box, Group, Text } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import ModelSidebar from './ModelSidebar';
import ModelChatArea from './ModelChatArea';

const SIDEBAR_WIDTH = 260;

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
        background: '#0B0E11',
        direction: 'rtl',
        overflow: 'hidden',
      }}
    >
      {/* Top bar */}
      <Box
        px="md"
        py="sm"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid rgba(42,46,62,0.5)',
          background: 'rgba(11,14,17,0.98)',
          flexShrink: 0,
        }}
      >
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={() => navigate('/dashboard')}
          aria-label="بازگشت به داشبورد"
        >
          <IconArrowRight size={16} />
        </ActionIcon>
        <Text fw={700} size="sm" c="white">
          مدل‌ساز مالی هوشمند
        </Text>
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
