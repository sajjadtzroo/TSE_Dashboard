import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Drawer,
  Group,
  Loader,
  Popover,
  ScrollArea,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconChartLine,
  IconBuildingBank,
  IconFiles,
  IconMessageChatbot,
  IconPaperclip,
  IconRobot,
  IconSend,
  IconTrendingUp,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import axios from 'axios';
import useSSEChat from '../../hooks/useSSEChat';
import MessageBubble from './MessageBubble';
import MarkdownRenderer from './MarkdownRenderer';
import ThinkingIndicator from './ThinkingIndicator';
import styles from './ChatDrawer.module.css';

const STATUS_COLORS = {
  embedded: 'green',
  failed: 'red',
  downloaded: 'blue',
  extracting: 'orange',
  embedding: 'orange',
  pending: 'yellow',
};

const CATEGORIES = [
  {
    icon: IconTrendingUp,
    color: '#10B981',
    label: 'بازار سهام',
    prompt: 'قیمت فولاد چقدره؟',
    className: styles.categoryGreen,
  },
  {
    icon: IconBuildingBank,
    color: '#8B5CF6',
    label: 'تسهیلات بانکی',
    prompt: 'شرایط وام مسکن',
    className: styles.categoryPurple,
  },
  {
    icon: IconChartLine,
    color: '#3B82F6',
    label: 'تحلیل تکنیکال',
    prompt: 'حمایت و مقاومت فولاد',
    className: styles.categoryBlue,
  },
];

export default function ChatDrawer() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [symbolFilter, setSymbolFilter] = useState('');
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [docsPopoverOpen, setDocsPopoverOpen] = useState(false);
  const [ragDocs, setRagDocs] = useState([]);
  const [pollingDocId, setPollingDocId] = useState(null);
  const fileInputRef = useRef(null);
  const viewport = useRef(null);
  const textareaRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 48em)');

  // SSE streaming hook
  const {
    sendMessage: sendSSE,
    cancel: cancelSSE,
    isStreaming,
    streamingContent,
    stage,
    activeTools,
  } = useSSEChat({
    onComplete: (result) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.answer,
          sources: result.sources || [],
          tools_used: result.tools_used || [],
          model: result.model,
          timestamp: Date.now(),
        },
      ]);
    },
    onError: (errMsg) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: errMsg,
          sources: [],
          tools_used: [],
          error: true,
          timestamp: Date.now(),
        },
      ]);
    },
  });

  // Poll uploaded document status until embedded or failed
  useEffect(() => {
    if (!pollingDocId) return;
    const interval = setInterval(async () => {
      try {
        const res = await axios.get('/api/rag/documents', { params: { limit: 50 } });
        const doc = (res.data || []).find((d) => d.id === pollingDocId);
        if (!doc) return;
        if (doc.status === 'embedded') {
          notifications.show({
            color: 'green',
            title: 'سند آماده شد',
            message: `"${doc.title}" پردازش شد و آماده جستجو است.`,
          });
          setPollingDocId(null);
        } else if (doc.status === 'failed') {
          notifications.show({
            color: 'red',
            title: 'خطا در پردازش',
            message: `"${doc.title}" پردازش نشد. دوباره تلاش کنید.`,
          });
          setPollingDocId(null);
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [pollingDocId]);

  useEffect(() => {
    viewport.current?.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isStreaming, streamingContent]);

  useEffect(() => {
    setModelsLoading(true);
    axios
      .get('/api/chat/models')
      .then((res) => {
        setModels(res.data.models || []);
        setSelectedModel(res.data.default || '');
      })
      .catch(() => {})
      .finally(() => setModelsLoading(false));
  }, []);

  // Auto-focus textarea when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  const sendMessage = useCallback(
    (text) => {
      const query = text || input.trim();
      if (!query || isStreaming) return;
      setInput('');
      const newUserMsg = { role: 'user', content: query, timestamp: Date.now() };
      const updatedMessages = [...messages, newUserMsg];
      setMessages(updatedMessages);

      sendSSE({
        messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        model: selectedModel || undefined,
        symbol: symbolFilter || undefined,
        top_k: 5,
      });
    },
    [input, messages, selectedModel, symbolFilter, isStreaming, sendSSE],
  );

  const handleRegenerate = useCallback(
    (index) => {
      const precedingUserMsg = messages
        .slice(0, index)
        .reverse()
        .find((m) => m.role === 'user');
      if (!precedingUserMsg) return;
      setMessages((prev) => prev.filter((_, i) => i !== index));
      setTimeout(() => sendMessage(precedingUserMsg.content), 0);
    },
    [messages, sendMessage],
  );

  const handleRetry = useCallback(
    (index) => {
      handleRegenerate(index);
    },
    [handleRegenerate],
  );

  const handleClearChat = useCallback(() => {
    modals.openConfirmModal({
      title: 'پاک کردن تاریخچه',
      children: (
        <Text size="sm" style={{ direction: 'rtl' }}>
          آیا مطمئن هستید؟ تمام پیام‌ها حذف خواهند شد.
        </Text>
      ),
      labels: { confirm: 'پاک کن', cancel: 'انصراف' },
      confirmProps: { color: 'red' },
      onConfirm: () => setMessages([]),
    });
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      notifications.show({ color: 'red', message: 'فقط فایل PDF پذیرفته می‌شود.' });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      notifications.show({ color: 'red', message: 'حجم فایل بیش از ۵۰ مگابایت است.' });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', file.name.replace(/\.pdf$/i, ''));
      if (symbolFilter) fd.append('symbol', symbolFilter);
      const res = await axios.post('/api/rag/upload', fd);
      notifications.show({
        color: 'blue',
        message: res.data.message || 'سند آپلود شد و در حال پردازش است.',
      });
      if (res.data.document_id) {
        setPollingDocId(res.data.document_id);
      }
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err.response?.data?.detail || 'آپلود ناموفق بود.',
      });
    } finally {
      setUploading(false);
    }
  };

  const fetchDocs = async () => {
    try {
      const res = await axios.get('/api/rag/documents', { params: { limit: 20 } });
      setRagDocs(res.data);
    } catch {
      setRagDocs([]);
    }
  };

  const deleteDoc = async (docId) => {
    try {
      await axios.delete(`/api/rag/documents/${docId}`);
      setRagDocs((prev) => prev.filter((d) => d.id !== docId));
      notifications.show({ color: 'green', message: 'سند حذف شد.' });
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err.response?.data?.detail || 'حذف ناموفق بود.',
      });
    }
  };

  const modelOptions = models.map((m) => ({
    value: m.id,
    label: `${m.name} (${m.provider})`,
  }));

  return (
    <>
      {/* Glowing Floating Button */}
      {!open && (
        <button
          className={styles.floatingButton}
          onClick={() => setOpen(true)}
          aria-label="باز کردن چت"
        >
          <IconMessageChatbot size={26} />
        </button>
      )}

      <Drawer
        opened={open}
        onClose={() => setOpen(false)}
        position="right"
        size={isMobile ? '100%' : 420}
        withCloseButton={false}
        styles={{
          body: { padding: 0, height: '100%', display: 'flex', flexDirection: 'column' },
          inner: { right: 0 },
        }}
      >
        {/* Glassmorphic Header */}
        <Group className={styles.drawerHeader} justify="space-between">
          <Group gap="sm">
            <IconRobot size={20} stroke={1.5} style={{ color: '#10B981' }} />
            <Text className={styles.drawerTitle}>چت مالی</Text>
          </Group>
          <Group gap="sm">
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={() => fileInputRef.current?.click()}
              title="آپلود PDF"
              aria-label="آپلود PDF"
              loading={uploading}
            >
              <IconPaperclip size={16} />
            </ActionIcon>
            <Popover
              opened={docsPopoverOpen}
              onChange={setDocsPopoverOpen}
              width={340}
              position="bottom-end"
            >
              <Popover.Target>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  title="اسناد"
                  aria-label="اسناد"
                  onClick={() => {
                    fetchDocs();
                    setDocsPopoverOpen((v) => !v);
                  }}
                >
                  <IconFiles size={16} />
                </ActionIcon>
              </Popover.Target>
              <Popover.Dropdown>
                <Text size="sm" fw={600} mb="xs" style={{ direction: 'rtl' }}>
                  اسناد
                </Text>
                {ragDocs.length === 0 ? (
                  <Text size="xs" c="dimmed" style={{ direction: 'rtl' }}>
                    سندی یافت نشد.
                  </Text>
                ) : (
                  <Stack gap={4}>
                    {ragDocs.map((doc) => (
                      <Group key={doc.id} justify="space-between" wrap="nowrap">
                        <Box style={{ overflow: 'hidden' }}>
                          <Text size="xs" truncate>
                            {doc.title || `#${doc.id}`}
                          </Text>
                          <Group gap={4} mt={2}>
                            <Badge size="xs" color={STATUS_COLORS[doc.status] || 'gray'}>
                              {doc.status}
                            </Badge>
                            <Badge size="xs" variant="outline">
                              {doc.source}
                            </Badge>
                            {doc.symbol && <Badge size="xs">{doc.symbol}</Badge>}
                          </Group>
                        </Box>
                        {doc.source === 'upload' && (
                          <ActionIcon
                            size="xs"
                            color="red"
                            variant="subtle"
                            onClick={() => deleteDoc(doc.id)}
                          >
                            <IconTrash size={12} />
                          </ActionIcon>
                        )}
                      </Group>
                    ))}
                  </Stack>
                )}
              </Popover.Dropdown>
            </Popover>
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={handleClearChat}
              title="پاک کردن تاریخچه"
              aria-label="پاک کردن تاریخچه"
            >
              <IconTrash size={16} />
            </ActionIcon>
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={() => setOpen(false)}
              aria-label="بستن چت"
            >
              <IconX size={18} />
            </ActionIcon>
          </Group>
        </Group>

        {/* Model selector + symbol filter */}
        <Group
          p="sm"
          gap="xs"
          style={{
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            flexShrink: 0,
          }}
        >
          <Select
            data={modelOptions}
            value={selectedModel}
            onChange={setSelectedModel}
            size="xs"
            style={{ flex: 1 }}
            placeholder="مدل را انتخاب کنید"
            rightSection={modelsLoading ? <Loader size={12} /> : undefined}
            disabled={modelsLoading}
          />
          <TextInput
            size="xs"
            placeholder="نماد..."
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value)}
            style={{ width: 80 }}
          />
        </Group>

        {/* Messages */}
        <ScrollArea
          flex={1}
          viewportRef={viewport}
          p="sm"
          role="log"
          aria-live="polite"
          className={styles.drawerContent}
        >
          {messages.length === 0 && !isStreaming && (
            <Stack align="center" py="xl" gap="md">
              <Box className={styles.emptyStateIcon}>
                <IconRobot size={28} stroke={1.5} style={{ color: '#10B981' }} />
              </Box>
              <Text fw={700} size="md" ta="center" style={{ direction: 'rtl' }}>
                دستیار هوشمند بازار سرمایه
              </Text>
              <Text size="xs" c="dimmed" ta="center" style={{ direction: 'rtl', maxWidth: 280 }}>
                سوالات خود را درباره بورس، تسهیلات و تحلیل تکنیکال بپرسید
              </Text>
              <Stack gap={8} mt="xs" w="100%" px="md">
                {CATEGORIES.map((cat) => (
                  <UnstyledButton
                    key={cat.label}
                    className={`${styles.categoryCard} ${cat.className}`}
                    onClick={() => sendMessage(cat.prompt)}
                  >
                    <Group gap="sm" wrap="nowrap">
                      <cat.icon size={18} style={{ color: cat.color, flexShrink: 0 }} />
                      <Box>
                        <Text size="sm" fw={600} style={{ direction: 'rtl', color: cat.color }}>
                          {cat.label}
                        </Text>
                        <Text size="xs" c="dimmed" style={{ direction: 'rtl' }}>
                          {cat.prompt}
                        </Text>
                      </Box>
                    </Group>
                  </UnstyledButton>
                ))}
              </Stack>
            </Stack>
          )}

          {messages.map((msg, i) => (
            <MessageBubble
              key={`${i}-${msg.timestamp}`}
              msg={msg}
              onRegenerate={
                msg.role === 'assistant' && !msg.error ? () => handleRegenerate(i) : undefined
              }
              onRetry={msg.error ? () => handleRetry(i) : undefined}
            />
          ))}

          {/* Streaming content preview */}
          {isStreaming && streamingContent && (
            <Box
              mb="sm"
              className={styles.messageEnter}
              style={{ display: 'flex', justifyContent: 'flex-start' }}
            >
              <Box style={{ maxWidth: '90%' }}>
                <Box p="sm" className={styles.streamingBubble}>
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
              <ThinkingIndicator
                stage={stage}
                activeTool={activeTools[activeTools.length - 1]}
              />
              <button className={styles.cancelButton} onClick={cancelSSE}>
                انصراف
              </button>
            </Group>
          )}
        </ScrollArea>

        {/* Input */}
        <Group gap="xs" className={styles.inputArea}>
          <Textarea
            ref={textareaRef}
            style={{ flex: 1 }}
            placeholder="درباره سهام، بازار و گزارش‌ها بپرسید..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            autosize
            maxRows={3}
            size="sm"
          />
          <ActionIcon
            onClick={() => sendMessage()}
            disabled={isStreaming || !input.trim()}
            size="lg"
            radius="md"
            aria-label="ارسال پیام"
            style={{
              background: input.trim()
                ? 'linear-gradient(135deg, #10B981, #059669)'
                : undefined,
            }}
          >
            <IconSend size={18} />
          </ActionIcon>
        </Group>
      </Drawer>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />
    </>
  );
}
