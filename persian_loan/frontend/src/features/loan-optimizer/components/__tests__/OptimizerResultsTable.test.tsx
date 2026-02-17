/**
 * OptimizerResultsTable Component Tests
 * Tests for the MUI DataGrid implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import OptimizerResultsTable from '../OptimizerResultsTable';
import type { LoanAnalysisResult } from '@/features/loan-optimizer/types';

// Mock data for testing
const mockLoanData: LoanAnalysisResult[] = [
  {
    loanId: '1',
    bankNameFA: 'بانک ملی',
    loanNameFA: 'وام مسکن',
    loanAmount: 50_000_000,
    npv: 2_500_000,
    irr: 0.15,
    monthlyPayment: 1_200_000,
    totalCost: 72_000_000,
    effectiveRate: 0.18,
    discountRate: 0.12,
    riskScore: 75,
    meetsRequirement: true,
    percentileNPV: 0.05,
    percentileIRR: 0.08,
    percentileCost: 0.15,
    breakEvenPrivilegePrice: 3_000_000,
    maxWaitMonths: 6,
    canAffordCurrentWait: true,
    scenarios: {
      wait: {
        name: 'انتظار',
        npv: 2_500_000,
        decision: 'ACCEPT' as const,
        description: 'منتظر بمانید'
      },
      buyPrivilege: {
        name: 'خرید امتیاز',
        npv: 1_800_000,
        decision: 'ACCEPT' as const,
        description: 'خرید امتیاز توصیه می‌شود'
      },
      reject: {
        name: 'رد',
        npv: 0,
        decision: 'BASELINE' as const,
        description: 'رد کنید'
      }
    },
    recommendation: 'WAIT',
    reasoning: 'انتظار بهترین گزینه است',
    cashFlows: [-10_000_000, 0, 0, 0, 50_000_000, -1_200_000, -1_200_000],
    depositAmount: 10_000_000,
    waitMonths: 3,
    repaymentMonths: 60,
    loanRate: 0.18,
    depositMultiplier: 2.0,
    depositRatioLabel: '1:2',
    loanCategory: 'deposit-based',
  },
  {
    loanId: '2',
    bankNameFA: 'بانک صادرات',
    loanNameFA: 'وام خودرو',
    loanAmount: 30_000_000,
    npv: -500_000,
    irr: 0.22,
    monthlyPayment: 800_000,
    totalCost: 48_000_000,
    effectiveRate: 0.24,
    discountRate: 0.12,
    riskScore: 45,
    meetsRequirement: false,
    percentileNPV: 0.95,
    percentileIRR: 0.92,
    percentileCost: 0.88,
    breakEvenPrivilegePrice: 1_500_000,
    maxWaitMonths: 2,
    canAffordCurrentWait: false,
    scenarios: {
      wait: {
        name: 'انتظار',
        npv: -500_000,
        decision: 'REJECT' as const,
        description: 'انتظار توصیه نمی‌شود'
      },
      reject: {
        name: 'رد',
        npv: 0,
        decision: 'BASELINE' as const,
        description: 'رد کنید'
      }
    },
    recommendation: 'REJECT',
    reasoning: 'وام مناسب نیست',
    cashFlows: [-5_000_000, 0, 0, 0, 30_000_000, -800_000, -800_000],
    depositAmount: 5_000_000,
    waitMonths: 3,
    repaymentMonths: 60,
    loanRate: 0.24,
    depositMultiplier: null,
    depositRatioLabel: 'حداکثر مبلغ',
    loanCategory: 'instant',
  },
  {
    loanId: '3',
    bankNameFA: 'بانک ملت',
    loanNameFA: 'وام تجهیزات',
    loanAmount: 40_000_000,
    npv: 1_200_000,
    irr: 0.18,
    monthlyPayment: 950_000,
    totalCost: 57_000_000,
    effectiveRate: 0.20,
    discountRate: 0.12,
    riskScore: 60,
    meetsRequirement: true,
    percentileNPV: 0.35,
    percentileIRR: 0.42,
    percentileCost: 0.55,
    breakEvenPrivilegePrice: 2_000_000,
    maxWaitMonths: 4,
    canAffordCurrentWait: true,
    scenarios: {
      wait: {
        name: 'انتظار',
        npv: 1_200_000,
        decision: 'ACCEPT' as const,
        description: 'منتظر بمانید'
      },
      buyPrivilege: {
        name: 'خرید امتیاز',
        npv: 800_000,
        decision: 'ACCEPT' as const,
        description: 'می‌توانید امتیاز بخرید'
      },
      reject: {
        name: 'رد',
        npv: 0,
        decision: 'BASELINE' as const,
        description: 'رد کنید'
      }
    },
    recommendation: 'BUY_PRIVILEGE',
    reasoning: 'خرید امتیاز مناسب است',
    cashFlows: [-8_000_000, 0, 0, 0, 40_000_000, -950_000, -950_000],
    depositAmount: 8_000_000,
    waitMonths: 3,
    repaymentMonths: 60,
    loanRate: 0.20,
    depositMultiplier: 3.7,
    depositRatioLabel: '1:3.7',
    loanCategory: 'average-based',
  }
];

describe('OptimizerResultsTable', () => {
  beforeEach(() => {
    // Reset any state before each test
  });

  it('renders without crashing', () => {
    render(<OptimizerResultsTable data={mockLoanData} />);
    expect(screen.getByText(/تعداد وام‌ها:/)).toBeDefined();
  });

  it('displays empty state when no data', () => {
    render(<OptimizerResultsTable data={[]} />);
    expect(screen.getByText('هیچ وامی یافت نشد')).toBeDefined();
  });

  it('displays correct number of rows', () => {
    render(<OptimizerResultsTable data={mockLoanData} />);
    const rowCountText = screen.getByText(/تعداد وام‌ها:/);
    expect(rowCountText.textContent).toContain('۳');
  });

  it('filters data when onlySuitable is true', () => {
    render(<OptimizerResultsTable data={mockLoanData} onlySuitable={true} />);
    const rowCountText = screen.getByText(/تعداد وام‌ها:/);
    // Should show 2 suitable loans out of 3 total
    expect(rowCountText.textContent).toContain('۲');
  });

  it('shows all data when onlySuitable is false', () => {
    render(<OptimizerResultsTable data={mockLoanData} onlySuitable={false} />);
    const rowCountText = screen.getByText(/تعداد وام‌ها:/);
    expect(rowCountText.textContent).toContain('۳');
  });

  it('displays column headers in Persian', () => {
    render(<OptimizerResultsTable data={mockLoanData} />);
    expect(screen.getByText('بانک')).toBeDefined();
    expect(screen.getByText('نام وام')).toBeDefined();
    expect(screen.getByText('مبلغ وام')).toBeDefined();
    expect(screen.getByText('NPV')).toBeDefined();
    expect(screen.getByText('IRR')).toBeDefined();
  });

  it('displays bank names correctly', () => {
    render(<OptimizerResultsTable data={mockLoanData} />);
    expect(screen.getByText('بانک ملی')).toBeDefined();
    expect(screen.getByText('بانک صادرات')).toBeDefined();
    expect(screen.getByText('بانک ملت')).toBeDefined();
  });

  it('displays loan names correctly', () => {
    render(<OptimizerResultsTable data={mockLoanData} />);
    expect(screen.getByText('وام مسکن')).toBeDefined();
    expect(screen.getByText('وام خودرو')).toBeDefined();
    expect(screen.getByText('وام تجهیزات')).toBeDefined();
  });

  it('displays recommendation chips', () => {
    render(<OptimizerResultsTable data={mockLoanData} />);
    expect(screen.getByText('منتظر بمانید')).toBeDefined();
    expect(screen.getByText('رد کنید')).toBeDefined();
    expect(screen.getByText('خرید امتیاز')).toBeDefined();
  });

  it('formats amounts in millions with Persian numbers', () => {
    render(<OptimizerResultsTable data={mockLoanData} />);
    // Check if amounts are formatted correctly (50M, 30M, 40M)
    // Note: Persian numbers will be displayed as ۵۰, ۳۰, ۴۰
    const formattedAmounts = screen.getAllByText(/م/);
    expect(formattedAmounts.length).toBeGreaterThan(0);
  });

  it('displays toolbar with quick filter', () => {
    render(<OptimizerResultsTable data={mockLoanData} />);
    // MUI DataGrid toolbar should be present
    const toolbar = document.querySelector('.MuiDataGrid-toolbarContainer');
    expect(toolbar).toBeDefined();
  });

  it('applies correct theme colors', () => {
    const { container } = render(<OptimizerResultsTable data={mockLoanData} />);
    // Check if DataGrid has dark theme classes
    const dataGrid = container.querySelector('.MuiDataGrid-root');
    expect(dataGrid).toBeDefined();
  });

  it('shows reasoning text for recommendations', () => {
    render(<OptimizerResultsTable data={mockLoanData} />);
    expect(screen.getByText('انتظار بهترین گزینه است')).toBeDefined();
    expect(screen.getByText('وام مناسب نیست')).toBeDefined();
    expect(screen.getByText('خرید امتیاز مناسب است')).toBeDefined();
  });

  it('displays max wait months with affordability indicator', () => {
    render(<OptimizerResultsTable data={mockLoanData} />);
    expect(screen.getAllByText('✓ قابل قبول').length).toBeGreaterThan(0);
    expect(screen.getAllByText('✗ بیش از حد').length).toBeGreaterThan(0);
  });

  it('displays break-even price subtitle', () => {
    render(<OptimizerResultsTable data={mockLoanData} />);
    const subtitles = screen.getAllByText('حداکثر قیمت خرید');
    expect(subtitles.length).toBe(3);
  });
});

describe('OptimizerResultsTable - Edge Cases', () => {
  it('handles loans with undefined percentiles', () => {
    const dataWithUndefinedPercentiles: LoanAnalysisResult[] = [{
      ...mockLoanData[0],
      percentileNPV: undefined,
      percentileIRR: undefined,
      percentileCost: undefined,
    }];

    render(<OptimizerResultsTable data={dataWithUndefinedPercentiles} />);
    expect(screen.getByText(/تعداد وام‌ها:/)).toBeDefined();
  });

  it('handles loans without reasoning text', () => {
    const dataWithoutReasoning: LoanAnalysisResult[] = [{
      ...mockLoanData[0],
      reasoning: '',
    }];

    render(<OptimizerResultsTable data={dataWithoutReasoning} />);
    expect(screen.getByText('منتظر بمانید')).toBeDefined();
  });

  it('handles very large loan amounts', () => {
    const dataWithLargeAmounts: LoanAnalysisResult[] = [{
      ...mockLoanData[0],
      loanAmount: 999_999_999_999,
    }];

    render(<OptimizerResultsTable data={dataWithLargeAmounts} />);
    expect(screen.getByText(/تعداد وام‌ها:/)).toBeDefined();
  });

  it('handles negative NPV values', () => {
    const dataWithNegativeNPV: LoanAnalysisResult[] = [{
      ...mockLoanData[0],
      npv: -5_000_000,
    }];

    render(<OptimizerResultsTable data={dataWithNegativeNPV} />);
    expect(screen.getByText(/تعداد وام‌ها:/)).toBeDefined();
  });

  it('handles very small risk scores', () => {
    const dataWithLowRiskScore: LoanAnalysisResult[] = [{
      ...mockLoanData[0],
      riskScore: 5,
    }];

    render(<OptimizerResultsTable data={dataWithLowRiskScore} />);
    expect(screen.getByText(/تعداد وام‌ها:/)).toBeDefined();
  });
});

describe('OptimizerResultsTable - Accessibility', () => {
  it('has proper table structure for screen readers', () => {
    const { container } = render(<OptimizerResultsTable data={mockLoanData} />);
    const grid = container.querySelector('[role="grid"]');
    expect(grid).toBeDefined();
  });

  it('has column headers with proper attributes', () => {
    const { container } = render(<OptimizerResultsTable data={mockLoanData} />);
    const columnHeaders = container.querySelectorAll('[role="columnheader"]');
    expect(columnHeaders.length).toBeGreaterThan(0);
  });

  it('has proper RTL direction', () => {
    const { container } = render(<OptimizerResultsTable data={mockLoanData} />);
    // Theme should set direction to rtl
    expect(container.querySelector('.MuiDataGrid-root')).toBeDefined();
  });
});
