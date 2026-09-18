<script lang="ts">
  import Button from '../atoms/Button.svelte';

  interface Props {
    message: string;
    tone?: 'success' | 'error';
    ondismiss: () => void;
  }

  let { message, tone = 'success', ondismiss }: Props = $props();
</script>

<!-- Success is announced politely by the live region around the toasts; an error interrupts. -->
<div class="toast {tone}" role={tone === 'error' ? 'alert' : undefined}>
  <p class="message">{message}</p>
  <Button aria-label="Dismiss notification" onclick={ondismiss}>×</Button>
</div>

<style>
  .toast {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
    border: 1px solid currentcolor;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
  }

  .success {
    background: var(--color-success-bg);
    color: var(--color-success-text);
  }

  .error {
    background: var(--color-danger-bg);
    color: var(--color-danger-text);
  }

  .message {
    overflow-wrap: anywhere;
    font-weight: var(--font-weight-medium);
  }
</style>
