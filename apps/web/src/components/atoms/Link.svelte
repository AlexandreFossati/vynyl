<script lang="ts">
  import type { HTMLAnchorAttributes } from 'svelte/elements';
  import { router } from '../../lib/router.svelte';

  interface Props extends HTMLAnchorAttributes {
    // `primary` and `secondary` look like the buttons of the same name, for actions that navigate.
    variant?: 'link' | 'primary' | 'secondary';
  }

  let { variant = 'link', href, target, children, ...rest }: Props = $props();

  // A real link (keyboard, "open in new tab"), handled in-app only for a plain click: anything
  // else, such as Ctrl+click or the middle button, keeps the browser's own behavior.
  function navigate(event: MouseEvent) {
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (event.button !== 0 || modified || target || href === undefined || href === null) {
      return;
    }
    event.preventDefault();
    router.navigate(href);
  }
</script>

<a {...rest} {href} {target} class="link {variant}" onclick={navigate}>{@render children?.()}</a>

<style>
  .link {
    display: inline-flex;
    align-items: center;
    min-height: var(--tap-size);
  }

  .primary,
  .secondary {
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text);
    font-weight: var(--font-weight-medium);
    text-decoration: none;
  }

  .secondary:hover {
    border-color: var(--color-text-muted);
  }

  .primary {
    border-color: var(--color-accent);
    background: var(--color-accent);
    color: var(--color-accent-text);
  }

  .primary:hover {
    border-color: var(--color-accent-hover);
    background: var(--color-accent-hover);
  }

  /* Plain links only need the touch-sized target on small screens. */
  @media (min-width: 640px) {
    .link:not(.primary, .secondary) {
      min-height: 0;
    }
  }
</style>
