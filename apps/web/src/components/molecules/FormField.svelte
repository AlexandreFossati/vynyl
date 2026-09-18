<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import Input from '../atoms/Input.svelte';
  import Textarea from '../atoms/Textarea.svelte';

  interface Props {
    label: string;
    value?: string;
    // The message for the current problem with the value, if any.
    error?: string | undefined;
    multiline?: boolean;
    required?: boolean;
    inputmode?: HTMLInputAttributes['inputmode'];
    oninput?: () => void;
  }

  let {
    label,
    value = $bindable(''),
    error,
    multiline = false,
    required = false,
    inputmode,
    oninput,
  }: Props = $props();

  const id = $props.id();
  const errorId = `${id}-error`;

  // Ties the message to the field, so assistive technology reads it with the field.
  const control = $derived({
    id,
    required,
    autocomplete: 'off' as const,
    oninput,
    'aria-invalid': error ? ('true' as const) : undefined,
    'aria-describedby': error ? errorId : undefined,
  });
</script>

<div class="field">
  <label class="label" for={id}>{label}</label>
  {#if multiline}
    <Textarea {...control} rows={4} bind:value />
  {:else}
    <Input {...control} {inputmode} bind:value />
  {/if}
  {#if error}
    <p class="error" id={errorId}>{error}</p>
  {/if}
</div>

<style>
  .field {
    display: grid;
    gap: var(--space-1);
    align-content: start;
  }

  .label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
  }

  .error {
    color: var(--color-danger-text);
    font-size: var(--font-size-sm);
  }
</style>
