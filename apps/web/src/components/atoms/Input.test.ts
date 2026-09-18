import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Input from './Input.svelte';

describe('Input', () => {
  it('shows the value it receives and passes attributes to the field', () => {
    render(Input, { value: 'flux', 'aria-label': 'Search products', maxlength: 100 });

    const input = screen.getByRole('textbox', { name: 'Search products' });
    expect(input).toHaveValue('flux');
    expect(input).toHaveAttribute('maxlength', '100');
  });

  it('reports what the user types', async () => {
    const oninput = vi.fn();
    render(Input, { 'aria-label': 'Search products', oninput });

    await fireEvent.input(screen.getByRole('textbox'), { target: { value: 'capacitor' } });

    expect(screen.getByRole('textbox')).toHaveValue('capacitor');
    expect(oninput).toHaveBeenCalledTimes(1);
  });
});
