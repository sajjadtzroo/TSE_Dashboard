import { forwardRef } from 'react';
import ChatInputBar from '../../../components/chat/ChatInputBar';

/** Thin wrapper for backwards compatibility */
const ChatInput = forwardRef(function ChatInput(
  { input, onInputChange, onSend, isStreaming },
  ref,
) {
  return (
    <ChatInputBar
      ref={ref}
      value={input}
      onChange={onInputChange}
      onSend={onSend}
      disabled={isStreaming}
      placeholder="درباره سهام، بازار و گزارش‌ها بپرسید..."
    />
  );
});

export default ChatInput;
