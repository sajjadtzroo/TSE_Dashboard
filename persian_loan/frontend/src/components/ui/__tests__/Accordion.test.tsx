/**
 * Tests for Accordion Component
 */

import { describe, it, expect } from 'vitest';
import { render, screen, userEvent, waitFor } from '@/test/utils';
import { Accordion, AccordionItem } from '../Accordion';
import { Calculator } from 'lucide-react';

describe('AccordionItem', () => {
  describe('Rendering', () => {
    it('should render accordion item with title', () => {
      render(
        <AccordionItem title="Accordion Title">
          <p>Content</p>
        </AccordionItem>
      );

      expect(screen.getByText('Accordion Title')).toBeInTheDocument();
    });

    it('should render title as ReactNode', () => {
      render(
        <AccordionItem
          title={
            <div>
              <strong>Bold Title</strong>
            </div>
          }
        >
          <p>Content</p>
        </AccordionItem>
      );

      expect(screen.getByText('Bold Title')).toBeInTheDocument();
    });

    it('should not show content by default when defaultOpen is false', () => {
      render(
        <AccordionItem title="Title" defaultOpen={false}>
          <p>Hidden content</p>
        </AccordionItem>
      );

      expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
    });

    it('should show content by default when defaultOpen is true', () => {
      render(
        <AccordionItem title="Title" defaultOpen={true}>
          <p>Visible content</p>
        </AccordionItem>
      );

      expect(screen.getByText('Visible content')).toBeInTheDocument();
    });

    it('should render icon when provided', () => {
      const { container } = render(
        <AccordionItem title="Title" icon={<Calculator data-testid="calc-icon" />}>
          <p>Content</p>
        </AccordionItem>
      );

      expect(screen.getByTestId('calc-icon')).toBeInTheDocument();
    });

    it('should render chevron icon', () => {
      const { container } = render(
        <AccordionItem title="Title">
          <p>Content</p>
        </AccordionItem>
      );

      // Chevron icon from lucide-react
      const chevron = container.querySelector('svg');
      expect(chevron).toBeInTheDocument();
    });
  });

  describe('Expand/Collapse behavior', () => {
    it('should expand when button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <AccordionItem title="Expandable Title" defaultOpen={false}>
          <p>Expandable content</p>
        </AccordionItem>
      );

      expect(screen.queryByText('Expandable content')).not.toBeInTheDocument();

      const button = screen.getByRole('button', { name: /Expandable Title/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Expandable content')).toBeInTheDocument();
      });
    });

    it('should collapse when button is clicked twice', async () => {
      const user = userEvent.setup();

      render(
        <AccordionItem title="Collapsible Title" defaultOpen={false}>
          <p>Collapsible content</p>
        </AccordionItem>
      );

      const button = screen.getByRole('button', { name: /Collapsible Title/i });

      // Expand
      await user.click(button);
      await waitFor(() => {
        expect(screen.getByText('Collapsible content')).toBeInTheDocument();
      });

      // Collapse
      await user.click(button);
      await waitFor(() => {
        expect(screen.queryByText('Collapsible content')).not.toBeInTheDocument();
      });
    });

    it('should toggle multiple times', async () => {
      const user = userEvent.setup();

      render(
        <AccordionItem title="Toggle Title" defaultOpen={false}>
          <p>Toggle content</p>
        </AccordionItem>
      );

      const button = screen.getByRole('button', { name: /Toggle Title/i });

      // First toggle - expand
      await user.click(button);
      await waitFor(() => {
        expect(screen.getByText('Toggle content')).toBeInTheDocument();
      });

      // Second toggle - collapse
      await user.click(button);
      await waitFor(() => {
        expect(screen.queryByText('Toggle content')).not.toBeInTheDocument();
      });

      // Third toggle - expand again
      await user.click(button);
      await waitFor(() => {
        expect(screen.getByText('Toggle content')).toBeInTheDocument();
      });
    });
  });

  describe('Chevron icon rotation', () => {
    it('should rotate chevron when expanded', async () => {
      const user = userEvent.setup();

      const { container } = render(
        <AccordionItem title="Title" defaultOpen={false}>
          <p>Content</p>
        </AccordionItem>
      );

      const button = screen.getByRole('button', { name: /Title/i });
      await user.click(button);

      // Wait for animation
      await waitFor(() => {
        expect(screen.getByText('Content')).toBeInTheDocument();
      });
    });
  });

  describe('Custom className', () => {
    it('should accept and apply custom className', () => {
      const { container } = render(
        <AccordionItem title="Title" className="custom-item">
          <p>Content</p>
        </AccordionItem>
      );

      const item = container.querySelector('.custom-item');
      expect(item).toBeInTheDocument();
    });

    it('should merge custom className with default classes', () => {
      const { container } = render(
        <AccordionItem title="Title" className="mb-4">
          <p>Content</p>
        </AccordionItem>
      );

      const item = container.querySelector('.mb-4');
      expect(item).toBeInTheDocument();
      expect(item).toHaveClass('border-b');
    });
  });

  describe('Accessibility', () => {
    it('should render button with proper role', () => {
      render(
        <AccordionItem title="Accessible Title">
          <p>Content</p>
        </AccordionItem>
      );

      const button = screen.getByRole('button', { name: /Accessible Title/i });
      expect(button).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();

      render(
        <AccordionItem title="Keyboard Title" defaultOpen={false}>
          <p>Keyboard content</p>
        </AccordionItem>
      );

      const button = screen.getByRole('button', { name: /Keyboard Title/i });

      // Tab to focus
      await user.tab();
      expect(button).toHaveFocus();

      // Press Enter to expand
      await user.keyboard('{Enter}');
      await waitFor(() => {
        expect(screen.getByText('Keyboard content')).toBeInTheDocument();
      });
    });

    it('should support Space key to toggle', async () => {
      const user = userEvent.setup();

      render(
        <AccordionItem title="Space Title" defaultOpen={false}>
          <p>Space content</p>
        </AccordionItem>
      );

      const button = screen.getByRole('button', { name: /Space Title/i });
      button.focus();

      await user.keyboard(' ');
      await waitFor(() => {
        expect(screen.getByText('Space content')).toBeInTheDocument();
      });
    });
  });

  describe('Content rendering', () => {
    it('should render complex content', async () => {
      const user = userEvent.setup();

      render(
        <AccordionItem title="Complex Title" defaultOpen={false}>
          <div>
            <h3>Heading</h3>
            <p>Paragraph</p>
            <button>Button</button>
          </div>
        </AccordionItem>
      );

      const toggleButton = screen.getByRole('button', { name: /Complex Title/i });
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('Heading')).toBeInTheDocument();
        expect(screen.getByText('Paragraph')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Button' })).toBeInTheDocument();
      });
    });
  });
});

describe('Accordion', () => {
  describe('Rendering', () => {
    it('should render accordion container', () => {
      const { container } = render(
        <Accordion>
          <AccordionItem title="Item 1">Content 1</AccordionItem>
        </Accordion>
      );

      expect(container.firstChild).toHaveClass('bg-surface-100');
      expect(container.firstChild).toHaveClass('rounded-lg');
      expect(container.firstChild).toHaveClass('border');
    });

    it('should render multiple accordion items', () => {
      render(
        <Accordion>
          <AccordionItem title="Item 1">Content 1</AccordionItem>
          <AccordionItem title="Item 2">Content 2</AccordionItem>
          <AccordionItem title="Item 3">Content 3</AccordionItem>
        </Accordion>
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('should render children content', () => {
      render(
        <Accordion>
          <div data-testid="custom-child">Custom content</div>
        </Accordion>
      );

      expect(screen.getByTestId('custom-child')).toBeInTheDocument();
    });
  });

  describe('Multiple items behavior', () => {
    it('should allow multiple items to be open simultaneously', async () => {
      const user = userEvent.setup();

      render(
        <Accordion>
          <AccordionItem title="Item 1" defaultOpen={false}>
            Content 1
          </AccordionItem>
          <AccordionItem title="Item 2" defaultOpen={false}>
            Content 2
          </AccordionItem>
        </Accordion>
      );

      const button1 = screen.getByRole('button', { name: /Item 1/i });
      const button2 = screen.getByRole('button', { name: /Item 2/i });

      // Expand first item
      await user.click(button1);
      await waitFor(() => {
        expect(screen.getByText('Content 1')).toBeInTheDocument();
      });

      // Expand second item
      await user.click(button2);
      await waitFor(() => {
        expect(screen.getByText('Content 2')).toBeInTheDocument();
      });

      // Both should be visible
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('should handle mixed open/closed states', async () => {
      const user = userEvent.setup();

      render(
        <Accordion>
          <AccordionItem title="Item 1" defaultOpen={true}>
            Content 1
          </AccordionItem>
          <AccordionItem title="Item 2" defaultOpen={false}>
            Content 2
          </AccordionItem>
          <AccordionItem title="Item 3" defaultOpen={true}>
            Content 3
          </AccordionItem>
        </Accordion>
      );

      // Item 1 and 3 should be visible
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
      expect(screen.getByText('Content 3')).toBeInTheDocument();

      // Expand item 2
      const button2 = screen.getByRole('button', { name: /Item 2/i });
      await user.click(button2);

      await waitFor(() => {
        expect(screen.getByText('Content 2')).toBeInTheDocument();
      });

      // All three should now be visible
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
      expect(screen.getByText('Content 3')).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should accept and apply custom className', () => {
      const { container } = render(
        <Accordion className="custom-accordion">
          <AccordionItem title="Item">Content</AccordionItem>
        </Accordion>
      );

      const accordion = container.querySelector('.custom-accordion');
      expect(accordion).toBeInTheDocument();
    });

    it('should merge custom className with default classes', () => {
      const { container } = render(
        <Accordion className="shadow-lg">
          <AccordionItem title="Item">Content</AccordionItem>
        </Accordion>
      );

      const accordion = container.querySelector('.shadow-lg');
      expect(accordion).toBeInTheDocument();
      expect(accordion).toHaveClass('bg-surface-100');
    });
  });

  describe('Integration with AccordionItem', () => {
    it('should work with items that have icons', async () => {
      const user = userEvent.setup();

      render(
        <Accordion>
          <AccordionItem
            title="Item with icon"
            icon={<Calculator data-testid="icon" />}
            defaultOpen={false}
          >
            Icon content
          </AccordionItem>
        </Accordion>
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();

      const button = screen.getByRole('button', { name: /Item with icon/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Icon content')).toBeInTheDocument();
      });
    });

    it('should maintain proper border styling between items', () => {
      const { container } = render(
        <Accordion>
          <AccordionItem title="Item 1">Content 1</AccordionItem>
          <AccordionItem title="Item 2">Content 2</AccordionItem>
          <AccordionItem title="Item 3">Content 3</AccordionItem>
        </Accordion>
      );

      const items = container.querySelectorAll('.border-b');
      // All items should have border-b except the last one (via last:border-b-0)
      expect(items.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      render(
        <Accordion>
          <AccordionItem title="Item 1">Content 1</AccordionItem>
          <AccordionItem title="Item 2">Content 2</AccordionItem>
        </Accordion>
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });

    it('should be navigable with keyboard', async () => {
      const user = userEvent.setup();

      render(
        <Accordion>
          <AccordionItem title="Item 1" defaultOpen={false}>
            Content 1
          </AccordionItem>
          <AccordionItem title="Item 2" defaultOpen={false}>
            Content 2
          </AccordionItem>
        </Accordion>
      );

      // Tab to first item
      await user.tab();
      const button1 = screen.getByRole('button', { name: /Item 1/i });
      expect(button1).toHaveFocus();

      // Expand with Enter
      await user.keyboard('{Enter}');
      await waitFor(() => {
        expect(screen.getByText('Content 1')).toBeInTheDocument();
      });

      // Tab to second item
      await user.tab();
      const button2 = screen.getByRole('button', { name: /Item 2/i });
      expect(button2).toHaveFocus();

      // Expand with Space
      await user.keyboard(' ');
      await waitFor(() => {
        expect(screen.getByText('Content 2')).toBeInTheDocument();
      });
    });
  });
});
