import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Drawer,
  Group,
  Popover,
  ScrollArea,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconFiles,
  IconMessageChatbot,
  IconPaperclip,
  IconRobot,
  IconSend,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import axios from 'axios';
import MessageBubble from './MessageBubble';
import ThinkingIndicator from './ThinkingIndicator';

const STATUS_COLORS = {
  embedded: 'green',
  failed: 'red',
  downloaded: 'blue',
  extracting: 'orange',
  embedding: 'orange',
  pending: 'yellow',
};

const EXAMPLES = [
  'قیمت فولاد چقدره؟',
  'شاخص کل بورس چنده؟',
  'قیمت طلا و دلار',
  'سود خالص شرکت فولاد چقدر بود؟',
];

export default function ChatDrawer() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [symbolFilter, setSymbolFilter] = useState('');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [docsPopoverOpen, setDocsPopoverOpen] = useState(false);
  const [ragDocs, setRagDocs] = useState([]);
  const [pollingDocId, setPollingDocId] = useState(null);
  const fileInputRef = useRef(null);
  const viewport = useRef(null);
  const textareaRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 48em)');

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
            title: 'Document Ready',
            message: `"${doc.title}" has been processed and is ready for search.`,
          });
          setPollingDocId(null);
        } else if (doc.status === 'failed') {
          notifications.show({
            color: 'red',
            title: 'Processing Failed',
            message: `"${doc.title}" failed to process. Please try re-uploading.`,
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
  }, [messages, loading]);

  useEffect(() => {
    axios
      .get('/api/chat/models')
      .then((res) => {
        setModels(res.data.models || []);
        setSelectedModel(res.data.default || '');
      })
      .catch(() => {});
  }, []);

  // Auto-focus textarea when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  const sendMessage = useCallback(async (text) => {
    const query = text || input.trim();
    if (!query) return;
    setInput('');
    const newUserMsg = { role: 'user', content: query, timestamp: Date.now() };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setLoading(true);
    try {
      const res = await axios.post('/api/chat', {
        messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        model: selectedModel || undefined,
        symbol: symbolFilter || undefined,
        top_k: 5,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.data.answer,
          sources: res.data.sources || [],
          tools_used: res.data.tools_used || [],
          model: res.data.model,
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: err.response?.data?.detail || err.message,
          sources: [],
          tools_used: [],
          error: true,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, selectedModel, symbolFilter]);

  const handleRegenerate = useCallback((index) => {
    const precedingUserMsg = messages.slice(0, index).reverse().find((m) => m.role === 'user');
    if (!precedingUserMsg) return;
    setMessages((prev) => prev.filter((_, i) => i !== index));
    setTimeout(() => sendMessage(precedingUserMsg.content), 0);
  }, [messages, sendMessage]);

  const handleRetry = useCallback((index) => {
    handleRegenerate(index);
  }, [handleRegenerate]);

  const handleClearChat = useCallback(() => {
    modals.openConfirmModal({
      title: 'Clear chat history',
      children: (
        <Text size="sm">Are you sure you want to clear all messages? This cannot be undone.</Text>
      ),
      labels: { confirm: 'Clear', cancel: 'Cancel' },
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
      notifications.show({ color: 'red', message: 'Only PDF files are accepted.' });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      notifications.show({ color: 'red', message: 'File exceeds 50 MB limit.' });
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
        message: res.data.message || 'Document uploaded, processing in background.',
      });
      if (res.data.document_id) {
        setPollingDocId(res.data.document_id);
      }
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err.response?.data?.detail || 'Upload failed.',
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
      notifications.show({ color: 'green', message: 'Document deleted.' });
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err.response?.data?.detail || 'Delete failed.',
      });
    }
  };

  const modelOptions = models.map((m) => ({
    value: m.id,
    label: `${m.name} (${m.provider})`,
  }));

  return (
    <>
      {/* Floating button */}
      {!open && (
        <ActionIcon
          size="xl"
          radius="xl"
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          style={{
            position: 'fixed',
            bottom: 24,
            left: 24,
            zIndex: 300,
            width: 56,
            height: 56,
          }}
        >
          <IconMessageChatbot size={26} />
        </ActionIcon>
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
        {/* Header */}
        <Group
          p="sm"
          style={{ borderBottom: '1px solid var(--mantine-color-dark-4)', flexShrink: 0 }}
        >
          <IconRobot size={20} stroke={1.5} />
          <Text fw={600} size="sm" style={{ flex: 1 }}>Financial Chat</Text>
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={() => fileInputRef.current?.click()}
                title="Upload PDF"
                aria-label="Upload PDF"
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
                    title="Documents"
                    aria-label="Documents"
                    onClick={() => {
                      fetchDocs();
                      setDocsPopoverOpen((v) => !v);
                    }}
                  >
                    <IconFiles size={16} />
                  </ActionIcon>
                </Popover.Target>
                <Popover.Dropdown>
                  <Text size="sm" fw={600} mb="xs">RAG Documents</Text>
                  {ragDocs.length === 0 ? (
                    <Text size="xs" c="dimmed">No documents found.</Text>
                  ) : (
                    <Stack gap={4}>
                      {ragDocs.map((doc) => (
                        <Group key={doc.id} justify="space-between" wrap="nowrap">
                          <Box style={{ overflow: 'hidden' }}>
                            <Text size="xs" truncate>{doc.title || `#${doc.id}`}</Text>
                            <Group gap={4} mt={2}>
                              <Badge size="xs" color={STATUS_COLORS[doc.status] || 'gray'}>
                                {doc.status}
                              </Badge>
                              <Badge size="xs" variant="outline">{doc.source}</Badge>
                              {doc.symbol && <Badge size="xs">{doc.symbol}</Badge>}
                            </Group>
                          </Box>
                          {doc.source === 'upload' && (
                            <ActionIcon size="xs" color="red" variant="subtle" onClick={() => deleteDoc(doc.id)}>
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
                title="Clear chat"
                aria-label="Clear chat"
              >
                <IconTrash size={16} />
              </ActionIcon>
          <ActionIcon size="sm" variant="subtle" onClick={() => setOpen(false)} aria-label="Close chat">
            <IconX size={18} />
          </ActionIcon>
        </Group>

            {/* Model selector + symbol filter */}
            <Group
              p="sm"
              gap="xs"
              style={{ borderBottom: '1px solid var(--mantine-color-dark-4)', flexShrink: 0 }}
            >
              <Select
                data={modelOptions}
                value={selectedModel}
                onChange={setSelectedModel}
                size="xs"
                style={{ flex: 1 }}
                placeholder="Select model..."
              />
              <TextInput
                size="xs"
                placeholder="Symbol..."
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
            >
              {messages.length === 0 && (
                <Stack align="center" py="xl" gap="xs">
                  <IconRobot size={40} stroke={1} style={{ opacity: 0.3 }} />
                  <Text size="sm" c="dimmed" ta="center">Ask about stocks, markets & reports</Text>
                  <Text size="xs" c="dimmed" ta="center">Persian or English — with live DB access</Text>
                  <Group gap={6} justify="center" mt="xs" wrap="wrap">
                    {EXAMPLES.map((ex) => (
                      <Badge
                        key={ex}
                        size="sm"
                        variant="light"
                        style={{ cursor: 'pointer' }}
                        onClick={() => sendMessage(ex)}
                      >
                        {ex}
                      </Badge>
                    ))}
                  </Group>
                </Stack>
              )}

              {messages.map((msg, i) => (
                <MessageBubble
                  key={`${i}-${msg.timestamp}`}
                  msg={msg}
                  onRegenerate={msg.role === 'assistant' && !msg.error ? () => handleRegenerate(i) : undefined}
                  onRetry={msg.error ? () => handleRetry(i) : undefined}
                />
              ))}

              {loading && <ThinkingIndicator />}
            </ScrollArea>

            {/* Input */}
            <Group
              p="sm"
              gap="xs"
              style={{ borderTop: '1px solid var(--mantine-color-dark-4)', flexShrink: 0 }}
            >
              <Textarea
                ref={textareaRef}
                style={{ flex: 1 }}
                placeholder="Ask about stocks, markets, reports..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                autosize
                maxRows={3}
                size="sm"
              />
              <ActionIcon
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                size="lg"
                radius="md"
                aria-label="Send message"
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
