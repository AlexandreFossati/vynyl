import { createRawSnippet } from 'svelte';

// Test helper: a snippet that renders a fixed text, for components that take `children`.
export const textSnippet = (text: string) =>
  createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));
