/**
 * Tests for Card Component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import { Card, CardHeader } from '../Card';

describe('Card', () => {
  describe('Rendering', () => {
    it('should render card with children', () => {
      render(
        <Card>
          <p>Card content</p>
        </Card>
      );
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should apply default background and border classes', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('bg-surface-100');
      expect(card).toHaveClass('border-border-light');
    });

    it('should have rounded corners', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('rounded-lg');
    });
  });

  describe('Padding sizes', () => {
    it('should apply sm padding', () => {
      const { container } = render(<Card padding="sm">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-4');
    });

    it('should apply md padding by default', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-6');
    });

    it('should apply lg padding', () => {
      const { container } = render(<Card padding="lg">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-8');
    });
  });

  describe('Hover effect', () => {
    it('should not have hover classes by default', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).not.toHaveClass('hover:shadow-dark-lg');
    });

    it('should apply hover classes when hover is true', () => {
      const { container } = render(<Card hover>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('hover:shadow-dark-lg');
      expect(card).toHaveClass('hover:border-border-highlight');
      expect(card).toHaveClass('transition-all');
    });
  });

  describe('Custom className', () => {
    it('should accept and apply custom className', () => {
      const { container } = render(<Card className="custom-card">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('custom-card');
    });

    it('should merge custom className with default classes', () => {
      const { container } = render(<Card className="mt-4">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('mt-4');
      expect(card).toHaveClass('bg-surface-100');
    });
  });

  describe('Complex content', () => {
    it('should render multiple children', () => {
      render(
        <Card>
          <h1>Title</h1>
          <p>Description</p>
          <button>Action</button>
        </Card>
      );
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });

    it('should render nested cards', () => {
      render(
        <Card>
          <Card padding="sm">Nested card</Card>
        </Card>
      );
      expect(screen.getByText('Nested card')).toBeInTheDocument();
    });
  });
});

describe('CardHeader', () => {
  describe('Rendering', () => {
    it('should render title', () => {
      render(<CardHeader title="Card Title" />);
      expect(screen.getByText('Card Title')).toBeInTheDocument();
    });

    it('should render title with proper heading tag', () => {
      render(<CardHeader title="Card Title" />);
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Card Title');
    });

    it('should render subtitle when provided', () => {
      render(<CardHeader title="Title" subtitle="Subtitle text" />);
      expect(screen.getByText('Subtitle text')).toBeInTheDocument();
    });

    it('should not render subtitle when not provided', () => {
      render(<CardHeader title="Title" />);
      const paragraphs = document.querySelectorAll('p');
      expect(paragraphs.length).toBe(0);
    });
  });

  describe('Action slot', () => {
    it('should render action element when provided', () => {
      render(
        <CardHeader
          title="Title"
          action={<button>Action</button>}
        />
      );
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });

    it('should render custom action component', () => {
      const CustomAction = () => (
        <div data-testid="custom-action">Custom</div>
      );
      render(<CardHeader title="Title" action={<CustomAction />} />);
      expect(screen.getByTestId('custom-action')).toBeInTheDocument();
    });

    it('should position action on the right side', () => {
      const { container } = render(
        <CardHeader
          title="Title"
          action={<button>Action</button>}
        />
      );
      const headerDiv = container.firstChild as HTMLElement;
      expect(headerDiv).toHaveClass('justify-between');
    });
  });

  describe('Styling', () => {
    it('should have border bottom', () => {
      const { container } = render(<CardHeader title="Title" />);
      const headerDiv = container.firstChild as HTMLElement;
      expect(headerDiv).toHaveClass('border-b');
    });

    it('should have margin bottom', () => {
      const { container } = render(<CardHeader title="Title" />);
      const headerDiv = container.firstChild as HTMLElement;
      expect(headerDiv).toHaveClass('mb-4');
    });

    it('should apply correct text colors', () => {
      render(<CardHeader title="Title" subtitle="Subtitle" />);
      const title = screen.getByText('Title');
      const subtitle = screen.getByText('Subtitle');
      expect(title).toHaveClass('text-gray-50');
      expect(subtitle).toHaveClass('text-gray-300');
    });
  });

  describe('Integration with Card', () => {
    it('should work inside Card component', () => {
      render(
        <Card>
          <CardHeader title="Card Title" subtitle="Card Subtitle" />
          <p>Card body content</p>
        </Card>
      );
      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card Subtitle')).toBeInTheDocument();
      expect(screen.getByText('Card body content')).toBeInTheDocument();
    });

    it('should render CardHeader with action inside Card', () => {
      render(
        <Card>
          <CardHeader
            title="Title"
            action={<button>Edit</button>}
          />
          <p>Content</p>
        </Card>
      );
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    });
  });
});
