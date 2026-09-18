<script lang="ts">
  import type { Toast as ToastItem } from '../../lib/toasts.svelte';
  import Toast from '../molecules/Toast.svelte';

  interface Props {
    toasts: readonly ToastItem[];
    ondismiss: (id: number) => void;
  }

  let { toasts, ondismiss }: Props = $props();
</script>

<!-- Always in the page, even when empty: a live region has to exist before its content changes. -->
<div class="toaster" aria-live="polite">
  {#each toasts as toast (toast.id)}
    <Toast message={toast.message} tone={toast.tone} ondismiss={() => ondismiss(toast.id)} />
  {/each}
</div>

<style>
  .toaster {
    position: fixed;
    right: var(--space-4);
    bottom: var(--space-4);
    left: var(--space-4);
    z-index: 10;
    display: grid;
    gap: var(--space-2);
  }

  @media (min-width: 640px) {
    .toaster {
      left: auto;
      width: 24rem;
    }
  }
</style>
