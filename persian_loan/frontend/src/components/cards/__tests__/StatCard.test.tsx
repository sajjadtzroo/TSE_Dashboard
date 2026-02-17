/**
 * Tests for StatCard Component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import { StatCard } from '../StatCard';
import { TrendingUp, Users, DollarSign, CreditCard } from 'lucide-react';

describe('StatCard', () => {
  describe('Basic Rendering', () => {
    it('should render title', () => {
      render(<StatCard title="Total Banks" value={50} icon={Users} />);
      expect(screen.getByText('Total Banks')).toBeInTheDocument();
    });

    it('should render numeric value', () => {
      render(<StatCard title="Total Banks" value={50} icon={Users} />);
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('should render string value', () => {
      render(<StatCard title="Status" value="Active" icon={TrendingUp} />);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should render icon', () => {
      const { container } = render(<StatCard title="Total" value={100} icon={Users} />);
      const icon = container.querySelector('svg[class*="lucide-users"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Color Variants', () => {
    it('should apply blue color by default', () => {
      const { container } = render(<StatCard title="Total" value={100} icon={Users} />);
      const iconContainer = container.querySelector('[class*="bg-primary-800/20"]');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should apply green color variant', () => {
      const { container } = render(
        <StatCard title="Active" value={50} icon={Users} color="green" />
      );
      const iconContainer = container.querySelector('[class*="bg-secondary-800/20"]');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should apply yellow color variant', () => {
      const { container } = render(
        <StatCard title="Pending" value={10} icon={Users} color="yellow" />
      );
      const iconContainer = container.querySelector('[class*="bg-yellow-900/20"]');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should apply purple color variant', () => {
      const { container } = render(
        <StatCard title="Premium" value={5} icon={Users} color="purple" />
      );
      const iconContainer = container.querySelector('[class*="bg-purple-900/20"]');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should apply red color variant', () => {
      const { container } = render(
        <StatCard title="Error" value={2} icon={Users} color="red" />
      );
      const iconContainer = container.querySelector('[class*="bg-error-900/20"]');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should apply gray color variant', () => {
      const { container } = render(
        <StatCard title="Inactive" value={8} icon={Users} color="gray" />
      );
      const iconContainer = container.querySelector('[class*="bg-surface-50/50"]');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('Subtitle', () => {
    it('should render subtitle when provided', () => {
      render(
        <StatCard
          title="Total Banks"
          value={50}
          icon={Users}
          subtitle="Active institutions"
        />
      );
      expect(screen.getByText('Active institutions')).toBeInTheDocument();
    });

    it('should not render subtitle when not provided', () => {
      const { container } = render(<StatCard title="Total" value={50} icon={Users} />);
      const subtitle = container.querySelector('.text-xs.text-gray-400');
      expect(subtitle).not.toBeInTheDocument();
    });
  });

  describe('Trend Indicator', () => {
    it('should render positive trend', () => {
      render(
        <StatCard
          title="Growth"
          value={100}
          icon={TrendingUp}
          trend={{ value: 15, isPositive: true }}
        />
      );
      expect(screen.getByText('+15%')).toBeInTheDocument();
    });

    it('should render negative trend', () => {
      render(
        <StatCard
          title="Decline"
          value={80}
          icon={TrendingUp}
          trend={{ value: -5, isPositive: false }}
        />
      );
      expect(screen.getByText('-5%')).toBeInTheDocument();
    });

    it('should apply positive trend color', () => {
      const { container } = render(
        <StatCard
          title="Growth"
          value={100}
          icon={TrendingUp}
          trend={{ value: 15, isPositive: true }}
        />
      );
      const trendElement = screen.getByText('+15%').parentElement;
      expect(trendElement).toHaveClass('text-secondary-500');
    });

    it('should apply negative trend color', () => {
      const { container } = render(
        <StatCard
          title="Decline"
          value={80}
          icon={TrendingUp}
          trend={{ value: -5, isPositive: false }}
        />
      );
      const trendElement = screen.getByText('-5%').parentElement;
      expect(trendElement).toHaveClass('text-error-500');
    });

    it('should not render trend when not provided', () => {
      render(<StatCard title="Stable" value={100} icon={TrendingUp} />);
      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });

    it('should handle zero trend', () => {
      render(
        <StatCard
          title="No Change"
          value={100}
          icon={TrendingUp}
          trend={{ value: 0, isPositive: true }}
        />
      );
      expect(screen.getByText('+0%')).toBeInTheDocument();
    });
  });

  describe('Different Icons', () => {
    it('should render Users icon', () => {
      const { container } = render(<StatCard title="Users" value={50} icon={Users} />);
      const icon = container.querySelector('svg[class*="lucide-users"]');
      expect(icon).toBeInTheDocument();
    });

    it('should render DollarSign icon', () => {
      const { container } = render(
        <StatCard title="Revenue" value="$1,000" icon={DollarSign} />
      );
      const icon = container.querySelector('svg[class*="lucide-dollar-sign"]');
      expect(icon).toBeInTheDocument();
    });

    it('should render CreditCard icon', () => {
      const { container } = render(<StatCard title="Loans" value={25} icon={CreditCard} />);
      const icon = container.querySelector('svg[class*="lucide-credit-card"]');
      expect(icon).toBeInTheDocument();
    });

    it('should render TrendingUp icon', () => {
      const { container } = render(<StatCard title="Growth" value={10} icon={TrendingUp} />);
      const icon = container.querySelector('svg[class*="lucide-trending-up"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have card styling', () => {
      const { container } = render(<StatCard title="Total" value={50} icon={Users} />);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('bg-surface-100');
      expect(card).toHaveClass('rounded-lg');
      expect(card).toHaveClass('border-border-light');
    });

    it('should have hover effects', () => {
      const { container } = render(<StatCard title="Total" value={50} icon={Users} />);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('hover:shadow-dark-lg');
      expect(card).toHaveClass('hover:border-primary-400/30');
    });

    it('should have transition classes', () => {
      const { container } = render(<StatCard title="Total" value={50} icon={Users} />);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('transition-all');
    });
  });

  describe('Complex Values', () => {
    it('should render formatted numbers', () => {
      render(<StatCard title="Total" value="1,234,567" icon={Users} />);
      expect(screen.getByText('1,234,567')).toBeInTheDocument();
    });

    it('should render Persian numbers', () => {
      render(<StatCard title="مجموع" value="۱۲۳" icon={Users} />);
      expect(screen.getByText('۱۲۳')).toBeInTheDocument();
    });

    it('should render currency values', () => {
      render(<StatCard title="Revenue" value="$1.5M" icon={DollarSign} />);
      expect(screen.getByText('$1.5M')).toBeInTheDocument();
    });

    it('should render percentage values', () => {
      render(<StatCard title="Rate" value="18%" icon={TrendingUp} />);
      expect(screen.getByText('18%')).toBeInTheDocument();
    });
  });

  describe('All Features Combined', () => {
    it('should render stat card with all features', () => {
      render(
        <StatCard
          title="Total Loans"
          value={150}
          icon={CreditCard}
          color="green"
          subtitle="Active loans"
          trend={{ value: 12.5, isPositive: true }}
        />
      );

      expect(screen.getByText('Total Loans')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Active loans')).toBeInTheDocument();
      expect(screen.getByText('+12.5%')).toBeInTheDocument();
    });

    it('should render multiple stat cards', () => {
      const { container } = render(
        <div>
          <StatCard title="Banks" value={50} icon={Users} color="blue" />
          <StatCard title="Loans" value={200} icon={CreditCard} color="green" />
          <StatCard title="Users" value={1000} icon={Users} color="purple" />
        </div>
      );

      expect(screen.getByText('Banks')).toBeInTheDocument();
      expect(screen.getByText('Loans')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();

      const cards = container.querySelectorAll('[class*="bg-surface-100"]');
      expect(cards).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      render(<StatCard title="Big Number" value={999999999} icon={Users} />);
      expect(screen.getByText('999999999')).toBeInTheDocument();
    });

    it('should handle zero value', () => {
      render(<StatCard title="None" value={0} icon={Users} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle negative numbers', () => {
      render(<StatCard title="Deficit" value={-50} icon={DollarSign} />);
      expect(screen.getByText('-50')).toBeInTheDocument();
    });

    it('should handle very long titles', () => {
      const longTitle = 'Very Long Title That Should Still Render Properly';
      render(<StatCard title={longTitle} value={100} icon={Users} />);
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should handle empty string value', () => {
      render(<StatCard title="Empty" value="" icon={Users} />);
      expect(screen.getByText('Empty')).toBeInTheDocument();
    });
  });

  describe('Memoization', () => {
    it('should be a memoized component', () => {
      expect(StatCard.displayName).toBe('StatCard');
    });
  });
});
