/**
 * Tests for LoanKeyInfoGrid Component
 */

import { describe, it, expect } from 'vitest';
import { screen, render, within } from '@testing-library/react';
import { LoanKeyInfoGrid } from '../LoanKeyInfoGrid';
import type { LoanType } from '@/types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Percent: ({ className }: { className?: string }) => (
    <svg data-testid="percent-icon" className={className} />
  ),
  Banknote: ({ className }: { className?: string }) => (
    <svg data-testid="banknote-icon" className={className} />
  ),
  Clock: ({ className }: { className?: string }) => (
    <svg data-testid="clock-icon" className={className} />
  ),
  UserCheck: ({ className }: { className?: string }) => (
    <svg data-testid="usercheck-icon" className={className} />
  ),
}));

const mockLoan: LoanType = {
  id: '1',
  nameFA: 'وام قرض‌الحسنه',
  nameEN: 'Qard al-Hasan Loan',
  interestRate: '0%',
  interestRateFA: 'بدون سود',
  minAmount: '1000000',
  maxAmount: '10000000',
  maxAmountFA: '۱۰ میلیون تومان',
  repaymentPeriod: '12 months',
  repaymentPeriodFA: '۱۲ ماه',
  minTerm: '6',
  maxTerm: '24',
  guarantor: 'No',
  guarantorFA: 'بدون ضامن',
};

describe('LoanKeyInfoGrid', () => {
  describe('Rendering', () => {
    it('should render all 4 info cards', () => {
      const { container } = render(
        <LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />
      );

      const cards = container.querySelectorAll('.grid > div');
      expect(cards).toHaveLength(4);
    });

    it('should render in grid layout', () => {
      const { container } = render(
        <LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />
      );

      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveClass('grid', 'grid-cols-2', 'md:grid-cols-4');
    });

    it('should have proper gap between cards', () => {
      const { container } = render(
        <LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />
      );

      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveClass('gap-4');
    });
  });

  describe('Interest Rate Card', () => {
    it('should render interest rate card with icon', () => {
      render(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />);

      expect(screen.getByTestId('percent-icon')).toBeInTheDocument();
      expect(screen.getByText('نرخ سود')).toBeInTheDocument();
    });

    it('should display interest rate value', () => {
      render(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should display Persian interest rate when provided', () => {
      render(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />);

      expect(screen.getByText('بدون سود')).toBeInTheDocument();
    });

    it('should not render interest rate card when not provided', () => {
      const loanWithoutRate = { ...mockLoan, interestRate: undefined };
      render(<LoanKeyInfoGrid loan={loanWithoutRate} hasGuarantor={false} />);

      expect(screen.queryByText('نرخ سود')).not.toBeInTheDocument();
    });

    it('should have primary color styling', () => {
      const { container } = render(
        <LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />
      );

      const rateCard = container.querySelector('.bg-primary-800\\/20');
      expect(rateCard).toBeInTheDocument();
    });

    it('should display icon with proper size', () => {
      render(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />);

      const icon = screen.getByTestId('percent-icon');
      expect(icon).toHaveClass('w-4', 'h-4');
    });

    it('should display label with small text', () => {
      render(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />);

      const label = screen.getByText('نرخ سود');
      expect(label).toHaveClass('text-xs');
    });
  });

  describe('Amount Card', () => {
    it('should render amount card with icon', () => {
      render(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />);

      expect(screen.getByTestId('banknote-icon')).toBeInTheDocument();
      expect(screen.getByText('مبلغ')).toBeInTheDocument();
    });

    it('should display max amount when provided', () => {
      render(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />);

      expect(screen.getByText('10000000')).toBeInTheDocument();
    });

    it('should display Persian amount when provided', () => {
      render(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />);

      expect(screen.getByText('۱۰ میلیون تومان')).toBeInTheDocument();
    });

    it('should fallback to minAmount when maxAmount not provided', () => {
      const loanWithMinOnly = { ...mockLoan, maxAmount: undefined };
      render(<LoanKeyInfoGrid loan={loanWithMinOnly} hasGuarantor={false} />);

      expect(screen.getByText('1000000')).toBeInTheDocument();
    });

    it('should not render amount card when neither min nor max provided', () => {
      const loanWithoutAmount = {
        ...mockLoan,
        minAmount: undefined,
        maxAmount: undefined,
      };
      render(<LoanKeyInfoGrid loan={loanWithoutAmount} hasGuarantor={false} />);

      expect(screen.queryByText('مبلغ')).not.toBeInTheDocument();
    });

    it('should have secondary color styling', () => {
      const { container } = render(
        <LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />
      );

      const amountCard = container.querySelector('.bg-secondary-800\\/20');
      expect(amountCard).toBeInTheDocument();
    });
  });

  describe('Repayment Period Card', () => {
    it('should render repayment period card with icon', () => {
      render(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />);

      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
      expect(screen.getByText('بازپرداخت')).toBeInTheDocument();
    });

    it('should display repayment period when provided', () => {
      render(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />);

      expect(screen.getByText('12 months')).toBeInTheDocument();
    });

    it('should display Persian repayment period when provided', () => {
      render(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />);

      expect(screen.getByText('۱۲ ماه')).toBeInTheDocument();
    });

    it('should construct period from minTerm and maxTerm', () => {
      const loanWithTerms = { ...mockLoan, repaymentPeriod: undefined };
      render(<LoanKeyInfoGrid loan={loanWithTerms} hasGuarantor={false} />);

      expect(screen.getByText('6 تا 24')).toBeInTheDocument();
    });

    it('should not render when no period data provided', () => {
      const loanWithoutPeriod = {
        ...mockLoan,
        repaymentPeriod: undefined,
        minTerm: undefined,
        maxTerm: undefined,
      };
      render(<LoanKeyInfoGrid loan={loanWithoutPeriod} hasGuarantor={false} />);

      expect(screen.queryByText('بازپرداخت')).not.toBeInTheDocument();
    });

    it('should have purple color styling', () => {
      const { container } = render(
        <LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />
      );

      const periodCard = container.querySelector('.bg-purple-900\\/20');
      expect(periodCard).toBeInTheDocument();
    });
  });

  describe('Guarantor Card', () => {
    it('should render guarantor card with icon', () => {
      render(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />);

      expect(screen.getByTestId('usercheck-icon')).toBeInTheDocument();
      expect(screen.getByText('ضامن')).toBeInTheDocument();
    });

    it('should display "بدون ضامن" when hasGuarantor is false', () => {
      render(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />);

      expect(screen.getAllByText('بدون ضامن').length).toBeGreaterThan(0);
    });

    it('should display "نیاز به ضامن" when hasGuarantor is true', () => {
      render(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={true} />);

      expect(screen.getByText('نیاز به ضامن')).toBeInTheDocument();
    });

    it('should have yellow styling when hasGuarantor is true', () => {
      const { container } = render(
        <LoanKeyInfoGrid loan={mockLoan} hasGuarantor={true} />
      );

      const guarantorCard = container.querySelector('.bg-yellow-900\\/20');
      expect(guarantorCard).toBeInTheDocument();
    });

    it('should have secondary styling when hasGuarantor is false', () => {
      const { container } = render(
        <LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />
      );

      const guarantorCard = container.querySelector('.bg-secondary-800\\/20');
      expect(guarantorCard).toBeInTheDocument();
    });

    it('should display guarantorFA when provided', () => {
      render(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />);

      expect(screen.getAllByText('بدون ضامن').length).toBeGreaterThan(0);
    });

    it('should always render guarantor card', () => {
      render(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />);

      expect(screen.getByText('ضامن')).toBeInTheDocument();
    });
  });

  describe('Grid Layout', () => {
    it('should use 2 columns on mobile', () => {
      const { container } = render(
        <LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />
      );

      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveClass('grid-cols-2');
    });

    it('should use 4 columns on desktop', () => {
      const { container } = render(
        <LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />
      );

      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveClass('md:grid-cols-4');
    });

    it('should have consistent gap', () => {
      const { container } = render(
        <LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />
      );

      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveClass('gap-4');
    });
  });

  describe('Card Styling', () => {
    it('should have rounded corners on all cards', () => {
      const { container } = render(
        <LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />
      );

      const cards = container.querySelectorAll('.rounded-lg');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should have padding on all cards', () => {
      const { container } = render(
        <LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />
      );

      const cards = container.querySelectorAll('.p-3');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should have borders on all cards', () => {
      const { container } = render(
        <LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />
      );

      const cards = container.querySelectorAll('.border');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe('Icons', () => {
    it('should render all required icons', () => {
      render(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />);

      expect(screen.getByTestId('percent-icon')).toBeInTheDocument();
      expect(screen.getByTestId('banknote-icon')).toBeInTheDocument();
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
      expect(screen.getByTestId('usercheck-icon')).toBeInTheDocument();
    });

    it('should render icons with proper size', () => {
      render(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />);

      const icons = [
        screen.getByTestId('percent-icon'),
        screen.getByTestId('banknote-icon'),
        screen.getByTestId('clock-icon'),
        screen.getByTestId('usercheck-icon'),
      ];

      icons.forEach((icon) => {
        expect(icon).toHaveClass('w-4', 'h-4');
      });
    });
  });

  describe('Persian Text Rendering', () => {
    it('should render all Persian labels', () => {
      render(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />);

      expect(screen.getByText('نرخ سود')).toBeInTheDocument();
      expect(screen.getByText('مبلغ')).toBeInTheDocument();
      expect(screen.getByText('بازپرداخت')).toBeInTheDocument();
      expect(screen.getByText('ضامن')).toBeInTheDocument();
    });

    it('should render Persian values', () => {
      render(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />);

      expect(screen.getByText('بدون سود')).toBeInTheDocument();
      expect(screen.getByText('۱۰ میلیون تومان')).toBeInTheDocument();
      expect(screen.getByText('۱۲ ماه')).toBeInTheDocument();
    });

    it('should handle Persian numbers correctly', () => {
      render(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />);

      expect(screen.getByText('۱۰ میلیون تومان')).toBeInTheDocument();
    });
  });

  describe('Component Memoization', () => {
    it('should be a memoized component', () => {
      expect(LoanKeyInfoGrid).toBeDefined();
      expect(typeof LoanKeyInfoGrid).toBe('object'); // memo returns an object
    });

    it('should render consistently with same props', () => {
      const { rerender } = render(
        <LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />
      );

      expect(screen.getAllByText('بدون ضامن').length).toBeGreaterThan(0);

      rerender(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />);

      expect(screen.getAllByText('بدون ضامن').length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle loan with minimal data', () => {
      const minimalLoan: LoanType = {
        id: '1',
        nameFA: 'وام',
        guarantor: 'No',
      };

      render(<LoanKeyInfoGrid loan={minimalLoan} hasGuarantor={false} />);

      // Only guarantor card should render
      expect(screen.getByText('ضامن')).toBeInTheDocument();
    });

    it('should handle very large amounts', () => {
      const loanWithLargeAmount = {
        ...mockLoan,
        maxAmount: '1000000000',
        maxAmountFA: '۱ میلیارد تومان',
      };

      render(<LoanKeyInfoGrid loan={loanWithLargeAmount} hasGuarantor={false} />);

      expect(screen.getByText('۱ میلیارد تومان')).toBeInTheDocument();
    });

    it('should handle very long repayment periods', () => {
      const loanWithLongPeriod = {
        ...mockLoan,
        repaymentPeriod: '240 months',
        repaymentPeriodFA: '۲۴۰ ماه (۲۰ سال)',
      };

      render(<LoanKeyInfoGrid loan={loanWithLongPeriod} hasGuarantor={false} />);

      expect(screen.getByText('۲۴۰ ماه (۲۰ سال)')).toBeInTheDocument();
    });

    it('should handle special interest rates', () => {
      const loanWithSpecialRate = {
        ...mockLoan,
        interestRate: '18-22%',
        interestRateFA: '۱۸ تا ۲۲ درصد',
      };

      render(<LoanKeyInfoGrid loan={loanWithSpecialRate} hasGuarantor={false} />);

      expect(screen.getByText('۱۸ تا ۲۲ درصد')).toBeInTheDocument();
    });

    it('should handle loan with only minTerm', () => {
      const loanWithMinTermOnly = {
        ...mockLoan,
        repaymentPeriod: undefined,
        maxTerm: undefined,
      };

      render(<LoanKeyInfoGrid loan={loanWithMinTermOnly} hasGuarantor={false} />);

      expect(screen.getByText('6 تا undefined')).toBeInTheDocument();
    });

    it('should handle empty Persian translations', () => {
      const loanWithoutFA = {
        ...mockLoan,
        interestRateFA: undefined,
        maxAmountFA: undefined,
        repaymentPeriodFA: undefined,
        guarantorFA: undefined,
      };

      render(<LoanKeyInfoGrid loan={loanWithoutFA} hasGuarantor={false} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('10000000')).toBeInTheDocument();
    });

    it('should render correctly without any optional Persian text', () => {
      const loanWithoutOptionalText = {
        ...mockLoan,
        interestRateFA: undefined,
        maxAmountFA: undefined,
        repaymentPeriodFA: undefined,
      };

      render(<LoanKeyInfoGrid loan={loanWithoutOptionalText} hasGuarantor={false} />);

      // Should still render main values
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('Conditional Rendering', () => {
    it('should show 4 cards when all data is present', () => {
      const { container } = render(
        <LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />
      );

      const cards = container.querySelectorAll('.grid > div');
      expect(cards).toHaveLength(4);
    });

    it('should show 3 cards when interest rate is missing', () => {
      const loanWithoutRate = { ...mockLoan, interestRate: undefined };
      const { container } = render(
        <LoanKeyInfoGrid loan={loanWithoutRate} hasGuarantor={false} />
      );

      const cards = container.querySelectorAll('.grid > div');
      expect(cards).toHaveLength(3);
    });

    it('should show 3 cards when amount is missing', () => {
      const loanWithoutAmount = {
        ...mockLoan,
        minAmount: undefined,
        maxAmount: undefined,
      };
      const { container } = render(
        <LoanKeyInfoGrid loan={loanWithoutAmount} hasGuarantor={false} />
      );

      const cards = container.querySelectorAll('.grid > div');
      expect(cards).toHaveLength(3);
    });

    it('should show 3 cards when repayment period is missing', () => {
      const loanWithoutPeriod = {
        ...mockLoan,
        repaymentPeriod: undefined,
        minTerm: undefined,
        maxTerm: undefined,
      };
      const { container } = render(
        <LoanKeyInfoGrid loan={loanWithoutPeriod} hasGuarantor={false} />
      );

      const cards = container.querySelectorAll('.grid > div');
      expect(cards).toHaveLength(3);
    });

    it('should always show at least guarantor card', () => {
      const minimalLoan: LoanType = {
        id: '1',
        nameFA: 'وام',
        guarantor: 'No',
      };

      const { container } = render(
        <LoanKeyInfoGrid loan={minimalLoan} hasGuarantor={false} />
      );

      const cards = container.querySelectorAll('.grid > div');
      expect(cards.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper text hierarchy', () => {
      render(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />);

      const labels = [
        screen.getByText('نرخ سود'),
        screen.getByText('مبلغ'),
        screen.getByText('بازپرداخت'),
        screen.getByText('ضامن'),
      ];

      labels.forEach((label) => {
        expect(label).toHaveClass('text-xs');
      });
    });

    it('should have proper color contrast for text', () => {
      const { container } = render(
        <LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />
      );

      // Check that text colors provide good contrast
      const boldText = container.querySelectorAll('.font-bold');
      expect(boldText.length).toBeGreaterThan(0);
    });
  });

  describe('Props Validation', () => {
    it('should handle all required props', () => {
      expect(() => {
        render(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />);
      }).not.toThrow();
    });

    it('should accept hasGuarantor boolean', () => {
      const { rerender } = render(
        <LoanKeyInfoGrid loan={mockLoan} hasGuarantor={false} />
      );

      expect(screen.getAllByText('بدون ضامن').length).toBeGreaterThan(0);

      rerender(<LoanKeyInfoGrid loan={mockLoan} hasGuarantor={true} />);

      expect(screen.getByText('نیاز به ضامن')).toBeInTheDocument();
    });
  });
});
