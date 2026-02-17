import { NumberInput as MantineNumberInput } from '@mantine/core';
import { IconCash } from '@tabler/icons-react';

interface CurrencyInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  error?: boolean;
  min?: number;
  max?: number;
}

export function CurrencyInput({
  label,
  value,
  onChange,
  placeholder = '0',
  helperText,
  required = false,
  error = false,
  min,
  max,
}: CurrencyInputProps) {
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
      thousandSeparator=","
      leftSection={<IconCash size={18} />}
      suffix=" تومان"
      hideControls
    />
  );
}

export default CurrencyInput;
