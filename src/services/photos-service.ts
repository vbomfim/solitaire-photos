/**
 * PhotosService — interacts with the Google Photos Picker API.
 *
 * Creates picker sessions, polls for completion, and retrieves
 * selected media items. All communication via REST with Bearer token.
 *
 * [SOLID] SRP — Picker API interaction only.
 * [CLEAN-CODE] Small methods, clear API boundary.
 * [SECURITY] Authorization header with in-memory token.
 */
import type { AuthService } from './auth-service';
import type { PickedPhoto, PickerMediaItem } from '../types/google-photos';

/* ── Constants ──────────────────────────────────────────────────── */

const PICKER_API_BASE = 'https://photospicker.googleapis.com/v1';
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 150; // 5 minutes max polling

/* ── PhotosService class ────────────────────────────────────────── */

export class PhotosService {
  private readonly authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  /* ── Picker session lifecycle ────────────────────────────────── */

  /**
   * Create a Picker session and open the picker UI in a new window.
   * @returns the session ID for polling.
   */
  async startPicker(): Promise<string> {
    const token = this.requireToken();

    const response = await fetch(`${PICKER_API_BASE}/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`Picker session creation failed: ${String(response.status)}`);
    }

    const session = (await response.json()) as { id: string; pickerUri: string };

    // Open picker UI in a popup
    window.open(session.pickerUri, '_blank', 'width=1024,height=768,menubar=no,toolbar=no');

    return session.id;
  }

  /**
   * Poll a picker session to check if the user has selected photos.
   * @returns true if photos have been selected.
   */
  async pollSession(sessionId: string): Promise<boolean> {
    const token = this.requireToken();

    const response = await fetch(`${PICKER_API_BASE}/sessions/${sessionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Picker session poll failed: ${String(response.status)}`);
    }

    const session = (await response.json()) as { mediaItemsSet?: boolean };
    return session.mediaItemsSet === true;
  }

  /**
   * Retrieve the photos selected in a completed picker session.
   */
  async getPickedPhotos(sessionId: string): Promise<PickedPhoto[]> {
    const token = this.requireToken();

    const response = await fetch(`${PICKER_API_BASE}/sessions/${sessionId}/mediaItems`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get picked photos: ${String(response.status)}`);
    }

    const data = (await response.json()) as { mediaItems?: PickerMediaItem[] };
    const items = data.mediaItems ?? [];

    return items.map((item) => ({
      id: item.id,
      baseUrl: item.mediaFile.baseUrl,
      mimeType: item.mediaFile.mimeType,
      width: item.mediaFile.mediaFileMetadata?.width ?? 0,
      height: item.mediaFile.mediaFileMetadata?.height ?? 0,
    }));
  }

  /**
   * Full picker flow: create session → poll until complete → return photos.
   */
  async pickPhotos(): Promise<PickedPhoto[]> {
    const sessionId = await this.startPicker();

    // Poll until user completes selection
    let attempts = 0;
    while (attempts < MAX_POLL_ATTEMPTS) {
      await this.delay(POLL_INTERVAL_MS);
      const ready = await this.pollSession(sessionId);
      if (ready) break;
      attempts++;
    }

    return this.getPickedPhotos(sessionId);
  }

  /* ── Private helpers ─────────────────────────────────────────── */

  /** Get the current Bearer token or throw. */
  private requireToken(): string {
    const accessToken = this.authService.getToken();
    if (!accessToken) {
      throw new Error('Not authenticated');
    }
    return accessToken.token;
  }

  /** Promise-based delay that works with fake timers. */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
