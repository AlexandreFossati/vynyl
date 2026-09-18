import { afterEach, describe, expect, it } from 'vitest';
import type { ProductInsert } from '../mappers/product.mapper';
import { createTestDatabase, type TestDatabase } from '../test/database';
import { createProductsRepository, DuplicateSkuError } from './products.repository';

const CREATED = '2025-01-01T00:00:00.000Z';
const UPDATED = '2026-02-02T00:00:00.000Z';

const newRow = (overrides: Partial<ProductInsert> = {}): ProductInsert => ({
  title: 'Flux part',
  description: 'A part.',
  category: 'tools',
  priceCents: 1999,
  stock: 5,
  brand: 'ACME',
  sku: 'FLX-001',
  weight: 1.5,
  createdAt: CREATED,
  updatedAt: CREATED,
  ...overrides,
});

describe('products repository (writes)', () => {
  let database: TestDatabase;

  afterEach(() => {
    database.close();
  });

  const setup = async () => {
    database = await createTestDatabase();
    return createProductsRepository(database.db);
  };

  describe('findById', () => {
    it('returns the row of an existing product', async () => {
      const repository = await setup();
      const created = await repository.create(newRow());

      expect(await repository.findById(created.id)).toEqual(created);
    });

    it('returns undefined when the product does not exist', async () => {
      const repository = await setup();

      expect(await repository.findById(9999)).toBeUndefined();
    });
  });

  describe('create', () => {
    it('returns the stored row with a generated id and the given timestamps', async () => {
      const repository = await setup();

      const created = await repository.create(newRow());

      expect(created).toMatchObject({ title: 'Flux part', priceCents: 1999, createdAt: CREATED });
      expect(created.id).toBeGreaterThan(0);
    });

    it('generates an id greater than every existing id', async () => {
      const repository = await setup();
      const first = await repository.create(newRow({ sku: 'FLX-001' }));
      const second = await repository.create(newRow({ sku: 'FLX-002' }));

      expect(second.id).toBeGreaterThan(first.id);
    });

    it('throws DuplicateSkuError for an existing sku and leaves the table unchanged', async () => {
      const repository = await setup();
      await repository.create(newRow({ sku: 'DUP-001' }));

      const attempt = repository.create(newRow({ sku: 'DUP-001', title: 'Second' }));

      await expect(attempt).rejects.toBeInstanceOf(DuplicateSkuError);
      const page = await repository.list({ limit: 10, offset: 0 });
      expect(page.total).toBe(1);
      expect(page.rows[0]?.title).toBe('Flux part');
    });

    it('keeps the driver error as the cause of DuplicateSkuError', async () => {
      const repository = await setup();
      await repository.create(newRow({ sku: 'DUP-001' }));

      const error = await repository.create(newRow({ sku: 'DUP-001' })).catch((e: unknown) => e);

      expect((error as Error).cause).toBeInstanceOf(Error);
    });
  });

  describe('update', () => {
    it('changes only the given fields and returns the updated row', async () => {
      const repository = await setup();
      const created = await repository.create(newRow());

      const updated = await repository.update(created.id, { stock: 7, updatedAt: UPDATED });

      expect(updated).toEqual({ ...created, stock: 7, updatedAt: UPDATED });
    });

    it('never changes createdAt', async () => {
      const repository = await setup();
      const created = await repository.create(newRow());

      const updated = await repository.update(created.id, { title: 'Renamed', updatedAt: UPDATED });

      expect(updated?.createdAt).toBe(CREATED);
    });

    it('persists the change', async () => {
      const repository = await setup();
      const created = await repository.create(newRow());

      await repository.update(created.id, { priceCents: 250, updatedAt: UPDATED });

      expect((await repository.findById(created.id))?.priceCents).toBe(250);
    });

    it('allows a product to keep its own sku', async () => {
      const repository = await setup();
      const created = await repository.create(newRow({ sku: 'OWN-001' }));

      const updated = await repository.update(created.id, { sku: 'OWN-001', updatedAt: UPDATED });

      expect(updated?.sku).toBe('OWN-001');
    });

    it('throws DuplicateSkuError for the sku of another product and changes nothing', async () => {
      const repository = await setup();
      await repository.create(newRow({ sku: 'A-001' }));
      const other = await repository.create(newRow({ sku: 'B-001' }));

      const attempt = repository.update(other.id, { sku: 'A-001', title: 'X', updatedAt: UPDATED });

      await expect(attempt).rejects.toBeInstanceOf(DuplicateSkuError);
      expect(await repository.findById(other.id)).toEqual(other);
    });

    it('returns undefined when the product does not exist', async () => {
      const repository = await setup();

      expect(await repository.update(9999, { title: 'x', updatedAt: UPDATED })).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('removes an existing product and reports it, then reports a missing one', async () => {
      const repository = await setup();
      const created = await repository.create(newRow());

      expect(await repository.remove(created.id)).toBe(true);
      expect(await repository.findById(created.id)).toBeUndefined();
      expect(await repository.remove(created.id)).toBe(false);
    });

    it('does not reuse the id of a removed product', async () => {
      const repository = await setup();
      const first = await repository.create(newRow({ sku: 'A-001' }));
      await repository.remove(first.id);

      const next = await repository.create(newRow({ sku: 'B-001' }));

      expect(next.id).toBeGreaterThan(first.id);
    });
  });

  describe('other failures', () => {
    it('are not translated into DuplicateSkuError', async () => {
      const repository = await setup();
      database.client.close();

      const created = await repository.create(newRow()).catch((e: unknown) => e);
      const found = await repository.findById(1).catch((e: unknown) => e);

      expect(created).toBeInstanceOf(Error);
      expect(created).not.toBeInstanceOf(DuplicateSkuError);
      expect(found).toBeInstanceOf(Error);
    });
  });
});
