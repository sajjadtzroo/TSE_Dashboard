/**
 * Tests for LoanCard Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '@/test/utils';
import { LoanCard } from '../LoanCard';
import { mockLoan, mockLoanWithGuarantor, mockLoanWithBank, mockLoanWithCoefficients } from '@/test/mocks';

describe('LoanCard', () => {
  describe('Basic Rendering', () => {
    it('should render loan name', () => {
      render(<LoanCard loan={mockLoan} />);
      expect(screen.getByText(mockLoan.nameFA)).toBeInTheDocument();
    });

    it('should render interest rate', () => {
      render(<LoanCard loan={mockLoan} />);
      expect(screen.getByText(/نرخ:/)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(mockLoan.interestRate || ''))).toBeInTheDocument();
    });

    it('should render loan amount range', () => {
      render(<LoanCard loan={mockLoan} />);
      if (mockLoan.minAmount) {
        expect(screen.getByText(new RegExp(`از ${mockLoan.minAmount}`))).toBeInTheDocument();
      }
      if (mockLoan.maxAmount) {
        expect(screen.getByText(new RegExp(`تا ${mockLoan.maxAmount}`))).toBeInTheDocument();
      }
    });

    it('should render loan term range', () => {
      render(<LoanCard loan={mockLoan} />);
      const termText = screen.getByText(/از.*تا/);
      expect(termText).toBeInTheDocument();
    });
  });

  describe('Guarantor Badge', () => {
    it('should show "بدون ضامن" badge for loans without guarantor', () => {
      render(<LoanCard loan={mockLoan} />);
      const badges = screen.getAllByText('بدون ضامن');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should not show "بدون ضامن" badge for loans with guarantor', () => {
      render(<LoanCard loan={mockLoanWithGuarantor} />);
      const badges = screen.queryAllByText('بدون ضامن');
      // Badge in corner should not be present for loans with guarantor
      expect(badges.length).toBe(0);
    });

    it('should show "نیاز به ضامن" text for loans with guarantor', () => {
      render(<LoanCard loan={mockLoanWithGuarantor} />);
      expect(screen.getByText('نیاز به ضامن')).toBeInTheDocument();
    });
  });

  describe('Bank Information', () => {
    it('should not show bank name by default', () => {
      render(<LoanCard loan={mockLoanWithBank} />);
      expect(screen.queryByText(mockLoanWithBank.bankNameFA)).not.toBeInTheDocument();
    });

    it('should show bank name when showBank is true', () => {
      render(<LoanCard loan={mockLoanWithBank} showBank />);
      expect(screen.getByText(mockLoanWithBank.bankNameFA)).toBeInTheDocument();
    });

    it('should not show bank name for regular loans when showBank is true', () => {
      render(<LoanCard loan={mockLoan} showBank />);
      // Should not crash, just not show bank name
      expect(screen.getByText(mockLoan.nameFA)).toBeInTheDocument();
    });
  });

  describe('Click Handlers', () => {
    it('should call onClick handler when card is clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<LoanCard loan={mockLoan} onClick={handleClick} />);
      // Find the card by looking for the inner div that has the onClick handler
      const loanName = screen.getByText(mockLoan.nameFA);
      const clickableDiv = loanName.closest('div')?.parentElement?.parentElement;

      if (clickableDiv) {
        await user.click(clickableDiv);
        expect(handleClick).toHaveBeenCalledOnce();
      }
    });

    it('should not crash when onClick is not provided', async () => {
      const user = userEvent.setup();

      render(<LoanCard loan={mockLoan} />);
      const card = screen.getByText(mockLoan.nameFA).closest('div[class*="cursor-pointer"]');

      if (card) {
        await user.click(card);
        // Should not crash
      }
    });
  });

  describe('Selectable Mode', () => {
    it('should not show checkbox by default', () => {
      render(<LoanCard loan={mockLoan} />);
      const checkbox = screen.queryByRole('button', { name: '' });
      expect(checkbox).not.toBeInTheDocument();
    });

    it('should show checkbox when selectable is true', () => {
      render(<LoanCard loan={mockLoan} selectable />);
      const container = screen.getByText(mockLoan.nameFA).parentElement?.parentElement;
      const checkbox = container?.querySelector('button');
      expect(checkbox).toBeInTheDocument();
    });

    it('should call onSelect handler when checkbox is clicked', async () => {
      const user = userEvent.setup();
      const handleSelect = vi.fn();

      render(<LoanCard loan={mockLoan} selectable onSelect={handleSelect} />);
      const container = screen.getByText(mockLoan.nameFA).parentElement?.parentElement;
      const checkbox = container?.querySelector('button');

      if (checkbox) {
        await user.click(checkbox);
        expect(handleSelect).toHaveBeenCalledWith(mockLoan);
      }
    });

    it('should not call onClick when checkbox is clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      const handleSelect = vi.fn();

      render(
        <LoanCard
          loan={mockLoan}
          selectable
          onClick={handleClick}
          onSelect={handleSelect}
        />
      );

      const container = screen.getByText(mockLoan.nameFA).parentElement?.parentElement;
      const checkbox = container?.querySelector('button');

      if (checkbox) {
        await user.click(checkbox);
        expect(handleSelect).toHaveBeenCalledOnce();
        expect(handleClick).not.toHaveBeenCalled();
      }
    });
  });

  describe('Selected State', () => {
    it('should apply selected styling when isSelected is true', () => {
      const { container } = render(<LoanCard loan={mockLoan} isSelected />);
      const card = container.querySelector('[class*="border-primary-400"]');
      expect(card).toBeInTheDocument();
    });

    it('should not apply selected styling by default', () => {
      const { container } = render(<LoanCard loan={mockLoan} />);
      const card = container.querySelector('[class*="ring-2"]');
      expect(card).not.toBeInTheDocument();
    });

    it('should show checkmark when selected and selectable', () => {
      const { container } = render(
        <LoanCard loan={mockLoan} selectable isSelected />
      );
      const checkIcon = container.querySelector('svg[class*="lucide-check"]');
      expect(checkIcon).toBeInTheDocument();
    });

    it('should not show checkmark when not selected', () => {
      const { container } = render(
        <LoanCard loan={mockLoan} selectable isSelected={false} />
      );
      const checkIcon = container.querySelector('svg[class*="lucide-check"]');
      expect(checkIcon).not.toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('should render percentage icon for interest rate', () => {
      const { container } = render(<LoanCard loan={mockLoan} />);
      const percentIcon = container.querySelector('svg[class*="lucide-percent"]');
      expect(percentIcon).toBeInTheDocument();
    });

    it('should render banknote icon for amount', () => {
      const { container } = render(<LoanCard loan={mockLoan} />);
      const banknoteIcon = container.querySelector('svg[class*="lucide-banknote"]');
      expect(banknoteIcon).toBeInTheDocument();
    });

    it('should render clock icon for term', () => {
      const { container } = render(<LoanCard loan={mockLoanWithCoefficients} />);
      const clockIcon = container.querySelector('svg[class*="lucide-clock"]');
      expect(clockIcon).toBeInTheDocument();
    });

    it('should render user-check icon for guarantor status', () => {
      const { container } = render(<LoanCard loan={mockLoan} />);
      const userCheckIcon = container.querySelector('svg[class*="lucide-user-check"]');
      expect(userCheckIcon).toBeInTheDocument();
    });
  });

  describe('Conditional Rendering', () => {
    it('should not render interest rate section if not provided', () => {
      const loanWithoutRate = { ...mockLoan, interestRate: undefined };
      render(<LoanCard loan={loanWithoutRate} />);
      expect(screen.queryByText(/نرخ:/)).not.toBeInTheDocument();
    });

    it('should not render amount section if not provided', () => {
      const loanWithoutAmount = {
        ...mockLoan,
        minAmount: undefined,
        maxAmount: undefined,
      };
      const { container } = render(<LoanCard loan={loanWithoutAmount} />);
      const banknoteIcon = container.querySelector('svg[class*="lucide-banknote"]');
      expect(banknoteIcon).not.toBeInTheDocument();
    });

    it('should not render term section if not provided', () => {
      const loanWithoutTerm = {
        ...mockLoan,
        minTerm: undefined,
        maxTerm: undefined,
      };
      const { container } = render(<LoanCard loan={loanWithoutTerm} />);
      const clockIcon = container.querySelector('svg[class*="lucide-clock"]');
      expect(clockIcon).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have cursor-pointer class', () => {
      const { container } = render(<LoanCard loan={mockLoan} />);
      const card = container.querySelector('[class*="cursor-pointer"]');
      expect(card).toBeInTheDocument();
    });

    it('should have transition classes', () => {
      const { container } = render(<LoanCard loan={mockLoan} />);
      const card = container.querySelector('[class*="transition-all"]');
      expect(card).toBeInTheDocument();
    });

    it('should have hover classes when not selected', () => {
      const { container } = render(<LoanCard loan={mockLoan} />);
      const card = container.querySelector('[class*="hover:border-primary-400"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle loan with all optional fields missing', () => {
      const minimalLoan = {
        id: 'minimal-1',
        nameFA: 'وام ساده',
        guarantor: false,
      };
      render(<LoanCard loan={minimalLoan as any} />);
      expect(screen.getByText('وام ساده')).toBeInTheDocument();
    });

    it('should handle very long loan names', () => {
      const loanWithLongName = {
        ...mockLoan,
        nameFA: 'وام با نام بسیار طولانی برای تست رندر کردن',
      };
      render(<LoanCard loan={loanWithLongName} />);
      expect(screen.getByText(loanWithLongName.nameFA)).toBeInTheDocument();
    });
  });

  describe('Memoization', () => {
    it('should be a memoized component', () => {
      expect(LoanCard.displayName).toBe('LoanCard');
    });
  });
});
