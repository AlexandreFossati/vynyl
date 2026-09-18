import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import ConfirmDialog from './ConfirmDialog.svelte';

const setup = (props: { open?: boolean; busy?: boolean } = {}) => {
  const onconfirm = vi.fn();
  const oncancel = vi.fn();
  const view = render(ConfirmDialog, {
    props: {
      open: false,
      title: 'Delete product?',
      message: 'Large Flux Capacitor will be removed for good.',
      confirmLabel: 'Delete',
      onconfirm,
      oncancel,
      ...props,
    },
  });
  return { ...view, onconfirm, oncancel };
};

const dialogElement = () => document.querySelector('dialog')!;

// What the browser does when the user presses Esc in a modal dialog.
const pressEscape = () =>
  fireEvent(dialogElement(), new Event('cancel', { bubbles: false, cancelable: true }));

describe('ConfirmDialog', () => {
  it('stays closed until it is opened, and closes again', async () => {
    const { rerender } = setup();
    expect(dialogElement()).not.toHaveAttribute('open');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await rerender({ open: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await rerender({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is named by its title and described by its message', () => {
    setup({ open: true });

    const dialog = screen.getByRole('dialog', { name: 'Delete product?' });
    expect(dialog).toHaveAccessibleDescription('Large Flux Capacitor will be removed for good.');
  });

  it('puts the focus on the safe choice, Cancel, when it opens', async () => {
    const { rerender } = setup();

    await rerender({ open: true });

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('asks the parent to confirm or to cancel from its buttons', async () => {
    const { onconfirm, oncancel } = setup({ open: true });

    await fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onconfirm).toHaveBeenCalledTimes(1);
    expect(oncancel).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(oncancel).toHaveBeenCalledTimes(1);
  });

  it('turns Esc into a request to cancel, and leaves closing to the parent', async () => {
    const { oncancel } = setup({ open: true });

    const notPrevented = await pressEscape();

    expect(oncancel).toHaveBeenCalledTimes(1);
    // The browser would close the dialog by itself unless the event is cancelled.
    expect(notPrevented).toBe(false);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  // A browser that could not let the page cancel Esc closes the dialog by itself.
  describe('when the browser closes the dialog on its own', () => {
    const closeNatively = () => {
      dialogElement().removeAttribute('open');
      return fireEvent(dialogElement(), new Event('close'));
    };

    it('tells the parent, so it can open the dialog again later', async () => {
      const { oncancel } = setup({ open: true });

      await closeNatively();

      expect(oncancel).toHaveBeenCalledTimes(1);
    });

    it('puts the dialog back while the confirmed action runs', async () => {
      const { oncancel } = setup({ open: true, busy: true });

      await closeNatively();

      expect(oncancel).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not report a close that the parent asked for', async () => {
      const { rerender, oncancel } = setup({ open: true });

      await rerender({ open: false });

      expect(oncancel).not.toHaveBeenCalled();
    });
  });

  describe('while the confirmed action runs', () => {
    it('disables both actions', () => {
      setup({ open: true, busy: true });

      expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    });

    it('ignores Esc, and does not let it close the dialog', async () => {
      const { oncancel } = setup({ open: true, busy: true });

      const notPrevented = await pressEscape();

      expect(oncancel).not.toHaveBeenCalled();
      expect(notPrevented).toBe(false);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
