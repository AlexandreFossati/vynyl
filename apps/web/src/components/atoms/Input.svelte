<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props extends HTMLInputAttributes {
    value?: string;
  }

  // The label is the caller's job (aria-label or a <label for>), so the atom stays generic.
  let { value = $bindable(''), ...rest }: Props = $props();
</script>

<input class="input" bind:value {...rest} />

<style>
  .input {
    width: 100%;
    min-height: var(--tap-size);
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
  }

  .input::placeholder {
    color: var(--color-text-muted);
  }
</style>
