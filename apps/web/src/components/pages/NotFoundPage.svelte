<script lang="ts">
  import { paths } from '../../lib/routes';
  import Link from '../atoms/Link.svelte';
</script>

<section class="not-found">
  <h1 class="title">Page not found</h1>
  <p class="message">The page you are looking for does not exist.</p>
  <Link href={paths.dashboard}>Back to products</Link>
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
</style>
