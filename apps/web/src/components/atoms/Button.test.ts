import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { textSnippet } from '../../test/snippet';
import Button from './Button.svelte';

describe('Button', () => {
  it('renders its content as a button that does not submit forms by default', () => {
    render(Button, { children: textSnippet('Save') });

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('type', 'button');
  });

  it('calls onclick when it is clicked', async () => {
    const onclick = vi.fn();
    render(Button, { children: textSnippet('Save'), onclick });

    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onclick).toHaveBeenCalledTimes(1);
  });

  // Browsers never dispatch clicks on a disabled button; jsdom does for synthetic events, so the
  // attribute is what is worth asserting here.
  it('is disabled when asked to', () => {
    render(Button, { children: textSnippet('Save'), disabled: true });

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
