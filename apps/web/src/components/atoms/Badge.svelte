<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    tone?: 'neutral' | 'success' | 'warning' | 'danger';
    children: Snippet;
  }

  let { tone = 'neutral', children }: Props = $props();
</script>

<span class="badge {tone}">{@render children()}</span>

<style>
  .badge {
    display: inline-block;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-lg);
    background: var(--color-bg);
    color: var(--color-text);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-tight);
    white-space: nowrap;
  }

  .success {
    background: var(--color-success-bg);
    color: var(--color-success-text);
  }

  .warning {
    background: var(--color-warning-bg);
    color: var(--color-warning-text);
  }

  .danger {
    background: var(--color-danger-bg);
    color: var(--color-danger-text);
  }
</style>
