import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import PriceTag from './PriceTag.svelte';

describe('PriceTag', () => {
  it.each([
    [1299, '$1,299.00'],
    [9.99, '$9.99'],
    [0.99, '$0.99'],
    [20, '$20.00'],
  ])('formats %s as %s', (value, text) => {
    render(PriceTag, { value });

    expect(screen.getByText(text)).toBeInTheDocument();
  });
});
