/**
 * WebSocket hook for live crypto data with automatic reconnection.
 * Crypto markets are 24/7 so there is no trading-hours gate.
 * Follows the same auto-reconnect + exponential backoff + ping/pong
 * keep-alive pattern as useWebSocket.js.
 *
 * Usage:
 *   const { data, isConnected, error } = useCryptoWebSocket();
 */
import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/crypto`;

const RECONNECT_BASE_DELAY = 1000; // 1s initial
const RECONNECT_MAX_DELAY = 30000; // 30s max
const PING_INTERVAL = 30000; // 30s keep-alive

export function useCryptoWebSocket({ onMessage, enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef(null);
  const pingTimer = useRef(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttempt.current = 0;

        // Start ping keep-alive
        pingTimer.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, PING_INTERVAL);
      };

      ws.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const parsed = JSON.parse(event.data);
          setData(parsed);
          if (onMessage) onMessage(parsed);
        } catch {
          // Not JSON, ignore
        }
      };

      ws.onerror = () => {
        setError('WebSocket connection error');
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (pingTimer.current) clearInterval(pingTimer.current);

        // Reconnect with exponential backoff (24/7, no trading hours check)
        if (enabled) {
          const delay = Math.min(
            RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempt.current),
            RECONNECT_MAX_DELAY
          );
          reconnectAttempt.current += 1;
          reconnectTimer.current = setTimeout(connect, delay);
        }
      };
    } catch (e) {
      setError(`WebSocket failed: ${e.message}`);
    }
  }, [enabled, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    if (pingTimer.current) clearInterval(pingTimer.current);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { data, isConnected, error, disconnect };
}
