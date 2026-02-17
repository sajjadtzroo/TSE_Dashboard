/**
 * Tests for Modal Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, userEvent, waitFor } from '@/test/utils';
import { Modal, ModalTrigger } from '../Modal';

describe('Modal', () => {
  beforeEach(() => {
    // Reset body overflow style before each test
    document.body.style.overflow = 'unset';
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={vi.fn()}>
          <p>Modal content</p>
        </Modal>
      );
      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <p>Modal content</p>
        </Modal>
      );
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('should render title when provided', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
          <p>Content</p>
        </Modal>
      );
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
    });

    it('should render children content', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <div>
            <h2>Child heading</h2>
            <p>Child paragraph</p>
          </div>
        </Modal>
      );
      expect(screen.getByText('Child heading')).toBeInTheDocument();
      expect(screen.getByText('Child paragraph')).toBeInTheDocument();
    });

    it('should render footer when provided', () => {
      render(
        <Modal
          isOpen={true}
          onClose={vi.fn()}
          footer={
            <>
              <button>Cancel</button>
              <button>Confirm</button>
            </>
          }
        >
          <p>Content</p>
        </Modal>
      );
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    });

    it('should show close button by default', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Modal">
          <p>Content</p>
        </Modal>
      );
      expect(screen.getByRole('button', { name: 'بستن' })).toBeInTheDocument();
    });

    it('should hide close button when showCloseButton is false', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Modal" showCloseButton={false}>
          <p>Content</p>
        </Modal>
      );
      expect(screen.queryByRole('button', { name: 'بستن' })).not.toBeInTheDocument();
    });
  });

  describe('Size variants', () => {
    it('should apply sm size class', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} size="sm">
          <p>Small modal</p>
        </Modal>
      );
      const modal = document.body.querySelector('.max-w-md');
      expect(modal).toBeInTheDocument();
    });

    it('should apply md size class by default', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <p>Medium modal</p>
        </Modal>
      );
      const modal = document.body.querySelector('.max-w-lg');
      expect(modal).toBeInTheDocument();
    });

    it('should apply lg size class', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} size="lg">
          <p>Large modal</p>
        </Modal>
      );
      const modal = document.body.querySelector('.max-w-2xl');
      expect(modal).toBeInTheDocument();
    });

    it('should apply xl size class', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} size="xl">
          <p>Extra large modal</p>
        </Modal>
      );
      const modal = document.body.querySelector('.max-w-4xl');
      expect(modal).toBeInTheDocument();
    });

    it('should apply full size class', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} size="full">
          <p>Full modal</p>
        </Modal>
      );
      const modal = document.body.querySelector('.max-w-7xl');
      expect(modal).toBeInTheDocument();
    });
  });

  describe('Close functionality', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <Modal isOpen={true} onClose={handleClose} title="Modal">
          <p>Content</p>
        </Modal>
      );

      const closeButton = screen.getByRole('button', { name: 'بستن' });
      await user.click(closeButton);

      expect(handleClose).toHaveBeenCalledOnce();
    });

    it('should call onClose when backdrop is clicked and closeOnOverlayClick is true', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <Modal isOpen={true} onClose={handleClose} closeOnOverlayClick={true}>
          <p>Content</p>
        </Modal>
      );

      // Click the backdrop (overlay)
      const backdrop = document.body.querySelector('.backdrop-blur-sm');
      if (backdrop) {
        await user.click(backdrop as HTMLElement);
      }

      expect(handleClose).toHaveBeenCalledOnce();
    });

    it('should not call onClose when backdrop is clicked and closeOnOverlayClick is false', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <Modal isOpen={true} onClose={handleClose} closeOnOverlayClick={false}>
          <p>Content</p>
        </Modal>
      );

      // Click the backdrop (overlay)
      const backdrop = document.body.querySelector('.backdrop-blur-sm');
      if (backdrop) {
        await user.click(backdrop as HTMLElement);
      }

      expect(handleClose).not.toHaveBeenCalled();
    });

    it('should call onClose when ESC key is pressed and closeOnEsc is true', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <Modal isOpen={true} onClose={handleClose} closeOnEsc={true}>
          <p>Content</p>
        </Modal>
      );

      await user.keyboard('{Escape}');

      expect(handleClose).toHaveBeenCalledOnce();
    });

    it('should not call onClose when ESC key is pressed and closeOnEsc is false', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <Modal isOpen={true} onClose={handleClose} closeOnEsc={false}>
          <p>Content</p>
        </Modal>
      );

      await user.keyboard('{Escape}');

      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('Body overflow management', () => {
    it('should set body overflow to hidden when modal is open', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <p>Content</p>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body overflow when modal is closed', () => {
      const { rerender } = render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <p>Content</p>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <Modal isOpen={false} onClose={vi.fn()}>
          <p>Content</p>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Focus management', () => {
    it('should focus first focusable element when modal opens', async () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <div>
            <button>First button</button>
            <button>Second button</button>
          </div>
        </Modal>
      );

      await waitFor(() => {
        const firstButton = screen.getByRole('button', { name: 'First button' });
        expect(firstButton).toHaveFocus();
      });
    });

    it('should focus close button if it is the only focusable element', async () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Modal">
          <p>Just text content</p>
        </Modal>
      );

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: 'بستن' });
        expect(closeButton).toHaveFocus();
      });
    });
  });

  describe('Custom className', () => {
    it('should accept and apply custom className', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} className="custom-modal">
          <p>Content</p>
        </Modal>
      );

      const modal = document.body.querySelector('.custom-modal');
      expect(modal).toBeInTheDocument();
    });

    it('should merge custom className with default classes', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} className="mt-4">
          <p>Content</p>
        </Modal>
      );

      const modal = document.body.querySelector('.mt-4');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveClass('bg-surface-100');
    });
  });

  describe('Portal rendering', () => {
    it('should render modal in document.body via portal', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <p>Modal content</p>
        </Modal>
      );

      // Modal should be rendered directly under body, not in the container
      const modalContent = screen.getByText('Modal content');
      expect(modalContent.closest('.fixed')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have close button with aria-label', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Modal">
          <p>Content</p>
        </Modal>
      );

      const closeButton = screen.getByRole('button', { name: 'بستن' });
      expect(closeButton).toHaveAttribute('aria-label', 'بستن');
    });

    it('should render title as heading', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Test Modal Title">
          <p>Content</p>
        </Modal>
      );

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Test Modal Title');
    });
  });
});

describe('ModalTrigger', () => {
  describe('Rendering', () => {
    it('should render trigger element', () => {
      render(
        <ModalTrigger
          modal={
            <Modal isOpen={true} onClose={vi.fn()}>
              <p>Modal content</p>
            </Modal>
          }
        >
          <button>Open Modal</button>
        </ModalTrigger>
      );

      expect(screen.getByRole('button', { name: 'Open Modal' })).toBeInTheDocument();
    });

    it('should not show modal initially', () => {
      render(
        <ModalTrigger
          modal={
            <Modal isOpen={false} onClose={vi.fn()}>
              <p>Modal content</p>
            </Modal>
          }
        >
          <button>Open Modal</button>
        </ModalTrigger>
      );

      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should open modal when trigger is clicked', async () => {
      const user = userEvent.setup();

      render(
        <ModalTrigger
          modal={({ isOpen, onClose }) => (
            <Modal isOpen={isOpen} onClose={onClose}>
              <p>Modal content</p>
            </Modal>
          )}
        >
          <button>Open Modal</button>
        </ModalTrigger>
      );

      const trigger = screen.getByRole('button', { name: 'Open Modal' });
      await user.click(trigger);

      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('should close modal when onClose is called', async () => {
      const user = userEvent.setup();

      render(
        <ModalTrigger
          modal={({ isOpen, onClose }) => (
            <Modal isOpen={isOpen} onClose={onClose} title="Test Modal">
              <p>Modal content</p>
            </Modal>
          )}
        >
          <button>Open Modal</button>
        </ModalTrigger>
      );

      // Open modal
      const trigger = screen.getByRole('button', { name: 'Open Modal' });
      await user.click(trigger);
      expect(screen.getByText('Modal content')).toBeInTheDocument();

      // Close modal
      const closeButton = screen.getByRole('button', { name: 'بستن' });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
      });
    });
  });

  describe('Custom className', () => {
    it('should accept and apply custom className to trigger', () => {
      const { container } = render(
        <ModalTrigger
          className="custom-trigger"
          modal={
            <Modal isOpen={false} onClose={vi.fn()}>
              <p>Modal</p>
            </Modal>
          }
        >
          <button>Trigger</button>
        </ModalTrigger>
      );

      const trigger = container.querySelector('.custom-trigger');
      expect(trigger).toBeInTheDocument();
    });
  });
});
