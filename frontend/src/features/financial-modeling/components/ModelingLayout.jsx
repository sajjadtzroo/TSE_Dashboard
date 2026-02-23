import { ActionIcon, Box, Group, Text } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import ModelSidebar from './ModelSidebar';
import ModelChatArea from './ModelChatArea';

const SIDEBAR_WIDTH = 260;

export default function ModelingLayout() {
  const navigate = useNavigate();

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        background: '#0B0E14',
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
          borderBottom: '1px solid rgba(148,163,184,0.1)',
          background: 'rgba(11,14,20,0.98)',
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
          <ModelSidebar />
        </Box>

        {/* Chat area */}
        <Box style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ModelChatArea />
        </Box>
      </Box>
    </Box>
  );
}
