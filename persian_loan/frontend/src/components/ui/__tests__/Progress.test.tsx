/**
 * Tests for Progress and CircularProgress Components
 *
 * Covers: linear progress rendering, percentage calculation, size variants,
 * color variants, label display, className passthrough, edge cases,
 * circular progress rendering, SVG structure, and module exports.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Progress, CircularProgress } from '../Progress';

// ===========================================================================
// Progress (Linear) Component
// ===========================================================================

describe('Progress', () => {
  // -------------------------------------------------------------------------
  // Default rendering
  // -------------------------------------------------------------------------

  describe('default rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<Progress value={50} />);
      expect(container.firstElementChild).toBeInTheDocument();
    });

    it('should render the outer container with w-full class', () => {
      const { container } = render(<Progress value={50} />);
      const wrapper = container.firstElementChild!;
      expect(wrapper).toHaveClass('w-full');
    });

    it('should render a track element with rounded-full and overflow-hidden', () => {
      const { container } = render(<Progress value={50} />);
      const track = container.querySelector('.rounded-full.overflow-hidden');
      expect(track).toBeInTheDocument();
    });

    it('should render an inner bar element', () => {
      const { container } = render(<Progress value={50} />);
      const track = container.querySelector('.overflow-hidden');
      const bar = track?.firstElementChild;
      expect(bar).toBeInTheDocument();
      expect(bar).toHaveClass('h-full', 'transition-all');
    });
  });

  // -------------------------------------------------------------------------
  // Percentage calculation
  // -------------------------------------------------------------------------

  describe('percentage calculation', () => {
    it('should set bar width to the correct percentage', () => {
      const { container } = render(<Progress value={75} />);
      const track = container.querySelector('.overflow-hidden');
      const bar = track?.firstElementChild as HTMLElement;
      expect(bar.style.width).toBe('75%');
    });

    it('should handle value of 0 (0% width)', () => {
      const { container } = render(<Progress value={0} />);
      const track = container.querySelector('.overflow-hidden');
      const bar = track?.firstElementChild as HTMLElement;
      expect(bar.style.width).toBe('0%');
    });

    it('should handle value of 100 (100% width)', () => {
      const { container } = render(<Progress value={100} />);
      const track = container.querySelector('.overflow-hidden');
      const bar = track?.firstElementChild as HTMLElement;
      expect(bar.style.width).toBe('100%');
    });

    it('should clamp value above max to 100%', () => {
      const { container } = render(<Progress value={150} max={100} />);
      const track = container.querySelector('.overflow-hidden');
      const bar = track?.firstElementChild as HTMLElement;
      expect(bar.style.width).toBe('100%');
    });

    it('should clamp negative value to 0%', () => {
      const { container } = render(<Progress value={-10} />);
      const track = container.querySelector('.overflow-hidden');
      const bar = track?.firstElementChild as HTMLElement;
      expect(bar.style.width).toBe('0%');
    });

    it('should calculate percentage based on custom max', () => {
      const { container } = render(<Progress value={25} max={50} />);
      const track = container.querySelector('.overflow-hidden');
      const bar = track?.firstElementChild as HTMLElement;
      expect(bar.style.width).toBe('50%');
    });

    it('should handle fractional percentages correctly', () => {
      const { container } = render(<Progress value={33} max={100} />);
      const track = container.querySelector('.overflow-hidden');
      const bar = track?.firstElementChild as HTMLElement;
      expect(bar.style.width).toBe('33%');
    });
  });

  // -------------------------------------------------------------------------
  // Size variants
  // -------------------------------------------------------------------------

  describe('size variants', () => {
    it('should apply h-1 for small size', () => {
      const { container } = render(<Progress value={50} size="sm" />);
      const track = container.querySelector('.overflow-hidden');
      expect(track).toHaveClass('h-1');
    });

    it('should apply h-2 for medium size (default)', () => {
      const { container } = render(<Progress value={50} />);
      const track = container.querySelector('.overflow-hidden');
      expect(track).toHaveClass('h-2');
    });

    it('should apply h-3 for large size', () => {
      const { container } = render(<Progress value={50} size="lg" />);
      const track = container.querySelector('.overflow-hidden');
      expect(track).toHaveClass('h-3');
    });

    it('should not apply other size classes when one is selected', () => {
      const { container } = render(<Progress value={50} size="sm" />);
      const track = container.querySelector('.overflow-hidden');
      expect(track).not.toHaveClass('h-2');
      expect(track).not.toHaveClass('h-3');
    });
  });

  // -------------------------------------------------------------------------
  // Color variants
  // -------------------------------------------------------------------------

  describe('color variants', () => {
    it('should apply primary color by default', () => {
      const { container } = render(<Progress value={50} />);
      const track = container.querySelector('.overflow-hidden');
      const bar = track?.firstElementChild;
      expect(bar).toHaveClass('bg-primary-400');
    });

    it('should apply secondary color variant', () => {
      const { container } = render(<Progress value={50} variant="secondary" />);
      const track = container.querySelector('.overflow-hidden');
      const bar = track?.firstElementChild;
      expect(bar).toHaveClass('bg-secondary-500');
    });

    it('should apply success color variant', () => {
      const { container } = render(<Progress value={50} variant="success" />);
      const track = container.querySelector('.overflow-hidden');
      const bar = track?.firstElementChild;
      expect(bar).toHaveClass('bg-green-500');
    });

    it('should apply warning color variant', () => {
      const { container } = render(<Progress value={50} variant="warning" />);
      const track = container.querySelector('.overflow-hidden');
      const bar = track?.firstElementChild;
      expect(bar).toHaveClass('bg-yellow-500');
    });

    it('should apply danger color variant', () => {
      const { container } = render(<Progress value={50} variant="danger" />);
      const track = container.querySelector('.overflow-hidden');
      const bar = track?.firstElementChild;
      expect(bar).toHaveClass('bg-red-500');
    });
  });

  // -------------------------------------------------------------------------
  // Label display
  // -------------------------------------------------------------------------

  describe('label display', () => {
    it('should not show label by default', () => {
      render(<Progress value={50} />);
      expect(screen.queryByText('پیشرفت')).not.toBeInTheDocument();
      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });

    it('should show Persian label when showLabel is true', () => {
      render(<Progress value={50} showLabel={true} />);
      expect(screen.getByText('پیشرفت')).toBeInTheDocument();
    });

    it('should show percentage value when showLabel is true', () => {
      render(<Progress value={50} showLabel={true} />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should round percentage in the label', () => {
      render(<Progress value={33} max={100} showLabel={true} />);
      expect(screen.getByText('33%')).toBeInTheDocument();
    });

    it('should show 0% for zero value with label', () => {
      render(<Progress value={0} showLabel={true} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should show 100% for full value with label', () => {
      render(<Progress value={100} showLabel={true} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should clamp displayed percentage to 100% for values above max', () => {
      render(<Progress value={200} max={100} showLabel={true} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should apply correct styling to label container', () => {
      render(<Progress value={50} showLabel={true} />);
      const label = screen.getByText('پیشرفت');
      expect(label).toHaveClass('text-sm', 'text-gray-300');
    });

    it('should apply correct styling to percentage value', () => {
      render(<Progress value={50} showLabel={true} />);
      const percentage = screen.getByText('50%');
      expect(percentage).toHaveClass('text-sm', 'font-medium', 'text-gray-50');
    });
  });

  // -------------------------------------------------------------------------
  // className prop
  // -------------------------------------------------------------------------

  describe('className prop', () => {
    it('should merge additional class names onto the container', () => {
      const { container } = render(<Progress value={50} className="mt-4 mb-2" />);
      const wrapper = container.firstElementChild!;
      expect(wrapper).toHaveClass('w-full', 'mt-4', 'mb-2');
    });

    it('should work without className', () => {
      const { container } = render(<Progress value={50} />);
      const wrapper = container.firstElementChild!;
      expect(wrapper).toHaveClass('w-full');
    });
  });

  // -------------------------------------------------------------------------
  // Track styling
  // -------------------------------------------------------------------------

  describe('track styling', () => {
    it('should have bg-surface-50 background on the track', () => {
      const { container } = render(<Progress value={50} />);
      const track = container.querySelector('.overflow-hidden');
      expect(track).toHaveClass('bg-surface-50');
    });

    it('should have rounded-full on the track', () => {
      const { container } = render(<Progress value={50} />);
      const track = container.querySelector('.overflow-hidden');
      expect(track).toHaveClass('rounded-full');
    });

    it('should have transition classes on the bar', () => {
      const { container } = render(<Progress value={50} />);
      const track = container.querySelector('.overflow-hidden');
      const bar = track?.firstElementChild;
      expect(bar).toHaveClass('transition-all', 'duration-300', 'ease-out');
    });

    it('should have rounded-full on the bar', () => {
      const { container } = render(<Progress value={50} />);
      const track = container.querySelector('.overflow-hidden');
      const bar = track?.firstElementChild;
      expect(bar).toHaveClass('rounded-full');
    });
  });
});

// ===========================================================================
// CircularProgress Component
// ===========================================================================

describe('CircularProgress', () => {
  // -------------------------------------------------------------------------
  // Default rendering
  // -------------------------------------------------------------------------

  describe('default rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<CircularProgress value={50} />);
      expect(container.firstElementChild).toBeInTheDocument();
    });

    it('should render an SVG element', () => {
      const { container } = render(<CircularProgress value={50} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render two circle elements (track and progress)', () => {
      const { container } = render(<CircularProgress value={50} />);
      const circles = container.querySelectorAll('circle');
      expect(circles).toHaveLength(2);
    });

    it('should render with inline-flex container', () => {
      const { container } = render(<CircularProgress value={50} />);
      const wrapper = container.firstElementChild!;
      expect(wrapper).toHaveClass('relative', 'inline-flex', 'items-center', 'justify-center');
    });
  });

  // -------------------------------------------------------------------------
  // SVG dimensions
  // -------------------------------------------------------------------------

  describe('SVG dimensions', () => {
    it('should default to size 120', () => {
      const { container } = render(<CircularProgress value={50} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '120');
      expect(svg).toHaveAttribute('height', '120');
    });

    it('should use custom size', () => {
      const { container } = render(<CircularProgress value={50} size={80} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '80');
      expect(svg).toHaveAttribute('height', '80');
    });

    it('should apply -rotate-90 transform to SVG', () => {
      const { container } = render(<CircularProgress value={50} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('transform', '-rotate-90');
    });
  });

  // -------------------------------------------------------------------------
  // Circle attributes
  // -------------------------------------------------------------------------

  describe('circle attributes', () => {
    it('should set correct cx and cy for both circles (center of SVG)', () => {
      const { container } = render(<CircularProgress value={50} size={100} />);
      const circles = container.querySelectorAll('circle');
      circles.forEach((circle) => {
        expect(circle).toHaveAttribute('cx', '50');
        expect(circle).toHaveAttribute('cy', '50');
      });
    });

    it('should set correct radius based on size and strokeWidth', () => {
      // radius = (size - strokeWidth) / 2 = (100 - 8) / 2 = 46
      const { container } = render(<CircularProgress value={50} size={100} strokeWidth={8} />);
      const circles = container.querySelectorAll('circle');
      circles.forEach((circle) => {
        expect(circle).toHaveAttribute('r', '46');
      });
    });

    it('should set fill to none for both circles', () => {
      const { container } = render(<CircularProgress value={50} />);
      const circles = container.querySelectorAll('circle');
      circles.forEach((circle) => {
        expect(circle).toHaveAttribute('fill', 'none');
      });
    });

    it('should apply strokeWidth to both circles', () => {
      const { container } = render(<CircularProgress value={50} strokeWidth={10} />);
      const circles = container.querySelectorAll('circle');
      circles.forEach((circle) => {
        expect(circle).toHaveAttribute('stroke-width', '10');
      });
    });

    it('should apply round strokeLinecap to the progress circle', () => {
      const { container } = render(<CircularProgress value={50} />);
      const circles = container.querySelectorAll('circle');
      const progressCircle = circles[1];
      expect(progressCircle).toHaveAttribute('stroke-linecap', 'round');
    });
  });

  // -------------------------------------------------------------------------
  // Stroke dash calculation
  // -------------------------------------------------------------------------

  describe('stroke dash calculation', () => {
    it('should set correct strokeDasharray on the progress circle', () => {
      // With size=120, strokeWidth=8: radius = (120-8)/2 = 56
      // circumference = 56 * 2 * PI = 351.858...
      const { container } = render(<CircularProgress value={50} />);
      const circles = container.querySelectorAll('circle');
      const progressCircle = circles[1];
      const dashArray = progressCircle.getAttribute('stroke-dasharray');
      expect(dashArray).toBeTruthy();
      const circumference = parseFloat(dashArray!);
      expect(circumference).toBeCloseTo(56 * 2 * Math.PI, 0);
    });

    it('should set correct strokeDashoffset for 50% progress', () => {
      const { container } = render(<CircularProgress value={50} />);
      const circles = container.querySelectorAll('circle');
      const progressCircle = circles[1];
      const circumference = 56 * 2 * Math.PI;
      const expectedOffset = circumference - (50 / 100) * circumference;
      const dashOffset = parseFloat(progressCircle.getAttribute('stroke-dashoffset')!);
      expect(dashOffset).toBeCloseTo(expectedOffset, 0);
    });

    it('should have full offset (circumference) for 0% progress', () => {
      const { container } = render(<CircularProgress value={0} />);
      const circles = container.querySelectorAll('circle');
      const progressCircle = circles[1];
      const circumference = 56 * 2 * Math.PI;
      const dashOffset = parseFloat(progressCircle.getAttribute('stroke-dashoffset')!);
      expect(dashOffset).toBeCloseTo(circumference, 0);
    });

    it('should have zero offset for 100% progress', () => {
      const { container } = render(<CircularProgress value={100} />);
      const circles = container.querySelectorAll('circle');
      const progressCircle = circles[1];
      const dashOffset = parseFloat(progressCircle.getAttribute('stroke-dashoffset')!);
      expect(dashOffset).toBeCloseTo(0, 0);
    });
  });

  // -------------------------------------------------------------------------
  // Color variants
  // -------------------------------------------------------------------------

  describe('color variants', () => {
    it('should apply primary color by default (#BB86FC)', () => {
      const { container } = render(<CircularProgress value={50} />);
      const circles = container.querySelectorAll('circle');
      const progressCircle = circles[1];
      expect(progressCircle).toHaveAttribute('stroke', '#BB86FC');
    });

    it('should apply secondary color (#03DAC5)', () => {
      const { container } = render(<CircularProgress value={50} variant="secondary" />);
      const circles = container.querySelectorAll('circle');
      const progressCircle = circles[1];
      expect(progressCircle).toHaveAttribute('stroke', '#03DAC5');
    });

    it('should apply success color (#10B981)', () => {
      const { container } = render(<CircularProgress value={50} variant="success" />);
      const circles = container.querySelectorAll('circle');
      const progressCircle = circles[1];
      expect(progressCircle).toHaveAttribute('stroke', '#10B981');
    });

    it('should apply warning color (#F59E0B)', () => {
      const { container } = render(<CircularProgress value={50} variant="warning" />);
      const circles = container.querySelectorAll('circle');
      const progressCircle = circles[1];
      expect(progressCircle).toHaveAttribute('stroke', '#F59E0B');
    });

    it('should apply danger color (#EF4444)', () => {
      const { container } = render(<CircularProgress value={50} variant="danger" />);
      const circles = container.querySelectorAll('circle');
      const progressCircle = circles[1];
      expect(progressCircle).toHaveAttribute('stroke', '#EF4444');
    });

    it('should apply text-surface-50 class to the track circle', () => {
      const { container } = render(<CircularProgress value={50} />);
      const circles = container.querySelectorAll('circle');
      const trackCircle = circles[0];
      expect(trackCircle).toHaveClass('text-surface-50');
    });
  });

  // -------------------------------------------------------------------------
  // Label display
  // -------------------------------------------------------------------------

  describe('label display', () => {
    it('should show label by default (showLabel defaults to true)', () => {
      render(<CircularProgress value={50} />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should hide label when showLabel is false', () => {
      render(<CircularProgress value={50} showLabel={false} />);
      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });

    it('should display correct percentage for custom max', () => {
      render(<CircularProgress value={25} max={50} />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should round the displayed percentage', () => {
      render(<CircularProgress value={33} max={100} />);
      expect(screen.getByText('33%')).toBeInTheDocument();
    });

    it('should display 0% for zero value', () => {
      render(<CircularProgress value={0} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should clamp displayed percentage to 100% for overflow', () => {
      render(<CircularProgress value={200} max={100} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should apply correct styling to the label', () => {
      render(<CircularProgress value={50} />);
      const label = screen.getByText('50%');
      expect(label).toHaveClass('text-lg', 'font-semibold', 'text-gray-50');
    });

    it('should center the label within the circle', () => {
      const { container } = render(<CircularProgress value={50} />);
      const labelContainer = container.querySelector('.absolute.inset-0');
      expect(labelContainer).toBeInTheDocument();
      expect(labelContainer).toHaveClass('flex', 'items-center', 'justify-center');
    });
  });

  // -------------------------------------------------------------------------
  // className prop
  // -------------------------------------------------------------------------

  describe('className prop', () => {
    it('should merge additional class names onto the container', () => {
      const { container } = render(<CircularProgress value={50} className="my-4" />);
      const wrapper = container.firstElementChild!;
      expect(wrapper).toHaveClass('relative', 'inline-flex', 'my-4');
    });
  });

  // -------------------------------------------------------------------------
  // Transition classes
  // -------------------------------------------------------------------------

  describe('transition', () => {
    it('should apply transition classes to the progress circle', () => {
      const { container } = render(<CircularProgress value={50} />);
      const circles = container.querySelectorAll('circle');
      const progressCircle = circles[1];
      expect(progressCircle).toHaveClass('transition-all', 'duration-300', 'ease-out');
    });
  });

  // -------------------------------------------------------------------------
  // Module exports
  // -------------------------------------------------------------------------

  describe('module exports', () => {
    it('should export Progress as a named export', async () => {
      const mod = await import('../Progress');
      expect(mod.Progress).toBeDefined();
      expect(typeof mod.Progress).toBe('function');
    });

    it('should export CircularProgress as a named export', async () => {
      const mod = await import('../Progress');
      expect(mod.CircularProgress).toBeDefined();
      expect(typeof mod.CircularProgress).toBe('function');
    });

    it('should export Progress as the default export', async () => {
      const mod = await import('../Progress');
      expect(mod.default).toBeDefined();
      expect(mod.default).toBe(mod.Progress);
    });
  });
});
