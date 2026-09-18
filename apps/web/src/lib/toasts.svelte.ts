const SUCCESS_TOAST_MS = 5_000;
// Errors stay a little longer: the user may need time to read what went wrong.
const ERROR_TOAST_MS = 8_000;

export interface Toast {
  id: number;
  tone: 'success' | 'error';
  message: string;
}

// What the pages depend on: they report an outcome and do not care how it is shown.
export interface Notifier {
  success(message: string): void;
  error(message: string): void;
}

export interface ToastStore extends Notifier {
  readonly items: readonly Toast[];
  dismiss(id: number): void;
}

// One store per app (created in App.svelte and handed down), so tests never share toasts.
export function createToasts(): ToastStore {
  let items = $state<Toast[]>([]);
  // Not reactive: nothing renders these handles.
  const timers: Record<number, ReturnType<typeof setTimeout>> = {};
  let nextId = 1;

  function dismiss(id: number) {
    clearTimeout(timers[id]);
    delete timers[id];
    items = items.filter((toast) => toast.id !== id);
  }

  function show(tone: Toast['tone'], message: string, durationMs: number) {
    const id = nextId++;
    items = [...items, { id, tone, message }];
    timers[id] = setTimeout(() => dismiss(id), durationMs);
  }

  return {
    get items() {
      return items;
    },
    success: (message) => show('success', message, SUCCESS_TOAST_MS),
    error: (message) => show('error', message, ERROR_TOAST_MS),
    dismiss,
  };
}
