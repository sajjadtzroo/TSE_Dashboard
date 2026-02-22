import { forwardRef } from 'react';
import { ActionIcon, Group, Textarea } from '@mantine/core';
import { IconSend } from '@tabler/icons-react';
import styles from './ChatDrawer.module.css';

const ChatInput = forwardRef(function ChatInput(
  { input, onInputChange, onSend, isStreaming },
  ref,
) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <Group gap="xs" className={styles.inputArea}>
      <Textarea
        ref={ref}
        style={{ flex: 1 }}
        placeholder="درباره سهام، بازار و گزارش‌ها بپرسید..."
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isStreaming}
        autosize
        maxRows={3}
        size="sm"
      />
      <ActionIcon
        onClick={onSend}
        disabled={isStreaming || !input.trim()}
        size="lg"
        radius="md"
        aria-label="ارسال پیام"
        style={{
          background: input.trim()
            ? 'linear-gradient(135deg, #10B981, #059669)'
            : undefined,
        }}
      >
        <IconSend size={18} />
      </ActionIcon>
    </Group>
  );
});

export default ChatInput;
