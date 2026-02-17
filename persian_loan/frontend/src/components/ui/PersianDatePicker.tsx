/**
 * PersianDatePicker Component
 *
 * A customized MUI DatePicker with Persian (Jalali) calendar support.
 * Includes RTL support, Persian month names, and proper localization.
 */

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFnsJalali } from '@mui/x-date-pickers/AdapterDateFnsJalali';
import { TextFieldProps } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { faIR } from '@mui/material/locale';

interface PersianDatePickerProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

// Persian month names and day names are handled by date-fns-jalali adapter
// No need to define them manually here

// Create a dark theme for the date picker
const darkTheme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'dark',
    primary: {
      main: '#3b82f6', // Primary blue
      light: '#60a5fa',
      dark: '#2563eb',
    },
    background: {
      paper: '#1e293b', // surface-100
      default: '#0f172a', // surface-base
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8',
    },
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#1e293b',
            borderRadius: '0.5rem',
            '& fieldset': {
              borderColor: '#334155',
            },
            '&:hover fieldset': {
              borderColor: '#475569',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#3b82f6',
              borderWidth: '2px',
            },
            '&.Mui-error fieldset': {
              borderColor: '#ef4444',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#94a3b8',
            '&.Mui-focused': {
              color: '#3b82f6',
            },
            '&.Mui-error': {
              color: '#ef4444',
            },
          },
          '& .MuiInputBase-input': {
            color: '#f1f5f9',
            padding: '12px 16px',
          },
          '& .MuiFormHelperText-root': {
            marginLeft: 0,
            marginRight: 14,
            '&.Mui-error': {
              color: '#ef4444',
            },
          },
        },
      },
    },
  },
}, faIR);

export function PersianDatePicker({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  error = false,
  helperText,
  className,
  placeholder,
  required = false,
}: PersianDatePickerProps) {
  return (
    <ThemeProvider theme={darkTheme}>
      <LocalizationProvider
        dateAdapter={AdapterDateFnsJalali}
        localeText={{
          // Custom locale text for Persian
          cancelButtonLabel: 'لغو',
          clearButtonLabel: 'پاک کردن',
          okButtonLabel: 'تایید',
          todayButtonLabel: 'امروز',
          // Toolbar
          datePickerToolbarTitle: 'انتخاب تاریخ',
          // Calendar navigation
          previousMonth: 'ماه قبل',
          nextMonth: 'ماه بعد',
          // Field labels
          fieldYearPlaceholder: () => 'سال',
          fieldMonthPlaceholder: () => 'ماه',
          fieldDayPlaceholder: () => 'روز',
        }}
      >
        <DatePicker
          label={label}
          value={value}
          onChange={onChange}
          minDate={minDate}
          maxDate={maxDate}
          disabled={disabled}
          className={className}
          slotProps={{
            textField: {
              error,
              helperText,
              placeholder,
              required,
              fullWidth: true,
              variant: 'outlined',
            } as TextFieldProps,
            day: {
              sx: {
                fontFamily: 'inherit',
                color: '#f1f5f9',
                '&:hover': {
                  backgroundColor: '#334155',
                },
                '&.Mui-selected': {
                  backgroundColor: '#3b82f6 !important',
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: '#2563eb !important',
                  },
                },
              },
            },
          }}
          // Format the display
          format="yyyy/MM/dd"
          // Enable keyboard input
          views={['year', 'month', 'day']}
        />
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default PersianDatePicker;
