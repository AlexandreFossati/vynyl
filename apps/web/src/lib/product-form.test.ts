import type { Product } from '@vynyl/shared';
import { describe, expect, it } from 'vitest';
import { ApiError } from './api/api-error';
import {
  SAVE_FAILED_MESSAGE,
  describeSaveFailure,
  emptyValues,
  validateProductForm,
  valuesFromProduct,
  type FormValues,
} from './product-form';

const validValues = (overrides: Partial<FormValues> = {}): FormValues => ({
  title: 'Large Flux Capacitor',
  description: 'Powers time travel.',
  category: 'dimensional-travel',
  price: '19.99',
  stock: '42',
  brand: 'ACME',
  sku: 'ACM-FC-001',
  weight: '4.5',
  ...overrides,
});

const errorsOf = (values: FormValues) => {
  const result = validateProductForm(values);
  if (result.ok) {
    throw new Error('expected the values to be rejected');
  }
  return result.errors;
};

describe('emptyValues and valuesFromProduct', () => {
  it('starts with every field blank, as a fresh object each time', () => {
    const values = emptyValues();

    expect(Object.values(values).every((text) => text === '')).toBe(true);
    expect(Object.keys(values)).toHaveLength(8);
    expect(emptyValues()).not.toBe(values);
  });

  it('turns a product into the text a person would type', () => {
    const product: Product = {
      id: 1,
      title: 'Large Flux Capacitor',
      description: 'Powers time travel.',
      category: 'automotive',
      price: 1299,
      stock: 0,
      brand: 'ACME',
      sku: 'ACM-FC-001',
      weight: 0.5,
      meta: { createdAt: '2025-04-30T09:41:02.053Z', updatedAt: '2025-04-30T09:41:02.053Z' },
    };

    expect(valuesFromProduct(product)).toEqual({
      title: 'Large Flux Capacitor',
      description: 'Powers time travel.',
      category: 'automotive',
      price: '1299',
      stock: '0',
      brand: 'ACME',
      sku: 'ACM-FC-001',
      weight: '0.5',
    });
  });
});

describe('validateProductForm', () => {
  it('turns valid text into a product input, with numbers as numbers', () => {
    expect(validateProductForm(validValues())).toEqual({
      ok: true,
      input: {
        title: 'Large Flux Capacitor',
        description: 'Powers time travel.',
        category: 'dimensional-travel',
        price: 19.99,
        stock: 42,
        brand: 'ACME',
        sku: 'ACM-FC-001',
        weight: 4.5,
      },
    });
  });

  it('trims the text values', () => {
    const result = validateProductForm(
      validValues({ title: '  Flux  ', price: ' 5 ', brand: ' ACME ' }),
    );

    expect(result).toMatchObject({ ok: true, input: { title: 'Flux', price: 5, brand: 'ACME' } });
  });

  it.each(['0', '0.00', '.5', '10.', '9.99'])('accepts %s as a price', (price) => {
    expect(validateProductForm(validValues({ price })).ok).toBe(true);
  });

  it('reports every blank field as required, including one with only spaces', () => {
    const errors = errorsOf({ ...emptyValues(), title: '   ' });

    expect(errors).toEqual({
      title: 'Required',
      description: 'Required',
      category: 'Required',
      price: 'Required',
      stock: 'Required',
      brand: 'Required',
      sku: 'Required',
      weight: 'Required',
    });
  });

  it.each(['abc', '1e2', '9,99', '0x10', '--1', '1.2.3'])(
    'asks for a number when the price is %s',
    (price) => {
      expect(errorsOf(validValues({ price }))).toEqual({ price: 'Enter a number' });
    },
  );

  it.each([
    ['a price with three decimals', { price: '9.999' }, 'price'],
    ['a negative price', { price: '-1' }, 'price'],
    ['a negative stock', { stock: '-1' }, 'stock'],
    ['a fractional stock', { stock: '1.5' }, 'stock'],
    ['a zero weight', { weight: '0' }, 'weight'],
    ['an uppercase category', { category: 'Tools' }, 'category'],
    ['a SKU with lowercase letters', { sku: 'acm-1' }, 'sku'],
    ['a SKU that is too short', { sku: 'A' }, 'sku'],
    ['a SKU with a space', { sku: 'ACM 1' }, 'sku'],
    ['a title over 200 characters', { title: 'x'.repeat(201) }, 'title'],
    ['a description over 2000 characters', { description: 'x'.repeat(2001) }, 'description'],
  ] as const)('rejects %s, on that field only', (_name, override, field) => {
    const errors = errorsOf(validValues(override));

    expect(Object.keys(errors)).toEqual([field]);
    expect(errors[field]).toBeTruthy();
  });

  it.each([
    ['a fractional stock', { stock: '1.5' }, 'stock', 'Enter a whole number'],
    ['a negative price', { price: '-1' }, 'price', 'Must be at least 0'],
    ['a zero weight', { weight: '0' }, 'weight', 'Must be greater than 0'],
    ['a short SKU', { sku: 'AB' }, 'sku', 'Must be at least 3 characters'],
    ['a long title', { title: 'x'.repeat(201) }, 'title', 'Must be at most 200 characters'],
    ['an uppercase category', { category: 'Tools' }, 'category', 'Must be lowercase'],
    [
      'a price with three decimals',
      { price: '9.999' },
      'price',
      'Invalid number: must be a multiple of 0.01',
    ],
  ] as const)('explains %s in plain words', (_name, override, field, message) => {
    expect(errorsOf(validValues(override))[field]).toBe(message);
  });

  it('reports the problems of several fields at once', () => {
    const errors = errorsOf(validValues({ title: '', price: 'abc', sku: 'bad sku' }));

    expect(Object.keys(errors).sort()).toEqual(['price', 'sku', 'title']);
    expect(errors.title).toBe('Required');
    expect(errors.price).toBe('Enter a number');
  });
});

describe('describeSaveFailure', () => {
  const apiError = (code: ApiError['code'], status: number, details?: ApiError['details']) =>
    new ApiError({ status, code, message: 'internal wording', ...(details ? { details } : {}) });

  it('points a duplicate SKU at the SKU field, without a toast', () => {
    expect(describeSaveFailure(apiError('SKU_CONFLICT', 409))).toEqual({
      fields: { sku: 'This SKU is already in use' },
    });
  });

  it('points each validation detail at its field, without a toast', () => {
    const failure = apiError('VALIDATION_ERROR', 400, [
      { path: 'price', message: 'too small' },
      { path: 'stock', message: 'must be an integer' },
    ]);

    expect(describeSaveFailure(failure)).toEqual({
      fields: { price: 'Too small', stock: 'Must be an integer' },
    });
  });

  it('keeps the first message of a field that the server reports twice', () => {
    const failure = apiError('VALIDATION_ERROR', 400, [
      { path: 'price', message: 'first' },
      { path: 'price', message: 'second' },
    ]);

    expect(describeSaveFailure(failure).fields).toEqual({ price: 'First' });
  });

  it('adds a toast when some detail does not belong to a field', () => {
    const failure = apiError('VALIDATION_ERROR', 400, [
      { path: 'price', message: 'too small' },
      { path: 'meta.createdAt', message: 'not allowed' },
    ]);

    expect(describeSaveFailure(failure)).toEqual({
      fields: { price: 'Too small' },
      toast: SAVE_FAILED_MESSAGE,
    });
  });

  it.each([
    ['a validation error without details', apiError('VALIDATION_ERROR', 400)],
    ['a server error', apiError('INTERNAL_ERROR', 500)],
    ['a network failure', apiError('NETWORK_ERROR', 0)],
    ['something that is not an ApiError', new Error('boom')],
    ['a value that is not an error', 'oops'],
  ])('falls back to the toast for %s', (_name, failure) => {
    expect(describeSaveFailure(failure)).toEqual({ fields: {}, toast: SAVE_FAILED_MESSAGE });
  });

  it('never puts the server wording of an unexpected error in the toast', () => {
    expect(describeSaveFailure(apiError('INTERNAL_ERROR', 500)).toast).not.toContain(
      'internal wording',
    );
  });
});
