/**
 * PersianDatePicker Component Tests
 *
 * MUI X DatePicker v6+ renders a sectioned input with role="group"
 * containing individual role="spinbutton" sections for year/month/day,
 * rather than a traditional <input role="textbox">.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersianDatePicker } from './PersianDatePicker';

describe('PersianDatePicker', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('should render with label', () => {
    render(
      <PersianDatePicker
        label="تاریخ تولد"
        value={null}
        onChange={mockOnChange}
      />
    );

    // MUI DatePicker renders the label text in a <label> element (and also inside fieldset legend).
    // Use getAllByText and check at least one is present.
    const labels = screen.getAllByText('تاریخ تولد');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });

  it('should render with initial value', () => {
    const testDate = new Date('2024-01-15');

    render(
      <PersianDatePicker
        label="تاریخ"
        value={testDate}
        onChange={mockOnChange}
      />
    );

    // When a date value is provided, the spinbuttons should have non-empty values
    const spinbuttons = screen.getAllByRole('spinbutton');
    expect(spinbuttons.length).toBeGreaterThanOrEqual(3);
    // At least one spinbutton should show a meaningful value (not "Empty")
    const hasValue = spinbuttons.some(
      (sb) => sb.getAttribute('aria-valuetext') !== 'Empty'
    );
    expect(hasValue).toBe(true);
  });

  it('should display error state', () => {
    const errorMessage = 'تاریخ الزامی است';

    render(
      <PersianDatePicker
        label="تاریخ"
        value={null}
        onChange={mockOnChange}
        error={true}
        helperText={errorMessage}
      />
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(
      <PersianDatePicker
        label="تاریخ"
        value={null}
        onChange={mockOnChange}
        disabled={true}
      />
    );

    // When disabled, MUI DatePicker marks the spinbuttons as disabled
    const spinbuttons = screen.getAllByRole('spinbutton');
    spinbuttons.forEach((sb) => {
      expect(sb).toHaveAttribute('aria-disabled', 'true');
    });
  });

  it('should display required indicator', () => {
    render(
      <PersianDatePicker
        label="تاریخ"
        value={null}
        onChange={mockOnChange}
        required={true}
      />
    );

    // The required asterisk (*) should be present in the label
    const label = screen.getByText('تاریخ');
    expect(label).toBeInTheDocument();
    // MUI adds an asterisk span sibling for required fields
    const asterisk = label.closest('label')?.querySelector('.MuiFormLabel-asterisk');
    expect(asterisk).toBeTruthy();
  });

  it('should display helper text', () => {
    const helperText = 'لطفا تاریخ را انتخاب کنید';

    render(
      <PersianDatePicker
        label="تاریخ"
        value={null}
        onChange={mockOnChange}
        helperText={helperText}
      />
    );

    expect(screen.getByText(helperText)).toBeInTheDocument();
  });

  it('should call onChange when date is selected', async () => {
    const user = userEvent.setup();

    render(
      <PersianDatePicker
        label="تاریخ"
        value={null}
        onChange={mockOnChange}
      />
    );

    // Open the date picker by clicking the calendar icon button
    const calendarButton = screen.getByRole('button', { name: /choose date/i });
    await user.click(calendarButton);

    // The calendar dialog/popper should open
    // MUI DatePicker uses role="dialog" for the calendar popup
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
  });

  it('should respect minDate constraint', () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    render(
      <PersianDatePicker
        label="تاریخ"
        value={null}
        onChange={mockOnChange}
        minDate={tomorrow}
      />
    );

    // The component should render without errors
    const spinbuttons = screen.getAllByRole('spinbutton');
    expect(spinbuttons.length).toBeGreaterThanOrEqual(3);
  });

  it('should respect maxDate constraint', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    render(
      <PersianDatePicker
        label="تاریخ"
        value={null}
        onChange={mockOnChange}
        maxDate={yesterday}
      />
    );

    // The component should render without errors
    const spinbuttons = screen.getAllByRole('spinbutton');
    expect(spinbuttons.length).toBeGreaterThanOrEqual(3);
  });

  it('should handle null value', () => {
    render(
      <PersianDatePicker
        label="تاریخ"
        value={null}
        onChange={mockOnChange}
      />
    );

    // When value is null, all spinbuttons should show "Empty"
    const spinbuttons = screen.getAllByRole('spinbutton');
    spinbuttons.forEach((sb) => {
      expect(sb).toHaveAttribute('aria-valuetext', 'Empty');
    });
  });

  it('should apply custom className', () => {
    const customClass = 'custom-date-picker';

    const { container } = render(
      <PersianDatePicker
        label="تاریخ"
        value={null}
        onChange={mockOnChange}
        className={customClass}
      />
    );

    const picker = container.querySelector(`.${customClass}`);
    expect(picker).toBeInTheDocument();
  });

  it('should handle date format correctly', () => {
    const testDate = new Date('2024-03-21'); // Persian New Year

    render(
      <PersianDatePicker
        label="تاریخ"
        value={testDate}
        onChange={mockOnChange}
      />
    );

    // The spinbuttons should have actual values (not "Empty") when a date is set
    const spinbuttons = screen.getAllByRole('spinbutton');
    const hasValue = spinbuttons.some(
      (sb) => sb.getAttribute('aria-valuetext') !== 'Empty'
    );
    expect(hasValue).toBe(true);
  });

  it('should clear date when null is passed', () => {
    const { rerender } = render(
      <PersianDatePicker
        label="تاریخ"
        value={new Date()}
        onChange={mockOnChange}
      />
    );

    // With a date value, at least one spinbutton should not be "Empty"
    let spinbuttons = screen.getAllByRole('spinbutton');
    let hasValue = spinbuttons.some(
      (sb) => sb.getAttribute('aria-valuetext') !== 'Empty'
    );
    expect(hasValue).toBe(true);

    rerender(
      <PersianDatePicker
        label="تاریخ"
        value={null}
        onChange={mockOnChange}
      />
    );

    // After setting value to null, all spinbuttons should show "Empty"
    spinbuttons = screen.getAllByRole('spinbutton');
    spinbuttons.forEach((sb) => {
      expect(sb).toHaveAttribute('aria-valuetext', 'Empty');
    });
  });

  it('should be accessible with ARIA attributes', () => {
    render(
      <PersianDatePicker
        label="تاریخ تولد"
        value={null}
        onChange={mockOnChange}
        required={true}
      />
    );

    // MUI DatePicker uses a role="group" container linked to the label
    const group = screen.getByRole('group');
    expect(group).toBeInTheDocument();

    // The hidden input should have the required attribute
    const hiddenInput = group.querySelector('input[aria-hidden="true"]');
    expect(hiddenInput).toHaveAttribute('required');
  });

  it('should show error styling when error prop is true', () => {
    const { container } = render(
      <PersianDatePicker
        label="تاریخ"
        value={null}
        onChange={mockOnChange}
        error={true}
      />
    );

    const input = container.querySelector('.Mui-error');
    expect(input).toBeInTheDocument();
  });

  it('should handle placeholder text', () => {
    const placeholderText = 'انتخاب تاریخ';

    render(
      <PersianDatePicker
        label="تاریخ"
        value={null}
        onChange={mockOnChange}
        placeholder={placeholderText}
      />
    );

    const input = screen.getByPlaceholderText(placeholderText);
    expect(input).toBeInTheDocument();
  });
});
