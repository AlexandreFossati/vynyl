<script lang="ts">
  import Badge from '../atoms/Badge.svelte';

  interface Props {
    stock: number;
  }

  let { stock }: Props = $props();

  // A presentation choice of this app, not part of the API contract.
  const LOW_STOCK_MAX = 10;

  const status = $derived(
    stock === 0
      ? { tone: 'danger' as const, label: 'Out of stock' }
      : stock <= LOW_STOCK_MAX
        ? { tone: 'warning' as const, label: 'Low stock' }
        : { tone: 'success' as const, label: 'In stock' },
  );
</script>

<!-- The text carries the meaning; the color only reinforces it. -->
<Badge tone={status.tone}>{status.label} ({stock})</Badge>
