import { useCallback, useEffect, useState } from 'react';
import api from '../services/apiClient';

/**
 * Hook for managing persistent chat sessions.
 * Provides CRUD operations against /chat/sessions.
 */
export default function useChatSessions() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch all sessions for the current user
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/chat/sessions', { params: { limit: 50 } });
      setSessions(res.data || []);
    } catch {
      // silently ignore — user may not be authenticated
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Create a new session, returns the created session object
  const createSession = useCallback(async ({ title, model, symbol } = {}) => {
    try {
      const res = await api.post('/chat/sessions', {
        title: title || 'New Chat',
        model: model || null,
        symbol: symbol || null,
      });
      const session = res.data;
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      return session;
    } catch {
      return null;
    }
  }, []);

  // Load a session with its messages
  const loadSession = useCallback(async (sessionId) => {
    try {
      const res = await api.get(`/chat/sessions/${sessionId}`);
      setActiveSessionId(sessionId);
      return res.data; // ChatSessionDetail with messages[]
    } catch {
      return null;
    }
  }, []);

  // Delete a session
  const deleteSession = useCallback(async (sessionId) => {
    try {
      await api.delete(`/chat/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
      return true;
    } catch {
      return false;
    }
  }, [activeSessionId]);

  // Save messages (user + assistant pair) to the active session
  const saveMessages = useCallback(async (sessionId, messagePairs) => {
    if (!sessionId || !messagePairs?.length) return false;
    try {
      await api.post(`/chat/sessions/${sessionId}/messages`, messagePairs);
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    sessions,
    activeSessionId,
    setActiveSessionId,
    loading,
    fetchSessions,
    createSession,
    loadSession,
    deleteSession,
    saveMessages,
  };
}
