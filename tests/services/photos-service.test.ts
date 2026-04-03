/**
 * Unit tests for PhotosService — Google Photos Picker API integration.
 *
 * [TDD] Red → Green → Refactor
 * Tests picker session creation, polling, photo retrieval, and errors.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PhotosService } from '../../src/services/photos-service';
import { AuthService } from '../../src/services/auth-service';
import type { PickerSession, PickerMediaItem } from '../../src/types/google-photos';

/* ── Test helpers ──────────────────────────────────────────────── */

/** Create a mock AuthService that returns a valid token. */
function createMockAuth(): AuthService {
  const auth = {
    isAuthenticated: vi.fn(() => true),
    getToken: vi.fn(() => ({ token: 'mock-token', expiresAt: Date.now() + 3600000 })),
  } as unknown as AuthService;
  return auth;
}

/** Create a mock AuthService that is not authenticated. */
function createUnauthenticatedAuth(): AuthService {
  return {
    isAuthenticated: vi.fn(() => false),
    getToken: vi.fn(() => null),
  } as unknown as AuthService;
}

/** Build a mock Picker session response. */
function mockSession(overrides: Partial<PickerSession> = {}): PickerSession {
  return {
    id: 'session-123',
    pickerUri: 'https://photos.google.com/picker/session-123',
    ...overrides,
  };
}

/** Build a mock media item. */
function mockMediaItem(id: string, baseUrl: string): PickerMediaItem {
  return {
    id,
    mediaFile: {
      baseUrl,
      mimeType: 'image/jpeg',
      mediaFileMetadata: { width: 4000, height: 3000 },
    },
  };
}

/** Set up global fetch mock for a specific sequence of responses. */
function mockFetch(responses: Array<{ ok: boolean; json: () => Promise<unknown> }>): void {
  let callIndex = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      const response = responses[callIndex];
      callIndex++;
      if (!response) {
        return Promise.reject(new Error('Unexpected fetch call'));
      }
      return Promise.resolve(response);
    }),
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/* 1. Construction                                                   */
/* ══════════════════════════════════════════════════════════════════ */

describe('PhotosService — Construction', () => {
  it('should create an instance with an AuthService', () => {
    const auth = createMockAuth();
    const service = new PhotosService(auth);
    expect(service).toBeDefined();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 2. startPicker — create session                                   */
/* ══════════════════════════════════════════════════════════════════ */

describe('PhotosService — startPicker', () => {
  let windowOpenSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    windowOpenSpy = vi.fn(() => ({ closed: false }));
    vi.stubGlobal('open', windowOpenSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should POST to create a picker session', async () => {
    const auth = createMockAuth();
    const service = new PhotosService(auth);

    mockFetch([
      {
        ok: true,
        json: () => Promise.resolve(mockSession()),
      },
    ]);

    await service.startPicker();

    expect(fetch).toHaveBeenCalledWith(
      'https://photospicker.googleapis.com/v1/sessions',
      expect.objectContaining({
        method: 'POST',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token',
        }),
      }),
    );
  });

  it('should return the session ID', async () => {
    const auth = createMockAuth();
    const service = new PhotosService(auth);

    mockFetch([{ ok: true, json: () => Promise.resolve(mockSession({ id: 'sess-abc' })) }]);

    const sessionId = await service.startPicker();
    expect(sessionId).toBe('sess-abc');
  });

  it('should open the picker URI in a new window', async () => {
    const auth = createMockAuth();
    const service = new PhotosService(auth);

    mockFetch([
      {
        ok: true,
        json: () =>
          Promise.resolve(mockSession({ pickerUri: 'https://photos.google.com/picker/xyz' })),
      },
    ]);

    await service.startPicker();

    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://photos.google.com/picker/xyz',
      '_blank',
      expect.any(String),
    );
  });

  it('should reject if not authenticated', async () => {
    const auth = createUnauthenticatedAuth();
    const service = new PhotosService(auth);

    await expect(service.startPicker()).rejects.toThrow('Not authenticated');
  });

  it('should reject on API error response', async () => {
    const auth = createMockAuth();
    const service = new PhotosService(auth);

    mockFetch([{ ok: false, json: () => Promise.resolve({ error: { message: 'Forbidden' } }) }]);

    await expect(service.startPicker()).rejects.toThrow();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 3. pollSession — wait for picker completion                       */
/* ══════════════════════════════════════════════════════════════════ */

describe('PhotosService — pollSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should GET session status', async () => {
    const auth = createMockAuth();
    const service = new PhotosService(auth);

    mockFetch([
      {
        ok: true,
        json: () => Promise.resolve({ ...mockSession(), mediaItemsSet: true }),
      },
    ]);

    await service.pollSession('session-123');

    expect(fetch).toHaveBeenCalledWith(
      'https://photospicker.googleapis.com/v1/sessions/session-123',
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token',
        }),
      }),
    );
  });

  it('should return true when mediaItemsSet is true', async () => {
    const auth = createMockAuth();
    const service = new PhotosService(auth);

    mockFetch([
      {
        ok: true,
        json: () => Promise.resolve({ ...mockSession(), mediaItemsSet: true }),
      },
    ]);

    const result = await service.pollSession('session-123');
    expect(result).toBe(true);
  });

  it('should return false when mediaItemsSet is not set', async () => {
    const auth = createMockAuth();
    const service = new PhotosService(auth);

    mockFetch([
      {
        ok: true,
        json: () => Promise.resolve(mockSession()),
      },
    ]);

    const result = await service.pollSession('session-123');
    expect(result).toBe(false);
  });

  it('should reject on API error', async () => {
    const auth = createMockAuth();
    const service = new PhotosService(auth);

    mockFetch([{ ok: false, json: () => Promise.resolve({}) }]);

    await expect(service.pollSession('session-123')).rejects.toThrow();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 4. getPickedPhotos — retrieve selected media items                */
/* ══════════════════════════════════════════════════════════════════ */

describe('PhotosService — getPickedPhotos', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should GET media items for the session', async () => {
    const auth = createMockAuth();
    const service = new PhotosService(auth);

    mockFetch([
      {
        ok: true,
        json: () =>
          Promise.resolve({
            mediaItems: [
              mockMediaItem('photo-1', 'https://lh3.googleusercontent.com/photo1'),
              mockMediaItem('photo-2', 'https://lh3.googleusercontent.com/photo2'),
            ],
          }),
      },
    ]);

    const photos = await service.getPickedPhotos('session-123');

    expect(fetch).toHaveBeenCalledWith(
      'https://photospicker.googleapis.com/v1/sessions/session-123/mediaItems',
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token',
        }),
      }),
    );
    expect(photos).toHaveLength(2);
  });

  it('should map media items to PickedPhoto format', async () => {
    const auth = createMockAuth();
    const service = new PhotosService(auth);

    mockFetch([
      {
        ok: true,
        json: () =>
          Promise.resolve({
            mediaItems: [mockMediaItem('p1', 'https://lh3.googleusercontent.com/p1')],
          }),
      },
    ]);

    const photos = await service.getPickedPhotos('session-123');

    expect(photos[0]).toEqual({
      id: 'p1',
      baseUrl: 'https://lh3.googleusercontent.com/p1',
      mimeType: 'image/jpeg',
      width: 4000,
      height: 3000,
    });
  });

  it('should return empty array when no items selected', async () => {
    const auth = createMockAuth();
    const service = new PhotosService(auth);

    mockFetch([
      {
        ok: true,
        json: () => Promise.resolve({ mediaItems: [] }),
      },
    ]);

    const photos = await service.getPickedPhotos('session-123');
    expect(photos).toEqual([]);
  });

  it('should handle missing mediaItems gracefully', async () => {
    const auth = createMockAuth();
    const service = new PhotosService(auth);

    mockFetch([
      {
        ok: true,
        json: () => Promise.resolve({}),
      },
    ]);

    const photos = await service.getPickedPhotos('session-123');
    expect(photos).toEqual([]);
  });

  it('should default width/height to 0 when metadata is missing', async () => {
    const auth = createMockAuth();
    const service = new PhotosService(auth);

    mockFetch([
      {
        ok: true,
        json: () =>
          Promise.resolve({
            mediaItems: [
              {
                id: 'p1',
                mediaFile: {
                  baseUrl: 'https://lh3.googleusercontent.com/p1',
                  mimeType: 'image/png',
                },
              },
            ],
          }),
      },
    ]);

    const photos = await service.getPickedPhotos('session-123');
    expect(photos[0]?.width).toBe(0);
    expect(photos[0]?.height).toBe(0);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 5. pickPhotos — full flow                                         */
/* ══════════════════════════════════════════════════════════════════ */

describe('PhotosService — pickPhotos (full flow)', () => {
  let windowOpenSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    windowOpenSpy = vi.fn(() => ({ closed: false }));
    vi.stubGlobal('open', windowOpenSpy);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should create session, poll, and return photos', async () => {
    const auth = createMockAuth();
    const service = new PhotosService(auth);

    mockFetch([
      // 1. Create session
      { ok: true, json: () => Promise.resolve(mockSession({ id: 'sess-1' })) },
      // 2. Poll — not ready
      {
        ok: true,
        json: () => Promise.resolve({ ...mockSession({ id: 'sess-1' }), mediaItemsSet: false }),
      },
      // 3. Poll — ready
      {
        ok: true,
        json: () => Promise.resolve({ ...mockSession({ id: 'sess-1' }), mediaItemsSet: true }),
      },
      // 4. Get media items
      {
        ok: true,
        json: () =>
          Promise.resolve({
            mediaItems: [mockMediaItem('photo-1', 'https://lh3.googleusercontent.com/p1')],
          }),
      },
    ]);

    const pickPromise = service.pickPhotos();

    // Advance timers to trigger polling intervals
    await vi.advanceTimersByTimeAsync(2000); // first poll — not ready
    await vi.advanceTimersByTimeAsync(2000); // second poll — ready

    const photos = await pickPromise;

    expect(photos).toHaveLength(1);
    expect(photos[0]?.id).toBe('photo-1');
  });

  it('should reject if not authenticated', async () => {
    const auth = createUnauthenticatedAuth();
    const service = new PhotosService(auth);

    await expect(service.pickPhotos()).rejects.toThrow('Not authenticated');
  });
});
