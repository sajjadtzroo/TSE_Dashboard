import { useCallback, useRef, useState } from 'react';

/**
 * Captures microphone audio as 24kHz 16-bit PCM, emitting base64 chunks.
 *
 * @param {object} opts
 * @param {Function} opts.onAudioChunk - Called with base64 PCM string every ~100ms
 * @returns {{ start, stop, isMuted, toggleMute, analyserNode, isCapturing }}
 */
export default function useAudioCapture({ onAudioChunk }) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const streamRef = useRef(null);
  const contextRef = useRef(null);
  const processorRef = useRef(null);
  const analyserRef = useRef(null);
  const mutedRef = useRef(false);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 24000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    const ctx = new AudioContext({ sampleRate: 24000 });
    const source = ctx.createMediaStreamSource(stream);

    // Analyser for visualizer
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    // ScriptProcessor for PCM capture (4096 samples per buffer)
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (e) => {
      if (mutedRef.current) return;
      const float32 = e.inputBuffer.getChannelData(0);
      // Float32 → Int16
      const int16 = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      // Int16 → base64
      const bytes = new Uint8Array(int16.buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      onAudioChunk(btoa(binary));
    };

    source.connect(processor);
    processor.connect(ctx.destination);

    streamRef.current = stream;
    contextRef.current = ctx;
    processorRef.current = processor;
    analyserRef.current = analyser;
    setIsCapturing(true);
  }, [onAudioChunk]);

  const stop = useCallback(() => {
    processorRef.current?.disconnect();
    contextRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    contextRef.current = null;
    processorRef.current = null;
    analyserRef.current = null;
    setIsCapturing(false);
    setIsMuted(false);
    mutedRef.current = false;
  }, []);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    setIsMuted(mutedRef.current);
  }, []);

  return {
    start,
    stop,
    isMuted,
    toggleMute,
    analyserNode: analyserRef.current,
    isCapturing,
  };
}
