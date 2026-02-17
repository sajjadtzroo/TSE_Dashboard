/**
 * CurrencyInput Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material';
import { muiTheme } from '@/theme/muiTheme';
import { CurrencyInput } from '../CurrencyInput';

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={muiTheme}>
      {component}
    </ThemeProvider>
  );
};

describe('CurrencyInput', () => {
  it('renders with label', () => {
    const onChange = vi.fn();
    renderWithTheme(
      <CurrencyInput
        label="مبلغ"
        value={1000000}
        onChange={onChange}
      />
    );
    expect(screen.getByLabelText('مبلغ')).toBeInTheDocument();
  });

  it('formats value with thousands separator', () => {
    const onChange = vi.fn();
    renderWithTheme(
      <CurrencyInput
        label="مبلغ"
        value={1000000}
        onChange={onChange}
      />
    );
    const input = screen.getByLabelText('مبلغ') as HTMLInputElement;
    expect(input.value).toBe('1,000,000');
  });

  it('calls onChange with numeric value', () => {
    const onChange = vi.fn();
    renderWithTheme(
      <CurrencyInput
        label="مبلغ"
        value={0}
        onChange={onChange}
      />
    );
    const input = screen.getByLabelText('مبلغ') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '5,000,000' } });
    expect(onChange).toHaveBeenCalledWith(5000000);
  });

  it('displays helper text when provided', () => {
    const onChange = vi.fn();
    renderWithTheme(
      <CurrencyInput
        label="مبلغ"
        value={1000000}
        onChange={onChange}
        helperText="حداقل 1 میلیون تومان"
      />
    );
    expect(screen.getByText('حداقل 1 میلیون تومان')).toBeInTheDocument();
  });

  it('respects min and max constraints', () => {
    const onChange = vi.fn();
    renderWithTheme(
      <CurrencyInput
        label="مبلغ"
        value={1000000}
        onChange={onChange}
        min={500000}
        max={5000000}
      />
    );
    const input = screen.getByLabelText('مبلغ') as HTMLInputElement;

    // Try to set value below min - should not call onChange
    onChange.mockClear();
    fireEvent.change(input, { target: { value: '100,000' } });
    expect(onChange).not.toHaveBeenCalled();

    // Try to set value above max - should not call onChange
    onChange.mockClear();
    fireEvent.change(input, { target: { value: '10,000,000' } });
    expect(onChange).not.toHaveBeenCalled();

    // Set valid value - should call onChange
    onChange.mockClear();
    fireEvent.change(input, { target: { value: '2,000,000' } });
    expect(onChange).toHaveBeenCalledWith(2000000);
  });
});
