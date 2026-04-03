/**
 * Card utility functions.
 *
 * Pure helper functions for card-related operations that don't belong
 * to a specific component. [CLEAN-CODE] [DRY]
 */
import type { Card, Color, Rank, Suit } from '../types';

/** All four suits in standard order. */
const SUITS: readonly Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'] as const;

/** All thirteen ranks in ascending order. */
const RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;

/** Returns the color ('red' or 'black') of the given suit. */
export function suitColor(suit: Suit): Color {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

/** Creates a standard 52-card deck, all cards face-down. [CLEAN-CODE] */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, faceUp: false });
    }
  }
  return deck;
}

/**
 * Seeded PRNG — mulberry32.
 * Returns a function that produces deterministic floats in [0, 1).
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle (pure — returns a new array). [CLEAN-CODE]
 *
 * Accepts an optional numeric seed for deterministic testing.
 * When no seed is provided, uses Math.random.
 */
export function shuffle(cards: readonly Card[], seed?: number): Card[] {
  const result = [...cards];
  const random = seed !== undefined ? mulberry32(seed) : Math.random;
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

/** Compares two ranks numerically. Returns negative/0/positive. */
export function compareRank(a: Rank, b: Rank): number {
  return a - b;
}

/** Returns true if two cards have alternating colors (red ↔ black). */
export function isAlternatingColor(a: Card, b: Card): boolean {
  return suitColor(a.suit) !== suitColor(b.suit);
}

/**
 * Returns true if `higher` is exactly one rank above `lower`.
 * No wrap-around: King (13) → Ace (1) returns false.
 */
export function isNextRank(lower: Card, higher: Card): boolean {
  return higher.rank - lower.rank === 1;
}
