import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import StockBadge from './StockBadge.svelte';

describe('StockBadge', () => {
  it.each([
    [0, 'Out of stock (0)'],
    [1, 'Low stock (1)'],
    [10, 'Low stock (10)'],
    [11, 'In stock (11)'],
    [250, 'In stock (250)'],
  ])('shows %i units as "%s"', (stock, text) => {
    render(StockBadge, { stock });

    expect(screen.getByText(text)).toBeInTheDocument();
  });
});
