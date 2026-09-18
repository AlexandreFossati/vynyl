<script lang="ts">
  import type { Product } from '@vynyl/shared';
  import PriceTag from '../molecules/PriceTag.svelte';
  import StockBadge from '../molecules/StockBadge.svelte';

  interface Props {
    products: Product[];
    // A newer page is being loaded: keep showing these products, marked as stale.
    busy?: boolean;
  }

  let { products, busy = false }: Props = $props();

  // "dimensional-travel" reads better as "Dimensional travel".
  const formatCategory = (category: string) => {
    const words = category.replaceAll('-', ' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
  };
</script>

<!--
  The same products are rendered twice: as cards on small screens and as a table from 640px.
  CSS hides one of them with display: none, which also removes it from the accessibility tree.
-->
<div class="product-list" class:busy aria-busy={busy}>
  <ul class="cards">
    {#each products as product (product.id)}
      <li class="card">
        <div class="card-head">
          <h2 class="name">{product.title}</h2>
          <StockBadge stock={product.stock} />
        </div>
        <p class="meta">
          {product.brand} · {formatCategory(product.category)}
        </p>
        <p class="card-price"><PriceTag value={product.price} /></p>
      </li>
    {/each}
  </ul>

  <table class="table">
    <caption class="visually-hidden">Products</caption>
    <thead>
      <tr>
        <th scope="col">Product</th>
        <th scope="col">Category</th>
        <th scope="col" class="wide">Brand</th>
        <th scope="col" class="wide">SKU</th>
        <th scope="col" class="numeric">Price</th>
        <th scope="col">Stock</th>
      </tr>
    </thead>
    <tbody>
      {#each products as product (product.id)}
        <tr>
          <th scope="row" class="name">{product.title}</th>
          <td>{formatCategory(product.category)}</td>
          <td class="wide">{product.brand}</td>
          <td class="wide sku">{product.sku}</td>
          <td class="numeric"><PriceTag value={product.price} /></td>
          <td><StockBadge stock={product.stock} /></td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .product-list.busy {
    opacity: 0.6;
  }

  .name {
    overflow-wrap: anywhere;
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
  }

  /* Cards: below 640px */
  .cards {
    display: grid;
    gap: var(--space-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .card {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
  }

  .card-head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .meta {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  .table {
    display: none;
  }

  /* Table: from 640px */
  @media (min-width: 640px) {
    .cards {
      display: none;
    }

    .table {
      display: table;
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
    }

    th,
    td {
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--color-border);
      text-align: left;
      vertical-align: middle;
    }

    tbody tr:last-child > * {
      border-bottom: 0;
    }

    thead th {
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
    }

    .numeric {
      text-align: right;
    }

    .sku {
      font-variant-numeric: tabular-nums;
    }

    /* Brand and SKU only fit comfortably from 1024px. */
    .wide {
      display: none;
    }
  }

  @media (min-width: 1024px) {
    .wide {
      display: table-cell;
    }
  }
</style>
