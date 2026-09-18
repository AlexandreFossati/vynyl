<script lang="ts">
  import { ApiError } from '../../lib/api/api-error';
  import { productsApi, type ProductsApi } from '../../lib/api/products-api';
  import { createProductLoader } from '../../lib/product-loader.svelte';
  import { router } from '../../lib/router.svelte';
  import { paths } from '../../lib/routes';
  import type { Notifier } from '../../lib/toasts.svelte';
  import Button from '../atoms/Button.svelte';
  import Link from '../atoms/Link.svelte';
  import StatusMessage from '../molecules/StatusMessage.svelte';
  import ConfirmDialog from '../organisms/ConfirmDialog.svelte';
  import ProductDetail from '../organisms/ProductDetail.svelte';

  interface Props {
    id: number;
    // Injected so tests can hand the page a fake; the real one is the default.
    api?: Pick<ProductsApi, 'get' | 'remove'>;
    notify: Notifier;
  }

  let { id, api = productsApi, notify }: Props = $props();

  const loader = createProductLoader({ api: () => api, id: () => id });

  let confirming = $state(false);
  let deleting = $state(false);

  async function remove() {
    if (deleting) {
      return;
    }
    deleting = true;
    try {
      await api.remove(id);
      notify.success('Product deleted');
      router.navigate(paths.dashboard);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PRODUCT_NOT_FOUND') {
        // Someone else deleted it first: the goal of the user is met, and there is nothing left here.
        notify.error('This product no longer exists.');
        router.navigate(paths.dashboard);
      } else {
        notify.error('Could not delete the product. Please try again.');
      }
    } finally {
      deleting = false;
      confirming = false;
    }
  }
</script>

<div class="page">
  {#if loader.current.status === 'ready'}
    {@const product = loader.current.product}
    <div><Link href={paths.dashboard}>Back to products</Link></div>
    <ProductDetail {product} />
    <div class="actions">
      <Link variant="secondary" href={paths.productEdit(product.id)}>Edit</Link>
      <Button onclick={() => (confirming = true)}>Delete</Button>
    </div>
    <ConfirmDialog
      open={confirming}
      title="Delete product?"
      message="“{product.title}” will be permanently removed."
      confirmLabel="Delete"
      busy={deleting}
      onconfirm={remove}
      oncancel={() => (confirming = false)}
    />
  {:else if loader.current.status === 'not-found'}
    <StatusMessage
      title="Product not found"
      message="It may have been deleted."
      actionLabel="Back to products"
      onaction={() => router.navigate(paths.dashboard)}
    />
  {:else if loader.current.status === 'error'}
    <StatusMessage
      tone="danger"
      title="Could not load the product"
      message="Check your connection and try again."
      actionLabel="Try again"
      onaction={loader.reload}
    />
  {:else}
    <StatusMessage busy title="Loading product…" />
  {/if}
</div>

<style>
  .page {
    display: grid;
    gap: var(--space-4);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }
</style>
