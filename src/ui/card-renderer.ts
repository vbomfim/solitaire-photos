/**
 * CardRenderer — renders individual cards to the DOM.
 *
 * Creates card elements with inline SVG faces, CSS-pattern backs,
 * and manages flip / highlight / select / drag states via CSS classes.
 *
 * [CLEAN-CODE] Each public method does one thing.
 * [SOLID] SRP — only card element rendering, no layout or game logic.
 */
import type { Card, Rank, Suit } from '../types';
import { suitColor } from '../game/card-utils';

/* ── Constants ──────────────────────────────────────────────────── */

/** Unicode suit symbols. */
const SUIT_SYMBOLS: Readonly<Record<Suit, string>> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

/** Display labels for ranks. */
const RANK_LABELS: Readonly<Record<Rank, string>> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
};

/** Human-readable suit names for ARIA labels. */
const SUIT_NAMES: Readonly<Record<Suit, string>> = {
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
  spades: 'Spades',
};

/** Human-readable rank names for ARIA labels. */
const RANK_NAMES: Readonly<Record<Rank, string>> = {
  1: 'Ace',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'Jack',
  12: 'Queen',
  13: 'King',
};

/* ── SVG helpers ────────────────────────────────────────────────── */

/** Build the inline SVG string for a card face. [CLEAN-CODE] */
function buildCardFaceSvg(suit: Suit, rank: Rank): string {
  const symbol = SUIT_SYMBOLS[suit];
  const label = RANK_LABELS[rank];
  const color =
    suitColor(suit) === 'red'
      ? 'var(--color-red-suit, #d32f2f)'
      : 'var(--color-black-suit, #212121)';

  return `<svg class="card__svg" viewBox="0 0 100 145" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <text x="8" y="22" font-size="16" fill="${color}" font-family="sans-serif" font-weight="bold">${label}</text>
    <text x="8" y="38" font-size="14" fill="${color}" font-family="sans-serif">${symbol}</text>
    <text x="50" y="85" font-size="36" fill="${color}" font-family="sans-serif" text-anchor="middle" dominant-baseline="central">${symbol}</text>
    <text x="92" y="135" font-size="16" fill="${color}" font-family="sans-serif" font-weight="bold" text-anchor="end" transform="rotate(180, 92, 127)">${label}</text>
    <text x="92" y="119" font-size="14" fill="${color}" font-family="sans-serif" text-anchor="end" transform="rotate(180, 92, 111)">${symbol}</text>
  </svg>`;
}

/** Build ARIA label for a card. */
function buildAriaLabel(suit: Suit, rank: Rank): string {
  return `${RANK_NAMES[rank]} of ${SUIT_NAMES[suit]}`;
}

/* ── CardRenderer class ─────────────────────────────────────────── */

export class CardRenderer {
  /**
   * Create a card DOM element.
   *
   * @param card  — the Card data
   * @param back  — optional photo URL for the card back
   * @returns the card HTMLElement
   */
  createCard(card: Card, back?: string): HTMLElement {
    const el = document.createElement('div');
    el.classList.add('card');

    // Suit color class
    el.classList.add(suitColor(card.suit) === 'red' ? 'card--red' : 'card--black');

    // Data attributes for identification
    el.dataset['suit'] = card.suit;
    el.dataset['rank'] = String(card.rank);

    // Card face (SVG)
    const face = document.createElement('div');
    face.classList.add('card__face');
    face.innerHTML = buildCardFaceSvg(card.suit, card.rank);
    el.appendChild(face);

    // Card back
    const backEl = document.createElement('div');
    backEl.classList.add('card__back');
    if (back) {
      backEl.style.backgroundImage = `url(${back})`;
      backEl.classList.add('card__back--photo');
    }
    el.appendChild(backEl);

    // Set initial face-up/face-down state
    this.applyFaceState(el, card.faceUp, card.suit, card.rank);

    return el;
  }

  /**
   * Flip a card element to face-up or face-down.
   *
   * Toggles CSS classes and updates ARIA attributes.
   */
  flipCard(element: HTMLElement, faceUp: boolean): void {
    const suit = element.dataset['suit'] as Suit;
    const rank = Number(element.dataset['rank']) as Rank;
    this.applyFaceState(element, faceUp, suit, rank);
  }

  /**
   * Set whether a card element is draggable.
   */
  setDraggable(element: HTMLElement, draggable: boolean): void {
    element.setAttribute('draggable', String(draggable));
    element.classList.toggle('card--draggable', draggable);
  }

  /**
   * Set the card back image (photo URL) or revert to default pattern.
   *
   * @param photoUrl  — photo URL or null to revert to default
   */
  setCardBack(element: HTMLElement, photoUrl: string | null): void {
    const back = element.querySelector<HTMLElement>('.card__back');
    if (!back) return;

    if (photoUrl) {
      back.style.backgroundImage = `url(${photoUrl})`;
      back.classList.add('card__back--photo');
    } else {
      back.style.backgroundImage = '';
      back.classList.remove('card__back--photo');
    }
  }

  /**
   * Toggle highlight state (for valid move targets).
   */
  highlightCard(element: HTMLElement, highlight: boolean): void {
    element.classList.toggle('card--highlighted', highlight);
  }

  /**
   * Toggle selected state (for currently picked card).
   */
  selectCard(element: HTMLElement, selected: boolean): void {
    element.classList.toggle('card--selected', selected);
  }

  /* ── Private helpers ──────────────────────────────────────────── */

  /** Apply face-up/face-down CSS classes and ARIA attributes. [DRY] */
  private applyFaceState(element: HTMLElement, faceUp: boolean, suit: Suit, rank: Rank): void {
    element.classList.toggle('card--face-up', faceUp);
    element.classList.toggle('card--face-down', !faceUp);

    if (faceUp) {
      element.setAttribute('role', 'img');
      element.setAttribute('aria-label', buildAriaLabel(suit, rank));
      element.removeAttribute('aria-hidden');
    } else {
      element.removeAttribute('role');
      element.removeAttribute('aria-label');
      element.setAttribute('aria-hidden', 'true');
    }
  }
}
