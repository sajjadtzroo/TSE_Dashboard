import { useEffect, useRef } from 'react';
import { Box } from '@mantine/core';

/**
 * Renders an audio waveform bar visualization from an AnalyserNode.
 * Shows a mini bar-graph that pulses with audio levels.
 */
export default function AudioVisualizer({ analyserNode, color = '#10B981', width = 48, height = 24, barCount = 5 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode) return;

    const ctx = canvas.getContext('2d');
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      analyserNode.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, width, height);

      const barWidth = (width / barCount) * 0.6;
      const gap = (width / barCount) * 0.4;
      const step = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step] / 255;
        const barHeight = Math.max(3, value * height);
        const x = i * (barWidth + gap) + gap / 2;
        const y = (height - barHeight) / 2;

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5 + value * 0.5;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [analyserNode, color, width, height, barCount]);

  if (!analyserNode) {
    // Static placeholder bars
    return (
      <Box
        w={width}
        h={height}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
        }}
      >
        {Array.from({ length: barCount }).map((_, i) => (
          <Box
            key={i}
            style={{
              width: 4,
              height: 6 + (i % 3) * 4,
              borderRadius: 2,
              background: color,
              opacity: 0.3,
            }}
          />
        ))}
      </Box>
    );
  }

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
}
