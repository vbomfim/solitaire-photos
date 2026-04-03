/**
 * Tests for URL sanitization utilities.
 *
 * [TDD] Red → Green → Refactor
 */
import { describe, expect, it } from 'vitest';
import { safeCssUrl, sanitizeUrl } from '../../src/utils/url';

/* ══════════════════════════════════════════════════════════════════ */
/* sanitizeUrl                                                       */
/* ══════════════════════════════════════════════════════════════════ */

describe('sanitizeUrl', () => {
  it('should accept https:// URLs', () => {
    expect(sanitizeUrl('https://example.com/photo.jpg')).toBe('https://example.com/photo.jpg');
  });

  it('should accept blob: URLs', () => {
    expect(sanitizeUrl('blob:http://localhost/abc-123')).toBe('blob:http://localhost/abc-123');
  });

  it('should reject http:// URLs (not https)', () => {
    expect(sanitizeUrl('http://example.com/photo.jpg')).toBe('');
  });

  it('should reject javascript: URLs', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
  });

  it('should reject data: URLs', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
  });

  it('should strip embedded double quotes', () => {
    expect(sanitizeUrl('https://example.com/photo"inject.jpg')).toBe(
      'https://example.com/photoinject.jpg',
    );
  });

  it('should strip embedded backslashes', () => {
    expect(sanitizeUrl('https://example.com/photo\\inject.jpg')).toBe(
      'https://example.com/photoinject.jpg',
    );
  });

  it('should return empty string for empty input', () => {
    expect(sanitizeUrl('')).toBe('');
  });

  it('should trim whitespace', () => {
    expect(sanitizeUrl('  https://example.com/photo.jpg  ')).toBe('https://example.com/photo.jpg');
  });

  it('should reject ftp: scheme', () => {
    expect(sanitizeUrl('ftp://example.com/file')).toBe('');
  });

  it('should reject relative URLs', () => {
    expect(sanitizeUrl('/images/photo.jpg')).toBe('');
  });

  it('should reject schemeless URLs', () => {
    expect(sanitizeUrl('example.com/photo.jpg')).toBe('');
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* safeCssUrl                                                        */
/* ══════════════════════════════════════════════════════════════════ */

describe('safeCssUrl', () => {
  it('should wrap valid URL in url("...")', () => {
    expect(safeCssUrl('https://example.com/photo.jpg')).toBe(
      'url("https://example.com/photo.jpg")',
    );
  });

  it('should return empty string for invalid URL', () => {
    expect(safeCssUrl('javascript:alert(1)')).toBe('');
  });

  it('should return empty string for empty input', () => {
    expect(safeCssUrl('')).toBe('');
  });

  it('should strip quotes before wrapping', () => {
    expect(safeCssUrl('https://example.com/"evil".jpg')).toBe(
      'url("https://example.com/evil.jpg")',
    );
  });
});
