<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  interface Props extends HTMLTextareaAttributes {
    value?: string;
  }

  // Like Input, the label is the caller's job.
  let { value = $bindable(''), ...rest }: Props = $props();
</script>

<textarea class="textarea" bind:value {...rest}></textarea>

<style>
  .textarea {
    width: 100%;
    min-height: calc(var(--tap-size) * 2);
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    resize: vertical;
  }

  .textarea[aria-invalid='true'] {
    border-color: var(--color-danger-text);
  }
</style>
