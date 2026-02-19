import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import useAudioCapture from './useAudioCapture';
import useAudioPlayback from './useAudioPlayback';

/**
 * Core voice call hook. Manages WebSocket, audio capture/playback, and call state.
 *
 * States: idle → connecting → active → ended | error
 */
export default function useVoiceCall() {
  const { accessToken } = useAuth();
  const [callState, setCallState] = useState('idle'); // idle | connecting | active | ended | error
  const [activeModel, setActiveModel] = useState(null);
  const [transcripts, setTranscripts] = useState([]);
  const [activeToolCalls, setActiveToolCalls] = useState([]);
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const wsRef = useRef(null);
  const durationTimerRef = useRef(null);

  const playback = useAudioPlayback();

  const onAudioChunk = useCallback((b64) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'audio', data: b64 }));
    }
  }, []);

  const capture = useAudioCapture({ onAudioChunk });

  // Duration counter
  useEffect(() => {
    if (callState === 'active') {
      durationTimerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } else {
      clearInterval(durationTimerRef.current);
    }
    return () => clearInterval(durationTimerRef.current);
  }, [callState]);

  const startCall = useCallback(
    async (modelId, voice) => {
      if (!accessToken) {
        setErrorMessage('Authentication required');
        setCallState('error');
        return;
      }

      setCallState('connecting');
      setTranscripts([]);
      setActiveToolCalls([]);
      setDuration(0);
      setErrorMessage('');
      setActiveModel(modelId);

      try {
        // Start audio capture first (triggers mic permission)
        await capture.start();

        // Connect WebSocket
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const params = new URLSearchParams({
          token: accessToken,
          model: modelId,
          voice: voice || '',
        });
        const ws = new WebSocket(`${protocol}//${host}/ws/voice?${params}`);
        wsRef.current = ws;

        ws.onopen = () => {
          // Wait for 'connected' status from server
        };

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'audio':
              playback.enqueue(msg.data);
              break;

            case 'transcript':
              setTranscripts((prev) => {
                // For incremental transcripts, update the last one
                if (!msg.final && prev.length > 0 && prev[prev.length - 1].role === msg.role && !prev[prev.length - 1].final) {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...msg };
                  return updated;
                }
                return [...prev, { role: msg.role, text: msg.text, final: msg.final }];
              });
              break;

            case 'tool_call':
              setActiveToolCalls((prev) => [...prev, { name: msg.name, status: 'running' }]);
              break;

            case 'tool_result':
              setActiveToolCalls((prev) =>
                prev.map((tc) => (tc.name === msg.name && tc.status === 'running' ? { ...tc, status: 'done' } : tc)),
              );
              break;

            case 'status':
              if (msg.status === 'connected') {
                setCallState('active');
              } else if (msg.status === 'ended') {
                setCallState('ended');
                capture.stop();
                playback.stop();
              }
              break;

            case 'error':
              setErrorMessage(msg.message || 'Unknown error');
              setCallState('error');
              capture.stop();
              playback.stop();
              break;
          }
        };

        ws.onclose = () => {
          if (callState !== 'ended' && callState !== 'error') {
            setCallState('ended');
          }
          capture.stop();
          playback.stop();
        };

        ws.onerror = () => {
          setErrorMessage('Connection failed');
          setCallState('error');
          capture.stop();
          playback.stop();
        };
      } catch (err) {
        setErrorMessage(err.message || 'Failed to start call');
        setCallState('error');
        capture.stop();
      }
    },
    [accessToken, capture, playback, callState],
  );

  const endCall = useCallback(() => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'control', action: 'end' }));
      ws.close();
    }
    capture.stop();
    playback.stop();
    setCallState('ended');
    wsRef.current = null;
  }, [capture, playback]);

  const resetCall = useCallback(() => {
    setCallState('idle');
    setActiveModel(null);
    setTranscripts([]);
    setActiveToolCalls([]);
    setDuration(0);
    setErrorMessage('');
  }, []);

  return {
    callState,
    activeModel,
    transcripts,
    activeToolCalls,
    duration,
    errorMessage,
    isMuted: capture.isMuted,
    startCall,
    endCall,
    resetCall,
    toggleMute: capture.toggleMute,
    inputAnalyser: capture.analyserNode,
    outputAnalyser: playback.analyserNode,
  };
}
