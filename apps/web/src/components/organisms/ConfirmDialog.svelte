<script lang="ts">
  import Button from '../atoms/Button.svelte';

  interface Props {
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    // The confirmed action is running: nothing can be chosen, and Esc does not close the dialog.
    busy?: boolean;
    onconfirm: () => void;
    oncancel: () => void;
  }

  let { open, title, message, confirmLabel, busy = false, onconfirm, oncancel }: Props = $props();

  const id = $props.id();
  let dialog = $state<HTMLDialogElement>();

  // The native <dialog> does the modal work: the rest of the page becomes inert, focus stays
  // inside and goes back to what opened it on close. This only keeps it in step with `open`.
  $effect(() => {
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
      // The safe choice gets the focus, so an accidental Enter does not delete anything.
      dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  });

  // Esc. The parent decides (through `open`), so the dialog does not close behind its back.
  function handleCancel(event: Event) {
    event.preventDefault();
    if (!busy) {
      oncancel();
    }
  }

  // Browsers only let `preventDefault` stop Esc when the user has interacted with the page since
  // the last close request; otherwise they close the dialog anyway. Keep the parent in step with
  // what is on screen: while busy the dialog is put back, otherwise the parent is told.
  function handleClose() {
    if (!open) {
      return;
    }
    if (busy) {
      dialog?.showModal();
    } else {
      oncancel();
    }
  }
</script>

<dialog
  bind:this={dialog}
  class="dialog"
  aria-labelledby="{id}-title"
  aria-describedby="{id}-message"
  oncancel={handleCancel}
  onclose={handleClose}
>
  <h2 class="title" id="{id}-title">{title}</h2>
  <p class="message" id="{id}-message">{message}</p>
  <div class="actions">
    <Button data-initial-focus onclick={oncancel} disabled={busy}>Cancel</Button>
    <Button variant="primary" onclick={onconfirm} disabled={busy}>{confirmLabel}</Button>
  </div>
</dialog>

<style>
  /* Full screen below 640px. Only the open state sets `display`, or a closed dialog would show. */
  .dialog {
    width: 100%;
    max-width: none;
    height: 100%;
    max-height: none;
    margin: 0;
    padding: var(--space-5);
    border: 0;
    background: var(--color-surface);
    color: inherit;
  }

  .dialog[open] {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--space-4);
  }

  .dialog::backdrop {
    background: var(--color-overlay);
  }

  .title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
  }

  .message {
    overflow-wrap: anywhere;
    color: var(--color-text-muted);
  }

  .actions {
    display: flex;
    flex-direction: column-reverse;
    gap: var(--space-3);
  }

  @media (min-width: 640px) {
    .dialog {
      width: min(28rem, calc(100% - var(--space-5) * 2));
      /* `auto` would stretch it between the top and the bottom of the screen. */
      height: fit-content;
      max-height: calc(100% - var(--space-5) * 2);
      margin: auto;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
    }

    .dialog[open] {
      display: block;
    }

    .message {
      margin-top: var(--space-3);
    }

    .actions {
      flex-direction: row;
      justify-content: flex-end;
      margin-top: var(--space-5);
    }
  }
</style>
