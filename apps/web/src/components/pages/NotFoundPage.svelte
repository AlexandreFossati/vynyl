<script lang="ts">
  import { router } from '../../lib/router.svelte';

  // A plain link (so it works with the keyboard and "open in new tab"), handled in-app when
  // it is a normal click.
  function goHome(event: MouseEvent) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    router.navigate('/');
  }
</script>

<section class="not-found">
  <h1 class="title">Page not found</h1>
  <p class="message">The page you are looking for does not exist.</p>
  <a class="link" href="/" onclick={goHome}>Back to products</a>
</section>

<style>
  .not-found {
    display: grid;
    justify-items: center;
    gap: var(--space-3);
    padding: var(--space-6) var(--space-4);
    text-align: center;
  }

  .title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
  }

  .message {
    color: var(--color-text-muted);
  }

  .link {
    display: inline-flex;
    align-items: center;
    min-height: var(--tap-size);
    font-weight: var(--font-weight-medium);
  }
</style>
