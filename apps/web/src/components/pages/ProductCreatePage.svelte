<script lang="ts">
  import type { CreateProductInput } from '@vynyl/shared';
  import { productsApi, type ProductsApi } from '../../lib/api/products-api';
  import { describeSaveFailure } from '../../lib/product-form';
  import { router } from '../../lib/router.svelte';
  import { paths } from '../../lib/routes';
  import type { Notifier } from '../../lib/toasts.svelte';
  import ProductForm from '../organisms/ProductForm.svelte';

  interface Props {
    // Injected so tests can hand the page a fake; the real one is the default.
    api?: Pick<ProductsApi, 'create'>;
    notify: Notifier;
  }

  let { api = productsApi, notify }: Props = $props();

  let saving = $state(false);
  let form = $state<ReturnType<typeof ProductForm>>();

  async function save(input: CreateProductInput) {
    if (saving) {
      return;
    }
    saving = true;
    try {
      const created = await api.create(input);
      notify.success('Product created');
      router.navigate(paths.product(created.id));
    } catch (error) {
      const { fields, toast } = describeSaveFailure(error);
      if (Object.keys(fields).length > 0) {
        form?.showErrors(fields);
      }
      if (toast) {
        notify.error(toast);
      }
    } finally {
      saving = false;
    }
  }
</script>

<div class="page">
  <h1 class="title">New product</h1>
  <ProductForm
    bind:this={form}
    submitLabel="Create product"
    busy={saving}
    onsubmit={save}
    oncancel={() => router.navigate(paths.dashboard)}
  />
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
