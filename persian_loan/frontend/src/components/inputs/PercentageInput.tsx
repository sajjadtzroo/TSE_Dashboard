/**
 * Percentage Input Component (MUI-Enhanced)
 * Beautiful input for percentage values
 */

import { TextField, InputAdornment } from '@mui/material';
import { Percent } from 'lucide-react';

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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = Number(e.target.value);
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      onChange(numValue);
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
            <Percent className="w-5 h-5 text-gray-400" />
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            <span className="text-sm text-gray-400">٪</span>
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

export default PercentageInput;
