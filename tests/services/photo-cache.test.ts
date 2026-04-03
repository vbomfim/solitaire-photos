/**
 * Unit tests for PhotoCache — blob URL caching for photo card backs.
 *
 * [TDD] Red → Green → Refactor
 * Tests thumbnail loading, blob URL management, cycling, expiry, and cleanup.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PhotoCache } from '../../src/services/photo-cache';
import type { PickedPhoto } from '../../src/types/google-photos';

/* ── Test helpers ──────────────────────────────────────────────── */

/** Create a mock PickedPhoto. */
function pickedPhoto(id: string, baseUrl?: string): PickedPhoto {
  return {
    id,
    baseUrl: baseUrl ?? `https://lh3.googleusercontent.com/${id}`,
    mimeType: 'image/jpeg',
    width: 4000,
    height: 3000,
  };
}

/** Create multiple mock photos. */
function createPhotos(count: number): PickedPhoto[] {
  return Array.from({ length: count }, (_, i) => pickedPhoto(`photo-${String(i)}`));
}

/** Mock global fetch to return fake image blobs. */
function mockFetchForThumbnails(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(['fake-image'], { type: 'image/jpeg' })),
      }),
    ),
  );
}

/** Mock URL.createObjectURL and revokeObjectURL. */
let createdBlobUrls: string[];
let revokedBlobUrls: string[];

function mockBlobUrls(): void {
  let urlCounter = 0;
  createdBlobUrls = [];
  revokedBlobUrls = [];

  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn((_blob: Blob) => {
      const url = `blob:http://localhost/fake-${String(urlCounter++)}`;
      createdBlobUrls.push(url);
      return url;
    }),
    revokeObjectURL: vi.fn((url: string) => {
      revokedBlobUrls.push(url);
    }),
  });
}

/* ══════════════════════════════════════════════════════════════════ */
/* 1. Construction                                                   */
/* ══════════════════════════════════════════════════════════════════ */

describe('PhotoCache — Construction', () => {
  it('should create an instance', () => {
    const cache = new PhotoCache();
    expect(cache).toBeDefined();
  });

  it('should have no photos initially', () => {
    const cache = new PhotoCache();
    expect(cache.hasPhotos()).toBe(false);
  });

  it('should return null for getCardBack initially', () => {
    const cache = new PhotoCache();
    expect(cache.getCardBack(0)).toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 2. loadThumbnails                                                 */
/* ══════════════════════════════════════════════════════════════════ */

describe('PhotoCache — loadThumbnails', () => {
  beforeEach(() => {
    mockFetchForThumbnails();
    mockBlobUrls();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch thumbnails with size parameters', async () => {
    const cache = new PhotoCache();
    const photos = [pickedPhoto('p1')];

    await cache.loadThumbnails(photos, { width: 200, height: 300 });

    expect(fetch).toHaveBeenCalledWith('https://lh3.googleusercontent.com/p1=w200-h300');
  });

  it('should create blob URLs for each thumbnail', async () => {
    const cache = new PhotoCache();
    const photos = createPhotos(3);

    const cardBacks = await cache.loadThumbnails(photos, { width: 200, height: 300 });

    expect(cardBacks).toHaveLength(3);
    expect(createdBlobUrls).toHaveLength(3);
    for (const cb of cardBacks) {
      expect(cb.thumbnailUrl).toMatch(/^blob:/);
    }
  });

  it('should set hasPhotos to true after loading', async () => {
    const cache = new PhotoCache();
    await cache.loadThumbnails(createPhotos(2), { width: 200, height: 300 });

    expect(cache.hasPhotos()).toBe(true);
  });

  it('should store fullSizeUrl from original baseUrl', async () => {
    const cache = new PhotoCache();
    const photos = [pickedPhoto('p1', 'https://lh3.googleusercontent.com/original')];

    const cardBacks = await cache.loadThumbnails(photos, { width: 200, height: 300 });

    expect(cardBacks[0]?.fullSizeUrl).toBe('https://lh3.googleusercontent.com/original');
  });

  it('should store photoId from the picked photo', async () => {
    const cache = new PhotoCache();
    const photos = [pickedPhoto('my-photo-id')];

    const cardBacks = await cache.loadThumbnails(photos, { width: 200, height: 300 });

    expect(cardBacks[0]?.photoId).toBe('my-photo-id');
  });

  it('should skip photos that fail to fetch', async () => {
    let fetchCallCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        fetchCallCount++;
        if (fetchCallCount === 2) {
          return Promise.resolve({ ok: false, blob: () => Promise.reject(new Error('fail')) });
        }
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['img'], { type: 'image/jpeg' })),
        });
      }),
    );

    const cache = new PhotoCache();
    const cardBacks = await cache.loadThumbnails(createPhotos(3), { width: 200, height: 300 });

    // One of three failed → only 2 loaded
    expect(cardBacks).toHaveLength(2);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 3. getCardBack — cycling                                          */
/* ══════════════════════════════════════════════════════════════════ */

describe('PhotoCache — getCardBack (cycling)', () => {
  beforeEach(() => {
    mockFetchForThumbnails();
    mockBlobUrls();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return a card back by index', async () => {
    const cache = new PhotoCache();
    await cache.loadThumbnails(createPhotos(5), { width: 200, height: 300 });

    const cb = cache.getCardBack(2);
    expect(cb).not.toBeNull();
    expect(cb?.thumbnailUrl).toMatch(/^blob:/);
  });

  it('should cycle when index exceeds photo count', async () => {
    const cache = new PhotoCache();
    await cache.loadThumbnails(createPhotos(3), { width: 200, height: 300 });

    const cb0 = cache.getCardBack(0);
    const cb3 = cache.getCardBack(3); // Should wrap to index 0

    expect(cb0?.thumbnailUrl).toBe(cb3?.thumbnailUrl);
  });

  it('should return different backs for different indices', async () => {
    const cache = new PhotoCache();
    await cache.loadThumbnails(createPhotos(5), { width: 200, height: 300 });

    const cb0 = cache.getCardBack(0);
    const cb1 = cache.getCardBack(1);

    expect(cb0?.thumbnailUrl).not.toBe(cb1?.thumbnailUrl);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 4. getRevealPhoto                                                 */
/* ══════════════════════════════════════════════════════════════════ */

describe('PhotoCache — getRevealPhoto', () => {
  beforeEach(() => {
    mockFetchForThumbnails();
    mockBlobUrls();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return null when no photos cached', () => {
    const cache = new PhotoCache();
    expect(cache.getRevealPhoto()).toBeNull();
  });

  it('should return a CardBack when photos are cached', async () => {
    const cache = new PhotoCache();
    await cache.loadThumbnails(createPhotos(3), { width: 200, height: 300 });

    const reveal = cache.getRevealPhoto();
    expect(reveal).not.toBeNull();
    expect(reveal?.thumbnailUrl).toMatch(/^blob:/);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 5. clear — cleanup                                                */
/* ══════════════════════════════════════════════════════════════════ */

describe('PhotoCache — clear', () => {
  beforeEach(() => {
    mockFetchForThumbnails();
    mockBlobUrls();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should revoke all blob URLs on clear', async () => {
    const cache = new PhotoCache();
    await cache.loadThumbnails(createPhotos(3), { width: 200, height: 300 });

    cache.clear();

    expect(revokedBlobUrls).toHaveLength(3);
  });

  it('should have no photos after clear', async () => {
    const cache = new PhotoCache();
    await cache.loadThumbnails(createPhotos(2), { width: 200, height: 300 });

    cache.clear();

    expect(cache.hasPhotos()).toBe(false);
    expect(cache.getCardBack(0)).toBeNull();
  });

  it('should not throw when clearing empty cache', () => {
    const cache = new PhotoCache();
    expect(() => cache.clear()).not.toThrow();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 6. isExpired / refresh                                            */
/* ══════════════════════════════════════════════════════════════════ */

describe('PhotoCache — expiry and refresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetchForThumbnails();
    mockBlobUrls();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should not be expired immediately after loading', async () => {
    const cache = new PhotoCache();
    await cache.loadThumbnails(createPhotos(2), { width: 200, height: 300 });

    expect(cache.isExpired()).toBe(false);
  });

  it('should be expired after 60 minutes', async () => {
    const cache = new PhotoCache();
    await cache.loadThumbnails(createPhotos(2), { width: 200, height: 300 });

    vi.advanceTimersByTime(60 * 60 * 1000); // 60 minutes

    expect(cache.isExpired()).toBe(true);
  });

  it('should refresh thumbnails with new base URLs', async () => {
    const cache = new PhotoCache();
    const photos = createPhotos(2);
    await cache.loadThumbnails(photos, { width: 200, height: 300 });

    vi.advanceTimersByTime(60 * 60 * 1000);

    // Refresh with new base URLs
    const newPhotos = [
      pickedPhoto('photo-0', 'https://lh3.googleusercontent.com/new-0'),
      pickedPhoto('photo-1', 'https://lh3.googleusercontent.com/new-1'),
    ];

    await cache.refresh(newPhotos);

    expect(cache.isExpired()).toBe(false);
    expect(cache.hasPhotos()).toBe(true);
  });

  it('should not be expired when no photos loaded', () => {
    const cache = new PhotoCache();
    expect(cache.isExpired()).toBe(false);
  });
});
