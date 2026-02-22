import { useState, useEffect } from 'react';
import { Group, NumberInput, Slider, Text } from '@mantine/core';

const STORAGE_KEY = 'tse-risk-free-rate';
const DEFAULT_RATE = 23;

/**
 * Compact risk-free rate slider + number input.
 * Persists to localStorage. Reusable across all options pages.
 */
export default function RiskFreeRateSlider({ value, onChange }) {
  // Self-managed state when used standalone (no external value/onChange)
  const [internal, setInternal] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored != null ? parseFloat(stored) : DEFAULT_RATE;
    } catch {
      return DEFAULT_RATE;
    }
  });

  const rate = value ?? internal;
  const setRate = onChange || setInternal;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(rate));
    } catch { /* noop */ }
  }, [rate]);

  return (
    <Group gap="xs" wrap="nowrap" style={{ minWidth: 200, maxWidth: 280 }}>
      <Text size="xs" c="dimmed" fw={600} style={{ whiteSpace: 'nowrap' }}>
        نرخ بدون ریسک:
      </Text>
      <NumberInput
        value={rate}
        onChange={(v) => setRate(v ?? DEFAULT_RATE)}
        min={0}
        max={50}
        step={0.5}
        decimalScale={1}
        suffix="%"
        size="xs"
        style={{ width: 72 }}
        styles={{ input: { textAlign: 'center' } }}
      />
      <Slider
        value={rate}
        onChange={setRate}
        min={0}
        max={50}
        step={0.5}
        size="xs"
        color="rally-green"
        style={{ flex: 1, minWidth: 80 }}
        label={(v) => `${v}%`}
      />
    </Group>
  );
}

/**
 * Hook to get risk-free rate from localStorage with change callback.
 */
export function useRiskFreeRate() {
  const [rate, setRate] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored != null ? parseFloat(stored) : DEFAULT_RATE;
    } catch {
      return DEFAULT_RATE;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(rate));
    } catch { /* noop */ }
  }, [rate]);

  return [rate, setRate];
}
