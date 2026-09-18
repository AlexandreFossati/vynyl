<script lang="ts">
  interface Props {
    value: number;
  }

  let { value }: Props = $props();

  // The catalog has a single currency.
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
</script>

<span class="price">{formatter.format(value)}</span>

<style>
  .price {
    font-variant-numeric: tabular-nums;
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
  }
</style>
