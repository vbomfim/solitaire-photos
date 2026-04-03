/**
 * Unit tests for AuthService — Google OAuth token lifecycle.
 *
 * [TDD] Red → Green → Refactor
 * Tests GIS script loading, token acquisition, expiry, events, and error handling.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService } from '../../src/services/auth-service';
import type { GisTokenResponse, GisTokenClientConfig } from '../../src/types/google-photos';

/* ── GIS mock helpers ──────────────────────────────────────────── */

const TEST_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
const PHOTOS_SCOPE = 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly';

/** Captured GIS config for verifying initialization args. */
let capturedGisConfig: GisTokenClientConfig | null = null;

/** Mock requestAccessToken — resolves stored callback with a token. */
let mockRequestAccessToken: ReturnType<typeof vi.fn>;

/** Install a fake `google.accounts.oauth2` on the global window. */
function installGisMock(tokenResponse?: Partial<GisTokenResponse>): void {
  mockRequestAccessToken = vi.fn(() => {
    if (capturedGisConfig?.callback) {
      capturedGisConfig.callback({
        access_token: 'mock-token-abc',
        expires_in: 3600,
        ...tokenResponse,
      });
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  (window as any).google = {
    accounts: {
      oauth2: {
        initTokenClient: (config: GisTokenClientConfig) => {
          capturedGisConfig = config;
          return { requestAccessToken: mockRequestAccessToken };
        },
        revoke: vi.fn((_token: string, done: () => void) => done()),
      },
    },
  };
}

/** Remove the fake GIS global. */
function removeGisMock(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  delete (window as any).google;
  capturedGisConfig = null;
}

/* ══════════════════════════════════════════════════════════════════ */
/* 1. Construction                                                   */
/* ══════════════════════════════════════════════════════════════════ */

describe('AuthService — Construction', () => {
  it('should create an instance with a client ID', () => {
    const auth = new AuthService(TEST_CLIENT_ID);
    expect(auth).toBeDefined();
  });

  it('should not be authenticated initially', () => {
    const auth = new AuthService(TEST_CLIENT_ID);
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('should return null token initially', () => {
    const auth = new AuthService(TEST_CLIENT_ID);
    expect(auth.getToken()).toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 2. GIS script loading                                             */
/* ══════════════════════════════════════════════════════════════════ */

describe('AuthService — loadGisScript', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    removeGisMock();
  });

  afterEach(() => {
    removeGisMock();
  });

  it('should add a script tag for the GIS client', async () => {
    const auth = new AuthService(TEST_CLIENT_ID);

    // Start loading (will pend until onload)
    const loadPromise = auth.loadGisScript();

    // Find the script element added to document
    const script = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]',
    ) as HTMLScriptElement;
    expect(script).not.toBeNull();

    // Simulate script load
    installGisMock();
    script.dispatchEvent(new Event('load'));

    await expect(loadPromise).resolves.toBeUndefined();
  });

  it('should reject if script fails to load', async () => {
    const auth = new AuthService(TEST_CLIENT_ID);

    const loadPromise = auth.loadGisScript();

    const script = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]',
    ) as HTMLScriptElement;
    script.dispatchEvent(new Event('error'));

    await expect(loadPromise).rejects.toMatchObject({
      code: 'gis-load-failed',
    });
  });

  it('should not add duplicate script tags on repeated calls', async () => {
    const auth = new AuthService(TEST_CLIENT_ID);

    // First load
    const p1 = auth.loadGisScript();
    const script = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]',
    ) as HTMLScriptElement;
    installGisMock();
    script.dispatchEvent(new Event('load'));
    await p1;

    // Second load — should reuse
    await auth.loadGisScript();

    const scripts = document.querySelectorAll(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    expect(scripts).toHaveLength(1);
  });

  it('should resolve immediately if GIS already loaded', async () => {
    installGisMock();
    const auth = new AuthService(TEST_CLIENT_ID);

    // Should resolve without adding script (already loaded)
    await expect(auth.loadGisScript()).resolves.toBeUndefined();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 3. Token acquisition                                              */
/* ══════════════════════════════════════════════════════════════════ */

describe('AuthService — requestToken', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    vi.useFakeTimers();
    installGisMock();
  });

  afterEach(() => {
    vi.useRealTimers();
    removeGisMock();
  });

  it('should return an AccessToken on success', async () => {
    const auth = new AuthService(TEST_CLIENT_ID);
    await auth.loadGisScript();

    const token = await auth.requestToken();

    expect(token.token).toBe('mock-token-abc');
    expect(token.expiresAt).toBeGreaterThan(Date.now());
  });

  it('should pass correct scope to GIS', async () => {
    const auth = new AuthService(TEST_CLIENT_ID);
    await auth.loadGisScript();

    await auth.requestToken();

    expect(capturedGisConfig?.scope).toBe(PHOTOS_SCOPE);
  });

  it('should pass correct client_id to GIS', async () => {
    const auth = new AuthService(TEST_CLIENT_ID);
    await auth.loadGisScript();

    await auth.requestToken();

    expect(capturedGisConfig?.client_id).toBe(TEST_CLIENT_ID);
  });

  it('should be authenticated after token acquired', async () => {
    const auth = new AuthService(TEST_CLIENT_ID);
    await auth.loadGisScript();

    await auth.requestToken();

    expect(auth.isAuthenticated()).toBe(true);
  });

  it('should return the token via getToken()', async () => {
    const auth = new AuthService(TEST_CLIENT_ID);
    await auth.loadGisScript();

    await auth.requestToken();

    const token = auth.getToken();
    expect(token).not.toBeNull();
    expect(token?.token).toBe('mock-token-abc');
  });

  it('should reject with popup-blocked on popup_blocked_by_browser error', async () => {
    installGisMock({ error: 'popup_blocked_by_browser', access_token: '' });
    const auth = new AuthService(TEST_CLIENT_ID);
    await auth.loadGisScript();

    await expect(auth.requestToken()).rejects.toMatchObject({
      code: 'popup-blocked',
    });
  });

  it('should reject with user-cancelled on access_denied error', async () => {
    installGisMock({ error: 'access_denied', access_token: '' });
    const auth = new AuthService(TEST_CLIENT_ID);
    await auth.loadGisScript();

    await expect(auth.requestToken()).rejects.toMatchObject({
      code: 'user-cancelled',
    });
  });

  it('should reject if GIS not loaded', async () => {
    removeGisMock();
    const auth = new AuthService(TEST_CLIENT_ID);

    await expect(auth.requestToken()).rejects.toMatchObject({
      code: 'gis-load-failed',
    });
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 4. Token expiry                                                   */
/* ══════════════════════════════════════════════════════════════════ */

describe('AuthService — Token expiry', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    vi.useFakeTimers();
    installGisMock();
  });

  afterEach(() => {
    vi.useRealTimers();
    removeGisMock();
  });

  it('should fire onTokenExpired when token expires', async () => {
    const auth = new AuthService(TEST_CLIENT_ID);
    await auth.loadGisScript();

    const expiredCallback = vi.fn();
    auth.onTokenExpired(expiredCallback);

    await auth.requestToken();

    // Advance past expiry (3600s = 1 hour)
    vi.advanceTimersByTime(3600 * 1000);

    expect(expiredCallback).toHaveBeenCalledOnce();
  });

  it('should not be authenticated after token expires', async () => {
    const auth = new AuthService(TEST_CLIENT_ID);
    await auth.loadGisScript();

    await auth.requestToken();
    expect(auth.isAuthenticated()).toBe(true);

    // Advance past expiry
    vi.advanceTimersByTime(3600 * 1000);

    expect(auth.isAuthenticated()).toBe(false);
  });

  it('should return null token after expiry', async () => {
    const auth = new AuthService(TEST_CLIENT_ID);
    await auth.loadGisScript();

    await auth.requestToken();
    vi.advanceTimersByTime(3600 * 1000);

    expect(auth.getToken()).toBeNull();
  });

  it('should set expiry timer ~5 min before actual expiry', async () => {
    const auth = new AuthService(TEST_CLIENT_ID);
    await auth.loadGisScript();

    const expiredCallback = vi.fn();
    auth.onTokenExpired(expiredCallback);

    await auth.requestToken();

    // At 55 minutes — should have fired (5 min before 60-min expiry)
    vi.advanceTimersByTime(55 * 60 * 1000);

    expect(expiredCallback).toHaveBeenCalledOnce();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 5. Event callbacks                                                */
/* ══════════════════════════════════════════════════════════════════ */

describe('AuthService — Events', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    vi.useFakeTimers();
    installGisMock();
  });

  afterEach(() => {
    vi.useRealTimers();
    removeGisMock();
  });

  it('should fire onTokenAcquired when token is obtained', async () => {
    const auth = new AuthService(TEST_CLIENT_ID);
    await auth.loadGisScript();

    const callback = vi.fn();
    auth.onTokenAcquired(callback);

    await auth.requestToken();

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ token: 'mock-token-abc' }));
  });

  it('should fire onError when token request fails', async () => {
    installGisMock({ error: 'popup_blocked_by_browser', access_token: '' });
    const auth = new AuthService(TEST_CLIENT_ID);
    await auth.loadGisScript();

    const errorCallback = vi.fn();
    auth.onError(errorCallback);

    // requestToken will reject — catch so test doesn't fail
    await auth.requestToken().catch(() => {});

    expect(errorCallback).toHaveBeenCalledOnce();
    expect(errorCallback).toHaveBeenCalledWith(expect.objectContaining({ code: 'popup-blocked' }));
  });

  it('should support multiple onTokenAcquired listeners', async () => {
    const auth = new AuthService(TEST_CLIENT_ID);
    await auth.loadGisScript();

    const cb1 = vi.fn();
    const cb2 = vi.fn();
    auth.onTokenAcquired(cb1);
    auth.onTokenAcquired(cb2);

    await auth.requestToken();

    expect(cb1).toHaveBeenCalledOnce();
    expect(cb2).toHaveBeenCalledOnce();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 6. Sign out                                                       */
/* ══════════════════════════════════════════════════════════════════ */

describe('AuthService — signOut', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    vi.useFakeTimers();
    installGisMock();
  });

  afterEach(() => {
    vi.useRealTimers();
    removeGisMock();
  });

  it('should clear token on sign out', async () => {
    const auth = new AuthService(TEST_CLIENT_ID);
    await auth.loadGisScript();
    await auth.requestToken();

    auth.signOut();

    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.getToken()).toBeNull();
  });

  it('should call google.accounts.oauth2.revoke', async () => {
    const auth = new AuthService(TEST_CLIENT_ID);
    await auth.loadGisScript();
    await auth.requestToken();

    auth.signOut();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const revoke = (window as any).google.accounts.oauth2.revoke;
    expect(revoke).toHaveBeenCalledWith('mock-token-abc', expect.any(Function));
  });

  it('should not throw if signed out when not authenticated', () => {
    const auth = new AuthService(TEST_CLIENT_ID);
    expect(() => auth.signOut()).not.toThrow();
  });

  it('should cancel expiry timer on sign out', async () => {
    const auth = new AuthService(TEST_CLIENT_ID);
    await auth.loadGisScript();

    const expiredCallback = vi.fn();
    auth.onTokenExpired(expiredCallback);

    await auth.requestToken();
    auth.signOut();

    // Advance past when expiry would have fired
    vi.advanceTimersByTime(3600 * 1000);

    expect(expiredCallback).not.toHaveBeenCalled();
  });
});
