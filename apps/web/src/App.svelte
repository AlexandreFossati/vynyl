<script lang="ts">
  import DashboardPage from './components/pages/DashboardPage.svelte';
  import NotFoundPage from './components/pages/NotFoundPage.svelte';
  import ProductCreatePage from './components/pages/ProductCreatePage.svelte';
  import ProductDetailPage from './components/pages/ProductDetailPage.svelte';
  import ProductEditPage from './components/pages/ProductEditPage.svelte';
  import Header from './components/organisms/Header.svelte';
  import Toaster from './components/organisms/Toaster.svelte';
  import AppShell from './components/templates/AppShell.svelte';
  import { router } from './lib/router.svelte';
  import { resolveRoute } from './lib/routes';
  import { createToasts } from './lib/toasts.svelte';

  // One store for the whole app, outside the pages: a toast has to outlive the navigation that
  // follows the action it reports.
  const toasts = createToasts();

  const route = $derived(resolveRoute(router.path));
</script>

<AppShell>
  {#snippet header()}
    <Header title="Product Catalog" />
  {/snippet}

  {#if route.name === 'dashboard'}
    <DashboardPage />
  {:else if route.name === 'product-create'}
    <ProductCreatePage notify={toasts} />
  {:else if route.name === 'product-detail'}
    <ProductDetailPage id={route.id} notify={toasts} />
  {:else if route.name === 'product-edit'}
    <ProductEditPage id={route.id} notify={toasts} />
  {:else}
    <NotFoundPage />
  {/if}
</AppShell>

<Toaster toasts={toasts.items} ondismiss={toasts.dismiss} />
