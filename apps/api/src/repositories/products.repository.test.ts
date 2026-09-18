import { afterEach, describe, expect, it } from 'vitest';
import { products } from '../db/schema';
import { createTestDatabase, type TestDatabase } from '../test/database';
import { createProductsRepository } from './products.repository';

interface Fixture {
  id?: number;
  title: string;
  description?: string;
}

describe('products repository', () => {
  let database: TestDatabase;

  afterEach(() => {
    database.close();
  });

  const setup = async (fixtures: Fixture[]) => {
    database = await createTestDatabase();
    if (fixtures.length > 0) {
      await database.db.insert(products).values(
        fixtures.map((fixture, index) => ({
          ...(fixture.id === undefined ? {} : { id: fixture.id }),
          title: fixture.title,
          description: fixture.description ?? 'plain description',
          category: 'tools',
          priceCents: 100,
          stock: 1,
          brand: 'ACME',
          sku: `SKU-${index + 1}`,
          weight: 1,
        })),
      );
    }
    return createProductsRepository(database.db);
  };

  const numbered = (size: number): Fixture[] =>
    Array.from({ length: size }, (_unused, index) => ({ title: `Item ${index + 1}` }));

  const titles = (rows: Array<{ title: string }>) => rows.map((row) => row.title);

  describe('pagination', () => {
    it('orders by id ascending regardless of insertion order', async () => {
      const repository = await setup([
        { id: 3, title: 'Third' },
        { id: 1, title: 'First' },
        { id: 2, title: 'Second' },
      ]);

      const { rows } = await repository.list({ limit: 10, offset: 0 });

      expect(rows.map((row) => row.id)).toEqual([1, 2, 3]);
    });

    it('returns the requested slice', async () => {
      const repository = await setup(numbered(25));

      const { rows } = await repository.list({ limit: 5, offset: 10 });

      expect(titles(rows)).toEqual(['Item 11', 'Item 12', 'Item 13', 'Item 14', 'Item 15']);
    });

    it('reports the same total on every page and pages do not overlap', async () => {
      const repository = await setup(numbered(25));

      const first = await repository.list({ limit: 10, offset: 0 });
      const second = await repository.list({ limit: 10, offset: 10 });
      const third = await repository.list({ limit: 10, offset: 20 });

      expect([first.total, second.total, third.total]).toEqual([25, 25, 25]);
      const ids = [...first.rows, ...second.rows, ...third.rows].map((row) => row.id);
      expect(new Set(ids).size).toBe(25);
      expect(third.rows).toHaveLength(5);
    });

    it('returns no rows but the correct total when the offset is past the end', async () => {
      const repository = await setup(numbered(25));

      const page = await repository.list({ limit: 10, offset: 1000 });

      expect(page).toEqual({ rows: [], total: 25 });
    });

    it('returns everything when the limit exceeds the number of products', async () => {
      const repository = await setup(numbered(3));

      const { rows, total } = await repository.list({ limit: 100, offset: 0 });

      expect(rows).toHaveLength(3);
      expect(total).toBe(3);
    });

    it('handles an empty table', async () => {
      const repository = await setup([]);

      expect(await repository.list({ limit: 30, offset: 0 })).toEqual({ rows: [], total: 0 });
    });
  });

  describe('search', () => {
    const searchable: Fixture[] = [
      { title: 'Alpha Widget', description: 'first' },
      { title: 'ALPHA gadget', description: 'second' },
      { title: 'Beta 50% off', description: 'discounted' },
      { title: 'Gamma_thing', description: 'underscore in the title' },
      { title: 'GammaXthing', description: 'no underscore anywhere' },
      { title: 'Back\\slash', description: 'has a backslash' },
      { title: 'Delta', description: 'mentions a flux capacitor' },
      { title: 'Epsilon', description: 'ends with a wild_card' },
    ];

    it('matches the title regardless of letter case', async () => {
      const repository = await setup(searchable);

      const { rows, total } = await repository.list({ limit: 30, offset: 0, search: 'alpha' });

      expect(titles(rows)).toEqual(['Alpha Widget', 'ALPHA gadget']);
      expect(total).toBe(2);
    });

    it('matches the description when the title does not contain the term', async () => {
      const repository = await setup(searchable);

      const { rows } = await repository.list({ limit: 30, offset: 0, search: 'FLUX' });

      expect(titles(rows)).toEqual(['Delta']);
    });

    it('matches a substring in the middle of a word', async () => {
      const repository = await setup(searchable);

      const { rows } = await repository.list({ limit: 30, offset: 0, search: 'idget' });

      expect(titles(rows)).toEqual(['Alpha Widget']);
    });

    it('treats % literally instead of as a wildcard', async () => {
      const repository = await setup(searchable);

      const { rows, total } = await repository.list({ limit: 30, offset: 0, search: '%' });

      expect(titles(rows)).toEqual(['Beta 50% off']);
      expect(total).toBe(1);
    });

    it('treats _ literally instead of as a single-character wildcard', async () => {
      const repository = await setup(searchable);

      const { rows } = await repository.list({ limit: 30, offset: 0, search: '_' });

      expect(titles(rows)).toEqual(['Gamma_thing', 'Epsilon']);
    });

    it('does not let an underscore match an arbitrary character', async () => {
      const repository = await setup(searchable);

      const { rows } = await repository.list({ limit: 30, offset: 0, search: 'Gamma_thing' });

      expect(titles(rows)).toEqual(['Gamma_thing']);
    });

    it('treats a backslash literally', async () => {
      const repository = await setup(searchable);

      const { rows } = await repository.list({ limit: 30, offset: 0, search: '\\' });

      expect(titles(rows)).toEqual(['Back\\slash']);
    });

    it('does not interpret the search term as SQL', async () => {
      const repository = await setup(searchable);

      const { rows, total } = await repository.list({
        limit: 30,
        offset: 0,
        search: "' OR 1=1 --",
      });

      expect(rows).toEqual([]);
      expect(total).toBe(0);
    });

    it('returns no rows and a zero total when nothing matches', async () => {
      const repository = await setup(searchable);

      const page = await repository.list({ limit: 30, offset: 0, search: 'does-not-exist' });

      expect(page).toEqual({ rows: [], total: 0 });
    });

    it('combines the search with pagination and counts only the matches', async () => {
      const repository = await setup(
        Array.from({ length: 12 }, (_unused, index) => ({
          title: `Flux part ${index + 1}`,
        })).concat([{ title: 'Unrelated' }]),
      );

      const { rows, total } = await repository.list({ limit: 5, offset: 5, search: 'flux' });

      expect(titles(rows)).toEqual([
        'Flux part 6',
        'Flux part 7',
        'Flux part 8',
        'Flux part 9',
        'Flux part 10',
      ]);
      expect(total).toBe(12);
    });

    it('applies no filter when the search is empty or absent', async () => {
      const repository = await setup(searchable);

      const withEmpty = await repository.list({ limit: 30, offset: 0, search: '' });
      const withUndefined = await repository.list({ limit: 30, offset: 0, search: undefined });

      expect(withEmpty.total).toBe(searchable.length);
      expect(withUndefined.total).toBe(searchable.length);
    });
  });
});
