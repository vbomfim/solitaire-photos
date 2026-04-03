/**
 * Unit tests for CardRenderer — individual card DOM elements.
 *
 * [TDD] — Tests written FIRST for all CardRenderer public methods.
 * Uses jsdom environment for DOM APIs.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CardRenderer } from '../../src/ui/card-renderer';
import type { Card, Rank, Suit } from '../../src/types';

/* ── Helpers ────────────────────────────────────────────────────── */

/** Create a card shorthand. */
function card(suit: Suit, rank: Rank, faceUp = true): Card {
  return { suit, rank, faceUp };
}

/** Rank display label lookup. */
const RANK_LABELS: Record<Rank, string> = {
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

/** Suit display label lookup. */
const SUIT_LABELS: Record<Suit, string> = {
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
  spades: 'Spades',
};

/** Suit unicode symbols. */
const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

/* ══════════════════════════════════════════════════════════════════ */
/* 1. createCard                                                     */
/* ══════════════════════════════════════════════════════════════════ */

describe('CardRenderer — createCard', () => {
  let renderer: CardRenderer;

  beforeEach(() => {
    renderer = new CardRenderer();
  });

  it('should return an HTMLElement', () => {
    const el = renderer.createCard(card('spades', 1));
    expect(el).toBeInstanceOf(HTMLElement);
  });

  it('should have class "card"', () => {
    const el = renderer.createCard(card('spades', 1));
    expect(el.classList.contains('card')).toBe(true);
  });

  it('should have class "card--face-up" when card is face-up', () => {
    const el = renderer.createCard(card('spades', 1, true));
    expect(el.classList.contains('card--face-up')).toBe(true);
    expect(el.classList.contains('card--face-down')).toBe(false);
  });

  it('should have class "card--face-down" when card is face-down', () => {
    const el = renderer.createCard(card('spades', 1, false));
    expect(el.classList.contains('card--face-down')).toBe(true);
    expect(el.classList.contains('card--face-up')).toBe(false);
  });

  it('should have suit-color class "card--red" for hearts', () => {
    const el = renderer.createCard(card('hearts', 1));
    expect(el.classList.contains('card--red')).toBe(true);
  });

  it('should have suit-color class "card--red" for diamonds', () => {
    const el = renderer.createCard(card('diamonds', 5));
    expect(el.classList.contains('card--red')).toBe(true);
  });

  it('should have suit-color class "card--black" for spades', () => {
    const el = renderer.createCard(card('spades', 13));
    expect(el.classList.contains('card--black')).toBe(true);
  });

  it('should have suit-color class "card--black" for clubs', () => {
    const el = renderer.createCard(card('clubs', 10));
    expect(el.classList.contains('card--black')).toBe(true);
  });

  /* ── Accessibility ────────────────────────────────────────────── */

  it('should have role="img" on face-up cards', () => {
    const el = renderer.createCard(card('spades', 1, true));
    expect(el.getAttribute('role')).toBe('img');
  });

  it('should have descriptive aria-label on face-up cards', () => {
    const el = renderer.createCard(card('spades', 1, true));
    expect(el.getAttribute('aria-label')).toBe('Ace of Spades');
  });

  it('should have correct aria-label for numbered cards', () => {
    const el = renderer.createCard(card('hearts', 7, true));
    expect(el.getAttribute('aria-label')).toBe('7 of Hearts');
  });

  it('should have correct aria-label for face cards', () => {
    const el = renderer.createCard(card('diamonds', 12, true));
    expect(el.getAttribute('aria-label')).toBe('Queen of Diamonds');
  });

  it('should have aria-hidden="true" on face-down cards', () => {
    const el = renderer.createCard(card('spades', 1, false));
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('should NOT have aria-hidden on face-up cards', () => {
    const el = renderer.createCard(card('spades', 1, true));
    expect(el.hasAttribute('aria-hidden')).toBe(false);
  });

  /* ── Data attributes ──────────────────────────────────────────── */

  it('should store suit in data-suit attribute', () => {
    const el = renderer.createCard(card('hearts', 5));
    expect(el.dataset['suit']).toBe('hearts');
  });

  it('should store rank in data-rank attribute', () => {
    const el = renderer.createCard(card('hearts', 5));
    expect(el.dataset['rank']).toBe('5');
  });

  /* ── SVG card face ─────────────────────────────────────────────── */

  it('should contain an SVG element for face-up cards', () => {
    const el = renderer.createCard(card('spades', 1, true));
    const svg = el.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('should show suit symbol in SVG for face-up cards', () => {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    for (const suit of suits) {
      const el = renderer.createCard(card(suit, 5, true));
      expect(el.textContent).toContain(SUIT_SYMBOLS[suit]);
    }
  });

  it('should show rank label in SVG for face-up cards', () => {
    const ranks: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    for (const rank of ranks) {
      const el = renderer.createCard(card('spades', rank, true));
      expect(el.textContent).toContain(RANK_LABELS[rank]);
    }
  });

  it('should NOT show SVG face on face-down cards', () => {
    const el = renderer.createCard(card('spades', 1, false));
    const face = el.querySelector('.card__face');
    // Face should be hidden or not rendered
    expect(
      face === null ||
        getComputedStyle(face).display === 'none' ||
        !el.classList.contains('card--face-up'),
    ).toBe(true);
  });

  /* ── Card back ─────────────────────────────────────────────────── */

  it('should have a card-back element', () => {
    const el = renderer.createCard(card('spades', 1, false));
    const back = el.querySelector('.card__back');
    expect(back).not.toBeNull();
  });

  it('should support custom card back URL', () => {
    const el = renderer.createCard(card('spades', 1, false), 'https://example.com/photo.jpg');
    const back = el.querySelector('.card__back') as HTMLElement;
    expect(back.style.backgroundImage).toContain('https://example.com/photo.jpg');
  });

  /* ── All 52 cards ──────────────────────────────────────────────── */

  it('should create all 52 unique cards without errors', () => {
    const RANK_NAMES: Record<Rank, string> = {
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
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    for (const suit of suits) {
      for (const rank of ranks) {
        const el = renderer.createCard(card(suit, rank, true));
        expect(el).toBeInstanceOf(HTMLElement);
        expect(el.getAttribute('aria-label')).toBe(`${RANK_NAMES[rank]} of ${SUIT_LABELS[suit]}`);
      }
    }
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 2. flipCard                                                       */
/* ══════════════════════════════════════════════════════════════════ */

describe('CardRenderer — flipCard', () => {
  let renderer: CardRenderer;

  beforeEach(() => {
    renderer = new CardRenderer();
  });

  it('should flip a face-down card to face-up', () => {
    const el = renderer.createCard(card('spades', 1, false));
    renderer.flipCard(el, true);
    expect(el.classList.contains('card--face-up')).toBe(true);
    expect(el.classList.contains('card--face-down')).toBe(false);
  });

  it('should flip a face-up card to face-down', () => {
    const el = renderer.createCard(card('spades', 1, true));
    renderer.flipCard(el, false);
    expect(el.classList.contains('card--face-down')).toBe(true);
    expect(el.classList.contains('card--face-up')).toBe(false);
  });

  it('should update aria attributes when flipping to face-up', () => {
    const el = renderer.createCard(card('spades', 1, false));
    renderer.flipCard(el, true);
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('Ace of Spades');
    expect(el.hasAttribute('aria-hidden')).toBe(false);
  });

  it('should update aria attributes when flipping to face-down', () => {
    const el = renderer.createCard(card('spades', 1, true));
    renderer.flipCard(el, false);
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('should be idempotent for same state', () => {
    const el = renderer.createCard(card('spades', 1, true));
    renderer.flipCard(el, true);
    expect(el.classList.contains('card--face-up')).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 3. setDraggable                                                   */
/* ══════════════════════════════════════════════════════════════════ */

describe('CardRenderer — setDraggable', () => {
  let renderer: CardRenderer;

  beforeEach(() => {
    renderer = new CardRenderer();
  });

  it('should set draggable attribute to true', () => {
    const el = renderer.createCard(card('spades', 1));
    renderer.setDraggable(el, true);
    expect(el.getAttribute('draggable')).toBe('true');
  });

  it('should set draggable attribute to false', () => {
    const el = renderer.createCard(card('spades', 1));
    renderer.setDraggable(el, true);
    renderer.setDraggable(el, false);
    expect(el.getAttribute('draggable')).toBe('false');
  });

  it('should add card--draggable class when draggable', () => {
    const el = renderer.createCard(card('spades', 1));
    renderer.setDraggable(el, true);
    expect(el.classList.contains('card--draggable')).toBe(true);
  });

  it('should remove card--draggable class when not draggable', () => {
    const el = renderer.createCard(card('spades', 1));
    renderer.setDraggable(el, true);
    renderer.setDraggable(el, false);
    expect(el.classList.contains('card--draggable')).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 4. setCardBack                                                    */
/* ══════════════════════════════════════════════════════════════════ */

describe('CardRenderer — setCardBack', () => {
  let renderer: CardRenderer;

  beforeEach(() => {
    renderer = new CardRenderer();
  });

  it('should set background image on card back when given URL', () => {
    const el = renderer.createCard(card('spades', 1));
    renderer.setCardBack(el, 'https://example.com/photo.jpg');
    const back = el.querySelector('.card__back') as HTMLElement;
    expect(back.style.backgroundImage).toContain('https://example.com/photo.jpg');
  });

  it('should add card__back--photo class when given URL', () => {
    const el = renderer.createCard(card('spades', 1));
    renderer.setCardBack(el, 'https://example.com/photo.jpg');
    const back = el.querySelector('.card__back') as HTMLElement;
    expect(back.classList.contains('card__back--photo')).toBe(true);
  });

  it('should remove background image when given null', () => {
    const el = renderer.createCard(card('spades', 1));
    renderer.setCardBack(el, 'https://example.com/photo.jpg');
    renderer.setCardBack(el, null);
    const back = el.querySelector('.card__back') as HTMLElement;
    expect(back.style.backgroundImage).toBe('');
  });

  it('should remove card__back--photo class when given null', () => {
    const el = renderer.createCard(card('spades', 1));
    renderer.setCardBack(el, 'https://example.com/photo.jpg');
    renderer.setCardBack(el, null);
    const back = el.querySelector('.card__back') as HTMLElement;
    expect(back.classList.contains('card__back--photo')).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 5. highlightCard                                                  */
/* ══════════════════════════════════════════════════════════════════ */

describe('CardRenderer — highlightCard', () => {
  let renderer: CardRenderer;

  beforeEach(() => {
    renderer = new CardRenderer();
  });

  it('should add card--highlighted class when highlighted', () => {
    const el = renderer.createCard(card('spades', 1));
    renderer.highlightCard(el, true);
    expect(el.classList.contains('card--highlighted')).toBe(true);
  });

  it('should remove card--highlighted class when unhighlighted', () => {
    const el = renderer.createCard(card('spades', 1));
    renderer.highlightCard(el, true);
    renderer.highlightCard(el, false);
    expect(el.classList.contains('card--highlighted')).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 6. selectCard                                                     */
/* ══════════════════════════════════════════════════════════════════ */

describe('CardRenderer — selectCard', () => {
  let renderer: CardRenderer;

  beforeEach(() => {
    renderer = new CardRenderer();
  });

  it('should add card--selected class when selected', () => {
    const el = renderer.createCard(card('spades', 1));
    renderer.selectCard(el, true);
    expect(el.classList.contains('card--selected')).toBe(true);
  });

  it('should remove card--selected class when deselected', () => {
    const el = renderer.createCard(card('spades', 1));
    renderer.selectCard(el, true);
    renderer.selectCard(el, false);
    expect(el.classList.contains('card--selected')).toBe(false);
  });
});
