/** Only follow same-app redirects, never an absolute URL from the query string. */
export function safeRedirect(target: string | null, fallback: string): string {
  if (!target) return fallback;
  return target.startsWith('/') && !target.startsWith('//') ? target : fallback;
}
