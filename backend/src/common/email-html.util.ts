/**
 * Escapes `&`, `<`, `>`, `"`, and `'` for safe use in HTML email fragments and in double-quoted
 * attributes (for example `href` on links).
 */
export function escapeHtmlForEmail(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
