/**
 * Tests for Badge Component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import { Badge } from '../Badge';

describe('Badge', () => {
  describe('Rendering', () => {
    it('should render badge with text', () => {
      render(<Badge>Badge Text</Badge>);
      expect(screen.getByText('Badge Text')).toBeInTheDocument();
    });

    it('should render badge with number', () => {
      render(<Badge>123</Badge>);
      expect(screen.getByText('123')).toBeInTheDocument();
    });

    it('should render badge with Persian text', () => {
      render(<Badge>بانک دیجیتال</Badge>);
      expect(screen.getByText('بانک دیجیتال')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should apply gray variant by default', () => {
      const { container } = render(<Badge>Default</Badge>);
      const chip = container.querySelector('.MuiChip-root');
      expect(chip).toHaveClass('MuiChip-colorDefault');
    });

    it('should apply blue variant (primary color)', () => {
      const { container } = render(<Badge variant="blue">Blue</Badge>);
      const chip = container.querySelector('.MuiChip-root');
      expect(chip).toHaveClass('MuiChip-colorPrimary');
    });

    it('should apply green variant (success color)', () => {
      const { container } = render(<Badge variant="green">Green</Badge>);
      const chip = container.querySelector('.MuiChip-root');
      expect(chip).toHaveClass('MuiChip-colorSuccess');
    });

    it('should apply yellow variant (warning color)', () => {
      const { container } = render(<Badge variant="yellow">Yellow</Badge>);
      const chip = container.querySelector('.MuiChip-root');
      expect(chip).toHaveClass('MuiChip-colorWarning');
    });

    it('should apply red variant (error color)', () => {
      const { container } = render(<Badge variant="red">Red</Badge>);
      const chip = container.querySelector('.MuiChip-root');
      expect(chip).toHaveClass('MuiChip-colorError');
    });

    it('should apply purple variant with custom styles', () => {
      const { container } = render(<Badge variant="purple">Purple</Badge>);
      const chip = container.querySelector('.MuiChip-root');
      expect(chip).toBeInTheDocument();
      // Purple variant uses primary color but with custom sx styles
      expect(chip).toHaveClass('MuiChip-colorPrimary');
    });
  });

  describe('Sizes', () => {
    it('should apply medium size by default', () => {
      const { container } = render(<Badge>Medium</Badge>);
      const chip = container.querySelector('.MuiChip-root');
      expect(chip).toHaveClass('MuiChip-sizeMedium');
    });

    it('should apply small size', () => {
      const { container } = render(<Badge size="sm">Small</Badge>);
      const chip = container.querySelector('.MuiChip-root');
      expect(chip).toHaveClass('MuiChip-sizeSmall');
    });

    it('should apply medium size explicitly', () => {
      const { container } = render(<Badge size="md">Medium</Badge>);
      const chip = container.querySelector('.MuiChip-root');
      expect(chip).toHaveClass('MuiChip-sizeMedium');
    });
  });

  describe('Custom className', () => {
    it('should accept custom className', () => {
      const { container } = render(<Badge className="custom-badge">Custom</Badge>);
      const chip = container.querySelector('.MuiChip-root');
      expect(chip).toHaveClass('custom-badge');
    });

    it('should merge custom className with MUI classes', () => {
      const { container } = render(<Badge className="ml-2">Margin</Badge>);
      const chip = container.querySelector('.MuiChip-root');
      expect(chip).toHaveClass('ml-2');
      expect(chip).toHaveClass('MuiChip-root');
    });
  });

  describe('MUI Integration', () => {
    it('should use MUI Chip component', () => {
      const { container } = render(<Badge>MUI Badge</Badge>);
      const chip = container.querySelector('.MuiChip-root');
      expect(chip).toBeInTheDocument();
    });

    it('should use outlined variant', () => {
      const { container } = render(<Badge>Outlined</Badge>);
      const chip = container.querySelector('.MuiChip-root');
      expect(chip).toHaveClass('MuiChip-outlined');
    });

    it('should render as MuiChip label', () => {
      const { container } = render(<Badge>Label</Badge>);
      const label = container.querySelector('.MuiChip-label');
      expect(label).toHaveTextContent('Label');
    });
  });

  describe('Multiple badges', () => {
    it('should render multiple badges correctly', () => {
      render(
        <div>
          <Badge variant="blue">Blue</Badge>
          <Badge variant="green">Green</Badge>
          <Badge variant="red">Red</Badge>
        </div>
      );
      expect(screen.getByText('Blue')).toBeInTheDocument();
      expect(screen.getByText('Green')).toBeInTheDocument();
      expect(screen.getByText('Red')).toBeInTheDocument();
    });

    it('should render badges with different sizes', () => {
      const { container } = render(
        <div>
          <Badge size="sm">Small</Badge>
          <Badge size="md">Medium</Badge>
        </div>
      );
      const chips = container.querySelectorAll('.MuiChip-root');
      expect(chips[0]).toHaveClass('MuiChip-sizeSmall');
      expect(chips[1]).toHaveClass('MuiChip-sizeMedium');
    });
  });

  describe('Accessibility', () => {
    it('should be readable by screen readers', () => {
      render(<Badge>Accessible Badge</Badge>);
      expect(screen.getByText('Accessible Badge')).toBeInTheDocument();
    });

    it('should render status badge', () => {
      render(<Badge variant="green">Active</Badge>);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should render category badge', () => {
      render(<Badge variant="purple">بانک دیجیتال</Badge>);
      expect(screen.getByText('بانک دیجیتال')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      const { container } = render(<Badge>{''}</Badge>);
      const chip = container.querySelector('.MuiChip-root');
      expect(chip).toBeInTheDocument();
    });

    it('should handle very long text', () => {
      const longText = 'Very long badge text that might need to be truncated';
      render(<Badge>{longText}</Badge>);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('should handle special characters', () => {
      render(<Badge>۱۸٪ - 100%</Badge>);
      expect(screen.getByText('۱۸٪ - 100%')).toBeInTheDocument();
    });
  });

  describe('Variant combinations with size', () => {
    it('should combine blue variant with small size', () => {
      const { container } = render(
        <Badge variant="blue" size="sm">
          Small Blue
        </Badge>
      );
      const chip = container.querySelector('.MuiChip-root');
      expect(chip).toHaveClass('MuiChip-colorPrimary');
      expect(chip).toHaveClass('MuiChip-sizeSmall');
    });

    it('should combine success variant with medium size', () => {
      const { container } = render(
        <Badge variant="green" size="md">
          Medium Green
        </Badge>
      );
      const chip = container.querySelector('.MuiChip-root');
      expect(chip).toHaveClass('MuiChip-colorSuccess');
      expect(chip).toHaveClass('MuiChip-sizeMedium');
    });
  });
});
