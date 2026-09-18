// "dimensional-travel" reads better as "Dimensional travel".
export function formatCategory(category: string): string {
  const words = category.replaceAll('-', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// An ISO 8601 instant shown in the reader's own time zone.
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}
