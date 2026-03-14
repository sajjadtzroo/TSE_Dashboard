import { useEffect, useRef } from 'react';
import { Box, Group, ScrollArea } from '@mantine/core';
import { IconRobot } from '@tabler/icons-react';
import ChatBubble from '../../../components/chat/ChatBubble';
import StreamingIndicator from '../../../components/chat/StreamingIndicator';
import FollowUpBar from '../../../components/chat/FollowUpBar';
import EmptyStateTemplate from '../../../components/chat/EmptyStateTemplate';
import MarkdownRenderer from './MarkdownRenderer';
import { getFollowUpSuggestions } from '../utils/followUpTemplates';
import { TOOL_LABELS, TOOL_CATEGORIES, CHAT_CATEGORIES } from '../../../constants/chat';
import {
  IconBuildingBank,
  IconChartLine,
  IconCoin,
  IconSchool,
  IconTrendingUp,
} from '@tabler/icons-react';
import sharedStyles from '../../../components/chat/chat.module.css';
import drawerStyles from './ChatDrawer.module.css';

const ICON_MAP = {
  green: IconTrendingUp,
  purple: IconBuildingBank,
  blue: IconChartLine,
  orange: IconCoin,
  pink: IconSchool,
};

function buildTemplates(section, contextSymbol) {
  let categories = CHAT_CATEGORIES.map((cat) => ({
    ...cat,
    icon: ICON_MAP[cat.colorName] ?? IconTrendingUp,
    className:
      drawerStyles[`category${cat.colorName.charAt(0).toUpperCase() + cat.colorName.slice(1)}`] ??
      drawerStyles.categoryGreen,
  }));

  // Re-order categories based on current page section
  if (section && section !== 'general') {
    const sectionMap = { stock: 'green', crypto: 'orange', loans: 'purple' };
    const targetColor = sectionMap[section];
    if (targetColor) {
      const prioritized = categories.filter((c) => c.colorName === targetColor);
      const rest = categories.filter((c) => c.colorName !== targetColor);
      categories = [...prioritized, ...rest];
    }
  }

  // Template symbol into prompts
  if (contextSymbol) {
    return categories.map((cat) => {
      let prompt = cat.prompt;
      if (cat.colorName === 'green' && section === 'stock') prompt = `قیمت ${contextSymbol} چقدره؟`;
      if (cat.colorName === 'blue' && section === 'stock') prompt = `حمایت و مقاومت ${contextSymbol}`;
      if (cat.colorName === 'orange' && section === 'crypto') prompt = `قیمت ${contextSymbol} چقدره؟`;
      return { ...cat, prompt };
    });
  }

  return categories;
}

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

  const templates = buildTemplates(section, contextSymbol);

  // Get follow-up suggestions for the last assistant message
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant' && !m.error);
  const followUps = lastAssistant
    ? getFollowUpSuggestions({ toolsUsed: lastAssistant.tools_used, sources: lastAssistant.sources, symbol: contextSymbol })
    : [];

  return (
    <ScrollArea
      flex={1}
      viewportRef={viewport}
      p="sm"
      role="log"
      aria-live="polite"
      className={drawerStyles.drawerContent}
    >
      {messages.length === 0 && !isStreaming && (
        <EmptyStateTemplate
          title="دستیار هوشمند بازار سرمایه"
          subtitle="سوالات خود را درباره بورس، تسهیلات و تحلیل تکنیکال بپرسید"
          templates={templates}
          onSelect={onSendPrompt}
        />
      )}

      {messages.map((msg, i) => (
        <Box key={`${i}-${msg.timestamp}`}>
          <ChatBubble
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
            toolLabels={TOOL_LABELS}
            toolCategories={TOOL_CATEGORIES}
            MarkdownRenderer={MarkdownRenderer}
          />
        </Box>
      ))}

      {/* Follow-up chips after last assistant message */}
      {!isStreaming && followUps.length > 0 && messages.length > 0 && (
        <FollowUpBar suggestions={followUps} onSelect={onSendPrompt} />
      )}

      {/* Streaming content preview */}
      {isStreaming && streamingContent && (
        <Box
          mb="sm"
          className={sharedStyles.messageEnter}
          style={{ display: 'flex', justifyContent: 'flex-start' }}
        >
          <Box style={{ maxWidth: '90%' }}>
            <Box p="sm" className={sharedStyles.streamingBubble}>
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
          <StreamingIndicator
            stage={stage}
            activeTool={activeTools.length > 0 ? activeTools[activeTools.length - 1] : undefined}
          />
          <button className={sharedStyles.cancelButton} onClick={cancelSSE}>
            انصراف
          </button>
        </Group>
      )}
    </ScrollArea>
  );
}
