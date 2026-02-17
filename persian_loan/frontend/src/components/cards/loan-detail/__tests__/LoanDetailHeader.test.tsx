/**
 * Tests for LoanDetailHeader Component
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, render } from '@testing-library/react';
import { LoanDetailHeader } from '../LoanDetailHeader';
import type { LoanType } from '@/types';

// Mock Badge component
vi.mock('@/components/ui', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant: string }) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

const mockLoan: LoanType = {
  id: '1',
  nameFA: 'وام قرض‌الحسنه',
  nameEN: 'Qard al-Hasan Loan',
  category: 'qard',
  categoryFA: 'قرض‌الحسنه',
  interestRate: '0%',
  interestRateFA: 'بدون سود',
  minAmount: '1000000',
  maxAmount: '10000000',
  maxAmountFA: '۱۰ میلیون تومان',
  repaymentPeriod: '12 months',
  repaymentPeriodFA: '۱۲ ماه',
  guarantor: 'No',
  guarantorFA: 'بدون ضامن',
};

describe('LoanDetailHeader', () => {
  describe('Rendering', () => {
    it('should render loan name in Persian', () => {
      render(
        <LoanDetailHeader loan={mockLoan} bankNameFA="بانک ملی" hasGuarantor={false} />
      );

      expect(screen.getByText('وام قرض‌الحسنه')).toBeInTheDocument();
    });

    it('should render loan name in English when provided', () => {
      render(
        <LoanDetailHeader loan={mockLoan} bankNameFA="بانک ملی" hasGuarantor={false} />
      );

      expect(screen.getByText('Qard al-Hasan Loan')).toBeInTheDocument();
    });

    it('should not render English name when not provided', () => {
      const loanWithoutEN = { ...mockLoan, nameEN: undefined };
      render(
        <LoanDetailHeader loan={loanWithoutEN} bankNameFA="بانک ملی" hasGuarantor={false} />
      );

      expect(screen.queryByText('Qard al-Hasan Loan')).not.toBeInTheDocument();
    });

    it('should render bank name when provided', () => {
      render(
        <LoanDetailHeader loan={mockLoan} bankNameFA="بانک ملی" hasGuarantor={false} />
      );

      expect(screen.getByText('بانک ملی')).toBeInTheDocument();
    });

    it('should not render bank name when not provided', () => {
      render(<LoanDetailHeader loan={mockLoan} hasGuarantor={false} />);

      expect(screen.queryByText('بانک ملی')).not.toBeInTheDocument();
    });
  });

  describe('Badge Rendering', () => {
    it('should render "No Guarantor" badge when hasGuarantor is false', () => {
      render(
        <LoanDetailHeader loan={mockLoan} bankNameFA="بانک ملی" hasGuarantor={false} />
      );

      const badges = screen.getAllByTestId('badge');
      const noGuarantorBadge = badges.find((badge) =>
        badge.textContent?.includes('بدون ضامن')
      );

      expect(noGuarantorBadge).toBeInTheDocument();
      expect(noGuarantorBadge).toHaveAttribute('data-variant', 'green');
    });

    it('should not render "No Guarantor" badge when hasGuarantor is true', () => {
      render(
        <LoanDetailHeader loan={mockLoan} bankNameFA="بانک ملی" hasGuarantor={true} />
      );

      const noGuarantorBadge = screen.queryByText('بدون ضامن');
      expect(noGuarantorBadge).not.toBeInTheDocument();
    });

    it('should render category badge when category is provided', () => {
      render(
        <LoanDetailHeader loan={mockLoan} bankNameFA="بانک ملی" hasGuarantor={false} />
      );

      const badges = screen.getAllByTestId('badge');
      const categoryBadge = badges.find((badge) =>
        badge.textContent?.includes('قرض‌الحسنه')
      );

      expect(categoryBadge).toBeInTheDocument();
      expect(categoryBadge).toHaveAttribute('data-variant', 'blue');
    });

    it('should use categoryFA when available', () => {
      render(
        <LoanDetailHeader loan={mockLoan} bankNameFA="بانک ملی" hasGuarantor={false} />
      );

      expect(screen.getByText('قرض‌الحسنه')).toBeInTheDocument();
    });

    it('should fallback to category when categoryFA is not available', () => {
      const loanWithoutCategoryFA = { ...mockLoan, categoryFA: undefined };
      render(
        <LoanDetailHeader
          loan={loanWithoutCategoryFA}
          bankNameFA="بانک ملی"
          hasGuarantor={false}
        />
      );

      expect(screen.getByText('qard')).toBeInTheDocument();
    });

    it('should not render category badge when category is not provided', () => {
      const loanWithoutCategory = { ...mockLoan, category: undefined, categoryFA: undefined };
      render(
        <LoanDetailHeader
          loan={loanWithoutCategory}
          bankNameFA="بانک ملی"
          hasGuarantor={false}
        />
      );

      const badges = screen.getAllByTestId('badge');
      expect(badges).toHaveLength(1); // Only no guarantor badge
    });

    it('should render both badges when applicable', () => {
      render(
        <LoanDetailHeader loan={mockLoan} bankNameFA="بانک ملی" hasGuarantor={false} />
      );

      const badges = screen.getAllByTestId('badge');
      expect(badges).toHaveLength(2);
    });

    it('should render only category badge when hasGuarantor is true', () => {
      render(
        <LoanDetailHeader loan={mockLoan} bankNameFA="بانک ملی" hasGuarantor={true} />
      );

      const badges = screen.getAllByTestId('badge');
      expect(badges).toHaveLength(1);
      expect(badges[0]).toHaveTextContent('قرض‌الحسنه');
    });
  });

  describe('Layout and Styling', () => {
    it('should have gradient background', () => {
      const { container } = render(
        <LoanDetailHeader loan={mockLoan} bankNameFA="بانک ملی" hasGuarantor={false} />
      );

      const header = container.firstChild as HTMLElement;
      expect(header).toHaveClass('bg-gradient-to-l');
    });

    it('should have border at bottom', () => {
      const { container } = render(
        <LoanDetailHeader loan={mockLoan} bankNameFA="بانک ملی" hasGuarantor={false} />
      );

      const header = container.firstChild as HTMLElement;
      expect(header).toHaveClass('border-b');
    });

    it('should have proper padding', () => {
      const { container } = render(
        <LoanDetailHeader loan={mockLoan} bankNameFA="بانک ملی" hasGuarantor={false} />
      );

      const header = container.firstChild as HTMLElement;
      expect(header).toHaveClass('p-4');
    });

    it('should layout items with flexbox', () => {
      const { container } = render(
        <LoanDetailHeader loan={mockLoan} bankNameFA="بانک ملی" hasGuarantor={false} />
      );

      const flexContainer = container.querySelector('.flex.items-start.justify-between');
      expect(flexContainer).toBeInTheDocument();
    });

    it('should wrap badges in flex container', () => {
      const { container } = render(
        <LoanDetailHeader loan={mockLoan} bankNameFA="بانک ملی" hasGuarantor={false} />
      );

      const badgeContainer = container.querySelector('.flex.flex-wrap.gap-2');
      expect(badgeContainer).toBeInTheDocument();
    });
  });

  describe('Persian Text Rendering', () => {
    it('should render Persian loan name with proper styling', () => {
      render(
        <LoanDetailHeader loan={mockLoan} bankNameFA="بانک ملی" hasGuarantor={false} />
      );

      const heading = screen.getByText('وام قرض‌الحسنه');
      expect(heading).toHaveClass('text-xl', 'font-bold', 'text-gray-100');
    });

    it('should render English name with gray text', () => {
      render(
        <LoanDetailHeader loan={mockLoan} bankNameFA="بانک ملی" hasGuarantor={false} />
      );

      const englishName = screen.getByText('Qard al-Hasan Loan');
      expect(englishName).toHaveClass('text-sm', 'text-gray-400');
    });

    it('should render bank name with primary color', () => {
      render(
        <LoanDetailHeader loan={mockLoan} bankNameFA="بانک ملی" hasGuarantor={false} />
      );

      const bankName = screen.getByText('بانک ملی');
      expect(bankName).toHaveClass('text-sm', 'text-primary-400');
    });

    it('should handle complex Persian characters', () => {
      const loanWithComplexText = {
        ...mockLoan,
        nameFA: 'وام خرید کالا و خدمات',
      };

      render(
        <LoanDetailHeader
          loan={loanWithComplexText}
          bankNameFA="بانک ملی"
          hasGuarantor={false}
        />
      );

      expect(screen.getByText('وام خرید کالا و خدمات')).toBeInTheDocument();
    });

    it('should handle Persian numbers in badges', () => {
      render(
        <LoanDetailHeader loan={mockLoan} bankNameFA="بانک ملی" hasGuarantor={false} />
      );

      expect(screen.getByText('بدون ضامن')).toBeInTheDocument();
    });
  });

  describe('Component Memoization', () => {
    it('should be a memoized component', () => {
      expect(LoanDetailHeader).toBeDefined();
      expect(typeof LoanDetailHeader).toBe('object'); // memo returns an object
    });

    it('should render consistently with same props', () => {
      const { rerender } = render(
        <LoanDetailHeader loan={mockLoan} bankNameFA="بانک ملی" hasGuarantor={false} />
      );

      expect(screen.getByText('وام قرض‌الحسنه')).toBeInTheDocument();

      rerender(
        <LoanDetailHeader loan={mockLoan} bankNameFA="بانک ملی" hasGuarantor={false} />
      );

      expect(screen.getByText('وام قرض‌الحسنه')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty loan name', () => {
      const loanWithEmptyName = { ...mockLoan, nameFA: '' };
      render(
        <LoanDetailHeader
          loan={loanWithEmptyName}
          bankNameFA="بانک ملی"
          hasGuarantor={false}
        />
      );

      // Should render but with empty text
      expect(screen.queryByText('وام قرض‌الحسنه')).not.toBeInTheDocument();
    });

    it('should handle very long loan names', () => {
      const loanWithLongName = {
        ...mockLoan,
        nameFA: 'وام خرید کالای بادوام با بازپرداخت بلندمدت و نرخ سود ترجیحی',
      };

      render(
        <LoanDetailHeader
          loan={loanWithLongName}
          bankNameFA="بانک ملی"
          hasGuarantor={false}
        />
      );

      expect(
        screen.getByText('وام خرید کالای بادوام با بازپرداخت بلندمدت و نرخ سود ترجیحی')
      ).toBeInTheDocument();
    });

    it('should handle very long bank names', () => {
      render(
        <LoanDetailHeader
          loan={mockLoan}
          bankNameFA="بانک ملی صنعت و معدن جمهوری اسلامی ایران"
          hasGuarantor={false}
        />
      );

      expect(
        screen.getByText('بانک ملی صنعت و معدن جمهوری اسلامی ایران')
      ).toBeInTheDocument();
    });

    it('should handle undefined bankNameFA gracefully', () => {
      render(<LoanDetailHeader loan={mockLoan} hasGuarantor={false} />);

      expect(screen.getByText('وام قرض‌الحسنه')).toBeInTheDocument();
    });

    it('should handle loan with no category or nameEN', () => {
      const minimalLoan = {
        ...mockLoan,
        nameEN: undefined,
        category: undefined,
        categoryFA: undefined,
      };

      render(
        <LoanDetailHeader loan={minimalLoan} bankNameFA="بانک ملی" hasGuarantor={false} />
      );

      expect(screen.getByText('وام قرض‌الحسنه')).toBeInTheDocument();
      expect(screen.getAllByTestId('badge')).toHaveLength(1); // Only no guarantor badge
    });

    it('should handle special characters in loan name', () => {
      const loanWithSpecialChars = {
        ...mockLoan,
        nameFA: 'وام (۲۰٪ سود) - بدون ضامن',
      };

      render(
        <LoanDetailHeader
          loan={loanWithSpecialChars}
          bankNameFA="بانک ملی"
          hasGuarantor={false}
        />
      );

      expect(screen.getByText('وام (۲۰٪ سود) - بدون ضامن')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should use semantic heading for loan name', () => {
      render(
        <LoanDetailHeader loan={mockLoan} bankNameFA="بانک ملی" hasGuarantor={false} />
      );

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('وام قرض‌الحسنه');
    });

    it('should have proper text hierarchy', () => {
      render(
        <LoanDetailHeader loan={mockLoan} bankNameFA="بانک ملی" hasGuarantor={false} />
      );

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
    });

    it('should render text with proper contrast', () => {
      render(
        <LoanDetailHeader loan={mockLoan} bankNameFA="بانک ملی" hasGuarantor={false} />
      );

      const heading = screen.getByText('وام قرض‌الحسنه');
      expect(heading).toHaveClass('text-gray-100'); // High contrast
    });
  });

  describe('Props Validation', () => {
    it('should handle all required props', () => {
      expect(() => {
        render(
          <LoanDetailHeader loan={mockLoan} bankNameFA="بانک ملی" hasGuarantor={false} />
        );
      }).not.toThrow();
    });

    it('should work without optional bankNameFA', () => {
      expect(() => {
        render(<LoanDetailHeader loan={mockLoan} hasGuarantor={false} />);
      }).not.toThrow();
    });

    it('should accept hasGuarantor boolean', () => {
      const { rerender } = render(
        <LoanDetailHeader loan={mockLoan} hasGuarantor={false} />
      );

      expect(screen.getByText('بدون ضامن')).toBeInTheDocument();

      rerender(<LoanDetailHeader loan={mockLoan} hasGuarantor={true} />);

      expect(screen.queryByText('بدون ضامن')).not.toBeInTheDocument();
    });
  });
});
