/** Shared pure helpers (formatters, guards) — keep UI-free. */
export function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString();
}
