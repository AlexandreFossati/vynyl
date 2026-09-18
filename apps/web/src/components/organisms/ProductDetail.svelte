<script lang="ts">
  import type { Product } from '@vynyl/shared';
  import { formatCategory, formatDateTime } from '../../lib/format';
  import PriceTag from '../molecules/PriceTag.svelte';
  import StockBadge from '../molecules/StockBadge.svelte';

  interface Props {
    product: Product;
  }

  let { product }: Props = $props();
</script>

<article class="detail">
  <h1 class="title">{product.title}</h1>
  <p class="description">{product.description}</p>

  <dl class="facts">
    <div class="fact">
      <dt>Category</dt>
      <dd>{formatCategory(product.category)}</dd>
    </div>
    <div class="fact">
      <dt>Brand</dt>
      <dd>{product.brand}</dd>
    </div>
    <div class="fact">
      <dt>SKU</dt>
      <dd class="sku">{product.sku}</dd>
    </div>
    <div class="fact">
      <dt>Price</dt>
      <dd><PriceTag value={product.price} /></dd>
    </div>
    <div class="fact">
      <dt>Stock</dt>
      <dd><StockBadge stock={product.stock} /></dd>
    </div>
    <div class="fact">
      <dt>Weight</dt>
      <dd>{product.weight}</dd>
    </div>
    <div class="fact">
      <dt>Created</dt>
      <dd>
        <time datetime={product.meta.createdAt}>{formatDateTime(product.meta.createdAt)}</time>
      </dd>
    </div>
    <div class="fact">
      <dt>Last updated</dt>
      <dd>
        <time datetime={product.meta.updatedAt}>{formatDateTime(product.meta.updatedAt)}</time>
      </dd>
    </div>
  </dl>
</article>

<style>
  .detail {
    display: grid;
    gap: var(--space-4);
    padding: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
  }

  .title {
    overflow-wrap: anywhere;
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
  }

  /* Keeps the line breaks the description was typed with. */
  .description {
    overflow-wrap: anywhere;
    white-space: pre-line;
  }

  .facts {
    display: grid;
    gap: var(--space-3);
    margin: 0;
  }

  dt {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
    font-weight: var(--font-weight-medium);
  }

  .sku {
    font-variant-numeric: tabular-nums;
  }

  @media (min-width: 640px) {
    .detail {
      padding: var(--space-5);
    }

    .facts {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: var(--space-5);
    }
  }
</style>
