import { memo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Collapse,
  CopyButton,
  Group,
  Paper,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconFileText,
  IconRefresh,
  IconRobot,
  IconThumbDown,
  IconThumbUp,
  IconTool,
  IconUser,
} from '@tabler/icons-react';
import SourceCard from './SourceCard';
import styles from './chat.module.css';
import { toPersianNum } from '../../utils/formatUtils';

const DEFAULT_TOOL_LABELS = {};
const DEFAULT_TOOL_CATEGORIES = {};

function formatRelativeTimePersian(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'همین الان';
  if (diff < 3600) return `${toPersianNum(Math.floor(diff / 60))} دقیقه پیش`;
  if (diff < 86400) return `${toPersianNum(Math.floor(diff / 3600))} ساعت پیش`;
  try {
    return new Date(ts).toLocaleTimeString('fa-IR');
  } catch {
    return new Date(ts).toLocaleTimeString();
  }
}

/** Max sources to show inline before collapsing */
const INLINE_SOURCE_LIMIT = 3;

function ChatBubble({
  msg,
  onRegenerate,
  onRetry,
  onFeedback,
  toolLabels = DEFAULT_TOOL_LABELS,
  toolCategories = DEFAULT_TOOL_CATEGORIES,
  MarkdownRenderer,
  children,
}) {
  const [moreSourcesOpen, setMoreSourcesOpen] = useState(false);
  const isUser = msg.role === 'user';
  const isError = msg.error === true;

  const inlineSources = msg.sources?.slice(0, INLINE_SOURCE_LIMIT) || [];
  const remainingSources = msg.sources?.slice(INLINE_SOURCE_LIMIT) || [];

  return (
    <Box mb="sm" className={styles.messageEnter} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <Box style={{ maxWidth: '90%' }} className={styles.messageWrapper}>
        <Paper
          p="sm"
          radius="md"
          style={{ position: 'relative' }}
          className={`${isError ? styles.errorBubble : ''} ${isUser ? styles.userBubble : styles.assistantBubble}`}
        >
          <Group gap={6} align="flex-start" wrap="nowrap">
            {!isUser && <IconRobot size={15} style={{ flexShrink: 0, marginTop: 2, opacity: 0.7 }} />}

            <Box style={{ flex: 1, minWidth: 0 }}>
              {isUser ? (
                <Text size="sm" style={{ whiteSpace: 'pre-wrap', direction: 'auto', color: 'inherit' }}>
                  {msg.content}
                </Text>
              ) : MarkdownRenderer ? (
                <MarkdownRenderer content={msg.content} />
              ) : (
                <Text size="sm" style={{ direction: 'auto', color: 'inherit' }}>
                  {msg.content}
                </Text>
              )}
            </Box>

            {isUser && <IconUser size={15} style={{ flexShrink: 0, marginTop: 2, opacity: 0.9 }} />}
          </Group>

          {/* Copy button overlay */}
          <Box className={styles.copyOverlay} style={{ position: 'absolute', top: 6, right: isUser ? 'auto' : 6, left: isUser ? 6 : 'auto' }}>
            <CopyButton value={msg.content} timeout={2000}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? 'کپی شد' : 'کپی پیام'} position="top">
                  <ActionIcon size="xs" variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy} aria-label="کپی پیام">
                    {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          </Box>
        </Paper>

        {/* Timestamp + model badge */}
        {msg.timestamp && (
          <Group gap={6} mt={2} align="center">
            <Tooltip label={new Date(msg.timestamp).toLocaleString('fa-IR')} position="bottom">
              <Text size="xs" c="dimmed" style={{ opacity: 0.6, direction: 'rtl' }}>
                {formatRelativeTimePersian(msg.timestamp)}
              </Text>
            </Tooltip>
            {!isUser && msg.model && (
              <span className={styles.modelBadge}>{msg.model}</span>
            )}
          </Group>
        )}

        {/* Feedback thumbs for assistant messages */}
        {!isUser && !isError && onFeedback && (
          <div className={`${styles.feedbackGroup} ${msg.feedback ? styles.feedbackVisible : ''}`}>
            <button
              className={`${styles.feedbackBtn} ${msg.feedback === 'up' ? styles.feedbackActive : ''}`}
              onClick={() => onFeedback('up')}
              aria-label="پسندیدم"
            >
              <IconThumbUp size={12} />
            </button>
            <button
              className={`${styles.feedbackBtn} ${msg.feedback === 'down' ? styles.feedbackActiveDown : ''}`}
              onClick={() => onFeedback('down')}
              aria-label="نپسندیدم"
            >
              <IconThumbDown size={12} />
            </button>
          </div>
        )}

        {/* Error retry */}
        {isError && onRetry && (
          <UnstyledButton onClick={onRetry} mt={4} className={styles.regenerateLink}>
            <Group gap={4}>
              <IconRefresh size={12} />
              <Text size="xs" c="red">تلاش مجدد</Text>
            </Group>
          </UnstyledButton>
        )}

        {/* Tools badges */}
        {msg.tools_used && msg.tools_used.length > 0 && (
          <Group gap={4} mt={4} wrap="wrap">
            {msg.tools_used.map((tool, idx) => (
              <Badge
                key={tool}
                size="xs"
                color={toolCategories[tool] || 'gray'}
                leftSection={<IconTool size={8} />}
                className={styles.toolBadge}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                {toolLabels[tool] || tool}
              </Badge>
            ))}
          </Group>
        )}

        {/* Inline sources (first 3 shown, rest collapsed) */}
        {inlineSources.length > 0 && (
          <Box className={styles.inlineSources}>
            {inlineSources.map((src, j) => (
              <SourceCard key={j} src={src} index={j + 1} />
            ))}
            {remainingSources.length > 0 && (
              <>
                <button
                  className={styles.showMoreSources}
                  onClick={() => setMoreSourcesOpen((v) => !v)}
                >
                  <IconFileText size={12} />
                  <span>
                    {moreSourcesOpen ? 'بستن' : `${toPersianNum(remainingSources.length)} منبع دیگر`}
                  </span>
                  {moreSourcesOpen ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
                </button>
                <Collapse in={moreSourcesOpen}>
                  <Box>
                    {remainingSources.map((src, j) => (
                      <SourceCard key={j + INLINE_SOURCE_LIMIT} src={src} index={j + INLINE_SOURCE_LIMIT + 1} />
                    ))}
                  </Box>
                </Collapse>
              </>
            )}
          </Box>
        )}

        {/* Custom children (e.g., ModelResultCard) */}
        {children}

        {/* Regenerate link */}
        {!isUser && !isError && onRegenerate && (
          <UnstyledButton onClick={onRegenerate} mt={4} className={styles.regenerateLink}>
            <Group gap={4}>
              <IconRefresh size={12} />
              <Text size="xs" c="dimmed">تولید مجدد</Text>
            </Group>
          </UnstyledButton>
        )}
      </Box>
    </Box>
  );
}

export default memo(ChatBubble);
