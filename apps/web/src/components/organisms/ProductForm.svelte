<script lang="ts">
  import type { CreateProductInput } from '@vynyl/shared';
  import { tick, untrack } from 'svelte';
  import {
    emptyValues,
    validateProductForm,
    type FieldErrors,
    type FormValues,
    type ProductField,
  } from '../../lib/product-form';
  import Button from '../atoms/Button.svelte';
  import FormField from '../molecules/FormField.svelte';

  interface Props {
    // The values the form starts with (an existing product when editing).
    initialValues?: FormValues;
    submitLabel: string;
    // A save is in progress: the form cannot be sent again.
    busy?: boolean;
    // Called only with values that passed the shared product rules.
    onsubmit: (input: CreateProductInput) => void;
    oncancel: () => void;
  }

  let {
    initialValues = emptyValues(),
    submitLabel,
    busy = false,
    onsubmit,
    oncancel,
  }: Props = $props();

  interface FieldConfig {
    name: ProductField;
    label: string;
    multiline?: true;
    inputmode?: 'decimal' | 'numeric';
    // Takes the whole row when the form has two columns.
    wide?: true;
  }

  // In the order they appear on the screen.
  const FIELDS: FieldConfig[] = [
    { name: 'title', label: 'Title', wide: true },
    { name: 'description', label: 'Description', multiline: true, wide: true },
    { name: 'category', label: 'Category' },
    { name: 'brand', label: 'Brand' },
    { name: 'sku', label: 'SKU' },
    { name: 'price', label: 'Price', inputmode: 'decimal' },
    { name: 'stock', label: 'Stock', inputmode: 'numeric' },
    { name: 'weight', label: 'Weight', inputmode: 'decimal' },
  ];

  // The initial values are read once: after that, the form owns what the user types.
  let values = $state<FormValues>(untrack(() => ({ ...initialValues })));
  let errors = $state<FieldErrors>({});
  let form: HTMLFormElement | undefined;

  async function focusFirstInvalid() {
    await tick();
    form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }

  // For problems only the server can know (such as a SKU that is already taken).
  export function showErrors(next: FieldErrors) {
    errors = { ...next };
    void focusFirstInvalid();
  }

  function clearError(field: ProductField) {
    delete errors[field];
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (busy) {
      return;
    }
    const result = validateProductForm(values);
    if (result.ok) {
      errors = {};
      onsubmit(result.input);
      return;
    }
    errors = result.errors;
    void focusFirstInvalid();
  }
</script>

<form class="form" novalidate aria-busy={busy} bind:this={form} onsubmit={submit}>
  <p class="note">All fields are required.</p>

  <div class="fields">
    {#each FIELDS as field (field.name)}
      <div class="cell" class:wide={field.wide}>
        <FormField
          label={field.label}
          multiline={field.multiline ?? false}
          inputmode={field.inputmode}
          required
          error={errors[field.name]}
          oninput={() => clearError(field.name)}
          bind:value={values[field.name]}
        />
      </div>
    {/each}
  </div>

  <div class="actions">
    <Button onclick={oncancel} disabled={busy}>Cancel</Button>
    <Button type="submit" variant="primary" disabled={busy}>
      {busy ? 'Saving…' : submitLabel}
    </Button>
  </div>
</form>

<style>
  .form {
    display: grid;
    gap: var(--space-4);
    padding: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
  }

  .note {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  .fields {
    display: grid;
    gap: var(--space-4);
  }

  .actions {
    display: flex;
    flex-direction: column-reverse;
    gap: var(--space-3);
  }

  @media (min-width: 640px) {
    .form {
      padding: var(--space-5);
    }

    .fields {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: var(--space-5);
    }

    .wide {
      grid-column: 1 / -1;
    }

    .actions {
      flex-direction: row;
      justify-content: flex-end;
    }
  }
</style>
