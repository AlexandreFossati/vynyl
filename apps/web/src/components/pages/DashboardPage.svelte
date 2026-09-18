<script lang="ts">
  import type { ProductListResponse } from '@vynyl/shared';
  import { productsApi, type ProductsApi } from '../../lib/api/products-api';
  import { paths } from '../../lib/routes';
  import Link from '../atoms/Link.svelte';
  import Pagination from '../molecules/Pagination.svelte';
  import SearchBox from '../molecules/SearchBox.svelte';
  import StatusMessage from '../molecules/StatusMessage.svelte';
  import ProductList from '../organisms/ProductList.svelte';

  interface Props {
    // Injected so tests can hand the page a fake; the real one is the default.
    api?: Pick<ProductsApi, 'list'>;
  }

  let { api = productsApi }: Props = $props();

  const PAGE_SIZE = 30;

  // What is typed in the search box, immediately.
  let searchText = $state('');
  // The search applied to the list: trimmed, and only updated once the user pauses typing.
  let query = $state('');
  // 1-based.
  let page = $state(1);

  let result = $state<ProductListResponse | undefined>();
  let loading = $state(true);
  let failed = $state(false);

  const request = $derived({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    q: query === '' ? undefined : query,
  });

  let inFlight: AbortController | undefined;

  // Starting a request cancels the previous one, and the response of a cancelled request is
  // ignored even if it still arrives, so only the latest request can change what is shown.
  function load() {
    inFlight?.abort();
    const controller = new AbortController();
    inFlight = controller;
    loading = true;
    failed = false;

    api.list(request, controller.signal).then(
      (response) => {
        if (controller.signal.aborted) return;
        result = response;
        loading = false;
      },
      () => {
        if (controller.signal.aborted) return;
        // Forget the old list: "Try again" starts from the loading state, not from stale data.
        result = undefined;
        loading = false;
        failed = true;
      },
    );
  }

  // Runs on the first render and whenever the page, the search or the api changes.
  $effect(() => {
    load();
    return () => inFlight?.abort();
  });

  function applySearch(term: string) {
    const next = term.trim();
    if (next !== query) {
      query = next;
      page = 1;
    }
  }

  function clearSearch() {
    searchText = '';
    query = '';
    page = 1;
  }
</script>

<div class="dashboard">
  <div class="toolbar">
    <div class="heading">
      <h1 class="title">Products</h1>
      <Link variant="primary" href={paths.productCreate}>Add product</Link>
    </div>
    <SearchBox bind:value={searchText} onsearch={applySearch} />
  </div>

  {#if failed}
    <StatusMessage
      tone="danger"
      title="Could not load products"
      message="Check your connection and try again."
      actionLabel="Try again"
      onaction={load}
    />
  {:else if !result}
    <StatusMessage busy title="Loading products…" />
  {:else if result.total === 0}
    <StatusMessage
      title="No products found"
      message={query ? `Nothing matches “${query}”.` : 'The catalog is empty.'}
      actionLabel={query ? 'Clear search' : undefined}
      onaction={clearSearch}
    />
  {:else}
    <ProductList products={result.data} busy={loading} />
    <Pagination
      {page}
      pageSize={PAGE_SIZE}
      total={result.total}
      onpagechange={(next) => (page = next)}
    />
  {/if}
</div>

<style>
  .dashboard {
    display: grid;
    gap: var(--space-4);
  }

  .toolbar {
    display: grid;
    gap: var(--space-3);
  }

  .heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
  }

  @media (min-width: 640px) {
    .dashboard {
      gap: var(--space-5);
    }

    .toolbar {
      grid-template-columns: 1fr auto;
      align-items: center;
    }

    .heading {
      justify-content: flex-start;
      gap: var(--space-4);
    }
  }
</style>
