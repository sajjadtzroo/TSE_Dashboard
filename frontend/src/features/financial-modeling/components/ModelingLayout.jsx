import { useCallback, useRef, useState } from 'react';
import { ActionIcon, Box, Drawer, Group, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconArrowRight, IconMathFunction, IconMenu2 } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import rallyColors from '../../../theme/rallyColors';
import ModelSidebar from './ModelSidebar';
import ModelChatArea from './ModelChatArea';
import styles from './FinancialModeling.module.css';

export default function ModelingLayout() {
  const navigate = useNavigate();
  const chatRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 48em)');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSelectPrompt = useCallback((prompt) => {
    chatRef.current?.sendPrompt(prompt);
    setDrawerOpen(false);
  }, []);

  const handleNewChat = useCallback(() => {
    chatRef.current?.resetMessages();
    setDrawerOpen(false);
  }, []);

  return (
    <Box className={styles.root}>
      {/* Top bar */}
      <Box px="md" py={10} className={styles.topBar}>
        <ActionIcon
          className={styles.hamburger}
          variant="subtle"
          color="gray"
          size="sm"
          onClick={() => setDrawerOpen(true)}
          aria-label="منوی کناری"
        >
          <IconMenu2 size={16} />
        </ActionIcon>
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
      <Box className={styles.body}>
        {/* Desktop sidebar */}
        <Box className={styles.sidebarSlot}>
          <ModelSidebar onSelectPrompt={handleSelectPrompt} onNewChat={handleNewChat} />
        </Box>

        {/* Mobile sidebar drawer */}
        {isMobile && (
          <Drawer
            opened={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            position="right"
            size={280}
            withCloseButton={false}
            styles={{
              body: { padding: 0, height: '100%' },
              content: { background: '#0B0E11' },
            }}
          >
            <ModelSidebar onSelectPrompt={handleSelectPrompt} onNewChat={handleNewChat} />
          </Drawer>
        )}

        {/* Chat area */}
        <Box className={styles.chatSlot}>
          <ModelChatArea ref={chatRef} />
        </Box>
      </Box>
    </Box>
  );
}
