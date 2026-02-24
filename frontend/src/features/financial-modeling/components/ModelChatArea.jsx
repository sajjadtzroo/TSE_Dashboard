import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { ActionIcon, Box, Group, ScrollArea, Stack, Text, Textarea } from '@mantine/core';
import { IconRobot, IconSend, IconUser } from '@tabler/icons-react';
import useSSEChat from '../../../hooks/useSSEChat';
import MarkdownRenderer from '../../chat/components/MarkdownRenderer';
import ModelResultCard from './ModelResultCard';
import ModelEmptyState from './ModelEmptyState';

const FM_TOOL_TO_TYPE = {
  build_dcf_model: 'dcf',
  build_pl_model: 'pl',
  build_loan_amortization: 'loan_amortization',
  build_bond_model: 'bond',
  build_ddm_model: 'ddm_gordon',
  build_residual_income_model: 'residual_income',
  build_multiples_model: 'multiples',
  compute_wacc: 'wacc',
  compute_capm: 'capm',
  compute_fcfe: 'fcfe',
  build_revenue_model: 'revenue_model',
  build_wc_model: 'wc_model',
  build_capex_schedule: 'capex_schedule',
  build_debt_schedule: 'debt_schedule',
  build_three_statement_model: 'three_statement',
  compute_beta: 'beta',
  build_scenario_model: 'scenario_model',
  compute_operating_leverage: 'operating_leverage',
  compute_pvgo: 'pvgo',
  compute_eva: 'eva',
};

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

const DEFAULT_MODEL = 'openai/gpt-4o-mini';

const ModelChatArea = forwardRef(function ModelChatArea(_props, ref) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const inputRef = useRef(null);
  const viewportRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  }, []);

  const handleComplete = useCallback(({ answer, sources, tools_used, model, download_urls }) => {
    // Prefer download URL from tool results; fall back to regex extraction from answer text
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

  // Expose sendPrompt and resetMessages via ref for parent (ModelingLayout) to call
  useImperativeHandle(ref, () => ({
    sendPrompt(prompt) {
      handleSendPrompt(prompt);
    },
    resetMessages() {
      setMessages([]);
      setInput('');
    },
  }), [handleSendPrompt]);

  return (
    <Stack style={{ flex: 1, overflow: 'hidden', height: '100%' }} gap={0}>
      {/* Message list */}
      <ScrollArea
        flex={1}
        viewportRef={viewportRef}
        p="md"
        style={{ flex: 1 }}
      >
        {messages.length === 0 && !isStreaming && (
          <ModelEmptyState onSendPrompt={handleSendPrompt} />
        )}

        {messages.map((msg, i) => (
          <Box key={i} mb="md" style={{ direction: 'rtl' }}>
            {msg.role === 'user' ? (
              <Group justify="flex-start" align="flex-start" gap="xs" wrap="nowrap">
                <Box
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'rgba(59,130,246,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IconUser size={14} color="#3B82F6" />
                </Box>
                <Box
                  p="sm"
                  style={{
                    background: 'rgba(59,130,246,0.1)',
                    border: '1px solid rgba(59,130,246,0.2)',
                    borderRadius: 8,
                    maxWidth: '85%',
                  }}
                >
                  <Text size="sm" style={{ direction: 'rtl', color: '#F1F5F9' }}>
                    {msg.content}
                  </Text>
                </Box>
              </Group>
            ) : (
              <Group justify="flex-end" align="flex-start" gap="xs" wrap="nowrap">
                <Stack gap={4} style={{ maxWidth: '85%' }}>
                  <Box
                    p="sm"
                    style={{
                      background: 'rgba(19,23,32,0.9)',
                      border: '1px solid rgba(148,163,184,0.12)',
                      borderRadius: 8,
                    }}
                  >
                    <MarkdownRenderer content={msg.content} />
                  </Box>
                  {/* Render ModelResultCard if a financial model was built */}
                  {msg.modelType && (
                    <ModelResultCard
                      modelData={{ model_type: msg.modelType, company_name: null }}
                      downloadUrl={msg.downloadUrl}
                    />
                  )}
                </Stack>
                <Box
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'rgba(16,185,129,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IconRobot size={14} color="#10B981" />
                </Box>
              </Group>
            )}
          </Box>
        ))}

        {/* Streaming indicator */}
        {isStreaming && (
          <Box mb="md" style={{ direction: 'rtl' }}>
            <Group justify="flex-end" align="flex-start" gap="xs" wrap="nowrap">
              <Box
                p="sm"
                style={{
                  background: 'rgba(19,23,32,0.9)',
                  border: '1px solid rgba(148,163,184,0.12)',
                  borderRadius: 8,
                  maxWidth: '85%',
                  minWidth: 80,
                }}
              >
                {streamingContent ? (
                  <MarkdownRenderer content={streamingContent} />
                ) : (
                  <Text size="xs" c="dimmed">
                    {stage === 'routing' ? 'در حال پردازش...' : stage === 'tool_call' ? 'در حال ساخت مدل...' : 'در حال پاسخ‌دهی...'}
                  </Text>
                )}
              </Box>
              <Box
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'rgba(16,185,129,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconRobot size={14} color="#10B981" />
              </Box>
            </Group>
          </Box>
        )}
      </ScrollArea>

      {/* Input area */}
      <Box
        p="sm"
        style={{
          borderTop: '1px solid rgba(148,163,184,0.1)',
          background: 'rgba(11,14,20,0.95)',
        }}
      >
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
                background: 'rgba(19,23,32,0.8)',
                border: '1px solid rgba(148,163,184,0.15)',
                color: '#F1F5F9',
              },
            }}
          />
          <ActionIcon
            onClick={isStreaming ? cancel : handleSend}
            size="lg"
            radius="md"
            aria-label={isStreaming ? 'انصراف' : 'ارسال'}
            style={{
              background: input.trim() && !isStreaming
                ? 'linear-gradient(135deg, #10B981, #059669)'
                : isStreaming
                  ? 'rgba(239,68,68,0.2)'
                  : undefined,
            }}
          >
            <IconSend size={18} />
          </ActionIcon>
        </Group>
      </Box>
    </Stack>
  );
});

export default ModelChatArea;
