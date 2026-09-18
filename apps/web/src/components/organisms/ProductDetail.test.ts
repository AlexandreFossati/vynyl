import type { Product } from '@vynyl/shared';
import { render, screen, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ProductDetail from './ProductDetail.svelte';

const product: Product = {
  id: 7,
  title: 'Large Flux Capacitor',
  description: 'Powers time travel.\nHandle with care.',
  category: 'dimensional-travel',
  price: 1299,
  stock: 0,
  brand: 'ACME',
  sku: 'ACM-FC-001',
  weight: 4.5,
  meta: { createdAt: '2025-04-30T09:41:02.053Z', updatedAt: '2025-06-01T10:00:00.000Z' },
};

// The value shown next to a term of the description list.
const valueOf = (term: string) => {
  const dt = screen.getByText(term, { selector: 'dt' });
  return dt.nextElementSibling as HTMLElement;
};

describe('ProductDetail', () => {
  it('shows the title as the main heading and the description in full', () => {
    render(ProductDetail, { product });

    expect(screen.getByRole('heading', { level: 1, name: 'Large Flux Capacitor' })).toBeVisible();
    // toHaveTextContent collapses whitespace, and the line break is what is being kept here.
    expect(screen.getByText(/Powers time travel\./).textContent).toBe(
      'Powers time travel.\nHandle with care.',
    );
  });

  it('shows every other field with its own label', () => {
    render(ProductDetail, { product });

    expect(valueOf('Category')).toHaveTextContent('Dimensional travel');
    expect(valueOf('Brand')).toHaveTextContent('ACME');
    expect(valueOf('SKU')).toHaveTextContent('ACM-FC-001');
    expect(valueOf('Price')).toHaveTextContent('$1,299.00');
    expect(valueOf('Stock')).toHaveTextContent('Out of stock (0)');
    expect(valueOf('Weight')).toHaveTextContent('4.5');
  });

  it('shows when the product was created and last updated as machine-readable times', () => {
    render(ProductDetail, { product });

    expect(within(valueOf('Created')).getByText(/2025/)).toHaveAttribute(
      'datetime',
      '2025-04-30T09:41:02.053Z',
    );
    expect(within(valueOf('Last updated')).getByText(/2025/)).toHaveAttribute(
      'datetime',
      '2025-06-01T10:00:00.000Z',
    );
  });

  it('shows text as text, never as markup', () => {
    render(ProductDetail, {
      product: { ...product, title: '<img src=x onerror=alert(1)>', description: '<b>bold</b>' },
    });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('<img src=x');
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('b')).toBeNull();
  });
});
