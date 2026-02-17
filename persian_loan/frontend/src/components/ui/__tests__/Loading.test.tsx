/**
 * Tests for Loading Component and LoadingPage Component
 *
 * Covers: rendering, size variants, text prop, className passthrough,
 * spinner animation, LoadingPage defaults, styling, and accessibility.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Loading, LoadingPage } from '../Loading';

// ===========================================================================
// Loading Component
// ===========================================================================

describe('Loading', () => {
  // -------------------------------------------------------------------------
  // Default rendering
  // -------------------------------------------------------------------------

  describe('default rendering', () => {
    it('should render without crashing when no props are provided', () => {
      const { container } = render(<Loading />);
      expect(container.firstElementChild).toBeInTheDocument();
    });

    it('should render a spinner element', () => {
      const { container } = render(<Loading />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should not render text when text prop is not provided', () => {
      const { container } = render(<Loading />);
      const paragraph = container.querySelector('p');
      expect(paragraph).not.toBeInTheDocument();
    });

    it('should use medium size by default', () => {
      const { container } = render(<Loading />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-12', 'w-12');
    });
  });

  // -------------------------------------------------------------------------
  // Size variants
  // -------------------------------------------------------------------------

  describe('size prop', () => {
    it('should render small spinner with h-6 w-6 classes', () => {
      const { container } = render(<Loading size="sm" />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-6', 'w-6');
    });

    it('should render medium spinner with h-12 w-12 classes', () => {
      const { container } = render(<Loading size="md" />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-12', 'w-12');
    });

    it('should render large spinner with h-16 w-16 classes', () => {
      const { container } = render(<Loading size="lg" />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-16', 'w-16');
    });

    it('should not apply size classes from other variants when one is selected', () => {
      const { container } = render(<Loading size="sm" />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).not.toHaveClass('h-12', 'w-12');
      expect(spinner).not.toHaveClass('h-16', 'w-16');
    });
  });

  // -------------------------------------------------------------------------
  // Text prop
  // -------------------------------------------------------------------------

  describe('text prop', () => {
    it('should render the loading text when provided', () => {
      render(<Loading text="Loading data..." />);
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('should render Persian loading text', () => {
      render(<Loading text="در حال بارگذاری..." />);
      expect(screen.getByText('در حال بارگذاری...')).toBeInTheDocument();
    });

    it('should render text inside a <p> element', () => {
      render(<Loading text="Paragraph test" />);
      const p = screen.getByText('Paragraph test');
      expect(p.tagName).toBe('P');
    });

    it('should apply the correct styling classes to the text', () => {
      render(<Loading text="Style check" />);
      const p = screen.getByText('Style check');
      expect(p).toHaveClass('mt-3', 'text-sm', 'text-gray-400');
    });

    it('should not render a <p> element when text is undefined', () => {
      const { container } = render(<Loading text={undefined} />);
      expect(container.querySelector('p')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // className prop
  // -------------------------------------------------------------------------

  describe('className prop', () => {
    it('should merge additional class names onto the container', () => {
      const { container } = render(<Loading className="p-8 bg-gray-900" />);
      const wrapper = container.firstElementChild!;
      expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
      expect(wrapper).toHaveClass('p-8', 'bg-gray-900');
    });

    it('should work without className (no extra classes)', () => {
      const { container } = render(<Loading />);
      const wrapper = container.firstElementChild!;
      expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
    });

    it('should handle empty className string gracefully', () => {
      const { container } = render(<Loading className="" />);
      const wrapper = container.firstElementChild!;
      expect(wrapper).toHaveClass('flex');
    });

    it('should support multiple space-separated classes', () => {
      const { container } = render(<Loading className="my-4 mx-auto min-h-screen" />);
      const wrapper = container.firstElementChild!;
      expect(wrapper).toHaveClass('my-4', 'mx-auto', 'min-h-screen');
    });
  });

  // -------------------------------------------------------------------------
  // Spinner element styling
  // -------------------------------------------------------------------------

  describe('spinner styling', () => {
    it('should have animate-spin class for CSS animation', () => {
      const { container } = render(<Loading />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should have rounded-full class for circular shape', () => {
      const { container } = render(<Loading />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('rounded-full');
    });

    it('should have border-b-2 and border-primary-400 for the spinner arc', () => {
      const { container } = render(<Loading />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('border-b-2', 'border-primary-400');
    });

    it('should render the spinner as a div element', () => {
      const { container } = render(<Loading />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner?.tagName).toBe('DIV');
    });
  });

  // -------------------------------------------------------------------------
  // Layout
  // -------------------------------------------------------------------------

  describe('layout', () => {
    it('should render a flex column container', () => {
      const { container } = render(<Loading />);
      const wrapper = container.firstElementChild!;
      expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
    });

    it('should have the spinner as the first child', () => {
      const { container } = render(<Loading text="Loading..." />);
      const wrapper = container.firstElementChild!;
      expect(wrapper.children[0]).toHaveClass('animate-spin');
    });

    it('should have text as the second child when present', () => {
      const { container } = render(<Loading text="Loading..." />);
      const wrapper = container.firstElementChild!;
      expect(wrapper.children).toHaveLength(2);
      expect(wrapper.children[1].tagName).toBe('P');
    });

    it('should have only the spinner when no text is provided', () => {
      const { container } = render(<Loading />);
      const wrapper = container.firstElementChild!;
      expect(wrapper.children).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // Combined props
  // -------------------------------------------------------------------------

  describe('combined props', () => {
    it('should render with all props specified', () => {
      const { container } = render(
        <Loading size="lg" text="Please wait..." className="p-4" />
      );
      const wrapper = container.firstElementChild!;
      const spinner = container.querySelector('.animate-spin');

      expect(wrapper).toHaveClass('p-4');
      expect(spinner).toHaveClass('h-16', 'w-16');
      expect(screen.getByText('Please wait...')).toBeInTheDocument();
    });

    it('should render small spinner with custom text and class', () => {
      const { container } = render(
        <Loading size="sm" text="Fetching..." className="inline-flex" />
      );
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-6', 'w-6');
      expect(screen.getByText('Fetching...')).toBeInTheDocument();
      expect(container.firstElementChild).toHaveClass('inline-flex');
    });
  });

  // -------------------------------------------------------------------------
  // Accessibility
  // -------------------------------------------------------------------------

  describe('accessibility', () => {
    it('should have visible text content for screen readers when text is provided', () => {
      render(<Loading text="Loading your data..." />);
      expect(screen.getByText('Loading your data...')).toBeVisible();
    });

    it('should render content in the DOM even without explicit ARIA attributes', () => {
      const { container } = render(<Loading />);
      // The spinner div is present even though it lacks ARIA -- verifying it exists
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Module exports
  // -------------------------------------------------------------------------

  describe('module exports', () => {
    it('should export Loading as a named export', async () => {
      const mod = await import('../Loading');
      expect(mod.Loading).toBeDefined();
      expect(typeof mod.Loading).toBe('function');
    });

    it('should export Loading as the default export', async () => {
      const mod = await import('../Loading');
      expect(mod.default).toBeDefined();
      expect(mod.default).toBe(mod.Loading);
    });

    it('should export LoadingPage as a named export', async () => {
      const mod = await import('../Loading');
      expect(mod.LoadingPage).toBeDefined();
      expect(typeof mod.LoadingPage).toBe('function');
    });
  });
});

// ===========================================================================
// LoadingPage Component
// ===========================================================================

describe('LoadingPage', () => {
  // -------------------------------------------------------------------------
  // Default rendering
  // -------------------------------------------------------------------------

  describe('default rendering', () => {
    it('should render with default Persian loading text', () => {
      render(<LoadingPage />);
      expect(screen.getByText('در حال بارگذاری...')).toBeInTheDocument();
    });

    it('should render a spinner element', () => {
      const { container } = render(<LoadingPage />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should use the large spinner size', () => {
      const { container } = render(<LoadingPage />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-16', 'w-16');
    });
  });

  // -------------------------------------------------------------------------
  // Text prop
  // -------------------------------------------------------------------------

  describe('text prop', () => {
    it('should display custom text when provided', () => {
      render(<LoadingPage text="Preparing dashboard..." />);
      expect(screen.getByText('Preparing dashboard...')).toBeInTheDocument();
    });

    it('should display custom Persian text', () => {
      render(<LoadingPage text="لطفا صبر کنید..." />);
      expect(screen.getByText('لطفا صبر کنید...')).toBeInTheDocument();
    });

    it('should override the default text', () => {
      render(<LoadingPage text="Custom" />);
      expect(screen.queryByText('در حال بارگذاری...')).not.toBeInTheDocument();
      expect(screen.getByText('Custom')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Layout and styling
  // -------------------------------------------------------------------------

  describe('layout and styling', () => {
    it('should render an outer container with centering and fixed height', () => {
      const { container } = render(<LoadingPage />);
      const outerDiv = container.firstElementChild!;
      expect(outerDiv).toHaveClass('flex', 'items-center', 'justify-center', 'h-64');
    });

    it('should contain a Loading component inside', () => {
      const { container } = render(<LoadingPage />);
      // The inner Loading component has the flex-col container
      const innerContainer = container.querySelector('.flex-col');
      expect(innerContainer).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Composition
  // -------------------------------------------------------------------------

  describe('composition with Loading', () => {
    it('should render the spinner with animation class', () => {
      const { container } = render(<LoadingPage />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should render the text below the spinner', () => {
      const { container } = render(<LoadingPage />);
      const text = screen.getByText('در حال بارگذاری...');
      expect(text.tagName).toBe('P');
      expect(text).toHaveClass('mt-3');
    });

    it('should use border-primary-400 for theming consistency', () => {
      const { container } = render(<LoadingPage />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('border-primary-400');
    });
  });

  // -------------------------------------------------------------------------
  // Accessibility
  // -------------------------------------------------------------------------

  describe('accessibility', () => {
    it('should have visible loading text for screen readers', () => {
      render(<LoadingPage />);
      expect(screen.getByText('در حال بارگذاری...')).toBeVisible();
    });

    it('should have visible custom text for screen readers', () => {
      render(<LoadingPage text="Loading loans..." />);
      expect(screen.getByText('Loading loans...')).toBeVisible();
    });
  });
});
