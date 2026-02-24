import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { ActionIcon, Box, Group, ScrollArea, Stack, Text, Textarea } from '@mantine/core';
import { IconRobot, IconSend, IconUser, IconX } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';
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
  // Phase 5 — Wall Street & Earnings Quality
  build_lbo_model: 'lbo',
  build_ma_model: 'ma',
  compute_credit_metrics: 'credit_metrics',
  compute_liquidation_value: 'liquidation',
  compute_ipo_pricing: 'ipo',
  compute_altman_z: 'altman_z',
  compute_beneish_score: 'beneish',
  compute_accrual_ratios: 'accrual_ratios',
  compute_variance_analysis: 'variance_analysis',
  // Phase 6 — Portfolio & Risk
  compute_portfolio_stats: 'portfolio_stats',
  compute_risk_metrics: 'risk_metrics',
  compute_var: 'var',
  compute_cvar: 'cvar',
  run_monte_carlo: 'monte_carlo',
  optimize_portfolio: 'portfolio_optimization',
  compute_efficient_frontier: 'efficient_frontier',
  compute_risk_parity: 'risk_parity',
  compute_factor_model: 'factor_model',
  run_stress_test: 'stress_test',
  // Phase 7 — Derivatives & Options
  price_option_bsm: 'bsm',
  price_option_binomial: 'binomial_tree',
  compute_greeks: 'greeks',
  compute_implied_volatility: 'implied_volatility',
  check_put_call_parity: 'put_call_parity',
  build_option_strategy: 'option_strategy',
  // Phase 8 — Iranian Market & Real Estate
  compute_real_estate_noi: 'real_estate_noi',
  build_development_proforma: 'development_proforma',
  build_sukuk_model: 'sukuk',
  build_murabaha_schedule: 'murabaha',
  build_ijara_model: 'ijara',
  compute_inflation_adjusted_valuation: 'inflation_adjusted',
  build_tehran_housing_model: 'tehran_housing',
  // Phase 10 — Excel Formula Gaps
  compute_dupont: 'dupont',
  compute_brinson_attribution: 'brinson',
  compute_black_litterman: 'black_litterman',
  compute_pe_fund_metrics: 'pe_fund',
  compute_omega_ratio: 'omega_ratio',
  compute_credit_risk: 'credit_risk',
  compute_forward_rates: 'forward_rates',
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

  const userBubbleStyle = {
    background: 'rgba(59, 130, 246, 0.08)',
    border: `1px solid rgba(59, 130, 246, 0.18)`,
    borderRadius: 12,
    borderTopRight: 4,
    maxWidth: '80%',
  };

  const assistantBubbleStyle = {
    background: rallyColors.glassBg,
    border: `1px solid ${rallyColors.border}`,
    borderRadius: 12,
    borderTopLeft: 4,
  };

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
          <Box key={i} mb="lg" style={{ direction: 'rtl' }}>
            {msg.role === 'user' ? (
              <Group justify="flex-start" align="flex-start" gap="xs" wrap="nowrap">
                <Box
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IconUser size={14} color={rallyColors.blue} />
                </Box>
                <Box p="sm" style={userBubbleStyle}>
                  <Text size="sm" style={{ direction: 'rtl', color: rallyColors.textPrimary, lineHeight: 1.7 }}>
                    {msg.content}
                  </Text>
                </Box>
              </Group>
            ) : (
              <Group justify="flex-end" align="flex-start" gap="xs" wrap="nowrap">
                <Stack gap={4} style={{ maxWidth: '85%' }}>
                  <Box p="sm" style={assistantBubbleStyle}>
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
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: `rgba(41, 98, 255, 0.12)`,
                    border: '1px solid rgba(41, 98, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IconRobot size={14} color={rallyColors.primary} />
                </Box>
              </Group>
            )}
          </Box>
        ))}

        {/* Streaming indicator */}
        {isStreaming && (
          <Box mb="lg" style={{ direction: 'rtl' }}>
            <Group justify="flex-end" align="flex-start" gap="xs" wrap="nowrap">
              <Box
                p="sm"
                style={{
                  ...assistantBubbleStyle,
                  maxWidth: '85%',
                  minWidth: 80,
                }}
              >
                {streamingContent ? (
                  <MarkdownRenderer content={streamingContent} />
                ) : (
                  <Group gap={6} align="center">
                    <Box
                      style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: rallyColors.blue,
                        animation: 'pulse 1.2s ease-in-out infinite',
                      }}
                    />
                    <Text size="xs" c="dimmed">
                      {stage === 'routing' ? 'در حال پردازش...' : stage === 'tool_call' ? 'در حال ساخت مدل...' : 'در حال پاسخ‌دهی...'}
                    </Text>
                  </Group>
                )}
              </Box>
              <Box
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'rgba(41, 98, 255, 0.12)',
                  border: '1px solid rgba(41, 98, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconRobot size={14} color={rallyColors.primary} />
              </Box>
            </Group>
          </Box>
        )}
      </ScrollArea>

      {/* Input area */}
      <Box
        p="sm"
        style={{
          borderTop: `1px solid ${rallyColors.glassBorder}`,
          background: 'rgba(11, 14, 17, 0.95)',
          backdropFilter: 'blur(12px)',
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
            aria-label={isStreaming ? 'انصراف' : 'ارسال'}
            style={{
              background: input.trim() && !isStreaming
                ? `linear-gradient(135deg, ${rallyColors.blue}, #2563EB)`
                : isStreaming
                  ? 'rgba(239, 68, 68, 0.15)'
                  : undefined,
              border: isStreaming ? `1px solid rgba(239, 68, 68, 0.25)` : undefined,
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
