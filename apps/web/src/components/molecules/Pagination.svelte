<script lang="ts">
  import Button from '../atoms/Button.svelte';

  interface Props {
    // 1-based.
    page: number;
    pageSize: number;
    total: number;
    onpagechange: (page: number) => void;
  }

  let { page, pageSize, total, onpagechange }: Props = $props();

  const lastPage = $derived(Math.max(1, Math.ceil(total / pageSize)));
  const from = $derived((page - 1) * pageSize + 1);
  const to = $derived(Math.min(page * pageSize, total));
</script>

<nav class="pagination" aria-label="Pagination">
  <p class="summary" aria-live="polite">
    {#if total === 0}
      No results
    {:else}
      Showing {from}–{to} of {total}
    {/if}
  </p>
  <div class="controls">
    <Button disabled={page <= 1} onclick={() => onpagechange(page - 1)}>Previous</Button>
    <span class="position">Page {page} of {lastPage}</span>
    <Button disabled={page >= lastPage} onclick={() => onpagechange(page + 1)}>Next</Button>
  </div>
</nav>

<style>
  .pagination {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
  }

  .summary,
  .position {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  .controls {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  @media (min-width: 640px) {
    .pagination {
      flex-direction: row;
      justify-content: space-between;
    }
  }
</style>
