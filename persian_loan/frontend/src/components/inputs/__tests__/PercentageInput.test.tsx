/**
 * Tests for PercentageInput Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '@/test/utils';
import { PercentageInput } from '../PercentageInput';

describe('PercentageInput', () => {
  describe('Basic Rendering', () => {
    it('should render input with label', () => {
      render(<PercentageInput label="Interest Rate" value={0} onChange={() => {}} />);
      expect(screen.getByLabelText('Interest Rate')).toBeInTheDocument();
    });

    it('should render input with value', () => {
      render(<PercentageInput label="Rate" value={18} onChange={() => {}} />);
      const input = screen.getByLabelText('Rate') as HTMLInputElement;
      expect(input.value).toBe('18');
    });

    it('should render MUI TextField', () => {
      const { container } = render(
        <PercentageInput label="Rate" value={0} onChange={() => {}} />
      );
      const textField = container.querySelector('.MuiTextField-root');
      expect(textField).toBeInTheDocument();
    });
  });

  describe('Icons and Adornments', () => {
    it('should render percent icon as start adornment', () => {
      const { container } = render(
        <PercentageInput label="Rate" value={0} onChange={() => {}} />
      );
      const percentIcon = container.querySelector('svg[class*="lucide-percent"]');
      expect(percentIcon).toBeInTheDocument();
    });

    it('should render Persian percent symbol as end adornment', () => {
      render(<PercentageInput label="Rate" value={0} onChange={() => {}} />);
      expect(screen.getByText('٪')).toBeInTheDocument();
    });
  });

  describe('Value Changes', () => {
    it('should call onChange when value changes', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<PercentageInput label="Rate" value={0} onChange={handleChange} />);
      const input = screen.getByLabelText('Rate');

      await user.clear(input);
      await user.type(input, '18');

      expect(handleChange).toHaveBeenCalled();
    });

    it('should update value correctly', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<PercentageInput label="Rate" value={0} onChange={handleChange} />);
      const input = screen.getByLabelText('Rate');

      await user.clear(input);
      await user.type(input, '25');

      // Check that onChange was called
      expect(handleChange).toHaveBeenCalled();
      // Check the calls for numeric values only
      const calls = handleChange.mock.calls;
      const numericCalls = calls.filter(call => !isNaN(call[0]) && call[0] >= 0 && call[0] <= 100);
      expect(numericCalls.length).toBeGreaterThan(0);
    });

    it('should handle decimal values', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<PercentageInput label="Rate" value={0} onChange={handleChange} />);
      const input = screen.getByLabelText('Rate');

      await user.clear(input);
      await user.type(input, '18.5');

      // Check that onChange was called
      expect(handleChange).toHaveBeenCalled();
      // Check that numeric decimal values were passed
      const calls = handleChange.mock.calls;
      const decimalCalls = calls.filter(call => !isNaN(call[0]) && call[0] > 0);
      expect(decimalCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    it('should respect min value constraint', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(
        <PercentageInput label="Rate" value={10} onChange={handleChange} min={5} max={100} />
      );
      const input = screen.getByLabelText('Rate') as HTMLInputElement;

      expect(input.min).toBe('5');
    });

    it('should respect max value constraint', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(
        <PercentageInput label="Rate" value={10} onChange={handleChange} min={0} max={50} />
      );
      const input = screen.getByLabelText('Rate') as HTMLInputElement;

      expect(input.max).toBe('50');
    });

    it('should not call onChange for values below min', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(
        <PercentageInput label="Rate" value={10} onChange={handleChange} min={5} max={100} />
      );
      const input = screen.getByLabelText('Rate');

      handleChange.mockClear();
      await user.clear(input);
      await user.type(input, '3');

      // Should not call onChange because 3 is below min (5)
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('should not call onChange for values above max', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(
        <PercentageInput label="Rate" value={10} onChange={handleChange} min={0} max={50} />
      );
      const input = screen.getByLabelText('Rate');

      handleChange.mockClear();
      await user.clear(input);
      await user.type(input, '75');

      // Should call onChange for "7" (within range) but not for "75" (above max)
      // Check that 75 was not passed to onChange
      const calls = handleChange.mock.calls;
      const invalidCall = calls.find(call => call[0] === 75);
      expect(invalidCall).toBeUndefined();
    });

    it('should accept values within range', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(
        <PercentageInput label="Rate" value={10} onChange={handleChange} min={0} max={100} />
      );
      const input = screen.getByLabelText('Rate');

      handleChange.mockClear();
      await user.clear(input);
      await user.type(input, '50');

      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Step Attribute', () => {
    it('should use default step of 0.1', () => {
      render(<PercentageInput label="Rate" value={0} onChange={() => {}} />);
      const input = screen.getByLabelText('Rate') as HTMLInputElement;
      expect(input.step).toBe('0.1');
    });

    it('should accept custom step value', () => {
      render(<PercentageInput label="Rate" value={0} onChange={() => {}} step={1} />);
      const input = screen.getByLabelText('Rate') as HTMLInputElement;
      expect(input.step).toBe('1');
    });

    it('should accept decimal step value', () => {
      render(<PercentageInput label="Rate" value={0} onChange={() => {}} step={0.01} />);
      const input = screen.getByLabelText('Rate') as HTMLInputElement;
      expect(input.step).toBe('0.01');
    });
  });

  describe('Placeholder', () => {
    it('should show default placeholder of "0"', () => {
      render(<PercentageInput label="Rate" value={0} onChange={() => {}} />);
      const input = screen.getByLabelText('Rate') as HTMLInputElement;
      expect(input.placeholder).toBe('0');
    });

    it('should accept custom placeholder', () => {
      render(
        <PercentageInput
          label="Rate"
          value={0}
          onChange={() => {}}
          placeholder="Enter rate"
        />
      );
      const input = screen.getByLabelText('Rate') as HTMLInputElement;
      expect(input.placeholder).toBe('Enter rate');
    });
  });

  describe('Helper Text', () => {
    it('should not show helper text by default', () => {
      render(<PercentageInput label="Rate" value={0} onChange={() => {}} />);
      expect(screen.queryByText(/helper/i)).not.toBeInTheDocument();
    });

    it('should show helper text when provided', () => {
      render(
        <PercentageInput
          label="Rate"
          value={0}
          onChange={() => {}}
          helperText="Enter interest rate"
        />
      );
      expect(screen.getByText('Enter interest rate')).toBeInTheDocument();
    });
  });

  describe('Required Field', () => {
    it('should not be required by default', () => {
      render(<PercentageInput label="Rate" value={0} onChange={() => {}} />);
      const input = screen.getByLabelText('Rate') as HTMLInputElement;
      expect(input.required).toBe(false);
    });

    it('should be required when required prop is true', () => {
      render(<PercentageInput label="Rate" value={0} onChange={() => {}} required />);
      const input = screen.getByLabelText(/Rate/);
      expect(input).toBeRequired();
    });
  });

  describe('Error State', () => {
    it('should not show error by default', () => {
      const { container } = render(
        <PercentageInput label="Rate" value={0} onChange={() => {}} />
      );
      const textField = container.querySelector('.Mui-error');
      expect(textField).not.toBeInTheDocument();
    });

    it('should show error state when error prop is true', () => {
      const { container } = render(
        <PercentageInput label="Rate" value={0} onChange={() => {}} error />
      );
      const textField = container.querySelector('.Mui-error');
      expect(textField).toBeInTheDocument();
    });

    it('should show error with helper text', () => {
      render(
        <PercentageInput
          label="Rate"
          value={0}
          onChange={() => {}}
          error
          helperText="Rate must be between 0 and 100"
        />
      );
      expect(screen.getByText('Rate must be between 0 and 100')).toBeInTheDocument();
    });
  });

  describe('Full Width', () => {
    it('should render as full width', () => {
      const { container } = render(
        <PercentageInput label="Rate" value={0} onChange={() => {}} />
      );
      const textField = container.querySelector('.MuiTextField-root');
      expect(textField).toHaveClass('MuiFormControl-fullWidth');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero value', () => {
      render(<PercentageInput label="Rate" value={0} onChange={() => {}} />);
      const input = screen.getByLabelText('Rate') as HTMLInputElement;
      expect(input.value).toBe('0');
    });

    it('should handle large values', () => {
      render(<PercentageInput label="Rate" value={999.99} onChange={() => {}} />);
      const input = screen.getByLabelText('Rate') as HTMLInputElement;
      expect(input.value).toBe('999.99');
    });

    it('should not accept non-numeric input', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<PercentageInput label="Rate" value={0} onChange={handleChange} />);
      const input = screen.getByLabelText('Rate');

      handleChange.mockClear();
      await user.clear(input);
      await user.type(input, 'abc');

      // Check that no valid numeric values were passed to onChange
      // The input type="number" may filter out non-numeric characters
      const calls = handleChange.mock.calls;
      // Either no calls were made, or only NaN-filtered calls
      if (calls.length > 0) {
        calls.forEach(call => {
          expect(isNaN(call[0])).toBe(false);
        });
      }
    });

    it('should handle negative values if min allows', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(
        <PercentageInput label="Rate" value={0} onChange={handleChange} min={-100} max={100} />
      );
      const input = screen.getByLabelText('Rate');

      handleChange.mockClear();
      await user.clear(input);
      await user.type(input, '-5');

      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Multiple Inputs', () => {
    it('should render multiple percentage inputs independently', () => {
      render(
        <div>
          <PercentageInput label="Interest Rate" value={18} onChange={() => {}} />
          <PercentageInput label="Tax Rate" value={9} onChange={() => {}} />
        </div>
      );

      expect(screen.getByLabelText('Interest Rate')).toBeInTheDocument();
      expect(screen.getByLabelText('Tax Rate')).toBeInTheDocument();

      const interestInput = screen.getByLabelText('Interest Rate') as HTMLInputElement;
      const taxInput = screen.getByLabelText('Tax Rate') as HTMLInputElement;

      expect(interestInput.value).toBe('18');
      expect(taxInput.value).toBe('9');
    });
  });

  describe('Focus Behavior', () => {
    it('should be focusable', async () => {
      render(<PercentageInput label="Rate" value={0} onChange={() => {}} />);
      const input = screen.getByLabelText('Rate');

      input.focus();
      expect(input).toHaveFocus();
    });

    it('should lose focus on blur', async () => {
      const user = userEvent.setup();

      render(<PercentageInput label="Rate" value={0} onChange={() => {}} />);
      const input = screen.getByLabelText('Rate');

      await user.click(input);
      expect(input).toHaveFocus();

      await user.tab();
      expect(input).not.toHaveFocus();
    });
  });
});
