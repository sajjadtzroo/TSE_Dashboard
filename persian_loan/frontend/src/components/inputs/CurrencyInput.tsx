/**
 * Currency Input Component (MUI-Enhanced)
 * Beautiful input for currency amounts with Persian formatting
 */

import { TextField, InputAdornment } from '@mui/material';
import { Banknote } from 'lucide-react';

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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = Number(e.target.value.replace(/,/g, ''));
    if (!isNaN(numValue)) {
      if ((min === undefined || numValue >= min) && (max === undefined || numValue <= max)) {
        onChange(numValue);
      }
    }
  };

  return (
    <TextField
      label={label}
      value={value.toLocaleString('en-US')}
      onChange={handleChange}
      placeholder={placeholder}
      required={required}
      error={error}
      helperText={helperText}
      fullWidth
      inputMode="numeric"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Banknote className="w-5 h-5 text-gray-400" />
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            <span className="text-sm text-gray-400">تومان</span>
          </InputAdornment>
        ),
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

export default CurrencyInput;
