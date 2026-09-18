<script lang="ts">
  import Button from '../atoms/Button.svelte';
  import Spinner from '../atoms/Spinner.svelte';

  interface Props {
    title: string;
    message?: string;
    tone?: 'neutral' | 'danger';
    // Shows a spinner: something is loading.
    busy?: boolean;
    actionLabel?: string;
    onaction?: () => void;
  }

  let { title, message, tone = 'neutral', busy = false, actionLabel, onaction }: Props = $props();
</script>

<!-- An error interrupts assistive technology; loading and empty states are announced politely. -->
<div class="status {tone}" role={tone === 'danger' ? 'alert' : 'status'}>
  {#if busy}<Spinner />{/if}
  <p class="title">{title}</p>
  {#if message}<p class="message">{message}</p>{/if}
  {#if actionLabel && onaction}
    <Button variant="primary" onclick={onaction}>{actionLabel}</Button>
  {/if}
</div>

<style>
  .status {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-6) var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    text-align: center;
  }

  .danger {
    border-color: var(--color-danger-text);
  }

  .title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
  }

  .danger .title {
    color: var(--color-danger-text);
  }

  .message {
    color: var(--color-text-muted);
  }
</style>
