/**
 * PhotoCache — caches photo thumbnails as blob URLs.
 *
 * Fetches thumbnails from Google Photos baseUrls, converts to blob URLs
 * that survive baseUrl expiry (60 min), and provides cycling access
 * for card-back assignment.
 *
 * [SOLID] SRP — thumbnail caching only.
 * [CLEAN-CODE] Small methods, clear lifecycle (load → use → clear).
 * [SECURITY] blob: URLs created locally, no external data persisted.
 */
import type { CardBack, PickedPhoto } from '../types/google-photos';

/* ── Constants ──────────────────────────────────────────────────── */

/** Google Photos baseUrls expire after ~60 minutes. */
const BASE_URL_TTL_MS = 60 * 60 * 1000;

/** Default thumbnail size for card backs. */
const DEFAULT_THUMBNAIL_SIZE = { width: 200, height: 300 };

/* ── PhotoCache class ───────────────────────────────────────────── */

export class PhotoCache {
  private cardBacks: CardBack[] = [];
  private loadedAt: number | null = null;

  /* ── Loading ─────────────────────────────────────────────────── */

  /**
   * Fetch thumbnails for all picked photos and cache as blob URLs.
   *
   * @param photos  — photos from the Picker API
   * @param size    — desired thumbnail dimensions
   * @returns CardBack array with blob: URLs for each loaded thumbnail
   */
  async loadThumbnails(
    photos: PickedPhoto[],
    size: { width: number; height: number } = DEFAULT_THUMBNAIL_SIZE,
  ): Promise<CardBack[]> {
    // Clear previous cache
    this.clear();

    const results = await Promise.allSettled(
      photos.map((photo) => this.fetchThumbnail(photo, size)),
    );

    this.cardBacks = results
      .filter((r): r is PromiseFulfilledResult<CardBack> => r.status === 'fulfilled')
      .map((r) => r.value);

    this.loadedAt = Date.now();
    return [...this.cardBacks];
  }

  /* ── Access ──────────────────────────────────────────────────── */

  /**
   * Get a cached card back by index, cycling if fewer than 52 photos.
   * Returns null if no photos are cached.
   */
  getCardBack(index: number): CardBack | null {
    if (this.cardBacks.length === 0) return null;
    return this.cardBacks[index % this.cardBacks.length] ?? null;
  }

  /**
   * Get a random card back for end-game reveal.
   * Returns null if no photos are cached.
   */
  getRevealPhoto(): CardBack | null {
    if (this.cardBacks.length === 0) return null;
    const index = Math.floor(Math.random() * this.cardBacks.length);
    return this.cardBacks[index] ?? null;
  }

  /** Check if the cache has any photos. */
  hasPhotos(): boolean {
    return this.cardBacks.length > 0;
  }

  /* ── Lifecycle ───────────────────────────────────────────────── */

  /** Clear all cached blob URLs and revoke them. */
  clear(): void {
    for (const cb of this.cardBacks) {
      URL.revokeObjectURL(cb.thumbnailUrl);
    }
    this.cardBacks = [];
    this.loadedAt = null;
  }

  /**
   * Check if the cached baseUrls have expired (60-min TTL).
   * Blob URLs still work — this indicates fullSizeUrls need refresh.
   */
  isExpired(): boolean {
    if (this.loadedAt === null) return false;
    return Date.now() - this.loadedAt >= BASE_URL_TTL_MS;
  }

  /**
   * Refresh cached photos with new baseUrls.
   * Re-fetches thumbnails and updates blob URLs.
   */
  async refresh(photos: PickedPhoto[]): Promise<void> {
    await this.loadThumbnails(photos);
  }

  /* ── Private helpers ─────────────────────────────────────────── */

  /** Fetch a single thumbnail and create a blob URL. */
  private async fetchThumbnail(
    photo: PickedPhoto,
    size: { width: number; height: number },
  ): Promise<CardBack> {
    const thumbnailUrl = `${photo.baseUrl}=w${String(size.width)}-h${String(size.height)}`;

    const response = await fetch(thumbnailUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch thumbnail for ${photo.id}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    return {
      photoId: photo.id,
      thumbnailUrl: blobUrl,
      fullSizeUrl: photo.baseUrl,
    };
  }
}
