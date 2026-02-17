import { useState, useRef, useEffect } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Collapse,
  Drawer,
  Group,
  Loader,
  Paper,
  Popover,
  ScrollArea,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconChevronDown,
  IconChevronUp,
  IconFileText,
  IconFiles,
  IconMessageChatbot,
  IconPaperclip,
  IconRobot,
  IconSend,
  IconTool,
  IconTrash,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import axios from 'axios';

const EXAMPLES = [
  'قیمت فولاد چقدره؟',
  'شاخص کل بورس چنده؟',
  'قیمت طلا و دلار',
  'سود خالص شرکت فولاد چقدر بود؟',
];

const TOOL_LABELS = {
  search_documents: 'RAG Search',
  get_stock_price: 'Stock Price',
  get_stock_history: 'History',
  get_order_book: 'Order Book',
  get_market_indices: 'Indices',
  get_sector_stocks: 'Sector',
  get_market_prices: 'Market Prices',
  get_etf_nav: 'ETF NAV',
};

const STATUS_COLORS = {
  embedded: 'green',
  failed: 'red',
  downloaded: 'blue',
  extracting: 'orange',
  embedding: 'orange',
  pending: 'yellow',
};

function SourceItem({ src }) {
  return (
    <Box
      p="xs"
      mb={4}
      style={{
        borderRadius: 6,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <Group gap={4} mb={2} wrap="wrap">
        {src.symbol && <Badge size="xs">{src.symbol}</Badge>}
        {src.page_numbers && (
          <Text size="xs" c="dimmed">Page {src.page_numbers}</Text>
        )}
        {src.similarity > 0 && (
          <Badge size="xs" color={src.similarity > 0.7 ? 'green' : 'yellow'}>
            {(src.similarity * 100).toFixed(0)}%
          </Badge>
        )}
        {src.source_url && (
          <Badge
            size="xs"
            color="red"
            component="a"
            href={src.source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ cursor: 'pointer' }}
          >
            PDF
          </Badge>
        )}
      </Group>
      {src.content_preview && (
        <Text size="xs" c="dimmed" style={{ direction: 'auto' }}>
          {src.content_preview}
        </Text>
      )}
    </Box>
  );
}

function MessageBubble({ msg }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const isUser = msg.role === 'user';

  return (
    <Box
      mb="sm"
      style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}
    >
      <Box style={{ maxWidth: '90%' }}>
        <Paper
          p="sm"
          radius="md"
          style={{
            background: isUser
              ? 'var(--mantine-color-blue-6)'
              : 'var(--mantine-color-dark-5)',
          }}
        >
          <Group gap={6} align="flex-start" wrap="nowrap">
            {!isUser && <IconRobot size={15} style={{ flexShrink: 0, marginTop: 2 }} />}
            <Text size="sm" style={{ whiteSpace: 'pre-wrap', direction: 'auto', color: 'inherit' }}>
              {msg.content}
            </Text>
            {isUser && <IconUser size={15} style={{ flexShrink: 0, marginTop: 2 }} />}
          </Group>
        </Paper>

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
      </Box>
    </Box>
  );
}

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
  const fileInputRef = useRef(null);
  const viewport = useRef(null);

  useEffect(() => {
    viewport.current?.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    axios
      .get('/api/chat/models')
      .then((res) => {
        setModels(res.data.models || []);
        setSelectedModel(res.data.default || '');
      })
      .catch(() => {});
  }, []);

  const sendMessage = async (text) => {
    const query = text || input.trim();
    if (!query) return;
    setInput('');
    const newUserMsg = { role: 'user', content: query };
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
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${err.response?.data?.detail || err.message}`,
          sources: [],
          tools_used: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

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
        color: 'green',
        message: res.data.message || 'Document uploaded, processing in background.',
      });
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
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
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
        size={420}
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
          <ActionIcon size="sm" variant="subtle" onClick={() => setMessages([])} title="Clear chat">
            <IconTrash size={16} />
          </ActionIcon>
          <ActionIcon size="sm" variant="subtle" onClick={() => setOpen(false)}>
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
        <ScrollArea flex={1} viewportRef={viewport} p="sm">
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
            <MessageBubble key={i} msg={msg} />
          ))}

          {loading && (
            <Box mb="sm" style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Paper p="sm" radius="md" style={{ background: 'var(--mantine-color-dark-5)' }}>
                <Loader size="xs" />
              </Paper>
            </Box>
          )}
        </ScrollArea>

        {/* Input */}
        <Group
          p="sm"
          gap="xs"
          style={{ borderTop: '1px solid var(--mantine-color-dark-4)', flexShrink: 0 }}
        >
          <Textarea
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
