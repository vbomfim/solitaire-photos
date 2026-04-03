/**
 * AuthService — handles Google Identity Services sign-in/sign-out.
 *
 * Manages OAuth2 tokens for Google Photos API access.
 * Token is stored in memory only — never persisted to localStorage/cookies.
 *
 * [SOLID] SRP — OAuth token lifecycle only.
 * [CLEAN-CODE] Small methods, clear event callbacks.
 * [SECURITY] Token in memory, revoked on sign-out.
 */
import type {
  AccessToken,
  AuthError,
  AuthErrorCode,
  GisTokenClient,
  GisTokenClientConfig,
  GisTokenResponse,
} from '../types/google-photos';

/* ── Constants ──────────────────────────────────────────────────── */

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const PHOTOS_PICKER_SCOPE = 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly';

/** Fire expiry event 5 minutes before actual token expiry. */
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/* ── Helpers ────────────────────────────────────────────────────── */

/** Map GIS error strings to our AuthErrorCode. */
function mapGisError(error: string): AuthErrorCode {
  if (error === 'popup_blocked_by_browser' || error === 'popup_closed') {
    return 'popup-blocked';
  }
  if (error === 'access_denied') {
    return 'user-cancelled';
  }
  return 'unknown';
}

/** Error class carrying a structured AuthError payload. */
class AuthServiceError extends Error {
  readonly code: AuthErrorCode;
  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthServiceError';
    this.code = code;
  }

  toAuthError(): AuthError {
    return { code: this.code, message: this.message };
  }
}

/* ── AuthService class ──────────────────────────────────────────── */

export class AuthService {
  private readonly clientId: string;
  private currentToken: AccessToken | null = null;
  private expiryTimerId: ReturnType<typeof setTimeout> | null = null;
  private tokenClient: GisTokenClient | null = null;
  private gisLoadPromise: Promise<void> | null = null;

  /* Event listener arrays */
  private readonly tokenAcquiredListeners: Array<(token: AccessToken) => void> = [];
  private readonly tokenExpiredListeners: Array<() => void> = [];
  private readonly errorListeners: Array<(error: AuthError) => void> = [];

  constructor(clientId: string) {
    this.clientId = clientId;
  }

  /* ── GIS script loading ──────────────────────────────────────── */

  /**
   * Dynamically load the Google Identity Services script.
   * Resolves when the script is loaded and the GIS API is available.
   * Rejects with AuthError if the script fails to load.
   */
  loadGisScript(): Promise<void> {
    // Already loaded?
    if (this.isGisAvailable()) {
      return Promise.resolve();
    }

    // Already in progress?
    if (this.gisLoadPromise) {
      return this.gisLoadPromise;
    }

    this.gisLoadPromise = new Promise<void>((resolve, reject) => {
      // Check if script tag already exists
      const existing = document.querySelector(`script[src="${GIS_SCRIPT_URL}"]`);
      if (existing) {
        // Wait for it to load
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () =>
          reject(
            new AuthServiceError('gis-load-failed', 'Failed to load Google Identity Services'),
          ),
        );
        return;
      }

      const script = document.createElement('script');
      script.src = GIS_SCRIPT_URL;
      script.async = true;

      script.addEventListener('load', () => resolve());
      script.addEventListener('error', () => {
        this.gisLoadPromise = null;
        reject(new AuthServiceError('gis-load-failed', 'Failed to load Google Identity Services'));
      });

      document.head.appendChild(script);
    });

    return this.gisLoadPromise;
  }

  /* ── Token acquisition ───────────────────────────────────────── */

  /**
   * Request an OAuth token via the GIS popup.
   * Requires a user gesture (click) to avoid popup blocking.
   */
  requestToken(): Promise<AccessToken> {
    if (!this.isGisAvailable()) {
      const err = new AuthServiceError('gis-load-failed', 'Google Identity Services not loaded');
      this.emitError(err.toAuthError());
      return Promise.reject(err);
    }

    return new Promise<AccessToken>((resolve, reject) => {
      const config: GisTokenClientConfig = {
        client_id: this.clientId,
        scope: PHOTOS_PICKER_SCOPE,
        callback: (response: GisTokenResponse) => {
          if (response.error) {
            const code = mapGisError(response.error);
            const err = new AuthServiceError(code, response.error_description ?? response.error);
            this.emitError(err.toAuthError());
            reject(err);
            return;
          }

          const expiresInMs = response.expires_in * 1000;
          const token: AccessToken = {
            token: response.access_token,
            expiresAt: Date.now() + expiresInMs,
          };

          this.setToken(token, expiresInMs);
          resolve(token);
        },
      };

      const oauth2 = this.getGisOAuth2();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      this.tokenClient = oauth2?.initTokenClient(config);
      this.tokenClient?.requestAccessToken();
    });
  }

  /* ── Token state ─────────────────────────────────────────────── */

  /** Check if there is a valid (non-expired) token. */
  isAuthenticated(): boolean {
    return this.currentToken !== null && this.currentToken.expiresAt > Date.now();
  }

  /** Get the current token, or null if expired/absent. */
  getToken(): AccessToken | null {
    if (this.currentToken && this.currentToken.expiresAt <= Date.now()) {
      this.clearToken();
      return null;
    }
    return this.currentToken;
  }

  /** Revoke the current token and clear state. */
  signOut(): void {
    if (this.currentToken) {
      this.revokeGisToken(this.currentToken.token);
    }
    this.clearToken();
  }

  /* ── Event registration ──────────────────────────────────────── */

  /** Register a callback for when a token is acquired. */
  onTokenAcquired(callback: (token: AccessToken) => void): void {
    this.tokenAcquiredListeners.push(callback);
  }

  /** Register a callback for when the token expires. */
  onTokenExpired(callback: () => void): void {
    this.tokenExpiredListeners.push(callback);
  }

  /** Register a callback for auth errors. */
  onError(callback: (error: AuthError) => void): void {
    this.errorListeners.push(callback);
  }

  /* ── Private helpers ─────────────────────────────────────────── */

  /** Store token and set expiry timer. */
  private setToken(token: AccessToken, expiresInMs: number): void {
    this.currentToken = token;
    this.scheduleExpiry(expiresInMs);
    this.emitTokenAcquired(token);
  }

  /** Clear token and cancel expiry timer. */
  private clearToken(): void {
    this.currentToken = null;
    if (this.expiryTimerId !== null) {
      clearTimeout(this.expiryTimerId);
      this.expiryTimerId = null;
    }
  }

  /** Schedule the expiry callback ~5 min before actual expiry. */
  private scheduleExpiry(expiresInMs: number): void {
    if (this.expiryTimerId !== null) {
      clearTimeout(this.expiryTimerId);
    }

    const delay = Math.max(0, expiresInMs - EXPIRY_BUFFER_MS);

    this.expiryTimerId = setTimeout(() => {
      this.currentToken = null;
      this.expiryTimerId = null;
      this.emitTokenExpired();
    }, delay);
  }

  /** Check if the GIS API is available on window. */
  private isGisAvailable(): boolean {
    return this.getGisOAuth2() !== null;
  }

  /**
   * Get the google.accounts.oauth2 namespace, or null if not loaded.
   * Centralizes the unsafe window access in one place.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getGisOAuth2(): Record<string, any> | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const g = (window as any)?.google;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (typeof g?.accounts?.oauth2?.initTokenClient === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
      return g.accounts.oauth2;
    }
    return null;
  }

  /** Revoke a token via the GIS revoke API (best-effort). */
  private revokeGisToken(tokenValue: string): void {
    const oauth2 = this.getGisOAuth2();
    if (oauth2?.revoke) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      oauth2.revoke(tokenValue, () => {
        /* revoke callback — intentionally empty */
      });
    }
  }

  /* ── Event emitters ──────────────────────────────────────────── */

  private emitTokenAcquired(token: AccessToken): void {
    for (const cb of this.tokenAcquiredListeners) cb(token);
  }

  private emitTokenExpired(): void {
    for (const cb of this.tokenExpiredListeners) cb();
  }

  private emitError(error: AuthError): void {
    for (const cb of this.errorListeners) cb(error);
  }
}
