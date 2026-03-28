import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Text,
  Textarea,
  ActionIcon,
  Group,
  Stack,
  Badge,
  Loader,
  Alert,
  Divider,
  ScrollArea,
  ThemeIcon,
} from '@mantine/core';
import {
  IconSend,
  IconAlertCircle,
  IconBuildingBank,
  IconRobot,
  IconUser,
  IconSparkles,
} from '@tabler/icons-react';
import axios from 'axios';
import MarkdownRenderer from '../../features/chat/components/MarkdownRenderer';
import { useAuth } from '../../context/AuthContext';
import rallyColors from '../../theme/rallyColors';

const TEAL = '#0D9488';
const TEAL_DIM = 'rgba(13,148,136,0.15)';
const TEAL_BORDER = 'rgba(13,148,136,0.30)';

const CREDIT_COLORS = {
  A1: '#22C55E', A2: '#22C55E', A3: '#22C55E',
  B1: '#3B82F6', B2: '#3B82F6', B3: '#3B82F6',
  C1: '#F59E0B', C2: '#F59E0B',
  D: '#EF4444',
};

function LoanResultCard({ loan }) {
  const eligible = loan.relevance_score >= 0.5;
  return (
    <Paper
      p="sm"
      radius="md"
      style={{
        background: 'rgba(26,29,46,0.7)',
        border: `1px solid ${eligible ? TEAL_BORDER : 'rgba(42,46,62,0.4)'}`,
        direction: 'rtl',
      }}
    >
      <Group justify="space-between" mb={4} wrap="nowrap">
        <Text fw={600} size="sm" c={rallyColors.textPrimary} style={{ flex: 1 }}>
          {loan.loan_name_fa}
        </Text>
        <Badge
          size="xs"
          variant="light"
          color={eligible ? 'teal' : 'gray'}
          style={{ flexShrink: 0 }}
        >
          {eligible ? 'واجد شرایط' : 'نیاز به بررسی'}
        </Badge>
      </Group>
      <Text size="xs" c="dimmed" mb={6}>{loan.bank_name_fa}</Text>
      <Group gap="xs" wrap="wrap">
        {loan.max_amount_million && (
          <Badge size="xs" variant="dot" color="teal">
            تا {loan.max_amount_million.toLocaleString('fa-IR')} م.ت
          </Badge>
        )}
        {loan.interest_rate_pct && (
          <Badge size="xs" variant="dot" color="blue">
            سود {loan.interest_rate_pct}٪
          </Badge>
        )}
        <Badge size="xs" variant="dot" color={loan.has_guarantor ? 'orange' : 'green'}>
          {loan.has_guarantor ? 'نیاز به ضامن' : 'بدون ضامن'}
        </Badge>
      </Group>
    </Paper>
  );
}

function Message({ msg }) {
  const isUser = msg.role === 'user';
  const isSystem = msg.role === 'system';

  if (isSystem) {
    return (
      <Alert icon={<IconSparkles size={16} />} color="teal" variant="light" radius="md" mb="xs">
        <Text size="sm" style={{ direction: 'rtl' }}>{msg.content}</Text>
      </Alert>
    );
  }

  return (
    <Group align="flex-start" gap="xs" justify={isUser ? 'flex-end' : 'flex-start'} mb="sm">
      {!isUser && (
        <ThemeIcon size={28} radius="xl" color="teal" variant="light" style={{ flexShrink: 0, marginTop: 2 }}>
          <IconRobot size={16} />
        </ThemeIcon>
      )}
      <Box style={{ maxWidth: '82%' }}>
        <Paper
          p="sm"
          radius="md"
          style={{
            background: isUser ? TEAL_DIM : 'rgba(26,29,46,0.8)',
            border: `1px solid ${isUser ? TEAL_BORDER : 'rgba(42,46,62,0.5)'}`,
            direction: 'rtl',
          }}
        >
          {msg.answer ? (
            <>
              <Text size="sm" c={rallyColors.textPrimary} mb={msg.results?.length ? 'xs' : 0}>
                {msg.answer}
              </Text>
              {msg.results?.length > 0 && (
                <>
                  <Divider my="xs" color="rgba(42,46,62,0.5)" />
                  <Stack gap={6}>
                    {msg.results.map((loan, i) => (
                      <LoanResultCard key={i} loan={loan} />
                    ))}
                  </Stack>
                </>
              )}
            </>
          ) : (
            <MarkdownRenderer content={msg.content} />
          )}
        </Paper>
        {msg.credit_sub_tier && (
          <Text size="xs" c="dimmed" mt={4} style={{ direction: 'rtl' }}>
            رتبه اعتباری:{' '}
            <Text span fw={600} c={CREDIT_COLORS[msg.credit_sub_tier] || 'teal'}>
              {msg.credit_sub_tier}
            </Text>
            {' '}(امتیاز {msg.credit_score})
          </Text>
        )}
      </Box>
      {isUser && (
        <ThemeIcon size={28} radius="xl" color="gray" variant="light" style={{ flexShrink: 0, marginTop: 2 }}>
          <IconUser size={16} />
        </ThemeIcon>
      )}
    </Group>
  );
}

const QUICK_PROMPTS = [
  { label: 'وام فوری', text: 'چه وام‌هایی در سریع‌ترین زمان قابل دریافت هستند؟' },
  { label: 'بدون ضامن', text: 'وام‌هایی که نیاز به ضامن ندارند کدامند؟' },
  { label: 'سود پایین', text: 'کم‌سودترین وام‌های موجود کدامند؟' },
  { label: 'مبلغ بالا', text: 'وام‌هایی با سقف بالای ۵۰۰ میلیون تومان چیست؟' },
];

export default function PersianLoanChat() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const location = useLocation();
  const initialState = location.state || {};

  if (authLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Pre-fill from PersianLoanHome navigation state
  const [creditScore, setCreditScore] = useState(initialState.creditScore ?? 700);
  const [maxAmount, setMaxAmount] = useState(initialState.maxAmount ?? null);
  const [noGuarantor, setNoGuarantor] = useState(initialState.noGuarantor ?? false);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(initialState.message ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  // Send initial message if navigated from home with context
  useEffect(() => {
    if (initialState.message && initialState.creditScore) {
      sendMessage(initialState.message, initialState.creditScore, initialState.maxAmount, initialState.noGuarantor);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ y: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, loading]);

  const sendMessage = useCallback(async (text, score, amount, noGuar) => {
    const msgText = text || input.trim();
    if (!msgText) return;

    const userMsg = { role: 'user', content: msgText };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.post('/api/persian-loan/chat', {
        credit_score: score ?? creditScore,
        max_amount: amount ?? maxAmount,
        no_guarantor: noGuar ?? noGuarantor,
        message: msgText,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          answer: data.answer,
          results: data.results,
          credit_score: data.credit_score,
          credit_sub_tier: data.credit_sub_tier,
        },
      ]);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || 'خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  }, [input, creditScore, maxAmount, noGuarantor]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Box
      style={{
        height: 'calc(100vh - 80px)',
        display: 'flex',
        flexDirection: 'column',
        direction: 'rtl',
      }}
    >
      {/* Header */}
      <Paper
        p="sm"
        radius="md"
        mb="sm"
        style={{
          background: TEAL_DIM,
          border: `1px solid ${TEAL_BORDER}`,
          flexShrink: 0,
        }}
      >
        <Group gap="xs">
          <ThemeIcon size={36} radius="md" color="teal" variant="light">
            <IconBuildingBank size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="sm" c={rallyColors.textPrimary}>جستجوی هوشمند وام</Text>
            <Text size="xs" c="dimmed">
              امتیاز اعتباری: <Text span fw={600} c={TEAL}>{creditScore}</Text>
              {maxAmount && <> · سقف: <Text span fw={600} c={TEAL}>{maxAmount} م.ت</Text></>}
              {noGuarantor && <> · <Text span c="green">بدون ضامن</Text></>}
            </Text>
          </div>
        </Group>
      </Paper>

      {/* Messages */}
      <ScrollArea
        flex={1}
        viewportRef={scrollRef}
        style={{ minHeight: 0 }}
        p="xs"
      >
        {messages.length === 0 && !loading && (
          <Box py="xl" style={{ textAlign: 'center' }}>
            <ThemeIcon size={56} radius="xl" color="teal" variant="light" mx="auto" mb="md">
              <IconSparkles size={28} />
            </ThemeIcon>
            <Text fw={600} size="md" c={rallyColors.textPrimary} mb={4}>
              مشاور هوشمند وام‌یار
            </Text>
            <Text size="sm" c="dimmed" mb="lg">
              سوالات خود درباره تسهیلات بانکی را بپرسید
            </Text>
            <Group gap={8} justify="center" wrap="wrap">
              {QUICK_PROMPTS.map((q) => (
                <Paper
                  key={q.label}
                  px="sm"
                  py={6}
                  radius="xl"
                  style={{
                    cursor: 'pointer',
                    background: 'rgba(26,29,46,0.7)',
                    border: `1px solid ${TEAL_BORDER}`,
                    transition: 'background 0.15s',
                  }}
                  onClick={() => sendMessage(q.text)}
                >
                  <Text size="xs" c={TEAL}>{q.label}</Text>
                </Paper>
              ))}
            </Group>
          </Box>
        )}

        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}

        {loading && (
          <Group gap="xs" align="center" mb="sm">
            <ThemeIcon size={28} radius="xl" color="teal" variant="light" style={{ flexShrink: 0 }}>
              <IconRobot size={16} />
            </ThemeIcon>
            <Paper p="sm" radius="md" style={{ background: 'rgba(26,29,46,0.8)', border: '1px solid rgba(42,46,62,0.5)' }}>
              <Group gap="xs">
                <Loader size={14} color="teal" />
                <Text size="sm" c="dimmed">در حال جستجو...</Text>
              </Group>
            </Paper>
          </Group>
        )}

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" radius="md" mb="xs">
            <Text size="sm" style={{ direction: 'rtl' }}>{error}</Text>
          </Alert>
        )}
      </ScrollArea>

      {/* Input */}
      <Paper
        p="sm"
        radius="md"
        style={{
          background: 'rgba(26,29,46,0.8)',
          border: `1px solid rgba(42,46,62,0.6)`,
          flexShrink: 0,
        }}
      >
        <Group align="flex-end" gap="xs">
          <Textarea
            style={{ flex: 1 }}
            placeholder="سوال خود را بنویسید… (Enter برای ارسال)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autosize
            minRows={1}
            maxRows={5}
            disabled={loading}
            styles={{
              input: {
                direction: 'rtl',
                background: 'rgba(15,16,28,0.6)',
                border: `1px solid rgba(42,46,62,0.6)`,
                color: rallyColors.textPrimary,
                '&:focus': { borderColor: TEAL },
              },
            }}
          />
          <ActionIcon
            size="lg"
            radius="md"
            color="teal"
            variant="filled"
            disabled={!input.trim() || loading}
            onClick={() => sendMessage()}
            aria-label="ارسال"
          >
            <IconSend size={18} />
          </ActionIcon>
        </Group>
      </Paper>
    </Box>
  );
}
