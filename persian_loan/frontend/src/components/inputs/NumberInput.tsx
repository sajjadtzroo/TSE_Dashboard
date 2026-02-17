/**
 * Number Input Component (MUI-Enhanced)
 * Beautiful input for numeric values
 */

import { TextField, InputAdornment } from '@mui/material';
import { Hash } from 'lucide-react';

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
  icon?: React.ComponentType<{ className?: string }>;
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
  icon: Icon = Hash,
  required = false,
  error = false,
}: NumberInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = Number(e.target.value);
    if (!isNaN(numValue)) {
      if ((min === undefined || numValue >= min) && (max === undefined || numValue <= max)) {
        onChange(numValue);
      }
    }
  };

  return (
    <TextField
      label={label}
      type="number"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      required={required}
      error={error}
      helperText={helperText}
      fullWidth
      inputProps={{
        min,
        max,
        step,
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Icon className="w-5 h-5 text-gray-400" />
          </InputAdornment>
        ),
        endAdornment: suffix ? (
          <InputAdornment position="end">
            <span className="text-sm text-gray-400">{suffix}</span>
          </InputAdornment>
        ) : undefined,
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          backgroundColor: '#121212',
          borderRadius: '0.75rem',
          '& fieldset': {
            borderColor: '#3d3d3d',
            borderWidth: '2px',
          },
          '&:hover fieldset': {
            borderColor: 'rgba(187, 134, 252, 0.5)',
            backgroundColor: '#1a1a1a',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#BB86FC',
          },
          '& input': {
            color: '#e5e5e5',
            fontSize: '1.125rem',
            padding: '0.75rem',
          },
        },
        '& .MuiInputLabel-root': {
          color: '#cccccc',
          fontWeight: 600,
          '&.Mui-focused': {
            color: '#BB86FC',
          },
        },
        '& .MuiFormHelperText-root': {
          color: '#999999',
          marginLeft: '0.25rem',
        },
      }}
    />
  );
}

export default NumberInput;
