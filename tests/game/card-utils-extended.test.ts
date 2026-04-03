/**
 * Unit tests for extended card utility functions.
 *
 * [TDD] — Tests written first for createDeck, shuffle, compareRank,
 * isAlternatingColor, and isNextRank.
 */
import { describe, it, expect } from 'vitest';
import {
  createDeck,
  shuffle,
  compareRank,
  isAlternatingColor,
  isNextRank,
} from '../../src/game/card-utils';
import type { Card, Rank, Suit } from '../../src/types';

/* ── createDeck ─────────────────────────────────────────────────── */

describe('createDeck()', () => {
  it('should return exactly 52 cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
  });

  it('should contain all unique cards', () => {
    const deck = createDeck();
    const keys = deck.map((c) => `${c.suit}-${c.rank}`);
    expect(new Set(keys).size).toBe(52);
  });

  it('should have 13 cards per suit', () => {
    const deck = createDeck();
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    for (const suit of suits) {
      const count = deck.filter((c) => c.suit === suit).length;
      expect(count).toBe(13);
    }
  });

  it('should have 4 cards per rank', () => {
    const deck = createDeck();
    for (let r = 1; r <= 13; r++) {
      const count = deck.filter((c) => c.rank === r).length;
      expect(count).toBe(4);
    }
  });

  it('should create all cards face-down', () => {
    const deck = createDeck();
    expect(deck.every((c) => !c.faceUp)).toBe(true);
  });

  it('should return a new array each time (no shared reference)', () => {
    const deck1 = createDeck();
    const deck2 = createDeck();
    expect(deck1).not.toBe(deck2);
    expect(deck1).toEqual(deck2);
  });
});

/* ── shuffle ────────────────────────────────────────────────────── */

describe('shuffle()', () => {
  it('should return the same number of cards', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    expect(shuffled).toHaveLength(52);
  });

  it('should return a new array (pure function)', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    expect(shuffled).not.toBe(deck);
  });

  it('should not mutate the original deck', () => {
    const deck = createDeck();
    const original = [...deck];
    shuffle(deck);
    expect(deck).toEqual(original);
  });

  it('should contain all original cards', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    const deckKeys = new Set(deck.map((c) => `${c.suit}-${c.rank}`));
    const shuffledKeys = new Set(shuffled.map((c) => `${c.suit}-${c.rank}`));
    expect(shuffledKeys).toEqual(deckKeys);
  });

  it('should produce a different order (probabilistic)', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    // With 52 cards, probability of identical order is ~1/52! ≈ 0
    const samePosition = deck.filter(
      (c, i) => shuffled[i]?.suit === c.suit && shuffled[i]?.rank === c.rank,
    ).length;
    expect(samePosition).toBeLessThan(52);
  });

  it('should produce deterministic output with a seed', () => {
    const deck = createDeck();
    const shuffled1 = shuffle(deck, 42);
    const shuffled2 = shuffle(deck, 42);
    expect(shuffled1).toEqual(shuffled2);
  });

  it('should produce different output with different seeds', () => {
    const deck = createDeck();
    const shuffled1 = shuffle(deck, 1);
    const shuffled2 = shuffle(deck, 2);
    const same = shuffled1.filter(
      (c, i) => shuffled2[i]?.suit === c.suit && shuffled2[i]?.rank === c.rank,
    ).length;
    expect(same).toBeLessThan(52);
  });

  it('should handle an empty array', () => {
    const result = shuffle([]);
    expect(result).toEqual([]);
  });

  it('should handle a single-card array', () => {
    const card: Card = { suit: 'hearts', rank: 1, faceUp: false };
    const result = shuffle([card]);
    expect(result).toEqual([card]);
  });
});

/* ── compareRank ────────────────────────────────────────────────── */

describe('compareRank()', () => {
  it('should return negative when first rank is lower', () => {
    expect(compareRank(1, 13)).toBeLessThan(0);
  });

  it('should return positive when first rank is higher', () => {
    expect(compareRank(13, 1)).toBeGreaterThan(0);
  });

  it('should return 0 for equal ranks', () => {
    expect(compareRank(7, 7)).toBe(0);
  });

  it('should work for consecutive ranks', () => {
    expect(compareRank(5, 6)).toBe(-1);
    expect(compareRank(6, 5)).toBe(1);
  });

  it('should work for Ace (1) and King (13)', () => {
    expect(compareRank(1, 13)).toBe(-12);
  });

  it('should handle all rank pairs consistently', () => {
    const ranks: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    for (const a of ranks) {
      for (const b of ranks) {
        if (a < b) expect(compareRank(a, b)).toBeLessThan(0);
        if (a > b) expect(compareRank(a, b)).toBeGreaterThan(0);
        if (a === b) expect(compareRank(a, b)).toBe(0);
      }
    }
  });
});

/* ── isAlternatingColor ─────────────────────────────────────────── */

describe('isAlternatingColor()', () => {
  it('should return true for red-black (hearts-spades)', () => {
    const a: Card = { suit: 'hearts', rank: 7, faceUp: true };
    const b: Card = { suit: 'spades', rank: 6, faceUp: true };
    expect(isAlternatingColor(a, b)).toBe(true);
  });

  it('should return true for black-red (clubs-diamonds)', () => {
    const a: Card = { suit: 'clubs', rank: 10, faceUp: true };
    const b: Card = { suit: 'diamonds', rank: 9, faceUp: true };
    expect(isAlternatingColor(a, b)).toBe(true);
  });

  it('should return false for same color (hearts-diamonds)', () => {
    const a: Card = { suit: 'hearts', rank: 7, faceUp: true };
    const b: Card = { suit: 'diamonds', rank: 6, faceUp: true };
    expect(isAlternatingColor(a, b)).toBe(false);
  });

  it('should return false for same color (clubs-spades)', () => {
    const a: Card = { suit: 'clubs', rank: 10, faceUp: true };
    const b: Card = { suit: 'spades', rank: 9, faceUp: true };
    expect(isAlternatingColor(a, b)).toBe(false);
  });

  it('should return false for same suit', () => {
    const a: Card = { suit: 'hearts', rank: 7, faceUp: true };
    const b: Card = { suit: 'hearts', rank: 6, faceUp: true };
    expect(isAlternatingColor(a, b)).toBe(false);
  });
});

/* ── isNextRank ─────────────────────────────────────────────────── */

describe('isNextRank()', () => {
  it('should return true when higher is exactly one rank above lower', () => {
    const lower: Card = { suit: 'hearts', rank: 5, faceUp: true };
    const higher: Card = { suit: 'spades', rank: 6, faceUp: true };
    expect(isNextRank(lower, higher)).toBe(true);
  });

  it('should return true for Ace → 2', () => {
    const ace: Card = { suit: 'hearts', rank: 1, faceUp: true };
    const two: Card = { suit: 'spades', rank: 2, faceUp: true };
    expect(isNextRank(ace, two)).toBe(true);
  });

  it('should return true for Queen → King', () => {
    const queen: Card = { suit: 'diamonds', rank: 12, faceUp: true };
    const king: Card = { suit: 'clubs', rank: 13, faceUp: true };
    expect(isNextRank(queen, king)).toBe(true);
  });

  it('should return false when ranks differ by more than 1', () => {
    const lower: Card = { suit: 'hearts', rank: 3, faceUp: true };
    const higher: Card = { suit: 'spades', rank: 7, faceUp: true };
    expect(isNextRank(lower, higher)).toBe(false);
  });

  it('should return false when ranks are equal', () => {
    const a: Card = { suit: 'hearts', rank: 5, faceUp: true };
    const b: Card = { suit: 'spades', rank: 5, faceUp: true };
    expect(isNextRank(a, b)).toBe(false);
  });

  it('should return false when lower is actually higher', () => {
    const lower: Card = { suit: 'hearts', rank: 8, faceUp: true };
    const higher: Card = { suit: 'spades', rank: 7, faceUp: true };
    expect(isNextRank(lower, higher)).toBe(false);
  });

  it('should return false for King → Ace (no wrap-around)', () => {
    const king: Card = { suit: 'hearts', rank: 13, faceUp: true };
    const ace: Card = { suit: 'spades', rank: 1, faceUp: true };
    expect(isNextRank(king, ace)).toBe(false);
  });
});
