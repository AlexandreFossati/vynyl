import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Toast from './Toast.svelte';

describe('Toast', () => {
  it('shows its message', () => {
    render(Toast, { message: 'Product created', ondismiss: vi.fn() });

    expect(screen.getByText('Product created')).toBeInTheDocument();
  });

  it('is an alert only when it reports an error', () => {
    const { unmount } = render(Toast, { message: 'Saved', tone: 'success', ondismiss: vi.fn() });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    unmount();

    render(Toast, { message: 'Could not save', tone: 'error', ondismiss: vi.fn() });
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save');
  });

  it('asks to be dismissed from a button', async () => {
    const ondismiss = vi.fn();
    render(Toast, { message: 'Saved', ondismiss });

    await fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));

    expect(ondismiss).toHaveBeenCalledTimes(1);
  });
});
