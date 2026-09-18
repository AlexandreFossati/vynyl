<!-- Decorative: whoever shows it also renders a text that says what is loading. -->
<span class="spinner" aria-hidden="true"></span>

<style>
  .spinner {
    display: inline-block;
    width: var(--space-5);
    height: var(--space-5);
    border: 3px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation-duration: 3s;
    }
  }
</style>
