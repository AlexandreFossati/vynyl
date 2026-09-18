import type { Product } from '@vynyl/shared';
import { render, screen, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ProductList from './ProductList.svelte';

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 1,
  title: 'Large Flux Capacitor',
  description: 'A capacitor.',
  category: 'automotive',
  price: 1299,
  stock: 42,
  brand: 'ACME',
  sku: 'ACM-FC-001',
  weight: 4,
  meta: { createdAt: '2025-04-30T09:41:02.053Z', updatedAt: '2025-04-30T09:41:02.053Z' },
  ...overrides,
});

const products = [
  product(),
  product({
    id: 2,
    title: 'Portable Wormhole',
    category: 'dimensional-travel',
    price: 9.99,
    stock: 0,
    brand: 'Zenith',
    sku: 'ZEN-PW-002',
  }),
];

// jsdom does not apply the responsive CSS, so both presentations are in the DOM.
describe('ProductList', () => {
  it('renders one table row per product under a header row', () => {
    render(ProductList, { products });

    const table = screen.getByRole('table', { name: 'Products' });
    expect(within(table).getAllByRole('row')).toHaveLength(products.length + 1);
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['Product', 'Category', 'Brand', 'SKU', 'Price', 'Stock']);
  });

  it('shows every field of a product in its table row', () => {
    render(ProductList, { products });

    const row = screen.getByRole('row', { name: /Portable Wormhole/ });
    expect(within(row).getByRole('rowheader')).toHaveTextContent('Portable Wormhole');
    expect(row).toHaveTextContent('Dimensional travel');
    expect(row).toHaveTextContent('Zenith');
    expect(row).toHaveTextContent('ZEN-PW-002');
    expect(row).toHaveTextContent('$9.99');
    expect(row).toHaveTextContent('Out of stock (0)');
  });

  it('renders one card per product with title, brand, category, price and stock', () => {
    render(ProductList, { products });

    const cards = screen.getAllByRole('listitem');
    expect(cards).toHaveLength(products.length);
    expect(cards[0]).toHaveTextContent('Large Flux Capacitor');
    expect(cards[0]).toHaveTextContent('ACME');
    expect(cards[0]).toHaveTextContent('Automotive');
    expect(cards[0]).toHaveTextContent('$1,299.00');
    expect(cards[0]).toHaveTextContent('In stock (42)');
  });

  it('links the title of each product to its detail page, in the table and in the cards', () => {
    render(ProductList, { products });

    const links = screen.getAllByRole('link', { name: 'Portable Wormhole' });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/products/2');
    }
    expect(
      within(screen.getByRole('table')).getByRole('link', { name: 'Large Flux Capacitor' }),
    ).toHaveAttribute('href', '/products/1');
  });

  it('marks the list as busy while a newer page loads', async () => {
    const { container, rerender } = render(ProductList, { products });
    const list = container.querySelector('.product-list');
    expect(list).toHaveAttribute('aria-busy', 'false');

    await rerender({ busy: true });

    expect(list).toHaveAttribute('aria-busy', 'true');
  });
});
