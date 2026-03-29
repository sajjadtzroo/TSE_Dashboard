import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Box, Group, ScrollArea, Stack } from '@mantine/core';
import { IconRobot } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';
import useSSEChat from '../../../hooks/useSSEChat';
import ChatBubble from '../../../components/chat/ChatBubble';
import ChatInputBar from '../../../components/chat/ChatInputBar';
import StreamingIndicator from '../../../components/chat/StreamingIndicator';
import EmptyStateTemplate from '../../../components/chat/EmptyStateTemplate';
import FollowUpBar from '../../../components/chat/FollowUpBar';
import MarkdownRenderer from '../../chat/components/MarkdownRenderer';
import ModelResultCard from './ModelResultCard';
import ModelResultChart from './ModelResultChart';
import { FM_TOOL_TO_TYPE, FM_TOOL_LABELS, TEMPLATES } from '../../../constants/financialModeling';
import sharedStyles from '../../../components/chat/chat.module.css';
import styles from './FinancialModeling.module.css';

function extractDownloadUrl(text) {
  if (!text) return null;
  const match = text.match(/\/api\/financial-modeling\/download\/[0-9a-f-]{36}/);
  return match ? match[0] : null;
}

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
  const [reasoningSteps, setReasoningSteps] = useState([]);
  const reasoningStartRef = useRef(null);
  const viewportRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  }, []);

  const handleComplete = useCallback((result) => {
    const { answer, sources, tools_used, model, download_urls, ...resultData } = result;
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
        modelResult: resultData,
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

  // Track reasoning steps
  useEffect(() => {
    if (!stage) return;
    if (!reasoningStartRef.current) reasoningStartRef.current = Date.now();
    setReasoningSteps((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].stage === stage) return prev;
      return [...prev, { stage, label: STAGE_LABELS[stage] || stage, time: Date.now() }];
    });
  }, [stage]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg = { role: 'user', content: text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    scrollToBottom();

    const history = [...messages, userMsg].map(({ role, content }) => ({ role, content }));
    sendMessage({ messages: history, model: DEFAULT_MODEL });
  }, [input, isStreaming, messages, sendMessage, scrollToBottom]);

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
    sendPrompt(prompt) { handleSendPrompt(prompt); },
    resetMessages() {
      setMessages([]);
      setInput('');
      setReasoningSteps([]);
      reasoningStartRef.current = null;
    },
  }), [handleSendPrompt]);

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

  const handleRegenerate = useCallback((index) => {
    const precedingUserMsg = messages.slice(0, index).reverse().find((m) => m.role === 'user');
    if (!precedingUserMsg) return;
    setMessages((prev) => prev.filter((_, i) => i !== index));
    setTimeout(() => handleSendPrompt(precedingUserMsg.content), 0);
  }, [messages, handleSendPrompt]);

  // Follow-up suggestions
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant' && !m.error);
  const showFollowUps = lastAssistant && !isStreaming;
  const followUps = showFollowUps
    ? (FM_FOLLOW_UP_MAP[lastAssistant.modelType] || FM_FOLLOW_UP_DEFAULT)
    : [];

  return (
    <Stack style={{ flex: 1, overflow: 'hidden', height: '100%' }} gap={0}>
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
          <EmptyStateTemplate
            icon={() => (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={rallyColors.blue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <line x1="8" y1="6" x2="16" y2="6" />
                <line x1="8" y1="10" x2="16" y2="10" />
                <line x1="8" y1="14" x2="12" y2="14" />
              </svg>
            )}
            title="مدل‌ساز مالی هوشمند"
            subtitle="مدل‌های مالی خود را از طریق گفتگو بسازید. DCF، DDM، WACC، CAPM، اوراق، وام و بیشتر."
            templates={TEMPLATES}
            onSelect={handleSendPrompt}
            cols={{ base: 1, xs: 2 }}
          />
        )}

        {messages.map((msg, i) => (
          <ChatBubble
            key={`${i}-${msg.timestamp}`}
            msg={msg}
            onRegenerate={
              msg.role === 'assistant' && !msg.error ? () => handleRegenerate(i) : undefined
            }
            onRetry={msg.error ? handleRetry : undefined}
            onFeedback={
              msg.role === 'assistant' && !msg.error
                ? (vote) => handleFeedback(i, vote)
                : undefined
            }
            toolLabels={FM_TOOL_LABELS}
            toolCategories={{}}
            MarkdownRenderer={MarkdownRenderer}
          >
            {/* Model result card + chart */}
            {msg.modelType && (
              <>
                <ModelResultCard
                  modelData={{ model_type: msg.modelType, company_name: null }}
                  downloadUrl={msg.downloadUrl}
                />
                <ModelResultChart modelType={msg.modelType} modelData={msg.modelResult || {}} />
              </>
            )}
          </ChatBubble>
        ))}

        {/* Follow-up chips */}
        {showFollowUps && followUps.length > 0 && (
          <FollowUpBar suggestions={followUps} onSelect={handleSendPrompt} />
        )}

        {/* Streaming indicator */}
        {isStreaming && (
          <Box className={sharedStyles.messageEnter}>
            {streamingContent ? (
              <Box p="sm" className={sharedStyles.assistantBubble} style={{ maxWidth: '85%' }}>
                <span className={styles.streamingCursor}>
                  <MarkdownRenderer content={streamingContent} />
                </span>
              </Box>
            ) : (
              <StreamingIndicator
                stage={stage}
                activeTool={null}
                showReasoning={true}
                reasoningSteps={reasoningSteps}
              />
            )}
          </Box>
        )}
      </ScrollArea>

      <ChatInputBar
        value={input}
        onChange={setInput}
        onSend={handleSend}
        onCancel={cancel}
        disabled={isStreaming}
        showCancel={isStreaming}
        placeholder="مدل مالی بخواهید: DCF، P&L، اقساط، یا اوراق بدهی..."
        hints={['Claude Sonnet 4.6', 'Enter ارسال · Shift+Enter خط جدید']}
      />
    </Stack>
  );
});

export default ModelChatArea;
