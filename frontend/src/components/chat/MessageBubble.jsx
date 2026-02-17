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
  IconTool,
  IconUser,
} from '@tabler/icons-react';
import MarkdownRenderer from './MarkdownRenderer';
import SourceItem from './SourceItem';
import styles from './ChatDrawer.module.css';

const TOOL_LABELS = {
  search_documents: 'RAG Search',
  get_stock_price: 'Stock Price',
  get_stock_history: 'History',
  get_order_book: 'Order Book',
  get_market_indices: 'Indices',
  get_sector_stocks: 'Sector',
  get_market_prices: 'Market Prices',
  get_etf_nav: 'ETF NAV',
  get_client_type_data: 'Client Type',
  get_shareholders: 'Shareholders',
  get_codal_announcements: 'Codal',
  compute_technical_indicators: 'Indicators',
  get_support_resistance: 'Support/Resist',
  compare_stocks: 'Compare',
  screen_stocks: 'Screener',
  search_loan_products: 'Loan Search',
  get_loan_details: 'Loan Details',
  list_banks: 'Banks',
  calculate_loan_installment: 'Installment',
};

function formatRelativeTime(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleTimeString();
}

function MessageBubble({ msg, onRegenerate, onRetry }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const isUser = msg.role === 'user';
  const isError = msg.error === true;

  return (
    <Box mb="sm" style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <Box style={{ maxWidth: '90%' }} className={styles.messageWrapper}>
        <Paper
          p="sm"
          radius="md"
          className={isError ? styles.errorBubble : undefined}
          style={{
            background: isUser
              ? 'var(--mantine-color-blue-6)'
              : 'var(--mantine-color-dark-5)',
          }}
        >
          <Group gap={6} align="flex-start" wrap="nowrap">
            {!isUser && <IconRobot size={15} style={{ flexShrink: 0, marginTop: 2 }} />}

            <Box style={{ flex: 1, minWidth: 0 }}>
              {isUser ? (
                <Text size="sm" style={{ whiteSpace: 'pre-wrap', direction: 'auto', color: 'inherit' }}>
                  {msg.content}
                </Text>
              ) : (
                <MarkdownRenderer content={msg.content} />
              )}
            </Box>

            {isUser && <IconUser size={15} style={{ flexShrink: 0, marginTop: 2 }} />}
          </Group>

          {/* Copy button overlay */}
          <Box className={styles.copyOverlay} style={{ position: 'absolute', top: 6, right: isUser ? 'auto' : 6, left: isUser ? 6 : 'auto' }}>
            <CopyButton value={msg.content} timeout={2000}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? 'Copied' : 'Copy message'} position="top">
                  <ActionIcon size="xs" variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy}>
                    {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          </Box>
        </Paper>

        {/* Timestamp */}
        {msg.timestamp && (
          <Tooltip label={new Date(msg.timestamp).toLocaleString()} position="bottom">
            <Text size="xs" c="dimmed" mt={2} style={{ opacity: 0.6 }}>
              {formatRelativeTime(msg.timestamp)}
            </Text>
          </Tooltip>
        )}

        {/* Error retry */}
        {isError && onRetry && (
          <UnstyledButton onClick={onRetry} mt={4} className={styles.regenerateLink}>
            <Group gap={4}>
              <IconRefresh size={12} />
              <Text size="xs" c="red">Retry</Text>
            </Group>
          </UnstyledButton>
        )}

        {/* Tools badges */}
        {msg.tools_used && msg.tools_used.length > 0 && (
          <Group gap={4} mt={4} wrap="wrap">
            {msg.tools_used.map((tool) => (
              <Badge
                key={tool}
                size="xs"
                color="violet"
                leftSection={<IconTool size={8} />}
              >
                {TOOL_LABELS[tool] || tool}
              </Badge>
            ))}
          </Group>
        )}

        {/* Sources collapse */}
        {msg.sources && msg.sources.length > 0 && (
          <Box mt={4}>
            <UnstyledButton onClick={() => setSourcesOpen((v) => !v)}>
              <Group gap={4}>
                <IconFileText size={12} />
                <Text size="xs" c="dimmed">{msg.sources.length} منبع</Text>
                {sourcesOpen ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
              </Group>
            </UnstyledButton>
            <Collapse in={sourcesOpen}>
              <Box mt={4}>
                {msg.sources.map((src, j) => (
                  <SourceItem key={j} src={src} />
                ))}
              </Box>
            </Collapse>
          </Box>
        )}

        {/* Regenerate link for assistant messages (non-error) */}
        {!isUser && !isError && onRegenerate && (
          <UnstyledButton onClick={onRegenerate} mt={4} className={styles.regenerateLink}>
            <Group gap={4}>
              <IconRefresh size={12} />
              <Text size="xs" c="dimmed">Regenerate</Text>
            </Group>
          </UnstyledButton>
        )}
      </Box>
    </Box>
  );
}

export default memo(MessageBubble);
