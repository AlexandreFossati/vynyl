<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    header: Snippet;
    children: Snippet;
  }

  // Layout only: where the header and the page content go.
  let { header, children }: Props = $props();
</script>

<div class="shell">
  {@render header()}
  <main class="content">
    {@render children()}
  </main>
</div>

<style>
  .shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .content {
    flex: 1;
    width: 100%;
    max-width: var(--content-width);
    margin: 0 auto;
    padding: var(--space-4);
  }

  @media (min-width: 640px) {
    .content {
      padding: var(--space-5);
    }
  }

  @media (min-width: 1024px) {
    .content {
      padding: var(--space-6);
    }
  }
</style>
