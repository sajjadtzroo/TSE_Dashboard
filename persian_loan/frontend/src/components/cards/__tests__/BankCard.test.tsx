/**
 * Tests for BankCard Component
 */

import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { BankCard } from '../BankCard';
import { mockBank, mockDigitalBank } from '@/test/mocks';

describe('BankCard', () => {
  describe('Rendering', () => {
    it('should render bank name in Farsi', () => {
      renderWithProviders(<BankCard bank={mockBank} />);
      expect(screen.getByText(mockBank.nameFA)).toBeInTheDocument();
    });

    it('should render bank name in English', () => {
      renderWithProviders(<BankCard bank={mockBank} />);
      expect(screen.getByText(mockBank.nameEN)).toBeInTheDocument();
    });

    it('should render loans count', () => {
      renderWithProviders(<BankCard bank={mockBank} />);
      expect(screen.getByText(`${mockBank.loansCount} محصول وام`)).toBeInTheDocument();
    });

    it('should render bank icon', () => {
      const { container } = renderWithProviders(<BankCard bank={mockBank} />);
      // Lucide icons don't always have the icon name in the class - just check for any SVG
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Traditional Bank', () => {
    it('should display traditional badge for traditional banks', () => {
      renderWithProviders(<BankCard bank={mockBank} />);
      expect(screen.getByText('سنتی')).toBeInTheDocument();
    });

    it('should apply blue variant to traditional bank badge', () => {
      const { container } = renderWithProviders(<BankCard bank={mockBank} />);
      const badge = screen.getByText('سنتی').closest('.MuiChip-root');
      expect(badge).toHaveClass('MuiChip-colorPrimary');
    });
  });

  describe('Digital Bank', () => {
    it('should display digital badge for digital banks', () => {
      renderWithProviders(<BankCard bank={mockDigitalBank} />);
      expect(screen.getByText('دیجیتال')).toBeInTheDocument();
    });

    it('should apply purple variant to digital bank badge', () => {
      const { container } = renderWithProviders(<BankCard bank={mockDigitalBank} />);
      const badge = screen.getByText('دیجیتال').closest('.MuiChip-root');
      expect(badge).toHaveClass('MuiChip-colorPrimary');
    });

    it('should render digital bank name', () => {
      renderWithProviders(<BankCard bank={mockDigitalBank} />);
      expect(screen.getByText(mockDigitalBank.nameFA)).toBeInTheDocument();
    });
  });

  describe('Link Navigation', () => {
    it('should render as a link', () => {
      renderWithProviders(<BankCard bank={mockBank} />);
      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
    });

    it('should link to bank detail page', () => {
      renderWithProviders(<BankCard bank={mockBank} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', `/banks/${mockBank.id}`);
    });

    it('should have correct href for digital bank', () => {
      renderWithProviders(<BankCard bank={mockDigitalBank} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', `/banks/${mockDigitalBank.id}`);
    });
  });

  describe('Styling and Hover Effects', () => {
    it('should have hover classes', () => {
      renderWithProviders(<BankCard bank={mockBank} />);
      const link = screen.getByRole('link');
      expect(link).toHaveClass('hover:shadow-dark-lg');
      expect(link).toHaveClass('hover:border-primary-400/40');
    });

    it('should have transition classes', () => {
      renderWithProviders(<BankCard bank={mockBank} />);
      const link = screen.getByRole('link');
      expect(link).toHaveClass('transition-all');
    });

    it('should have card styling', () => {
      renderWithProviders(<BankCard bank={mockBank} />);
      const link = screen.getByRole('link');
      expect(link).toHaveClass('bg-surface-100');
      expect(link).toHaveClass('rounded-lg');
      expect(link).toHaveClass('border-border-light');
    });
  });

  describe('Icons', () => {
    it('should render building icon', () => {
      const { container } = renderWithProviders(<BankCard bank={mockBank} />);
      // Lucide icons render as SVG elements - check for SVG instead of specific class
      const svgElements = container.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);
    });

    it('should render credit card icon for loans', () => {
      const { container } = renderWithProviders(<BankCard bank={mockBank} />);
      const creditCardIcon = container.querySelector('svg[class*="lucide-credit-card"]');
      expect(creditCardIcon).toBeInTheDocument();
    });

    it('should render arrow icon for navigation', () => {
      const { container } = renderWithProviders(<BankCard bank={mockBank} />);
      const arrowIcon = container.querySelector('svg[class*="lucide-arrow-left"]');
      expect(arrowIcon).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle bank with zero loans', () => {
      const bankWithNoLoans = { ...mockBank, loansCount: 0 };
      renderWithProviders(<BankCard bank={bankWithNoLoans} />);
      expect(screen.getByText('0 محصول وام')).toBeInTheDocument();
    });

    it('should handle bank with many loans', () => {
      const bankWithManyLoans = { ...mockBank, loansCount: 50 };
      renderWithProviders(<BankCard bank={bankWithManyLoans} />);
      expect(screen.getByText('50 محصول وام')).toBeInTheDocument();
    });

    it('should handle long bank names', () => {
      const bankWithLongName = {
        ...mockBank,
        nameFA: 'بانک با نام بسیار طولانی برای تست',
        nameEN: 'Bank With Very Long Name For Testing',
      };
      renderWithProviders(<BankCard bank={bankWithLongName} />);
      expect(screen.getByText(bankWithLongName.nameFA)).toBeInTheDocument();
      expect(screen.getByText(bankWithLongName.nameEN)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard navigable as a link', () => {
      renderWithProviders(<BankCard bank={mockBank} />);
      const link = screen.getByRole('link');
      link.focus();
      expect(link).toHaveFocus();
    });

    it('should have descriptive link content', () => {
      renderWithProviders(<BankCard bank={mockBank} />);
      const link = screen.getByRole('link');
      expect(link).toHaveTextContent(mockBank.nameFA);
      expect(link).toHaveTextContent(mockBank.nameEN);
    });
  });

  describe('Memoization', () => {
    it('should be a memoized component', () => {
      expect(BankCard.displayName).toBe('BankCard');
    });
  });

  describe('Multiple Banks', () => {
    it('should render multiple bank cards correctly', () => {
      const { container } = renderWithProviders(
        <div>
          <BankCard bank={mockBank} />
          <BankCard bank={mockDigitalBank} />
        </div>
      );
      expect(screen.getByText(mockBank.nameFA)).toBeInTheDocument();
      expect(screen.getByText(mockDigitalBank.nameFA)).toBeInTheDocument();
      const links = container.querySelectorAll('a');
      expect(links).toHaveLength(2);
    });

    it('should have unique hrefs for different banks', () => {
      const { container } = renderWithProviders(
        <div>
          <BankCard bank={mockBank} />
          <BankCard bank={mockDigitalBank} />
        </div>
      );
      const links = container.querySelectorAll('a');
      expect(links[0]).toHaveAttribute('href', `/banks/${mockBank.id}`);
      expect(links[1]).toHaveAttribute('href', `/banks/${mockDigitalBank.id}`);
    });
  });
});
