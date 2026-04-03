/**
 * Type definitions for Google Photos integration.
 *
 * Covers OAuth tokens, Picker API responses, and photo cache entries.
 * Separated from core game types to respect [CLEAN-ARCH] boundaries.
 */

/* ── OAuth ──────────────────────────────────────────────────────── */

/** An OAuth2 access token with expiry metadata. */
export interface AccessToken {
  readonly token: string;
  readonly expiresAt: number;
}

/** Error codes produced by the auth flow. */
export type AuthErrorCode =
  | 'popup-blocked'
  | 'user-cancelled'
  | 'network-error'
  | 'gis-load-failed'
  | 'unknown';

/** Structured auth error with user-facing guidance. */
export interface AuthError {
  readonly code: AuthErrorCode;
  readonly message: string;
}

/* ── Google Photos Picker API ───────────────────────────────────── */

/** A photo selected via the Google Photos Picker. */
export interface PickedPhoto {
  readonly id: string;
  readonly baseUrl: string;
  readonly mimeType: string;
  readonly width: number;
  readonly height: number;
}

/** Raw Picker session response from the API. */
export interface PickerSession {
  readonly id: string;
  readonly pickerUri: string;
  readonly mediaItemsSet?: boolean | undefined;
}

/** Raw media item from the Picker API. */
export interface PickerMediaItem {
  readonly id: string;
  readonly mediaFile: {
    readonly baseUrl: string;
    readonly mimeType: string;
    readonly mediaFileMetadata?:
      | {
          readonly width?: number | undefined;
          readonly height?: number | undefined;
        }
      | undefined;
  };
}

/* ── Photo Cache ────────────────────────────────────────────────── */

/** A cached card-back photo ready for rendering. */
export interface CardBack {
  readonly photoId: string;
  /** blob: URL for the thumbnail (survives baseUrl expiry). */
  readonly thumbnailUrl: string;
  /** Original baseUrl for full-size reveal (may expire after 60 min). */
  readonly fullSizeUrl: string;
}

/* ── Google Identity Services type shim ─────────────────────────── */

/**
 * Minimal type declarations for the Google Identity Services (GIS)
 * `google.accounts.oauth2` namespace. Only the parts we use are typed.
 */
export interface GisTokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
}

export interface GisTokenResponse {
  access_token: string;
  expires_in: number;
  error?: string | undefined;
  error_description?: string | undefined;
}

export interface GisTokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: GisTokenResponse) => void;
  error_callback?: (error: { type: string; message: string }) => void;
}
