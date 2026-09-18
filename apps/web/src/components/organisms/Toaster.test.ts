import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import type { Toast } from '../../lib/toasts.svelte';
import Toaster from './Toaster.svelte';

const toasts: Toast[] = [
  { id: 1, tone: 'success', message: 'Product created' },
  { id: 2, tone: 'error', message: 'Could not save' },
];

describe('Toaster', () => {
  it('is a polite live region even when there is nothing to show', () => {
    const { container } = render(Toaster, { toasts: [], ondismiss: vi.fn() });

    expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows every toast, inside the live region', () => {
    const { container } = render(Toaster, { toasts, ondismiss: vi.fn() });

    const region = container.querySelector('[aria-live="polite"]');
    expect(region).toHaveTextContent('Product created');
    expect(region).toHaveTextContent('Could not save');
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save');
  });

  it('reports which toast was dismissed', async () => {
    const ondismiss = vi.fn();
    render(Toaster, { toasts, ondismiss });

    const [, second] = screen.getAllByRole('button', { name: 'Dismiss notification' });
    await fireEvent.click(second!);

    expect(ondismiss).toHaveBeenCalledTimes(1);
    expect(ondismiss).toHaveBeenCalledWith(2);
  });

  it('follows the list it is given', async () => {
    const { rerender } = render(Toaster, { toasts, ondismiss: vi.fn() });

    await rerender({ toasts: [toasts[1]!] });

    expect(screen.queryByText('Product created')).not.toBeInTheDocument();
    expect(screen.getByText('Could not save')).toBeInTheDocument();
  });
});
