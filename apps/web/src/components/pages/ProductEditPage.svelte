<script lang="ts">
  import type { CreateProductInput } from '@vynyl/shared';
  import { ApiError } from '../../lib/api/api-error';
  import { productsApi, type ProductsApi } from '../../lib/api/products-api';
  import { describeSaveFailure, valuesFromProduct } from '../../lib/product-form';
  import { createProductLoader } from '../../lib/product-loader.svelte';
  import { router } from '../../lib/router.svelte';
  import { paths } from '../../lib/routes';
  import type { Notifier } from '../../lib/toasts.svelte';
  import StatusMessage from '../molecules/StatusMessage.svelte';
  import ProductForm from '../organisms/ProductForm.svelte';

  interface Props {
    id: number;
    // Injected so tests can hand the page a fake; the real one is the default.
    api?: Pick<ProductsApi, 'get' | 'update'>;
    notify: Notifier;
  }

  let { id, api = productsApi, notify }: Props = $props();

  const loader = createProductLoader({ api: () => api, id: () => id });

  let saving = $state(false);
  let form = $state<ReturnType<typeof ProductForm>>();

  // Every field is sent, not only the ones that changed: the form holds all of them, and it
  // avoids a request with nothing in it when the user saves without editing.
  async function save(input: CreateProductInput) {
    if (saving) {
      return;
    }
    saving = true;
    try {
      const updated = await api.update(id, input);
      notify.success('Product updated');
      router.navigate(paths.product(updated.id));
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PRODUCT_NOT_FOUND') {
        // Deleted while the user was editing it: there is nothing left to save to.
        notify.error('This product no longer exists.');
        router.navigate(paths.dashboard);
      } else {
        const { fields, toast } = describeSaveFailure(error);
        if (Object.keys(fields).length > 0) {
          form?.showErrors(fields);
        }
        if (toast) {
          notify.error(toast);
        }
      }
    } finally {
      saving = false;
    }
  }
</script>

<div class="page">
  {#if loader.current.status === 'ready'}
    <h1 class="title">Edit product</h1>
    <ProductForm
      bind:this={form}
      initialValues={valuesFromProduct(loader.current.product)}
      submitLabel="Save changes"
      busy={saving}
      onsubmit={save}
      oncancel={() => router.navigate(paths.product(id))}
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

  .title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
  }
</style>
