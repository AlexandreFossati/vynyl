<script lang="ts">
  import { paths } from '../../lib/routes';
  import Link from '../atoms/Link.svelte';

  interface Props {
    title: string;
  }

  let { title }: Props = $props();
</script>

<header class="header">
  <div class="inner">
    <span class="brand"><Link href={paths.dashboard}>{title}</Link></span>
  </div>
</header>

<style>
  .header {
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .inner {
    display: flex;
    align-items: center;
    max-width: var(--content-width);
    min-height: var(--tap-size);
    margin: 0 auto;
    padding: var(--space-3) var(--space-4);
  }

  .brand {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
  }

  /* The brand is a link, but reads as the app's name rather than as a call to action. */
  .brand :global(a) {
    color: inherit;
    text-decoration: none;
  }

  @media (min-width: 640px) {
    .inner {
      padding-inline: var(--space-5);
    }
  }

  @media (min-width: 1024px) {
    .inner {
      padding-inline: var(--space-6);
    }
  }
</style>
