import { useEffect, useRef } from 'react';
import { Box, Group, ScrollArea } from '@mantine/core';
import { IconRobot } from '@tabler/icons-react';
import MessageBubble from './MessageBubble';
import MarkdownRenderer from './MarkdownRenderer';
import ThinkingIndicator from './ThinkingIndicator';
import ChatEmptyState from './ChatEmptyState';
import FollowUpChips from './FollowUpChips';
import styles from './ChatDrawer.module.css';

export default function ChatMessageList({
  messages,
  isStreaming,
  streamingContent,
  stage,
  activeTools,
  cancelSSE,
  onRegenerate,
  onRetry,
  onFeedback,
  onSendPrompt,
  section,
  contextSymbol,
}) {
  const viewport = useRef(null);

  useEffect(() => {
    viewport.current?.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isStreaming, streamingContent]);

  return (
    <ScrollArea
      flex={1}
      viewportRef={viewport}
      p="sm"
      role="log"
      aria-live="polite"
      className={styles.drawerContent}
    >
      {messages.length === 0 && !isStreaming && (
        <ChatEmptyState
          onSendPrompt={onSendPrompt}
          section={section}
          contextSymbol={contextSymbol}
        />
      )}

      {messages.map((msg, i) => (
        <Box key={`${i}-${msg.timestamp}`}>
          <MessageBubble
            msg={msg}
            onRegenerate={
              msg.role === 'assistant' && !msg.error ? () => onRegenerate(i) : undefined
            }
            onRetry={msg.error ? () => onRetry(i) : undefined}
            onFeedback={
              msg.role === 'assistant' && !msg.error
                ? (vote) => onFeedback(i, vote)
                : undefined
            }
          />
          {/* Follow-up chips after the last assistant message */}
          {msg.role === 'assistant' &&
            !msg.error &&
            i === messages.length - 1 &&
            !isStreaming && (
              <FollowUpChips
                toolsUsed={msg.tools_used}
                sources={msg.sources}
                symbol={contextSymbol}
                onSelect={onSendPrompt}
              />
            )}
        </Box>
      ))}

      {/* Streaming content preview */}
      {isStreaming && streamingContent && (
        <Box
          mb="sm"
          className={styles.messageEnter}
          style={{ display: 'flex', justifyContent: 'flex-start' }}
        >
          <Box style={{ maxWidth: '90%' }}>
            <Box p="sm" className={styles.streamingBubble}>
              <Group gap={6} align="flex-start" wrap="nowrap">
                <IconRobot size={15} style={{ flexShrink: 0, marginTop: 2, opacity: 0.7 }} />
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <MarkdownRenderer content={streamingContent} />
                </Box>
              </Group>
            </Box>
          </Box>
        </Box>
      )}

      {/* Thinking indicator with stage */}
      {isStreaming && !streamingContent && (
        <Group gap="xs" align="center">
          <ThinkingIndicator
            stage={stage}
            activeTool={activeTools[activeTools.length - 1]}
          />
          <button className={styles.cancelButton} onClick={cancelSSE}>
            انصراف
          </button>
        </Group>
      )}
    </ScrollArea>
  );
}
