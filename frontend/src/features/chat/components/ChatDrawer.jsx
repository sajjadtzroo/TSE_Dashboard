import { useState, useRef, useEffect, useCallback } from 'react';
import { Drawer, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconMessageChatbot } from '@tabler/icons-react';
import axios from 'axios';
import useSSEChat from '../../../hooks/useSSEChat';
import useChatSessions from '../../../hooks/useChatSessions';
import usePageContext from '../../../hooks/usePageContext';
import { useAuth } from '../../../context/AuthContext';
import ChatHeader from './ChatHeader';
import ChatModelBar from './ChatModelBar';
import ChatMessageList from './ChatMessageList';
import ChatInput from './ChatInput';
import styles from './ChatDrawer.module.css';

export default function ChatDrawer({ open = false, onClose, onToggle }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [symbolFilter, setSymbolFilter] = useState('');
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [ragDocs, setRagDocs] = useState([]);
  const [pollingDocId, setPollingDocId] = useState(null);
  const textareaRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 48em)');

  const { section, symbol: contextSymbol } = usePageContext();
  const { isAuthenticated } = useAuth();
  const notifiedRef = useRef(false);

  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    fetchSessions,
    createSession,
    loadSession,
    deleteSession,
    saveMessages,
  } = useChatSessions();

  const pendingUserMsgRef = useRef(null);

  const {
    sendMessage: sendSSE,
    cancel: cancelSSE,
    isStreaming,
    streamingContent,
    stage,
    activeTools,
  } = useSSEChat({
    onComplete: async (result) => {
      const assistantMsg = {
        role: 'assistant',
        content: result.answer,
        sources: result.sources || [],
        tools_used: result.tools_used || [],
        model: result.model,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      const userMsg = pendingUserMsgRef.current;
      pendingUserMsgRef.current = null;
      if (activeSessionId && userMsg) {
        saveMessages(activeSessionId, [
          { role: 'user', content: userMsg.content },
          {
            role: 'assistant',
            content: result.answer,
            sources: result.sources || [],
            tools_used: result.tools_used || [],
            model: result.model,
          },
        ]);
      }
    },
    onError: (errMsg) => {
      pendingUserMsgRef.current = null;
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

  // Poll uploaded document status
  useEffect(() => {
    if (!pollingDocId) return;
    const interval = setInterval(async () => {
      try {
        const res = await axios.get('/api/rag/documents', { params: { limit: 50 } });
        const doc = (res.data || []).find((d) => d.id === pollingDocId);
        if (!doc) return;
        if (doc.status === 'embedded') {
          notifications.show({ color: 'green', title: 'سند آماده شد', message: `"${doc.title}" پردازش شد و آماده جستجو است.` });
          setPollingDocId(null);
        } else if (doc.status === 'failed') {
          notifications.show({ color: 'red', title: 'خطا در پردازش', message: `"${doc.title}" پردازش نشد. دوباره تلاش کنید.` });
          setPollingDocId(null);
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [pollingDocId]);

  // Fetch models on mount
  useEffect(() => {
    setModelsLoading(true);
    axios
      .get('/api/chat/models')
      .then((res) => { setModels(res.data.models || []); setSelectedModel(res.data.default || ''); })
      .catch(() => {})
      .finally(() => setModelsLoading(false));
  }, []);

  // Reload sessions when user logs in while drawer is already mounted
  useEffect(() => {
    if (isAuthenticated) fetchSessions();
  }, [isAuthenticated, fetchSessions]);

  // Auto-focus + load session + context auto-fill when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 100);
      if (!activeSessionId && sessions.length > 0) {
        handleLoadSession(sessions[0].id);
      }
      // Auto-fill symbol from page context
      if (contextSymbol && !symbolFilter) {
        setSymbolFilter(contextSymbol);
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadSession = useCallback(
    async (sessionId) => {
      const detail = await loadSession(sessionId);
      if (detail?.messages) {
        setMessages(
          detail.messages.map((m) => ({
            role: m.role,
            content: m.content || '',
            sources: m.sources || [],
            tools_used: m.tools_used || [],
            model: m.model,
            feedback: m.feedback,
            timestamp: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
          })),
        );
      } else {
        setMessages([]);
      }
    },
    [loadSession],
  );

  const handleNewChat = useCallback(async () => {
    if (isAuthenticated) {
      const session = await createSession({
        model: selectedModel || undefined,
        symbol: symbolFilter || undefined,
      });
      if (session) setMessages([]);
    } else {
      setMessages([]);
    }
  }, [isAuthenticated, createSession, selectedModel, symbolFilter]);

  const handleDeleteSession = useCallback(
    async (sessionId) => {
      const ok = await deleteSession(sessionId);
      if (ok && sessionId === activeSessionId) setMessages([]);
    },
    [deleteSession, activeSessionId],
  );

  const sendMessage = useCallback(
    async (text) => {
      const query = text || input.trim();
      if (!query || isStreaming) return;
      setInput('');
      const newUserMsg = { role: 'user', content: query, timestamp: Date.now() };
      const updatedMessages = [...messages, newUserMsg];
      setMessages(updatedMessages);
      pendingUserMsgRef.current = newUserMsg;

      let sessionId = activeSessionId;
      if (!sessionId && isAuthenticated) {
        const session = await createSession({
          title: query.slice(0, 60),
          model: selectedModel || undefined,
          symbol: symbolFilter || undefined,
        });
        sessionId = session?.id || null;
      } else if (!isAuthenticated && !notifiedRef.current) {
        notifiedRef.current = true;
        notifications.show({
          color: 'blue',
          title: 'مکالمه ذخیره نمی‌شود',
          message: 'برای ذخیره تاریخچه گفتگو وارد شوید.',
          autoClose: 4000,
        });
      }

      sendSSE({
        messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        model: selectedModel || undefined,
        symbol: symbolFilter || undefined,
        top_k: 5,
      });
    },
    [input, messages, selectedModel, symbolFilter, isStreaming, sendSSE, activeSessionId, createSession, isAuthenticated],
  );

  const handleRegenerate = useCallback(
    (index) => {
      const precedingUserMsg = messages.slice(0, index).reverse().find((m) => m.role === 'user');
      if (!precedingUserMsg) return;
      setMessages((prev) => prev.filter((_, i) => i !== index));
      setTimeout(() => sendMessage(precedingUserMsg.content), 0);
    },
    [messages, sendMessage],
  );

  const handleRetry = useCallback((index) => handleRegenerate(index), [handleRegenerate]);

  const handleFeedback = useCallback((msgIndex, vote) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === msgIndex ? { ...m, feedback: m.feedback === vote ? null : vote } : m)),
    );
  }, []);

  const handleClearChat = useCallback(() => {
    modals.openConfirmModal({
      title: 'پاک کردن تاریخچه',
      children: <Text size="sm" style={{ direction: 'rtl' }}>آیا مطمئن هستید؟ تمام پیام‌ها حذف خواهند شد.</Text>,
      labels: { confirm: 'پاک کن', cancel: 'انصراف' },
      confirmProps: { color: 'red' },
      onConfirm: () => { setMessages([]); setActiveSessionId(null); },
    });
  }, [setActiveSessionId]);

  const handleFileUpload = useCallback(
    async (file, category) => {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('title', file.name.replace(/\.pdf$/i, ''));
        if (symbolFilter) fd.append('symbol', symbolFilter);
        fd.append('doc_category', category);
        const res = await axios.post('/api/rag/upload', fd);
        notifications.show({ color: 'blue', message: res.data.message || 'سند آپلود شد و در حال پردازش است.' });
        if (res.data.document_id) setPollingDocId(res.data.document_id);
      } catch (err) {
        notifications.show({ color: 'red', message: err.response?.data?.detail || 'آپلود ناموفق بود.' });
      } finally {
        setUploading(false);
      }
    },
    [symbolFilter],
  );

  const fetchDocs = useCallback(
    async (category) => {
      try {
        const params = { limit: 20 };
        if (category) params.doc_category = category;
        const res = await axios.get('/api/rag/documents', { params });
        setRagDocs(res.data);
      } catch { setRagDocs([]); }
    },
    [],
  );

  const deleteDoc = useCallback(async (docId) => {
    try {
      await axios.delete(`/api/rag/documents/${docId}`);
      setRagDocs((prev) => prev.filter((d) => d.id !== docId));
      notifications.show({ color: 'green', message: 'سند حذف شد.' });
    } catch (err) {
      notifications.show({ color: 'red', message: err.response?.data?.detail || 'حذف ناموفق بود.' });
    }
  }, []);

  const handleExport = useCallback(() => {
    if (messages.length === 0) return;
    const lines = messages.map((m) => {
      const role = m.role === 'user' ? '**کاربر**' : '**دستیار**';
      const model = m.model ? ` _(${m.model})_` : '';
      return `${role}${model}\n\n${m.content}\n`;
    });
    const md = lines.join('\n---\n\n');
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages]);

  return (
    <>
      {!open && (
        <button className={styles.floatingButton} onClick={onToggle} aria-label="باز کردن چت">
          <IconMessageChatbot size={26} />
        </button>
      )}

      <Drawer
        opened={open}
        onClose={onClose}
        position="right"
        size={isMobile ? '100%' : 420}
        withCloseButton={false}
        styles={{
          body: { padding: 0, height: '100%', display: 'flex', flexDirection: 'column' },
          inner: { right: 0 },
        }}
      >
        <ChatHeader
          sessions={sessions}
          activeSessionId={activeSessionId}
          ragDocs={ragDocs}
          uploading={uploading}
          symbolFilter={symbolFilter}
          onNewChat={handleNewChat}
          onLoadSession={handleLoadSession}
          onDeleteSession={handleDeleteSession}
          onFetchSessions={fetchSessions}
          onFetchDocs={fetchDocs}
          onDeleteDoc={deleteDoc}
          onClearChat={handleClearChat}
          onExport={messages.length > 0 ? handleExport : undefined}
          onClose={onClose}
          onFileUpload={handleFileUpload}
        />

        <ChatModelBar
          models={models}
          modelsLoading={modelsLoading}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          symbolFilter={symbolFilter}
          onSymbolChange={setSymbolFilter}
        />

        <ChatMessageList
          messages={messages}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          stage={stage}
          activeTools={activeTools}
          cancelSSE={cancelSSE}
          onRegenerate={handleRegenerate}
          onRetry={handleRetry}
          onFeedback={handleFeedback}
          onSendPrompt={sendMessage}
          section={section}
          contextSymbol={contextSymbol}
        />

        <ChatInput
          ref={textareaRef}
          input={input}
          onInputChange={setInput}
          onSend={() => sendMessage()}
          isStreaming={isStreaming}
        />
      </Drawer>
    </>
  );
}
