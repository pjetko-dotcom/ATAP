export function sanitizeCsvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '""';

  let text = String(value);
  if (/^[\s\u0000-\u001f\u007f\uFEFF]*[=+\-@]/.test(text)) {
    text = "'" + text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}
