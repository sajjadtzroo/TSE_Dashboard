import { forwardRef } from 'react';
import { ActionIcon, Group, Text, Textarea } from '@mantine/core';
import { IconSend, IconX } from '@tabler/icons-react';
import styles from './chat.module.css';

const ChatInputBar = forwardRef(function ChatInputBar(
  { value, onChange, onSend, onCancel, disabled, placeholder, hints, showCancel },
  ref,
) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className={styles.inputArea}>
      <Group gap="xs" align="flex-end">
        <Textarea
          ref={ref}
          style={{ flex: 1 }}
          placeholder={placeholder || 'درباره سهام، بازار و گزارش‌ها بپرسید...'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled && !showCancel}
          autosize
          maxRows={3}
          size="sm"
        />
        <ActionIcon
          onClick={showCancel ? onCancel : onSend}
          disabled={!showCancel && (disabled || !value.trim())}
          size="lg"
          radius="md"
          color={showCancel ? 'red' : undefined}
          variant={showCancel ? 'light' : undefined}
          aria-label={showCancel ? 'لغو ارسال' : 'ارسال پیام'}
          style={{
            background: !showCancel && value.trim()
              ? 'linear-gradient(135deg, #22C55E, #16A34A)'
              : showCancel
                ? 'rgba(239, 68, 68, 0.15)'
                : undefined,
            border: showCancel ? '1px solid rgba(239, 68, 68, 0.25)' : undefined,
          }}
        >
          {showCancel ? <IconX size={18} /> : <IconSend size={18} />}
        </ActionIcon>
      </Group>
      {hints && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 4px 0' }}>
          {hints.map((hint, i) => (
            <Text key={i} size="10px" c="dimmed">{hint}</Text>
          ))}
        </div>
      )}
    </div>
  );
});

export default ChatInputBar;
