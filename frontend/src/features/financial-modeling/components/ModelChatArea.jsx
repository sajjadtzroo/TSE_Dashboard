import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { ActionIcon, Badge, Box, Group, ScrollArea, Stack, Text, Textarea } from '@mantine/core';
import { IconCheck, IconCopy, IconRefresh, IconRobot, IconSend, IconUser, IconX } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';
import useSSEChat from '../../../hooks/useSSEChat';
import MarkdownRenderer from '../../chat/components/MarkdownRenderer';
import ModelResultCard from './ModelResultCard';
import ModelEmptyState from './ModelEmptyState';
import { FM_TOOL_TO_TYPE, FM_TOOL_LABELS } from '../../../constants/financialModeling';
import styles from './FinancialModeling.module.css';

/** Extract a financial model download URL from a text string, if present. */
function extractDownloadUrl(text) {
  if (!text) return null;
  const match = text.match(/\/api\/financial-modeling\/download\/[0-9a-f-]{36}/);
  return match ? match[0] : null;
}

/** Detect model_type from tools_used list. */
function detectModelType(toolsUsed) {
  if (!toolsUsed?.length) return null;
  for (const tool of toolsUsed) {
    if (FM_TOOL_TO_TYPE[tool]) return FM_TOOL_TO_TYPE[tool];
  }
  return null;
}

const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.6';

const STAGE_LABELS = {
  routing: 'در حال تحلیل...',
  tool_call: 'در حال ساخت مدل...',
  answering: 'در حال نوشتن...',
};

const ModelChatArea = forwardRef(function ModelChatArea(_props, ref) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [copiedIdx, setCopiedIdx] = useState(null);
  const inputRef = useRef(null);
  const viewportRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  }, []);

  const handleComplete = useCallback(({ answer, sources, tools_used, model, download_urls }) => {
    const downloadUrl = download_urls?.length ? download_urls[0] : extractDownloadUrl(answer);
    const modelType = detectModelType(tools_used);

    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: answer,
        tools_used,
        sources,
        model,
        downloadUrl,
        modelType,
        timestamp: Date.now(),
      },
    ]);
    scrollToBottom();
  }, [scrollToBottom]);

  const handleError = useCallback((errMsg) => {
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: `خطا: ${errMsg}`,
        error: true,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const { sendMessage, cancel, isStreaming, streamingContent, stage } = useSSEChat({
    onComplete: handleComplete,
    onError: handleError,
  });

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg = { role: 'user', content: text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    scrollToBottom();

    const history = [
      ...messages,
      userMsg,
    ].map(({ role, content }) => ({ role, content }));

    sendMessage({ messages: history, model: DEFAULT_MODEL });
  }, [input, isStreaming, messages, sendMessage, scrollToBottom]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSendPrompt = useCallback((prompt) => {
    const text = prompt.trim();
    if (!text || isStreaming) return;
    const userMsg = { role: 'user', content: text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    scrollToBottom();
    sendMessage({
      messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
      model: DEFAULT_MODEL,
    });
  }, [isStreaming, messages, sendMessage, scrollToBottom]);

  useImperativeHandle(ref, () => ({
    sendPrompt(prompt) {
      handleSendPrompt(prompt);
    },
    resetMessages() {
      setMessages([]);
      setInput('');
    },
  }), [handleSendPrompt]);

  const handleCopy = useCallback((content, idx) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  }, []);

  const handleRetry = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) handleSendPrompt(lastUser.content);
  }, [messages, handleSendPrompt]);

  return (
    <Stack style={{ flex: 1, overflow: 'hidden', height: '100%' }} gap={0}>
      {/* Message list */}
      <ScrollArea
        flex={1}
        viewportRef={viewportRef}
        p="md"
        style={{ flex: 1 }}
        role="log"
        aria-live="polite"
        aria-label="پیام‌های مدل‌ساز مالی"
      >
        {messages.length === 0 && !isStreaming && (
          <ModelEmptyState onSendPrompt={handleSendPrompt} />
        )}

        {messages.map((msg, i) => (
          <Box key={i} mb="lg" style={{ direction: 'rtl' }} className={styles.messageEnter}>
            {msg.role === 'user' ? (
              <Group justify="flex-start" align="flex-start" gap="xs" wrap="nowrap">
                <Box className={styles.userAvatar}>
                  <IconUser size={14} color={rallyColors.blue} />
                </Box>
                <Box p="sm" className={styles.userBubble}>
                  <Text size="sm" style={{ direction: 'rtl', color: rallyColors.textPrimary, lineHeight: 1.7 }}>
                    {msg.content}
                  </Text>
                </Box>
              </Group>
            ) : (
              <Group justify="flex-end" align="flex-start" gap="xs" wrap="nowrap">
                <Stack gap={4} style={{ maxWidth: '85%' }}>
                  <Box
                    p="sm"
                    className={`${styles.assistantBubble} ${msg.error ? styles.errorBubble : ''}`}
                  >
                    {/* Copy button */}
                    {!msg.error && (
                      <ActionIcon
                        className={styles.copyBtn}
                        variant="subtle"
                        color="gray"
                        size="xs"
                        onClick={() => handleCopy(msg.content, i)}
                        aria-label="کپی پیام"
                        style={{ position: 'absolute', top: 6, left: 6, zIndex: 2 }}
                      >
                        {copiedIdx === i ? <IconCheck size={12} color={rallyColors.green} /> : <IconCopy size={12} />}
                      </ActionIcon>
                    )}
                    <MarkdownRenderer content={msg.content} />
                  </Box>

                  {/* Tool badges */}
                  {msg.tools_used?.length > 0 && (
                    <Group gap={4}>
                      {msg.tools_used.map((tool, ti) => (
                        <Badge
                          key={tool}
                          variant="light"
                          color="blue"
                          size="xs"
                          className={styles.toolBadge}
                          style={{ animationDelay: `${ti * 80}ms` }}
                        >
                          {FM_TOOL_LABELS[tool] || tool}
                        </Badge>
                      ))}
                    </Group>
                  )}

                  {/* Retry on error */}
                  {msg.error && (
                    <button className={styles.retryBtn} onClick={handleRetry}>
                      <Group gap={4} align="center">
                        <IconRefresh size={12} />
                        <span>تلاش مجدد</span>
                      </Group>
                    </button>
                  )}

                  {/* Model result card */}
                  {msg.modelType && (
                    <ModelResultCard
                      modelData={{ model_type: msg.modelType, company_name: null }}
                      downloadUrl={msg.downloadUrl}
                    />
                  )}
                </Stack>
                <Box className={styles.assistantAvatar}>
                  <IconRobot size={14} color={rallyColors.green} />
                </Box>
              </Group>
            )}
          </Box>
        ))}

        {/* Streaming indicator */}
        {isStreaming && (
          <Box mb="lg" style={{ direction: 'rtl' }} className={styles.messageEnter}>
            <Group justify="flex-end" align="flex-start" gap="xs" wrap="nowrap">
              <Box
                p="sm"
                className={styles.assistantBubble}
                style={{ maxWidth: '85%', minWidth: 80 }}
              >
                {streamingContent ? (
                  <MarkdownRenderer content={streamingContent} />
                ) : (
                  <Group gap={8} align="center">
                    <Box className={styles.thinkingDots}>
                      <span className={styles.dot} />
                      <span className={styles.dot} />
                      <span className={styles.dot} />
                    </Box>
                    <Text size="xs" c="dimmed">
                      {STAGE_LABELS[stage] || 'در حال پردازش...'}
                    </Text>
                  </Group>
                )}
              </Box>
              <Box className={styles.assistantAvatar}>
                <IconRobot size={14} color={rallyColors.green} />
              </Box>
            </Group>
          </Box>
        )}
      </ScrollArea>

      {/* Input area */}
      <Box p="sm" className={styles.inputArea}>
        <Group gap="xs" align="flex-end">
          <Textarea
            ref={inputRef}
            style={{ flex: 1 }}
            placeholder="مدل مالی بخواهید: DCF، P&L، اقساط، یا اوراق بدهی..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            autosize
            maxRows={4}
            size="sm"
            styles={{
              input: {
                direction: 'rtl',
                background: rallyColors.glassBg,
                border: `1px solid ${rallyColors.glassBorder}`,
                color: rallyColors.textPrimary,
                borderRadius: 10,
                transition: 'border-color 0.15s ease',
                '&:focus': {
                  borderColor: rallyColors.borderStrong,
                },
              },
            }}
          />
          <ActionIcon
            onClick={isStreaming ? cancel : handleSend}
            size="lg"
            radius="md"
            variant={input.trim() && !isStreaming ? 'filled' : isStreaming ? 'light' : 'subtle'}
            color={isStreaming ? 'red' : undefined}
            aria-label={isStreaming ? 'لغو ارسال' : 'ارسال پیام'}
            style={{
              background: input.trim() && !isStreaming
                ? `linear-gradient(135deg, ${rallyColors.blue}, #2563EB)`
                : isStreaming
                  ? 'rgba(239, 68, 68, 0.15)'
                  : undefined,
              border: isStreaming ? '1px solid rgba(239, 68, 68, 0.25)' : undefined,
              transition: 'all 0.2s ease',
            }}
          >
            {isStreaming ? <IconX size={18} /> : <IconSend size={18} />}
          </ActionIcon>
        </Group>
      </Box>
    </Stack>
  );
});

export default ModelChatArea;
