import { type ReactNode } from 'react';
import { NumberInput as MantineNumberInput } from '@mantine/core';
import { IconHash } from '@tabler/icons-react';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  helperText?: string;
  suffix?: string;
  icon?: ReactNode;
  required?: boolean;
  error?: boolean;
}

export function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder = '0',
  helperText,
  suffix,
  icon,
  required = false,
  error = false,
}: NumberInputProps) {
  return (
    <MantineNumberInput
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
      leftSection={icon || <IconHash size={18} />}
      suffix={suffix ? ` ${suffix}` : undefined}
    />
  );
}

export default NumberInput;
