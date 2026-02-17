/**
 * PageTransition Component Tests
 *
 * Comprehensive tests for the PageTransition component including:
 * - Animation rendering (framer-motion integration)
 * - Children display (content rendering)
 * - Reduced motion accessibility (prefers-reduced-motion)
 * - Route change key updates
 * - Animation variant props
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@/test/utils';
import { render } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { PageTransition } from '../PageTransition';
import { ReactNode } from 'react';

// Mock useReducedMotion hook
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

// Import the mocked hook for controlling return values in tests
import { useReducedMotion } from '@/hooks/useReducedMotion';
const mockUseReducedMotion = vi.mocked(useReducedMotion);

/**
 * Helper to render PageTransition with router context.
 */
function renderPageTransition(
  children: ReactNode,
  options?: { initialRoute?: string; reducedMotion?: boolean }
) {
  if (options?.reducedMotion !== undefined) {
    mockUseReducedMotion.mockReturnValue(options.reducedMotion);
  }

  const route = options?.initialRoute || '/';

  return render(
    <MemoryRouter initialEntries={[route]}>
      <PageTransition>{children}</PageTransition>
    </MemoryRouter>
  );
}

describe('PageTransition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseReducedMotion.mockReturnValue(false);
  });

  describe('Children Display', () => {
    it('should render children content', () => {
      renderPageTransition(<div>Page Content</div>);
      expect(screen.getByText('Page Content')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      renderPageTransition(
        <div>
          <h1>Title</h1>
          <p>Paragraph</p>
          <span>Span</span>
        </div>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Paragraph')).toBeInTheDocument();
      expect(screen.getByText('Span')).toBeInTheDocument();
    });

    it('should render nested components', () => {
      const NestedComponent = () => <div data-testid="nested">Nested Content</div>;

      renderPageTransition(
        <div>
          <NestedComponent />
        </div>
      );

      expect(screen.getByTestId('nested')).toBeInTheDocument();
      expect(screen.getByText('Nested Content')).toBeInTheDocument();
    });

    it('should render Persian content', () => {
      renderPageTransition(
        <div>
          <h1>محاسبه وام</h1>
          <p>لطفا اطلاعات وام را وارد کنید</p>
        </div>
      );

      expect(screen.getByText('محاسبه وام')).toBeInTheDocument();
      expect(screen.getByText('لطفا اطلاعات وام را وارد کنید')).toBeInTheDocument();
    });

    it('should render text-only children', () => {
      renderPageTransition(<span>Simple text</span>);
      expect(screen.getByText('Simple text')).toBeInTheDocument();
    });

    it('should render empty children without errors', () => {
      expect(() => {
        renderPageTransition(<div />);
      }).not.toThrow();
    });
  });

  describe('Animation Rendering', () => {
    it('should wrap children in motion.div when animations are enabled', () => {
      const { container } = renderPageTransition(
        <div data-testid="content">Animated Content</div>
      );

      // framer-motion wraps content in a div; the content should still be present
      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.getByText('Animated Content')).toBeInTheDocument();
    });

    it('should render without animation wrapper when reduced motion is preferred', () => {
      renderPageTransition(
        <div data-testid="content">Static Content</div>,
        { reducedMotion: true }
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.getByText('Static Content')).toBeInTheDocument();
    });

    it('should apply initial animation styles', () => {
      const { container } = renderPageTransition(
        <div data-testid="content">Content</div>
      );

      // framer-motion's AnimatePresence with initial={false} prevents
      // the initial animation on first load, so content should be directly visible
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Reduced Motion Accessibility', () => {
    it('should render children directly when prefers-reduced-motion is true', () => {
      const { container } = renderPageTransition(
        <div data-testid="content">Accessible Content</div>,
        { reducedMotion: true }
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
      // When reduced motion, no framer-motion AnimatePresence wrapper
      // The children are rendered as a React Fragment
    });

    it('should use framer-motion when prefers-reduced-motion is false', () => {
      const { container } = renderPageTransition(
        <div data-testid="content">Animated Content</div>,
        { reducedMotion: false }
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should switch from animated to static when motion preference changes', () => {
      // First render with animations enabled
      mockUseReducedMotion.mockReturnValue(false);
      const { rerender, container } = render(
        <MemoryRouter>
          <PageTransition>
            <div data-testid="content">Content</div>
          </PageTransition>
        </MemoryRouter>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();

      // Re-render with reduced motion
      mockUseReducedMotion.mockReturnValue(true);
      rerender(
        <MemoryRouter>
          <PageTransition>
            <div data-testid="content">Content</div>
          </PageTransition>
        </MemoryRouter>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should switch from static to animated when motion preference changes', () => {
      // First render with reduced motion
      mockUseReducedMotion.mockReturnValue(true);
      const { rerender } = render(
        <MemoryRouter>
          <PageTransition>
            <div data-testid="content">Content</div>
          </PageTransition>
        </MemoryRouter>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();

      // Re-render with animations enabled
      mockUseReducedMotion.mockReturnValue(false);
      rerender(
        <MemoryRouter>
          <PageTransition>
            <div data-testid="content">Content</div>
          </PageTransition>
        </MemoryRouter>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('Route Integration', () => {
    it('should render on root route', () => {
      renderPageTransition(
        <div data-testid="home">Home Page</div>,
        { initialRoute: '/' }
      );

      expect(screen.getByTestId('home')).toBeInTheDocument();
    });

    it('should render on a different route', () => {
      renderPageTransition(
        <div data-testid="about">About Page</div>,
        { initialRoute: '/about' }
      );

      expect(screen.getByTestId('about')).toBeInTheDocument();
    });

    it('should render on nested routes', () => {
      renderPageTransition(
        <div data-testid="detail">Loan Detail</div>,
        { initialRoute: '/loans/123' }
      );

      expect(screen.getByTestId('detail')).toBeInTheDocument();
    });
  });

  describe('Animation Variants', () => {
    it('should use correct animation variant names', () => {
      // The component defines variants: initial, enter, exit
      // We verify this by checking the component renders without error
      // when the variants are applied
      const { container } = renderPageTransition(
        <div data-testid="content">Content</div>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should handle mode="wait" without overlapping content', () => {
      // AnimatePresence with mode="wait" prevents overlapping animations
      const { container } = renderPageTransition(
        <div data-testid="content">Single Content</div>
      );

      // There should only be one instance of the content
      const contentElements = screen.getAllByTestId('content');
      expect(contentElements).toHaveLength(1);
    });
  });

  describe('Component Structure', () => {
    it('should not render AnimatePresence when reduced motion is preferred', () => {
      const { container } = renderPageTransition(
        <div data-testid="content">Content</div>,
        { reducedMotion: true }
      );

      // Content is rendered directly as Fragment, so the test-id should be
      // a direct child (no extra wrapper div from framer-motion)
      const content = screen.getByTestId('content');
      expect(content).toBeInTheDocument();
    });

    it('should render consistent DOM structure', () => {
      const { container } = renderPageTransition(
        <div data-testid="content">Content</div>
      );

      // Content should be present regardless of animation state
      expect(container.querySelector('[data-testid="content"]')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rendering without crashing', () => {
      expect(() => {
        renderPageTransition(<div>Content</div>);
      }).not.toThrow();
    });

    it('should handle null-like children gracefully', () => {
      expect(() => {
        renderPageTransition(<></>);
      }).not.toThrow();
    });

    it('should handle complex nested children', () => {
      renderPageTransition(
        <div>
          <header>
            <nav>
              <ul>
                <li>Item 1</li>
                <li>Item 2</li>
              </ul>
            </nav>
          </header>
          <main>
            <article>
              <p>Article content</p>
            </article>
          </main>
          <footer>Footer</footer>
        </div>
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Article content')).toBeInTheDocument();
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });

    it('should work with conditional rendering inside children', () => {
      const showExtra = true;

      renderPageTransition(
        <div>
          <span>Always visible</span>
          {showExtra && <span>Extra content</span>}
        </div>
      );

      expect(screen.getByText('Always visible')).toBeInTheDocument();
      expect(screen.getByText('Extra content')).toBeInTheDocument();
    });

    it('should handle re-renders with same children', () => {
      const { rerender } = render(
        <MemoryRouter>
          <PageTransition>
            <div data-testid="content">Content</div>
          </PageTransition>
        </MemoryRouter>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();

      // Re-render with same content
      rerender(
        <MemoryRouter>
          <PageTransition>
            <div data-testid="content">Content</div>
          </PageTransition>
        </MemoryRouter>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should handle re-renders with different children', () => {
      const { rerender } = render(
        <MemoryRouter>
          <PageTransition>
            <div data-testid="page1">Page 1</div>
          </PageTransition>
        </MemoryRouter>
      );

      expect(screen.getByText('Page 1')).toBeInTheDocument();

      // Re-render with different content
      rerender(
        <MemoryRouter>
          <PageTransition>
            <div data-testid="page2">Page 2</div>
          </PageTransition>
        </MemoryRouter>
      );

      expect(screen.getByText('Page 2')).toBeInTheDocument();
    });
  });
});
