import { fireEvent, screen } from '@testing-library/svelte';
import type { FormValues } from '../lib/product-form';

// Test helpers for anything that renders the product form.
export const validFormValues: FormValues = {
  title: 'Large Flux Capacitor',
  description: 'Powers time travel.',
  category: 'dimensional-travel',
  price: '19.99',
  stock: '42',
  brand: 'ACME',
  sku: 'ACM-FC-001',
  weight: '4.5',
};

export const FIELD_LABELS = {
  title: 'Title',
  description: 'Description',
  category: 'Category',
  price: 'Price',
  stock: 'Stock',
  brand: 'Brand',
  sku: 'SKU',
  weight: 'Weight',
} as const satisfies Record<keyof FormValues, string>;

export const typeInto = (label: string, value: string) =>
  fireEvent.input(screen.getByLabelText(label), { target: { value } });

// Types every field, like a person filling the form in: valid values, except where overridden.
export async function fillForm(overrides: Partial<FormValues> = {}) {
  const values = { ...validFormValues, ...overrides };
  for (const field of Object.keys(FIELD_LABELS) as (keyof FormValues)[]) {
    await typeInto(FIELD_LABELS[field], values[field]);
  }
}
