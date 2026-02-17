/**
 * Tests for Empty State Component
 *
 * Covers: rendering, props handling, conditional rendering,
 * custom icons, action slots, styling, and accessibility.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Empty } from '../Empty';

// ---------------------------------------------------------------------------
// Rendering defaults
// ---------------------------------------------------------------------------

describe('Empty', () => {
  describe('default rendering', () => {
    it('should render with default Persian title when no props are provided', () => {
      render(<Empty />);
      expect(screen.getByText('اطلاعاتی یافت نشد')).toBeInTheDocument();
    });

    it('should render the default Inbox icon when no icon prop is provided', () => {
      const { container } = render(<Empty />);
      // lucide-react renders an <svg> element for the Inbox icon
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('w-12', 'h-12');
    });

    it('should not render a description paragraph when description is not provided', () => {
      const { container } = render(<Empty />);
      const paragraph = container.querySelector('p');
      expect(paragraph).not.toBeInTheDocument();
    });

    it('should not render an action wrapper when action is not provided', () => {
      const { container } = render(<Empty />);
      // The action wrapper has class mt-4 and is the last child when present
      const actionDiv = container.querySelector('.mt-4');
      expect(actionDiv).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Custom title
  // ---------------------------------------------------------------------------

  describe('title prop', () => {
    it('should render a custom title', () => {
      render(<Empty title="No Results Found" />);
      expect(screen.getByText('No Results Found')).toBeInTheDocument();
    });

    it('should render a Persian custom title', () => {
      render(<Empty title="نتیجه‌ای یافت نشد" />);
      expect(screen.getByText('نتیجه‌ای یافت نشد')).toBeInTheDocument();
    });

    it('should render the title inside an h3 element', () => {
      render(<Empty title="Heading Test" />);
      const heading = screen.getByText('Heading Test');
      expect(heading.tagName).toBe('H3');
    });

    it('should apply the correct styling classes to the title', () => {
      render(<Empty title="Styled Title" />);
      const heading = screen.getByText('Styled Title');
      expect(heading).toHaveClass('text-lg', 'font-medium', 'text-gray-200');
    });

    it('should render an empty string title without crashing', () => {
      render(<Empty title="" />);
      const { container } = render(<Empty title="" />);
      const heading = container.querySelector('h3');
      expect(heading).toBeInTheDocument();
      expect(heading?.textContent).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // Description
  // ---------------------------------------------------------------------------

  describe('description prop', () => {
    it('should render the description when provided', () => {
      render(<Empty description="Try adjusting your filters" />);
      expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
    });

    it('should render the description inside a <p> element', () => {
      render(<Empty description="Paragraph check" />);
      const p = screen.getByText('Paragraph check');
      expect(p.tagName).toBe('P');
    });

    it('should apply the correct styling classes to the description', () => {
      render(<Empty description="Style check" />);
      const p = screen.getByText('Style check');
      expect(p).toHaveClass('mt-2', 'text-sm', 'text-gray-400', 'max-w-sm');
    });

    it('should not render description when it is undefined', () => {
      const { container } = render(<Empty description={undefined} />);
      expect(container.querySelector('p')).not.toBeInTheDocument();
    });

    it('should render a long description correctly', () => {
      const longText = 'A'.repeat(500);
      render(<Empty description={longText} />);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Custom icon
  // ---------------------------------------------------------------------------

  describe('icon prop', () => {
    it('should render a custom icon instead of the default Inbox icon', () => {
      render(
        <Empty
          icon={<span data-testid="custom-icon">Custom</span>}
        />
      );
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('should not render the default svg when a custom icon is provided', () => {
      const { container } = render(
        <Empty icon={<span data-testid="custom-icon">X</span>} />
      );
      const svg = container.querySelector('svg');
      expect(svg).not.toBeInTheDocument();
    });

    it('should wrap the custom icon in the icon container with correct classes', () => {
      const { container } = render(
        <Empty icon={<span data-testid="custom-icon">Icon</span>} />
      );
      const iconWrapper = screen.getByTestId('custom-icon').parentElement;
      expect(iconWrapper).toHaveClass('text-gray-500', 'mb-4');
    });

    it('should support an SVG element as custom icon', () => {
      render(
        <Empty
          icon={
            <svg data-testid="svg-icon" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
            </svg>
          }
        />
      );
      expect(screen.getByTestId('svg-icon')).toBeInTheDocument();
    });

    it('should support a complex React node as icon', () => {
      render(
        <Empty
          icon={
            <div data-testid="complex-icon">
              <span>Level 1</span>
              <span>Level 2</span>
            </div>
          }
        />
      );
      expect(screen.getByTestId('complex-icon')).toBeInTheDocument();
      expect(screen.getByText('Level 1')).toBeInTheDocument();
      expect(screen.getByText('Level 2')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Action slot
  // ---------------------------------------------------------------------------

  describe('action prop', () => {
    it('should render an action button when provided', () => {
      render(
        <Empty action={<button>Retry</button>} />
      );
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });

    it('should wrap the action in a div with mt-4 class', () => {
      render(
        <Empty action={<button data-testid="action-btn">Go</button>} />
      );
      const btn = screen.getByTestId('action-btn');
      expect(btn.parentElement).toHaveClass('mt-4');
    });

    it('should handle click events on the action button', async () => {
      const user = userEvent.setup();
      let clicked = false;
      render(
        <Empty
          action={<button onClick={() => { clicked = true; }}>Click Me</button>}
        />
      );
      await user.click(screen.getByRole('button', { name: 'Click Me' }));
      expect(clicked).toBe(true);
    });

    it('should support a link as the action element', () => {
      render(
        <Empty action={<a href="/home">Go Home</a>} />
      );
      const link = screen.getByRole('link', { name: 'Go Home' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/home');
    });

    it('should support multiple elements inside the action slot', () => {
      render(
        <Empty
          action={
            <div>
              <button>Action 1</button>
              <button>Action 2</button>
            </div>
          }
        />
      );
      expect(screen.getByRole('button', { name: 'Action 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action 2' })).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Combined props
  // ---------------------------------------------------------------------------

  describe('combined props', () => {
    it('should render all props together correctly', () => {
      const { container } = render(
        <Empty
          title="No Loans"
          description="You have no active loans"
          icon={<span data-testid="loan-icon">$</span>}
          action={<button>Apply Now</button>}
        />
      );
      expect(screen.getByText('No Loans')).toBeInTheDocument();
      expect(screen.getByText('You have no active loans')).toBeInTheDocument();
      expect(screen.getByTestId('loan-icon')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Apply Now' })).toBeInTheDocument();

      // Verify structural order: icon -> title -> description -> action
      const wrapper = container.firstElementChild!;
      expect(wrapper.children).toHaveLength(4);
    });

    it('should render title and description without icon or action', () => {
      const { container } = render(
        <Empty title="Empty" description="Nothing here" />
      );
      // icon wrapper (default) + h3 + p = 3 children
      const wrapper = container.firstElementChild!;
      expect(wrapper.children).toHaveLength(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Layout and styling
  // ---------------------------------------------------------------------------

  describe('layout and styling', () => {
    it('should render a flex column container with centered alignment', () => {
      const { container } = render(<Empty />);
      const wrapper = container.firstElementChild!;
      expect(wrapper).toHaveClass(
        'flex',
        'flex-col',
        'items-center',
        'justify-center',
        'py-12',
        'text-center'
      );
    });

    it('should apply text-gray-500 and mb-4 to the icon container', () => {
      const { container } = render(<Empty />);
      const iconContainer = container.querySelector('.text-gray-500');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer).toHaveClass('mb-4');
    });
  });

  // ---------------------------------------------------------------------------
  // Accessibility
  // ---------------------------------------------------------------------------

  describe('accessibility', () => {
    it('should use an h3 heading for the title for proper heading hierarchy', () => {
      render(<Empty title="Accessible Title" />);
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Accessible Title');
    });

    it('should be perceivable with screen readers (text content present)', () => {
      render(
        <Empty
          title="No Data Available"
          description="Please try again later"
        />
      );
      // Verify text nodes exist for screen readers
      expect(screen.getByText('No Data Available')).toBeVisible();
      expect(screen.getByText('Please try again later')).toBeVisible();
    });

    it('should have the action button accessible by role', () => {
      render(
        <Empty action={<button aria-label="Refresh data">Refresh</button>} />
      );
      expect(screen.getByRole('button', { name: 'Refresh data' })).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Different empty state scenarios
  // ---------------------------------------------------------------------------

  describe('different empty state scenarios', () => {
    it('should work as a "no data" state', () => {
      render(
        <Empty
          title="داده‌ای وجود ندارد"
          description="هنوز اطلاعاتی ثبت نشده است"
        />
      );
      expect(screen.getByText('داده‌ای وجود ندارد')).toBeInTheDocument();
      expect(screen.getByText('هنوز اطلاعاتی ثبت نشده است')).toBeInTheDocument();
    });

    it('should work as a "no search results" state', () => {
      render(
        <Empty
          title="نتیجه‌ای یافت نشد"
          description="فیلترهای خود را تغییر دهید"
          action={<button>پاک کردن فیلترها</button>}
        />
      );
      expect(screen.getByText('نتیجه‌ای یافت نشد')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'پاک کردن فیلترها' })).toBeInTheDocument();
    });

    it('should work as an "error" state', () => {
      render(
        <Empty
          title="خطا در بارگذاری"
          description="مشکلی در دریافت اطلاعات پیش آمد"
          icon={<span data-testid="error-icon">!</span>}
          action={<button>تلاش مجدد</button>}
        />
      );
      expect(screen.getByText('خطا در بارگذاری')).toBeInTheDocument();
      expect(screen.getByTestId('error-icon')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'تلاش مجدد' })).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------------------

  describe('module exports', () => {
    it('should export Empty as a named export', async () => {
      const mod = await import('../Empty');
      expect(mod.Empty).toBeDefined();
      expect(typeof mod.Empty).toBe('function');
    });

    it('should export Empty as the default export', async () => {
      const mod = await import('../Empty');
      expect(mod.default).toBeDefined();
      expect(mod.default).toBe(mod.Empty);
    });
  });
});
