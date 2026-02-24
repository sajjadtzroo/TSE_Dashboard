import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActionIcon, Badge, Box, Collapse, Group, ScrollArea, Stack, Text, Textarea } from '@mantine/core';
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconRefresh,
  IconRobot,
  IconSend,
  IconThumbDown,
  IconThumbUp,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';
import useSSEChat from '../../../hooks/useSSEChat';
import MarkdownRenderer from '../../chat/components/MarkdownRenderer';
import SourceItem from '../../chat/components/SourceItem';
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

/** FM-specific follow-up suggestions per model type */
const FM_FOLLOW_UP_MAP = {
  dcf: ['تحلیل حساسیت WACC', 'مقایسه با DDM'],
  pl: ['پیش‌بینی ۵ ساله', 'تحلیل حاشیه سود'],
  loan_amortization: ['بازپرداخت زودهنگام', 'مقایسه نرخ‌ها'],
  ddm_gordon: ['مقایسه با DCF', 'تحلیل حساسیت نرخ رشد'],
  wacc: ['محاسبه DCF با این WACC', 'تحلیل ساختار سرمایه'],
  three_statement: ['تحلیل نسبت‌های مالی', 'پیش‌بینی جریان نقد'],
  equity_valuation: ['تحلیل حساسیت', 'مقایسه با همتایان'],
};
const FM_FOLLOW_UP_DEFAULT = ['توضیح بیشتر', 'دانلود مدل'];

const ModelChatArea = forwardRef(function ModelChatArea(_props, ref) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});
  const [reasoningOpen, setReasoningOpen] = useState(true);
  const [reasoningSteps, setReasoningSteps] = useState([]);
  const reasoningStartRef = useRef(null);
  const [elapsedSec, setElapsedSec] = useState(0);
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
        feedback: null,
        timestamp: Date.now(),
      },
    ]);
    setReasoningSteps([]);
    reasoningStartRef.current = null;
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
    setReasoningSteps([]);
    reasoningStartRef.current = null;
  }, []);

  const { sendMessage, cancel, isStreaming, streamingContent, stage } = useSSEChat({
    onComplete: handleComplete,
    onError: handleError,
  });

  // Track reasoning steps as stage changes
  useEffect(() => {
    if (!stage) return;
    if (!reasoningStartRef.current) {
      reasoningStartRef.current = Date.now();
      setReasoningOpen(true);
    }
    setReasoningSteps((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].stage === stage) return prev;
      return [...prev, { stage, label: STAGE_LABELS[stage] || stage, time: Date.now() }];
    });
  }, [stage]);

  // Auto-collapse reasoning once streaming content appears
  useEffect(() => {
    if (streamingContent) setReasoningOpen(false);
  }, [streamingContent]);

  // Elapsed time counter for reasoning block
  useEffect(() => {
    if (!isStreaming || !reasoningStartRef.current) {
      setElapsedSec(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - reasoningStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isStreaming]);

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
      setReasoningSteps([]);
      reasoningStartRef.current = null;
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

  const handleFeedback = useCallback((msgIndex, vote) => {
    setMessages((prev) => prev.map((msg, i) => {
      if (i !== msgIndex) return msg;
      return { ...msg, feedback: msg.feedback === vote ? null : vote };
    }));
  }, []);

  const toggleSources = useCallback((idx) => {
    setExpandedSources((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }, []);

  // Find the last assistant message for follow-up chips
  const lastAssistantIdx = messages.length > 0
    ? messages.reduce((acc, msg, i) => (msg.role === 'assistant' ? i : acc), -1)
    : -1;
  const lastAssistant = lastAssistantIdx >= 0 ? messages[lastAssistantIdx] : null;
  const showFollowUps = lastAssistant && !lastAssistant.error && !isStreaming;
  const followUps = showFollowUps
    ? (FM_FOLLOW_UP_MAP[lastAssistant.modelType] || FM_FOLLOW_UP_DEFAULT)
    : [];

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
          <Box key={i} mb="lg" style={{ direction: 'rtl' }} className={`${styles.messageEnter} ${styles.messageWrapper}`}>
            {msg.role === 'user' ? (
              <Group justify="flex-start" align="flex-start" gap="xs" wrap="nowrap">
                <Box className={styles.userAvatar}>
                  <IconUser size={14} color={rallyColors.primary} />
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

                  {/* Feedback thumbs */}
                  {!msg.error && (
                    <div className={`${styles.feedbackGroup} ${msg.feedback ? styles.feedbackVisible : ''}`}>
                      <button
                        className={`${styles.feedbackBtn} ${msg.feedback === 'up' ? styles.feedbackActive : ''}`}
                        onClick={() => handleFeedback(i, 'up')}
                        aria-label="پسند"
                      >
                        <IconThumbUp size={14} />
                      </button>
                      <button
                        className={`${styles.feedbackBtn} ${msg.feedback === 'down' ? styles.feedbackActiveDown : ''}`}
                        onClick={() => handleFeedback(i, 'down')}
                        aria-label="نپسند"
                      >
                        <IconThumbDown size={14} />
                      </button>
                    </div>
                  )}

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

                  {/* Source attribution */}
                  {msg.sources?.length > 0 && (
                    <Stack gap={4}>
                      <button
                        className={styles.sourcesToggle}
                        onClick={() => toggleSources(i)}
                      >
                        {expandedSources[i] ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
                        <span>منابع ({msg.sources.length})</span>
                      </button>
                      <Collapse in={!!expandedSources[i]}>
                        <Stack gap={4}>
                          {msg.sources.map((src, si) => (
                            <SourceItem key={si} src={src} />
                          ))}
                        </Stack>
                      </Collapse>
                    </Stack>
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
                  <IconRobot size={14} color={rallyColors.primary} />
                </Box>
              </Group>
            )}
          </Box>
        ))}

        {/* Follow-up chips after last assistant message */}
        {showFollowUps && followUps.length > 0 && (
          <Group gap={6} mb="md" style={{ direction: 'rtl' }}>
            {followUps.map((text, fi) => (
              <button
                key={text}
                className={styles.followUpChip}
                style={{ animationDelay: `${fi * 80}ms` }}
                onClick={() => handleSendPrompt(text)}
              >
                {text}
              </button>
            ))}
          </Group>
        )}

        {/* Streaming indicator */}
        {isStreaming && (
          <Box mb="lg" style={{ direction: 'rtl' }} className={styles.messageEnter}>
            <Group justify="flex-end" align="flex-start" gap="xs" wrap="nowrap">
              <Stack gap={4} style={{ maxWidth: '85%', minWidth: 80 }}>
                {/* Reasoning block (before content streams) */}
                {!streamingContent && reasoningSteps.length > 0 && (
                  <Box className={styles.reasoningBlock}>
                    <div
                      className={styles.reasoningHeader}
                      onClick={() => setReasoningOpen((o) => !o)}
                    >
                      {reasoningOpen ? <IconChevronUp size={12} color={rallyColors.textSecondary} /> : <IconChevronDown size={12} color={rallyColors.textSecondary} />}
                      <Text size="xs" c="dimmed" style={{ flex: 1 }}>
                        {STAGE_LABELS[stage] || 'در حال پردازش...'}
                      </Text>
                      {elapsedSec > 0 && (
                        <Text size="10px" c="dimmed">{elapsedSec} ثانیه</Text>
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
                                <IconCheck size={10} color={rallyColors.green} />
                              )}
                            </Box>
                            <Text size="xs" c="dimmed">{step.label}</Text>
                          </div>
                        ))}
                      </Box>
                    </Collapse>
                  </Box>
                )}

                {/* Streaming bubble with content or plain dots fallback */}
                <Box p="sm" className={styles.assistantBubble}>
                  {streamingContent ? (
                    <span className={styles.streamingCursor}>
                      <MarkdownRenderer content={streamingContent} />
                    </span>
                  ) : reasoningSteps.length === 0 ? (
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
                  ) : null}
                </Box>
              </Stack>
              <Box className={styles.assistantAvatar}>
                <IconRobot size={14} color={rallyColors.primary} />
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
                borderRadius: 16,
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                '&:focus': {
                  borderColor: rallyColors.borderStrong,
                  boxShadow: '0 0 0 2px rgba(41, 98, 255, 0.1)',
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
                ? `linear-gradient(135deg, ${rallyColors.blue}, ${rallyColors.darkPrimary})`
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
        <div className={styles.inputHints}>
          <Text size="10px" c="dimmed">Claude Sonnet 4.6</Text>
          <Text size="10px" c="dimmed">Enter ارسال &middot; Shift+Enter خط جدید</Text>
        </div>
      </Box>
    </Stack>
  );
});

export default ModelChatArea;
