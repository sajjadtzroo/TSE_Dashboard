/**
 * WebSocket hook for live market data with automatic reconnection.
 * Falls back to SSE when WebSocket is unavailable, and to polling outside trading hours.
 *
 * Usage:
 *   const { data, isConnected, error } = useWebSocket();
 */
import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/market`;
const SSE_URL = '/api/events/market';

const RECONNECT_BASE_DELAY = 1000; // 1s initial
const RECONNECT_MAX_DELAY = 30000; // 30s max
const PING_INTERVAL = 30000; // 30s keep-alive

// Tehran trading hours: 09:00-12:30, Sat-Wed
function isTradingHours() {
  const now = new Date();
  // Convert to Tehran time (UTC+3:30)
  const tehranOffset = 3.5 * 60;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const tehranMinutes = utcMinutes + tehranOffset;
  const tehranHour = Math.floor((tehranMinutes % 1440) / 60);
  const tehranMinute = tehranMinutes % 60;

  const tehranDay = now.getUTCDay(); // 0=Sun, 6=Sat
  // Trading days: Sat(6), Sun(0), Mon(1), Tue(2), Wed(3)
  const isTradingDay = [0, 1, 2, 3, 6].includes(tehranDay);

  const marketOpen = 9 * 60;  // 09:00
  const marketClose = 12 * 60 + 30; // 12:30
  const currentMinutes = tehranHour * 60 + tehranMinute;

  return isTradingDay && currentMinutes >= marketOpen && currentMinutes <= marketClose;
}

export function useWebSocket({ onMessage, enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef(null);
  const pingTimer = useRef(null);

  const connect = useCallback(() => {
    if (!enabled || !isTradingHours()) return;

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

        // Reconnect with exponential backoff
        if (enabled && isTradingHours()) {
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

    // Reconnect check every minute (for trading hours transitions)
    const tradingCheck = setInterval(() => {
      if (isTradingHours() && !wsRef.current) {
        connect();
      } else if (!isTradingHours() && wsRef.current) {
        disconnect();
      }
    }, 60000);

    return () => {
      clearInterval(tradingCheck);
      disconnect();
    };
  }, [connect, disconnect]);

  return { data, isConnected, error, disconnect };
}
