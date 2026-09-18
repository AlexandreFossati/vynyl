<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends HTMLButtonAttributes {
    variant?: 'primary' | 'secondary';
  }

  // Everything else (onclick, disabled, aria-*) goes straight to the <button>.
  let { variant = 'secondary', type = 'button', children, ...rest }: Props = $props();
</script>

<button {type} class="button {variant}" {...rest}>{@render children?.()}</button>

<style>
  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-height: var(--tap-size);
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
  }

  .button:hover:not(:disabled) {
    border-color: var(--color-text-muted);
  }

  .primary {
    border-color: var(--color-accent);
    background: var(--color-accent);
    color: var(--color-accent-text);
  }

  .primary:hover:not(:disabled) {
    border-color: var(--color-accent-hover);
    background: var(--color-accent-hover);
  }

  .button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
