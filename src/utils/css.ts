/**
 * Safe CSS selector escaping utility.
 *
 * Wraps CSS.escape() with a fallback for environments that don't
 * support it (e.g. jsdom). [CLEAN-CODE]
 */

/**
 * Escape a value for use in a CSS selector attribute value.
 * Uses CSS.escape() where available, with a manual fallback.
 */
export function escapeCssValue(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  // Fallback: escape characters that are special in CSS selectors
  return value.replace(/([\\!"#$%&'()*+,./:;<=>?@[\]^`{|}~])/g, '\\$1');
}
