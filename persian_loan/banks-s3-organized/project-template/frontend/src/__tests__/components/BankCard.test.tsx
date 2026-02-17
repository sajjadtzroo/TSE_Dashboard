/**
 * Tests for BankCard Component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/testUtils';
import { BankCard } from '../../components/cards/BankCard';

describe('BankCard', () => {
  const mockBank = {
    id: 'test-bank',
    nameFA: 'بانک تست',
    nameEN: 'Test Bank',
    category: 'traditional-banks' as const,
    type: 'traditional',
    loansCount: 5,
    calculationMethod: 'points-based',
    loanTypes: [],
  };

  it('should render bank name in Farsi', () => {
    render(<BankCard bank={mockBank} />);
    expect(screen.getByText('بانک تست')).toBeInTheDocument();
  });

  it('should display loans count', () => {
    render(<BankCard bank={mockBank} />);
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it('should show bank category badge', () => {
    render(<BankCard bank={mockBank} />);
    // Badge should contain category info
    const element = screen.getByText('traditional-banks');
    expect(element).toBeInTheDocument();
  });

  it('should handle missing optional fields', () => {
    const minimalBank = {
      id: 'minimal-bank',
      nameFA: 'بانک ساده',
      nameEN: 'Simple Bank',
      category: 'digital-banks' as const,
      loansCount: 0,
      loanTypes: [],
    };

    render(<BankCard bank={minimalBank} />);
    expect(screen.getByText('بانک ساده')).toBeInTheDocument();
  });
});
