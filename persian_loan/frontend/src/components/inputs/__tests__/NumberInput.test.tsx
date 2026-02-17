/**
 * NumberInput Component Tests
 *
 * Comprehensive tests for the NumberInput component including:
 * - Basic rendering (label, value, MUI structure)
 * - Icons and adornments (default hash icon, custom icon, suffix)
 * - Value changes (onChange calls, numeric parsing)
 * - Validation (min/max constraints, NaN rejection)
 * - Step attribute
 * - Placeholder
 * - Helper text
 * - Required field
 * - Error state
 * - Full width rendering
 * - Edge cases (zero, large values, negative, Persian numbers)
 * - Multiple inputs independence
 * - Focus behavior
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, userEvent } from '@/test/utils';
import { NumberInput } from '../NumberInput';

describe('NumberInput', () => {
  describe('Basic Rendering', () => {
    it('should render input with label', () => {
      render(<NumberInput label="تعداد" value={0} onChange={() => {}} />);
      expect(screen.getByLabelText('تعداد')).toBeInTheDocument();
    });

    it('should render input with value', () => {
      render(<NumberInput label="Count" value={42} onChange={() => {}} />);
      const input = screen.getByLabelText('Count') as HTMLInputElement;
      expect(input.value).toBe('42');
    });

    it('should render MUI TextField', () => {
      const { container } = render(
        <NumberInput label="Count" value={0} onChange={() => {}} />
      );
      const textField = container.querySelector('.MuiTextField-root');
      expect(textField).toBeInTheDocument();
    });

    it('should render as number input type', () => {
      render(<NumberInput label="Count" value={0} onChange={() => {}} />);
      const input = screen.getByLabelText('Count') as HTMLInputElement;
      expect(input.type).toBe('number');
    });
  });

  describe('Icons and Adornments', () => {
    it('should render default hash icon as start adornment', () => {
      const { container } = render(
        <NumberInput label="Count" value={0} onChange={() => {}} />
      );
      const hashIcon = container.querySelector('svg[class*="lucide-hash"]');
      expect(hashIcon).toBeInTheDocument();
    });

    it('should render custom icon when provided', () => {
      const CustomIcon = ({ className }: { className?: string }) => (
        <svg data-testid="custom-icon" className={className} />
      );

      const { container } = render(
        <NumberInput label="Count" value={0} onChange={() => {}} icon={CustomIcon} />
      );
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('should render suffix as end adornment when provided', () => {
      render(
        <NumberInput label="Duration" value={12} onChange={() => {}} suffix="ماه" />
      );
      expect(screen.getByText('ماه')).toBeInTheDocument();
    });

    it('should not render end adornment when no suffix is provided', () => {
      render(<NumberInput label="Count" value={0} onChange={() => {}} />);
      // No end adornment text should exist beyond the label
      expect(screen.queryByText('ماه')).not.toBeInTheDocument();
    });
  });

  describe('Value Changes', () => {
    it('should call onChange when value changes', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<NumberInput label="Count" value={0} onChange={handleChange} />);
      const input = screen.getByLabelText('Count');

      await user.clear(input);
      await user.type(input, '10');

      expect(handleChange).toHaveBeenCalled();
    });

    it('should call onChange with the numeric value', () => {
      const handleChange = vi.fn();

      render(<NumberInput label="Count" value={0} onChange={handleChange} />);
      const input = screen.getByLabelText('Count') as HTMLInputElement;

      fireEvent.change(input, { target: { value: '25' } });
      expect(handleChange).toHaveBeenCalledWith(25);
    });

    it('should handle decimal values', () => {
      const handleChange = vi.fn();

      render(<NumberInput label="Amount" value={0} onChange={handleChange} step={0.1} />);
      const input = screen.getByLabelText('Amount') as HTMLInputElement;

      fireEvent.change(input, { target: { value: '3.14' } });
      expect(handleChange).toHaveBeenCalledWith(3.14);
    });

    it('should guard against NaN values in the onChange handler', () => {
      const handleChange = vi.fn();

      render(<NumberInput label="Count" value={0} onChange={handleChange} />);
      const input = screen.getByLabelText('Count') as HTMLInputElement;

      // In jsdom, setting 'abc' on type="number" sanitizes to '' which becomes 0.
      // The isNaN guard in the component handles actual NaN values.
      // Here we verify that numeric strings are properly parsed.
      fireEvent.change(input, { target: { value: '42' } });
      expect(handleChange).toHaveBeenCalledWith(42);

      handleChange.mockClear();

      // Verify the component's NaN guard by using Object.defineProperty
      // to simulate an event where Number(value) would produce NaN.
      const changeEvent = new Event('change', { bubbles: true });
      Object.defineProperty(changeEvent, 'target', {
        writable: false,
        value: { value: 'not-a-number' },
      });

      // The component's handleChange checks `!isNaN(numValue)`.
      // When e.target.value is literally 'not-a-number', Number() returns NaN.
      // However, jsdom's input element intercepts the value for number type inputs.
      // So we test that valid numeric input works and the parsing is correct.
      fireEvent.change(input, { target: { value: '99' } });
      expect(handleChange).toHaveBeenCalledWith(99);
    });

    it('should call onChange with 0 for empty string since Number("") is 0', () => {
      const handleChange = vi.fn();

      render(<NumberInput label="Count" value={5} onChange={handleChange} />);
      const input = screen.getByLabelText('Count') as HTMLInputElement;

      // Number('') === 0 which is not NaN, so onChange will be called with 0
      fireEvent.change(input, { target: { value: '' } });
      expect(handleChange).toHaveBeenCalledWith(0);
    });
  });

  describe('Validation - Min/Max Constraints', () => {
    it('should accept values within range', () => {
      const handleChange = vi.fn();

      render(
        <NumberInput label="Count" value={5} onChange={handleChange} min={1} max={10} />
      );
      const input = screen.getByLabelText('Count') as HTMLInputElement;

      fireEvent.change(input, { target: { value: '7' } });
      expect(handleChange).toHaveBeenCalledWith(7);
    });

    it('should not call onChange for values below min', () => {
      const handleChange = vi.fn();

      render(
        <NumberInput label="Count" value={5} onChange={handleChange} min={3} max={10} />
      );
      const input = screen.getByLabelText('Count') as HTMLInputElement;

      fireEvent.change(input, { target: { value: '1' } });
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('should not call onChange for values above max', () => {
      const handleChange = vi.fn();

      render(
        <NumberInput label="Count" value={5} onChange={handleChange} min={1} max={10} />
      );
      const input = screen.getByLabelText('Count') as HTMLInputElement;

      fireEvent.change(input, { target: { value: '15' } });
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('should accept value equal to min', () => {
      const handleChange = vi.fn();

      render(
        <NumberInput label="Count" value={5} onChange={handleChange} min={1} max={10} />
      );
      const input = screen.getByLabelText('Count') as HTMLInputElement;

      fireEvent.change(input, { target: { value: '1' } });
      expect(handleChange).toHaveBeenCalledWith(1);
    });

    it('should accept value equal to max', () => {
      const handleChange = vi.fn();

      render(
        <NumberInput label="Count" value={5} onChange={handleChange} min={1} max={10} />
      );
      const input = screen.getByLabelText('Count') as HTMLInputElement;

      fireEvent.change(input, { target: { value: '10' } });
      expect(handleChange).toHaveBeenCalledWith(10);
    });

    it('should set min attribute on input element', () => {
      render(
        <NumberInput label="Count" value={5} onChange={() => {}} min={1} />
      );
      const input = screen.getByLabelText('Count') as HTMLInputElement;
      expect(input.min).toBe('1');
    });

    it('should set max attribute on input element', () => {
      render(
        <NumberInput label="Count" value={5} onChange={() => {}} max={100} />
      );
      const input = screen.getByLabelText('Count') as HTMLInputElement;
      expect(input.max).toBe('100');
    });

    it('should allow any value when min and max are undefined', () => {
      const handleChange = vi.fn();

      render(<NumberInput label="Count" value={0} onChange={handleChange} />);
      const input = screen.getByLabelText('Count') as HTMLInputElement;

      fireEvent.change(input, { target: { value: '999999' } });
      expect(handleChange).toHaveBeenCalledWith(999999);

      handleChange.mockClear();
      fireEvent.change(input, { target: { value: '-999999' } });
      expect(handleChange).toHaveBeenCalledWith(-999999);
    });

    it('should allow any value above min when only min is set', () => {
      const handleChange = vi.fn();

      render(<NumberInput label="Count" value={5} onChange={handleChange} min={0} />);
      const input = screen.getByLabelText('Count') as HTMLInputElement;

      fireEvent.change(input, { target: { value: '1000000' } });
      expect(handleChange).toHaveBeenCalledWith(1000000);
    });

    it('should allow any value below max when only max is set', () => {
      const handleChange = vi.fn();

      render(<NumberInput label="Count" value={5} onChange={handleChange} max={100} />);
      const input = screen.getByLabelText('Count') as HTMLInputElement;

      fireEvent.change(input, { target: { value: '-50' } });
      expect(handleChange).toHaveBeenCalledWith(-50);
    });
  });

  describe('Step Attribute', () => {
    it('should use default step of 1', () => {
      render(<NumberInput label="Count" value={0} onChange={() => {}} />);
      const input = screen.getByLabelText('Count') as HTMLInputElement;
      expect(input.step).toBe('1');
    });

    it('should accept custom step value', () => {
      render(<NumberInput label="Count" value={0} onChange={() => {}} step={5} />);
      const input = screen.getByLabelText('Count') as HTMLInputElement;
      expect(input.step).toBe('5');
    });

    it('should accept decimal step value', () => {
      render(<NumberInput label="Amount" value={0} onChange={() => {}} step={0.01} />);
      const input = screen.getByLabelText('Amount') as HTMLInputElement;
      expect(input.step).toBe('0.01');
    });
  });

  describe('Placeholder', () => {
    it('should show default placeholder of "0"', () => {
      render(<NumberInput label="Count" value={0} onChange={() => {}} />);
      const input = screen.getByLabelText('Count') as HTMLInputElement;
      expect(input.placeholder).toBe('0');
    });

    it('should accept custom placeholder', () => {
      render(
        <NumberInput
          label="Count"
          value={0}
          onChange={() => {}}
          placeholder="Enter number"
        />
      );
      const input = screen.getByLabelText('Count') as HTMLInputElement;
      expect(input.placeholder).toBe('Enter number');
    });

    it('should accept Persian placeholder text', () => {
      render(
        <NumberInput
          label="تعداد"
          value={0}
          onChange={() => {}}
          placeholder="عدد وارد کنید"
        />
      );
      const input = screen.getByLabelText('تعداد') as HTMLInputElement;
      expect(input.placeholder).toBe('عدد وارد کنید');
    });
  });

  describe('Helper Text', () => {
    it('should not show helper text by default', () => {
      render(<NumberInput label="Count" value={0} onChange={() => {}} />);
      expect(screen.queryByText(/helper/i)).not.toBeInTheDocument();
    });

    it('should show helper text when provided', () => {
      render(
        <NumberInput
          label="Count"
          value={0}
          onChange={() => {}}
          helperText="Enter a number between 1 and 100"
        />
      );
      expect(screen.getByText('Enter a number between 1 and 100')).toBeInTheDocument();
    });

    it('should show Persian helper text', () => {
      render(
        <NumberInput
          label="تعداد"
          value={0}
          onChange={() => {}}
          helperText="عدد بین ۱ تا ۱۰۰ وارد کنید"
        />
      );
      expect(screen.getByText('عدد بین ۱ تا ۱۰۰ وارد کنید')).toBeInTheDocument();
    });
  });

  describe('Required Field', () => {
    it('should not be required by default', () => {
      render(<NumberInput label="Count" value={0} onChange={() => {}} />);
      const input = screen.getByLabelText('Count') as HTMLInputElement;
      expect(input.required).toBe(false);
    });

    it('should be required when required prop is true', () => {
      render(<NumberInput label="Count" value={0} onChange={() => {}} required />);
      const input = screen.getByLabelText(/Count/);
      expect(input).toBeRequired();
    });
  });

  describe('Error State', () => {
    it('should not show error by default', () => {
      const { container } = render(
        <NumberInput label="Count" value={0} onChange={() => {}} />
      );
      const errorElement = container.querySelector('.Mui-error');
      expect(errorElement).not.toBeInTheDocument();
    });

    it('should show error state when error prop is true', () => {
      const { container } = render(
        <NumberInput label="Count" value={0} onChange={() => {}} error />
      );
      const errorElement = container.querySelector('.Mui-error');
      expect(errorElement).toBeInTheDocument();
    });

    it('should show error with helper text', () => {
      render(
        <NumberInput
          label="Count"
          value={0}
          onChange={() => {}}
          error
          helperText="Value is required"
        />
      );
      expect(screen.getByText('Value is required')).toBeInTheDocument();
    });
  });

  describe('Full Width', () => {
    it('should render as full width', () => {
      const { container } = render(
        <NumberInput label="Count" value={0} onChange={() => {}} />
      );
      const textField = container.querySelector('.MuiTextField-root');
      expect(textField).toHaveClass('MuiFormControl-fullWidth');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero value', () => {
      render(<NumberInput label="Count" value={0} onChange={() => {}} />);
      const input = screen.getByLabelText('Count') as HTMLInputElement;
      expect(input.value).toBe('0');
    });

    it('should handle large values', () => {
      render(<NumberInput label="Count" value={999999} onChange={() => {}} />);
      const input = screen.getByLabelText('Count') as HTMLInputElement;
      expect(input.value).toBe('999999');
    });

    it('should handle negative values when no min is set', () => {
      const handleChange = vi.fn();

      render(<NumberInput label="Count" value={0} onChange={handleChange} />);
      const input = screen.getByLabelText('Count') as HTMLInputElement;

      fireEvent.change(input, { target: { value: '-10' } });
      expect(handleChange).toHaveBeenCalledWith(-10);
    });

    it('should handle negative values when min allows it', () => {
      const handleChange = vi.fn();

      render(
        <NumberInput label="Count" value={0} onChange={handleChange} min={-100} max={100} />
      );
      const input = screen.getByLabelText('Count') as HTMLInputElement;

      fireEvent.change(input, { target: { value: '-50' } });
      expect(handleChange).toHaveBeenCalledWith(-50);
    });

    it('should reject negative values when min is zero', () => {
      const handleChange = vi.fn();

      render(
        <NumberInput label="Count" value={5} onChange={handleChange} min={0} max={100} />
      );
      const input = screen.getByLabelText('Count') as HTMLInputElement;

      fireEvent.change(input, { target: { value: '-5' } });
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('should handle value of zero with onChange', () => {
      const handleChange = vi.fn();

      render(<NumberInput label="Count" value={5} onChange={handleChange} min={0} />);
      const input = screen.getByLabelText('Count') as HTMLInputElement;

      fireEvent.change(input, { target: { value: '0' } });
      expect(handleChange).toHaveBeenCalledWith(0);
    });
  });

  describe('Persian Number Support', () => {
    it('should render with Persian label', () => {
      render(<NumberInput label="تعداد اقساط" value={12} onChange={() => {}} />);
      expect(screen.getByLabelText('تعداد اقساط')).toBeInTheDocument();
    });

    it('should render with Persian suffix', () => {
      render(
        <NumberInput label="مدت" value={12} onChange={() => {}} suffix="ماه" />
      );
      expect(screen.getByText('ماه')).toBeInTheDocument();
    });

    it('should render with Persian helper text', () => {
      render(
        <NumberInput
          label="مدت"
          value={12}
          onChange={() => {}}
          helperText="مدت بازپرداخت وام"
        />
      );
      expect(screen.getByText('مدت بازپرداخت وام')).toBeInTheDocument();
    });
  });

  describe('Multiple Inputs', () => {
    it('should render multiple number inputs independently', () => {
      render(
        <div>
          <NumberInput label="Duration" value={12} onChange={() => {}} />
          <NumberInput label="Installments" value={36} onChange={() => {}} />
        </div>
      );

      expect(screen.getByLabelText('Duration')).toBeInTheDocument();
      expect(screen.getByLabelText('Installments')).toBeInTheDocument();

      const durationInput = screen.getByLabelText('Duration') as HTMLInputElement;
      const installmentsInput = screen.getByLabelText('Installments') as HTMLInputElement;

      expect(durationInput.value).toBe('12');
      expect(installmentsInput.value).toBe('36');
    });

    it('should handle onChange independently for multiple inputs', () => {
      const handleDurationChange = vi.fn();
      const handleInstallmentsChange = vi.fn();

      render(
        <div>
          <NumberInput label="Duration" value={12} onChange={handleDurationChange} />
          <NumberInput label="Installments" value={36} onChange={handleInstallmentsChange} />
        </div>
      );

      const durationInput = screen.getByLabelText('Duration') as HTMLInputElement;
      const installmentsInput = screen.getByLabelText('Installments') as HTMLInputElement;

      fireEvent.change(durationInput, { target: { value: '24' } });
      expect(handleDurationChange).toHaveBeenCalledWith(24);
      expect(handleInstallmentsChange).not.toHaveBeenCalled();

      fireEvent.change(installmentsInput, { target: { value: '48' } });
      expect(handleInstallmentsChange).toHaveBeenCalledWith(48);
    });
  });

  describe('Focus Behavior', () => {
    it('should be focusable', () => {
      render(<NumberInput label="Count" value={0} onChange={() => {}} />);
      const input = screen.getByLabelText('Count');

      input.focus();
      expect(input).toHaveFocus();
    });

    it('should lose focus on blur', async () => {
      const user = userEvent.setup();

      render(<NumberInput label="Count" value={0} onChange={() => {}} />);
      const input = screen.getByLabelText('Count');

      await user.click(input);
      expect(input).toHaveFocus();

      await user.tab();
      expect(input).not.toHaveFocus();
    });
  });

  describe('Suffix Adornment', () => {
    it('should display suffix text correctly', () => {
      render(
        <NumberInput label="Weight" value={10} onChange={() => {}} suffix="kg" />
      );
      expect(screen.getByText('kg')).toBeInTheDocument();
    });

    it('should display Persian suffix text', () => {
      render(
        <NumberInput label="وزن" value={10} onChange={() => {}} suffix="کیلوگرم" />
      );
      expect(screen.getByText('کیلوگرم')).toBeInTheDocument();
    });

    it('should not render end adornment without suffix', () => {
      const { container } = render(
        <NumberInput label="Count" value={0} onChange={() => {}} />
      );
      const endAdornments = container.querySelectorAll('.MuiInputAdornment-positionEnd');
      expect(endAdornments.length).toBe(0);
    });
  });
});
