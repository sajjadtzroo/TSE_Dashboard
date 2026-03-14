import { useState, useEffect, useRef, useCallback } from 'react';
import { DERIBIT_WS_URL } from '../services/deribit';

let _reqId = 1;

/**
 * Opens a single Deribit WebSocket and subscribes to the given channels.
 * Returns live ticker data keyed by channel name.
 *
 * @param {string[]} channels  Stable array ref of channel names to subscribe to
 * @returns {{ messages: Record<string,any>, status: 'connecting'|'connected'|'reconnecting' }}
 */
export default function useDeribitLive(channels) {
  const [messages, setMessages] = useState({});
  const [status, setStatus] = useState('connecting');
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  // Keep a ref so the connect callback always sees the latest channels
  const channelsRef = useRef(channels);

  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  const connect = useCallback(() => {
    // Close any existing socket without triggering reconnect
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
    }
    clearTimeout(reconnectTimer.current);
    setStatus('connecting');

    const ws = new WebSocket(DERIBIT_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: _reqId++,
        method: 'public/subscribe',
        params: { channels: channelsRef.current },
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.method === 'subscription' && msg.params?.channel) {
          const { channel, data } = msg.params;
          setMessages(prev => ({ ...prev, [channel]: data }));
        }
      } catch (_) {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      setStatus('reconnecting');
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      // Let onclose handle reconnect
      ws.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { messages, status };
}
