import { useCallback, useRef, useState } from 'react';

/**
 * SSE-based chat hook using fetch + ReadableStream.
 * Parses server-sent events from POST /api/chat/stream.
 *
 * Exports: { sendMessage, cancel, isStreaming, streamingContent, stage, activeTools }
 */
export default function useSSEChat({ onComplete, onError }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [stage, setStage] = useState(null);
  const [activeTools, setActiveTools] = useState([]);
  const abortRef = useRef(null);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
    setStage(null);
    setActiveTools([]);
    setStreamingContent('');
  }, []);

  const sendMessage = useCallback(async ({ messages, model, symbol, top_k }) => {
    cancel();
    setIsStreaming(true);
    setStreamingContent('');
    setStage('routing');
    setActiveTools([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, model, symbol, top_k }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        throw new Error(errText || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = null;
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6));
              handleEvent(currentEvent, data);
            } catch {
              // skip malformed JSON
            }
            currentEvent = null;
          } else if (line === '') {
            currentEvent = null;
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        onError?.(err.message || 'Stream failed');
      }
    } finally {
      setIsStreaming(false);
      setStage(null);
      setActiveTools([]);
      abortRef.current = null;
    }

    function handleEvent(event, data) {
      switch (event) {
        case 'status':
          setStage(data.stage);
          if (data.stage === 'tool_call' && data.tool) {
            setActiveTools((prev) => [...prev, data.tool]);
          }
          break;
        case 'token':
          setStreamingContent(data.content || '');
          setStage('done');
          break;
        case 'done':
          onComplete?.({
            answer: streamingContentRef.current,
            sources: data.sources || [],
            tools_used: data.tools_used || [],
            model: data.model || '',
          });
          setStreamingContent('');
          break;
        case 'error':
          onError?.(data.message || 'Stream error');
          break;
      }
    }
  }, [cancel, onComplete, onError]);

  // Ref to access latest streamingContent inside handleEvent closure
  const streamingContentRef = useRef('');
  streamingContentRef.current = streamingContent;

  return { sendMessage, cancel, isStreaming, streamingContent, stage, activeTools };
}
