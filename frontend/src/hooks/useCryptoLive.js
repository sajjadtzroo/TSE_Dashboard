/**
 * WebSocket hook for live crypto ticker + candle data.
 *
 * Connects to /ws/crypto (public, no auth) and receives updates every ~5s:
 * {
 *   event: "crypto_ticker",
 *   tickers: {
 *     "BTC": { price: 68500, volume: 0.5, candle: { t, o, h, l, c, v } },
 *     ...
 *   }
 * }
 *
 * Returns:
 * - tickers: latest price/candle per symbol
 * - status: 'connecting' | 'connected' | 'reconnecting'
 * - getLiveCandle(symbol): get current live candle for a symbol
 */
import { useState, useEffect, useRef, useCallback } from 'react';

const WS_PATH = '/ws/crypto';

export default function useCryptoLive() {
  const [tickers, setTickers] = useState({});
  const [status, setStatus] = useState('connecting');
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
    }
    clearTimeout(reconnectTimer.current);
    setStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}${WS_PATH}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.event === 'crypto_ticker' && msg.tickers) {
          setTickers(msg.tickers);
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
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    // Keepalive ping every 30s
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping');
      }
    }, 30_000);

    return () => {
      clearInterval(pingInterval);
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  const getLiveCandle = useCallback(
    (symbol) => tickers[symbol]?.candle ?? null,
    [tickers],
  );

  const getLivePrice = useCallback(
    (symbol) => tickers[symbol]?.price ?? null,
    [tickers],
  );

  return { tickers, status, getLiveCandle, getLivePrice };
}
