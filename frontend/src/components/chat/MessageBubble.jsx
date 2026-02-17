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
  search_documents: 'جستجوی اسناد',
  get_stock_price: 'قیمت سهم',
  get_stock_history: 'سابقه',
  get_order_book: 'دفتر سفارش',
  get_market_indices: 'شاخص‌ها',
  get_sector_stocks: 'صنعت',
  get_market_prices: 'قیمت بازار',
  get_etf_nav: 'NAV صندوق',
  get_client_type_data: 'حقیقی/حقوقی',
  get_shareholders: 'سهامداران',
  get_codal_announcements: 'کدال',
  compute_technical_indicators: 'اندیکاتورها',
  get_support_resistance: 'حمایت/مقاومت',
  compare_stocks: 'مقایسه',
  screen_stocks: 'فیلتر',
  search_loan_products: 'جستجوی تسهیلات',
  get_loan_details: 'جزئیات تسهیلات',
  list_banks: 'بانک‌ها',
  calculate_loan_installment: 'اقساط',
};

const TOOL_CATEGORIES = {
  get_stock_price: 'green',
  get_stock_history: 'green',
  get_order_book: 'green',
  get_market_indices: 'green',
  get_sector_stocks: 'green',
  get_market_prices: 'green',
  get_etf_nav: 'green',
  get_client_type_data: 'green',
  get_shareholders: 'green',
  compute_technical_indicators: 'blue',
  get_support_resistance: 'blue',
  search_documents: 'yellow',
  get_codal_announcements: 'yellow',
  compare_stocks: 'cyan',
  screen_stocks: 'cyan',
  search_loan_products: 'violet',
  get_loan_details: 'violet',
  list_banks: 'violet',
  calculate_loan_installment: 'violet',
};

const PERSIAN_DIGITS = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];

function toPersianDigits(str) {
  return String(str).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[+d]);
}

function formatRelativeTimePersian(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'همین الان';
  if (diff < 3600) return `${toPersianDigits(Math.floor(diff / 60))} دقیقه پیش`;
  if (diff < 86400) return `${toPersianDigits(Math.floor(diff / 3600))} ساعت پیش`;
  try {
    return new Date(ts).toLocaleTimeString('fa-IR');
  } catch {
    return new Date(ts).toLocaleTimeString();
  }
}

function MessageBubble({ msg, onRegenerate, onRetry }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const isUser = msg.role === 'user';
  const isError = msg.error === true;

  return (
    <Box mb="sm" className={styles.messageEnter} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <Box style={{ maxWidth: '90%' }} className={styles.messageWrapper}>
        <Paper
          p="sm"
          radius="md"
          className={`${isError ? styles.errorBubble : ''} ${isUser ? styles.userBubble : styles.assistantBubble}`}
        >
          <Group gap={6} align="flex-start" wrap="nowrap">
            {!isUser && <IconRobot size={15} style={{ flexShrink: 0, marginTop: 2, opacity: 0.7 }} />}

            <Box style={{ flex: 1, minWidth: 0 }}>
              {isUser ? (
                <Text size="sm" style={{ whiteSpace: 'pre-wrap', direction: 'auto', color: 'inherit' }}>
                  {msg.content}
                </Text>
              ) : (
                <MarkdownRenderer content={msg.content} />
              )}
            </Box>

            {isUser && <IconUser size={15} style={{ flexShrink: 0, marginTop: 2, opacity: 0.9 }} />}
          </Group>

          {/* Copy button overlay */}
          <Box className={styles.copyOverlay} style={{ position: 'absolute', top: 6, right: isUser ? 'auto' : 6, left: isUser ? 6 : 'auto' }}>
            <CopyButton value={msg.content} timeout={2000}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? 'کپی شد' : 'کپی پیام'} position="top">
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
          <Tooltip label={new Date(msg.timestamp).toLocaleString('fa-IR')} position="bottom">
            <Text size="xs" c="dimmed" mt={2} style={{ opacity: 0.6, direction: 'rtl' }}>
              {formatRelativeTimePersian(msg.timestamp)}
            </Text>
          </Tooltip>
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

        {/* Tools badges — color-coded by category */}
        {msg.tools_used && msg.tools_used.length > 0 && (
          <Group gap={4} mt={4} wrap="wrap">
            {msg.tools_used.map((tool, idx) => (
              <Badge
                key={tool}
                size="xs"
                color={TOOL_CATEGORIES[tool] || 'gray'}
                leftSection={<IconTool size={8} />}
                className={styles.toolBadge}
                style={{ animationDelay: `${idx * 0.05}s` }}
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
                <Text size="xs" c="dimmed">{toPersianDigits(msg.sources.length)} منبع</Text>
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
              <Text size="xs" c="dimmed">تولید مجدد</Text>
            </Group>
          </UnstyledButton>
        )}
      </Box>
    </Box>
  );
}

export default memo(MessageBubble);
