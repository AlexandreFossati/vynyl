import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import StatusMessage from './StatusMessage.svelte';

describe('StatusMessage', () => {
  it('announces a neutral message politely', () => {
    render(StatusMessage, { title: 'No products found', message: 'Try another search.' });

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('No products found');
    expect(status).toHaveTextContent('Try another search.');
  });

  it('announces a danger message as an alert', () => {
    render(StatusMessage, { title: 'Something went wrong', tone: 'danger' });

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('runs the action when its button is pressed', async () => {
    const onaction = vi.fn();
    render(StatusMessage, { title: 'Failed', actionLabel: 'Try again', onaction });

    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onaction).toHaveBeenCalledTimes(1);
  });

  it('has no button when there is no action', () => {
    render(StatusMessage, { title: 'Nothing here' });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows a spinner only while busy', () => {
    const idle = render(StatusMessage, { title: 'Nothing to load' });
    expect(idle.container.querySelector('.spinner')).toBeNull();
    idle.unmount();

    const busy = render(StatusMessage, { title: 'Loading products…', busy: true });
    expect(busy.container.querySelector('.spinner')).not.toBeNull();
  });
});
