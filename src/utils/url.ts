/**
 * URL sanitization utilities.
 *
 * Validates and sanitizes URLs before use in CSS or DOM contexts
 * to prevent injection attacks. [SECURITY]
 */

/** Allowed URL schemes for card-back images. */
const ALLOWED_SCHEMES = ['https:', 'blob:'] as const;

/**
 * Sanitize a URL for safe use in CSS `background-image: url(...)`.
 *
 * - Validates scheme is `https://` or `blob:`
 * - Strips embedded quotes and backslashes to prevent CSS injection
 * - Returns empty string for invalid URLs
 *
 * @param url — the raw URL string
 * @returns the sanitized URL, or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.length === 0) return '';

  // Validate scheme
  const isAllowed = ALLOWED_SCHEMES.some((scheme) => trimmed.startsWith(scheme));
  if (!isAllowed) return '';

  // Strip embedded quotes and backslashes to prevent CSS injection
  return trimmed.replace(/["\\]/g, '');
}

/**
 * Build a safe CSS `url(...)` value from a raw URL.
 *
 * Returns empty string if the URL is invalid.
 */
export function safeCssUrl(url: string): string {
  const safe = sanitizeUrl(url);
  if (safe.length === 0) return '';
  return `url("${safe}")`;
}
