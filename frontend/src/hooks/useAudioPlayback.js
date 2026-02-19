import { useCallback, useRef } from 'react';

/**
 * Plays back base64-encoded 24kHz 16-bit PCM audio chunks with gapless scheduling.
 *
 * @returns {{ enqueue, stop, analyserNode }}
 */
export default function useAudioPlayback() {
  const contextRef = useRef(null);
  const analyserRef = useRef(null);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef([]);

  const getContext = useCallback(() => {
    if (!contextRef.current || contextRef.current.state === 'closed') {
      const ctx = new AudioContext({ sampleRate: 24000 });
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.connect(ctx.destination);
      contextRef.current = ctx;
      analyserRef.current = analyser;
      nextStartTimeRef.current = 0;
    }
    return { ctx: contextRef.current, analyser: analyserRef.current };
  }, []);

  const enqueue = useCallback(
    (base64Pcm) => {
      const { ctx, analyser } = getContext();

      // Resume if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') ctx.resume();

      // base64 → Int16 → Float32
      const binary = atob(base64Pcm);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
      }

      // Create audio buffer
      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(analyser);

      // Schedule gapless playback
      const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + buffer.duration;

      // Track active sources for cleanup
      activeSourcesRef.current.push(source);
      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
      };
    },
    [getContext],
  );

  const stop = useCallback(() => {
    activeSourcesRef.current.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    });
    activeSourcesRef.current = [];
    nextStartTimeRef.current = 0;

    if (contextRef.current && contextRef.current.state !== 'closed') {
      contextRef.current.close();
    }
    contextRef.current = null;
    analyserRef.current = null;
  }, []);

  return {
    enqueue,
    stop,
    analyserNode: analyserRef.current,
  };
}
