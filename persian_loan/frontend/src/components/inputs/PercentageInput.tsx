import { NumberInput } from '@mantine/core';
import { IconPercentage } from '@tabler/icons-react';

interface PercentageInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  error?: boolean;
}

export function PercentageInput({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 0.1,
  placeholder = '0',
  helperText,
  required = false,
  error = false,
}: PercentageInputProps) {
  return (
    <NumberInput
      label={label}
      value={value}
      onChange={(val) => onChange(Number(val) || 0)}
      placeholder={placeholder}
      required={required}
      error={error ? helperText || true : undefined}
      description={!error ? helperText : undefined}
      min={min}
      max={max}
      step={step}
      leftSection={<IconPercentage size={18} />}
      suffix=" ٪"
      decimalScale={2}
    />
  );
}

export default PercentageInput;
