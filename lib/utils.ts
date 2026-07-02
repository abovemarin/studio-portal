export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ")
}

/** HTML-escape untrusted text for safe render outside React's auto-escaping
 *  (e.g. plaintext→HTML surfaces). React escapes text children by default; this
 *  is the explicit encoder the render layer uses where that guarantee doesn't
 *  apply. `&` is replaced first so we don't double-encode the entities we introduce. */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
