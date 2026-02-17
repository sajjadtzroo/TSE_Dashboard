/**
 * Tests for Skeleton, SkeletonText, SkeletonCard, and SkeletonList Components
 *
 * Covers: variant shapes (text, circular, rectangular), animation modes,
 * dimensions, className passthrough, SkeletonText lines, SkeletonCard layout,
 * SkeletonList items, and module exports.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton, SkeletonText, SkeletonCard, SkeletonList } from '../Skeleton';

// ===========================================================================
// Skeleton Component
// ===========================================================================

describe('Skeleton', () => {
  // -------------------------------------------------------------------------
  // Default rendering
  // -------------------------------------------------------------------------

  describe('default rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<Skeleton />);
      expect(container.firstElementChild).toBeInTheDocument();
    });

    it('should render a div element', () => {
      const { container } = render(<Skeleton />);
      expect(container.firstElementChild?.tagName).toBe('DIV');
    });

    it('should apply base background class', () => {
      const { container } = render(<Skeleton />);
      expect(container.firstElementChild).toHaveClass('bg-surface-50');
    });

    it('should default to rectangular variant', () => {
      const { container } = render(<Skeleton />);
      expect(container.firstElementChild).toHaveClass('rounded-lg');
    });

    it('should default to pulse animation', () => {
      const { container } = render(<Skeleton />);
      expect(container.firstElementChild).toHaveClass('animate-pulse');
    });
  });

  // -------------------------------------------------------------------------
  // Variant shapes
  // -------------------------------------------------------------------------

  describe('variant shapes', () => {
    it('should apply rounded and h-4 for text variant', () => {
      const { container } = render(<Skeleton variant="text" />);
      const el = container.firstElementChild!;
      expect(el).toHaveClass('rounded', 'h-4');
    });

    it('should apply rounded-full for circular variant', () => {
      const { container } = render(<Skeleton variant="circular" />);
      const el = container.firstElementChild!;
      expect(el).toHaveClass('rounded-full');
    });

    it('should apply rounded-lg for rectangular variant', () => {
      const { container } = render(<Skeleton variant="rectangular" />);
      const el = container.firstElementChild!;
      expect(el).toHaveClass('rounded-lg');
    });

    it('should not apply other variant classes when text is selected', () => {
      const { container } = render(<Skeleton variant="text" />);
      const el = container.firstElementChild!;
      expect(el).not.toHaveClass('rounded-full');
      expect(el).not.toHaveClass('rounded-lg');
    });

    it('should not apply other variant classes when circular is selected', () => {
      const { container } = render(<Skeleton variant="circular" />);
      const el = container.firstElementChild!;
      expect(el).not.toHaveClass('rounded-lg');
      expect(el).not.toHaveClass('h-4');
    });
  });

  // -------------------------------------------------------------------------
  // Animation modes
  // -------------------------------------------------------------------------

  describe('animation modes', () => {
    it('should apply animate-pulse for pulse animation (default)', () => {
      const { container } = render(<Skeleton animation="pulse" />);
      expect(container.firstElementChild).toHaveClass('animate-pulse');
    });

    it('should apply animate-shimmer for wave animation', () => {
      const { container } = render(<Skeleton animation="wave" />);
      expect(container.firstElementChild).toHaveClass('animate-shimmer');
    });

    it('should not apply any animation class for none', () => {
      const { container } = render(<Skeleton animation="none" />);
      const el = container.firstElementChild!;
      expect(el).not.toHaveClass('animate-pulse');
      expect(el).not.toHaveClass('animate-shimmer');
    });
  });

  // -------------------------------------------------------------------------
  // Dimensions (width and height)
  // -------------------------------------------------------------------------

  describe('dimensions', () => {
    it('should apply numeric width as pixel value', () => {
      const { container } = render(<Skeleton width={200} />);
      const el = container.firstElementChild as HTMLElement;
      expect(el.style.width).toBe('200px');
    });

    it('should apply string width directly', () => {
      const { container } = render(<Skeleton width="50%" />);
      const el = container.firstElementChild as HTMLElement;
      expect(el.style.width).toBe('50%');
    });

    it('should apply numeric height as pixel value', () => {
      const { container } = render(<Skeleton height={100} />);
      const el = container.firstElementChild as HTMLElement;
      expect(el.style.height).toBe('100px');
    });

    it('should apply string height directly', () => {
      const { container } = render(<Skeleton height="10rem" />);
      const el = container.firstElementChild as HTMLElement;
      expect(el.style.height).toBe('10rem');
    });

    it('should not set width style when width is not provided', () => {
      const { container } = render(<Skeleton />);
      const el = container.firstElementChild as HTMLElement;
      expect(el.style.width).toBe('');
    });

    it('should not set height style when height is not provided', () => {
      const { container } = render(<Skeleton />);
      const el = container.firstElementChild as HTMLElement;
      expect(el.style.height).toBe('');
    });

    it('should apply both width and height simultaneously', () => {
      const { container } = render(<Skeleton width={48} height={48} />);
      const el = container.firstElementChild as HTMLElement;
      expect(el.style.width).toBe('48px');
      expect(el.style.height).toBe('48px');
    });
  });

  // -------------------------------------------------------------------------
  // className prop
  // -------------------------------------------------------------------------

  describe('className prop', () => {
    it('should merge additional class names', () => {
      const { container } = render(<Skeleton className="mb-4 custom-class" />);
      const el = container.firstElementChild!;
      expect(el).toHaveClass('bg-surface-50', 'mb-4', 'custom-class');
    });

    it('should work without className', () => {
      const { container } = render(<Skeleton />);
      const el = container.firstElementChild!;
      expect(el).toHaveClass('bg-surface-50');
    });
  });

  // -------------------------------------------------------------------------
  // Combined props
  // -------------------------------------------------------------------------

  describe('combined props', () => {
    it('should render circular skeleton with specific dimensions and no animation', () => {
      const { container } = render(
        <Skeleton variant="circular" width={64} height={64} animation="none" className="mx-auto" />
      );
      const el = container.firstElementChild as HTMLElement;
      expect(el).toHaveClass('bg-surface-50', 'rounded-full', 'mx-auto');
      expect(el).not.toHaveClass('animate-pulse');
      expect(el.style.width).toBe('64px');
      expect(el.style.height).toBe('64px');
    });

    it('should render text skeleton with wave animation', () => {
      const { container } = render(
        <Skeleton variant="text" animation="wave" width="80%" />
      );
      const el = container.firstElementChild as HTMLElement;
      expect(el).toHaveClass('rounded', 'h-4', 'animate-shimmer');
      expect(el.style.width).toBe('80%');
    });
  });
});

// ===========================================================================
// SkeletonText Component
// ===========================================================================

describe('SkeletonText', () => {
  // -------------------------------------------------------------------------
  // Default rendering
  // -------------------------------------------------------------------------

  describe('default rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<SkeletonText />);
      expect(container.firstElementChild).toBeInTheDocument();
    });

    it('should render 3 lines by default', () => {
      const { container } = render(<SkeletonText />);
      const wrapper = container.firstElementChild!;
      expect(wrapper.children).toHaveLength(3);
    });

    it('should have space-y-2 class on the wrapper', () => {
      const { container } = render(<SkeletonText />);
      expect(container.firstElementChild).toHaveClass('space-y-2');
    });
  });

  // -------------------------------------------------------------------------
  // Lines prop
  // -------------------------------------------------------------------------

  describe('lines prop', () => {
    it('should render specified number of lines', () => {
      const { container } = render(<SkeletonText lines={5} />);
      const wrapper = container.firstElementChild!;
      expect(wrapper.children).toHaveLength(5);
    });

    it('should render 1 line when lines=1', () => {
      const { container } = render(<SkeletonText lines={1} />);
      const wrapper = container.firstElementChild!;
      expect(wrapper.children).toHaveLength(1);
    });

    it('should render all lines as text variant skeletons', () => {
      const { container } = render(<SkeletonText lines={3} />);
      const wrapper = container.firstElementChild!;
      Array.from(wrapper.children).forEach((child) => {
        expect(child).toHaveClass('rounded', 'h-4');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Last line width
  // -------------------------------------------------------------------------

  describe('lastLineWidth prop', () => {
    it('should set the last line width to 70% by default', () => {
      const { container } = render(<SkeletonText />);
      const wrapper = container.firstElementChild!;
      const lastLine = wrapper.children[2] as HTMLElement;
      expect(lastLine.style.width).toBe('70%');
    });

    it('should set non-last lines to 100% width', () => {
      const { container } = render(<SkeletonText />);
      const wrapper = container.firstElementChild!;
      const firstLine = wrapper.children[0] as HTMLElement;
      const secondLine = wrapper.children[1] as HTMLElement;
      expect(firstLine.style.width).toBe('100%');
      expect(secondLine.style.width).toBe('100%');
    });

    it('should use custom lastLineWidth', () => {
      const { container } = render(<SkeletonText lastLineWidth="50%" />);
      const wrapper = container.firstElementChild!;
      const lastLine = wrapper.children[2] as HTMLElement;
      expect(lastLine.style.width).toBe('50%');
    });

    it('should apply lastLineWidth only to the last line with custom line count', () => {
      const { container } = render(<SkeletonText lines={4} lastLineWidth="40%" />);
      const wrapper = container.firstElementChild!;
      // Lines 0-2 should be 100%
      for (let i = 0; i < 3; i++) {
        expect((wrapper.children[i] as HTMLElement).style.width).toBe('100%');
      }
      // Last line should be 40%
      expect((wrapper.children[3] as HTMLElement).style.width).toBe('40%');
    });
  });

  // -------------------------------------------------------------------------
  // className prop
  // -------------------------------------------------------------------------

  describe('className prop', () => {
    it('should merge additional class names on the wrapper', () => {
      const { container } = render(<SkeletonText className="my-4" />);
      expect(container.firstElementChild).toHaveClass('space-y-2', 'my-4');
    });
  });
});

// ===========================================================================
// SkeletonCard Component
// ===========================================================================

describe('SkeletonCard', () => {
  // -------------------------------------------------------------------------
  // Default rendering
  // -------------------------------------------------------------------------

  describe('default rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<SkeletonCard />);
      expect(container.firstElementChild).toBeInTheDocument();
    });

    it('should render with card styling', () => {
      const { container } = render(<SkeletonCard />);
      const card = container.firstElementChild!;
      expect(card).toHaveClass('bg-surface-100', 'rounded-lg', 'p-6', 'border', 'border-border-light');
    });

    it('should render the image skeleton by default', () => {
      const { container } = render(<SkeletonCard />);
      const card = container.firstElementChild!;
      // First child should be the image skeleton (200px height)
      const imageSkeleton = card.children[0] as HTMLElement;
      expect(imageSkeleton.style.height).toBe('200px');
    });

    it('should render a title skeleton', () => {
      const { container } = render(<SkeletonCard />);
      const card = container.firstElementChild!;
      // Second child: title skeleton with 60% width
      const titleSkeleton = card.children[1] as HTMLElement;
      expect(titleSkeleton.style.width).toBe('60%');
      expect(titleSkeleton).toHaveClass('rounded', 'h-4');
    });

    it('should render text lines (SkeletonText)', () => {
      const { container } = render(<SkeletonCard />);
      const card = container.firstElementChild!;
      // Third child: SkeletonText with 3 lines
      const textBlock = card.children[2];
      expect(textBlock).toHaveClass('space-y-2');
      expect(textBlock.children).toHaveLength(3);
    });

    it('should render two action button skeletons', () => {
      const { container } = render(<SkeletonCard />);
      const card = container.firstElementChild!;
      // Last child: action buttons container
      const actionsContainer = card.children[3];
      expect(actionsContainer).toHaveClass('flex', 'gap-2', 'mt-4');
      expect(actionsContainer.children).toHaveLength(2);
    });

    it('should render action button skeletons with 80px width and 32px height', () => {
      const { container } = render(<SkeletonCard />);
      const card = container.firstElementChild!;
      const actionsContainer = card.children[3];
      const button1 = actionsContainer.children[0] as HTMLElement;
      const button2 = actionsContainer.children[1] as HTMLElement;
      expect(button1.style.width).toBe('80px');
      expect(button1.style.height).toBe('32px');
      expect(button2.style.width).toBe('80px');
      expect(button2.style.height).toBe('32px');
    });
  });

  // -------------------------------------------------------------------------
  // hasImage prop
  // -------------------------------------------------------------------------

  describe('hasImage prop', () => {
    it('should render image skeleton when hasImage is true (default)', () => {
      const { container } = render(<SkeletonCard hasImage={true} />);
      const card = container.firstElementChild!;
      const imageSkeleton = card.children[0] as HTMLElement;
      expect(imageSkeleton.style.height).toBe('200px');
    });

    it('should not render image skeleton when hasImage is false', () => {
      const { container } = render(<SkeletonCard hasImage={false} />);
      const card = container.firstElementChild!;
      // First child should be the title skeleton (no image)
      const firstChild = card.children[0] as HTMLElement;
      expect(firstChild.style.width).toBe('60%');
      expect(firstChild.style.height).toBeFalsy();
    });

    it('should have fewer children when hasImage is false', () => {
      const { container: withImage } = render(<SkeletonCard hasImage={true} />);
      const { container: withoutImage } = render(<SkeletonCard hasImage={false} />);
      const withImageChildren = withImage.firstElementChild!.children.length;
      const withoutImageChildren = withoutImage.firstElementChild!.children.length;
      expect(withoutImageChildren).toBe(withImageChildren - 1);
    });
  });

  // -------------------------------------------------------------------------
  // className prop
  // -------------------------------------------------------------------------

  describe('className prop', () => {
    it('should merge additional class names on the card', () => {
      const { container } = render(<SkeletonCard className="w-full max-w-sm" />);
      const card = container.firstElementChild!;
      expect(card).toHaveClass('bg-surface-100', 'w-full', 'max-w-sm');
    });
  });
});

// ===========================================================================
// SkeletonList Component
// ===========================================================================

describe('SkeletonList', () => {
  // -------------------------------------------------------------------------
  // Default rendering
  // -------------------------------------------------------------------------

  describe('default rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<SkeletonList />);
      expect(container.firstElementChild).toBeInTheDocument();
    });

    it('should render 5 items by default', () => {
      const { container } = render(<SkeletonList />);
      const wrapper = container.firstElementChild!;
      expect(wrapper.children).toHaveLength(5);
    });

    it('should have space-y-4 class on the wrapper', () => {
      const { container } = render(<SkeletonList />);
      expect(container.firstElementChild).toHaveClass('space-y-4');
    });
  });

  // -------------------------------------------------------------------------
  // Items prop
  // -------------------------------------------------------------------------

  describe('items prop', () => {
    it('should render specified number of items', () => {
      const { container } = render(<SkeletonList items={3} />);
      const wrapper = container.firstElementChild!;
      expect(wrapper.children).toHaveLength(3);
    });

    it('should render 1 item when items=1', () => {
      const { container } = render(<SkeletonList items={1} />);
      const wrapper = container.firstElementChild!;
      expect(wrapper.children).toHaveLength(1);
    });

    it('should render 10 items when items=10', () => {
      const { container } = render(<SkeletonList items={10} />);
      const wrapper = container.firstElementChild!;
      expect(wrapper.children).toHaveLength(10);
    });
  });

  // -------------------------------------------------------------------------
  // List item structure
  // -------------------------------------------------------------------------

  describe('list item structure', () => {
    it('should render each item with card styling', () => {
      const { container } = render(<SkeletonList items={1} />);
      const item = container.firstElementChild!.children[0];
      expect(item).toHaveClass('bg-surface-100', 'rounded-lg', 'p-4', 'border', 'border-border-light');
    });

    it('should render each item as a flex row with gap', () => {
      const { container } = render(<SkeletonList items={1} />);
      const item = container.firstElementChild!.children[0];
      expect(item).toHaveClass('flex', 'items-center', 'gap-4');
    });

    it('should render a circular avatar skeleton in each item', () => {
      const { container } = render(<SkeletonList items={1} />);
      const item = container.firstElementChild!.children[0];
      const avatar = item.children[0] as HTMLElement;
      expect(avatar).toHaveClass('rounded-full');
      expect(avatar.style.width).toBe('48px');
      expect(avatar.style.height).toBe('48px');
    });

    it('should render two text lines in each item', () => {
      const { container } = render(<SkeletonList items={1} />);
      const item = container.firstElementChild!.children[0];
      const textContainer = item.children[1];
      expect(textContainer).toHaveClass('flex-1');
      expect(textContainer.children).toHaveLength(2);
    });

    it('should render the first text line at 40% width', () => {
      const { container } = render(<SkeletonList items={1} />);
      const item = container.firstElementChild!.children[0];
      const textContainer = item.children[1];
      const firstLine = textContainer.children[0] as HTMLElement;
      expect(firstLine.style.width).toBe('40%');
      expect(firstLine).toHaveClass('rounded', 'h-4');
    });

    it('should render the second text line at 80% width', () => {
      const { container } = render(<SkeletonList items={1} />);
      const item = container.firstElementChild!.children[0];
      const textContainer = item.children[1];
      const secondLine = textContainer.children[1] as HTMLElement;
      expect(secondLine.style.width).toBe('80%');
      expect(secondLine).toHaveClass('rounded', 'h-4');
    });
  });

  // -------------------------------------------------------------------------
  // className prop
  // -------------------------------------------------------------------------

  describe('className prop', () => {
    it('should merge additional class names on the wrapper', () => {
      const { container } = render(<SkeletonList className="max-w-lg mx-auto" />);
      expect(container.firstElementChild).toHaveClass('space-y-4', 'max-w-lg', 'mx-auto');
    });
  });

  // -------------------------------------------------------------------------
  // Consistency across items
  // -------------------------------------------------------------------------

  describe('consistency across items', () => {
    it('should render all items with the same structure', () => {
      const { container } = render(<SkeletonList items={3} />);
      const wrapper = container.firstElementChild!;
      Array.from(wrapper.children).forEach((item) => {
        expect(item).toHaveClass('bg-surface-100', 'rounded-lg');
        expect(item.children).toHaveLength(2); // avatar + text container
        expect(item.children[0]).toHaveClass('rounded-full'); // avatar
        expect(item.children[1]).toHaveClass('flex-1'); // text container
        expect(item.children[1].children).toHaveLength(2); // two text lines
      });
    });
  });
});

// ===========================================================================
// Module exports
// ===========================================================================

describe('Skeleton module exports', () => {
  it('should export Skeleton as a named export', async () => {
    const mod = await import('../Skeleton');
    expect(mod.Skeleton).toBeDefined();
    expect(typeof mod.Skeleton).toBe('function');
  });

  it('should export SkeletonText as a named export', async () => {
    const mod = await import('../Skeleton');
    expect(mod.SkeletonText).toBeDefined();
    expect(typeof mod.SkeletonText).toBe('function');
  });

  it('should export SkeletonCard as a named export', async () => {
    const mod = await import('../Skeleton');
    expect(mod.SkeletonCard).toBeDefined();
    expect(typeof mod.SkeletonCard).toBe('function');
  });

  it('should export SkeletonList as a named export', async () => {
    const mod = await import('../Skeleton');
    expect(mod.SkeletonList).toBeDefined();
    expect(typeof mod.SkeletonList).toBe('function');
  });

  it('should export Skeleton as the default export', async () => {
    const mod = await import('../Skeleton');
    expect(mod.default).toBeDefined();
    expect(mod.default).toBe(mod.Skeleton);
  });
});
