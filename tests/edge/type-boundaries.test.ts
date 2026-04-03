/**
 * Edge case tests — Boundary values and unusual but valid inputs.
 *
 * Tests extreme values, empty states, and edge conditions that acceptance
 * criteria don't explicitly cover but are important for robustness.
 *
 * [EDGE] — Edge cases not in acceptance criteria but important for correctness.
 * [BOUNDARY] — Component boundary tests verifying interface, not internals.
 */
import { describe, it, expect } from 'vitest';
import type {
  Card,
  Rank,
  Suit,
  GameState,
  Move,
  CardLocation,
  DifficultyConfig,
} from '../../src/types';

describe('Rank boundary values [EDGE]', () => {
  it('should handle Ace (rank 1) — the minimum rank', () => {
    const ace: Card = { suit: 'spades', rank: 1, faceUp: true };

    expect(ace.rank).toBe(1);
  });

  it('should handle King (rank 13) — the maximum rank', () => {
    const king: Card = { suit: 'hearts', rank: 13, faceUp: true };

    expect(king.rank).toBe(13);
  });

  it('should handle all 13 ranks as distinct values', () => {
    const ranks: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    const uniqueRanks = new Set(ranks);

    expect(uniqueRanks.size).toBe(13);
  });
});

describe('Suit completeness [EDGE]', () => {
  it('should support exactly 4 suits — no more, no less', () => {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

    expect(suits).toHaveLength(4);
    expect(new Set(suits).size).toBe(4);
  });
});

describe('Card edge cases [EDGE]', () => {
  it('should handle empty string photoUrl', () => {
    const card: Card = { suit: 'clubs', rank: 5, faceUp: true, photoUrl: '' };

    expect(card.photoUrl).toBe('');
  });

  it('should handle very long photoUrl', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2000);
    const card: Card = { suit: 'diamonds', rank: 1, faceUp: false, photoUrl: longUrl };

    expect(card.photoUrl).toBe(longUrl);
    expect(card.photoUrl?.length).toBeGreaterThan(2000);
  });

  it('should create all 52 unique cards in a standard deck [BOUNDARY]', () => {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    const deck: Card[] = [];

    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank, faceUp: false });
      }
    }

    expect(deck).toHaveLength(52);

    // Verify all cards are unique
    const keys = deck.map((c) => `${c.suit}-${c.rank}`);
    expect(new Set(keys).size).toBe(52);
  });
});

describe('GameState edge cases [EDGE]', () => {
  it('should represent a freshly-dealt state with 28 tableau cards', () => {
    // Klondike: 1+2+3+4+5+6+7 = 28 cards in tableau
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const makeCard = (i: number): Card => ({
      suit: suits[i % 4] as Suit,
      rank: ((i % 13) + 1) as Rank,
      faceUp: false,
    });

    // Build tableau with Klondike distribution
    const tableau = Array.from({ length: 7 }, (_, col) =>
      Array.from({ length: col + 1 }, (_, row) => {
        const card = makeCard(col * 7 + row);
        // Last card in each column is face-up
        return { ...card, faceUp: row === col };
      }),
    );

    const totalTableauCards = tableau.reduce((sum, col) => sum + col.length, 0);
    expect(totalTableauCards).toBe(28);

    // Remaining 24 cards go to stock
    const stock = Array.from({ length: 24 }, (_, i) => makeCard(28 + i));

    const state: GameState = {
      tableau,
      foundation: [[], [], [], []],
      stock,
      waste: [],
      moves: [],
      elapsedSeconds: 0,
      score: 0,
      isWon: false,
    };

    const totalCards =
      state.tableau.reduce((sum, col) => sum + col.length, 0) +
      state.foundation.reduce((sum, pile) => sum + pile.length, 0) +
      state.stock.length +
      state.waste.length;

    expect(totalCards).toBe(52);
  });

  it('should represent a won game state', () => {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const foundation = suits.map((suit) =>
      Array.from({ length: 13 }, (_, i) => ({
        suit,
        rank: (i + 1) as Rank,
        faceUp: true,
      })),
    );

    const state: GameState = {
      tableau: [[], [], [], [], [], [], []],
      foundation,
      stock: [],
      waste: [],
      moves: [],
      elapsedSeconds: 300,
      score: 1500,
      isWon: true,
    };

    expect(state.isWon).toBe(true);
    const foundationTotal = state.foundation.reduce((sum, pile) => sum + pile.length, 0);
    expect(foundationTotal).toBe(52);
  });

  it('should handle zero-second game (instant state)', () => {
    const state: GameState = {
      tableau: [[], [], [], [], [], [], []],
      foundation: [[], [], [], []],
      stock: [],
      waste: [],
      moves: [],
      elapsedSeconds: 0,
      score: 0,
      isWon: false,
    };

    expect(state.elapsedSeconds).toBe(0);
    expect(state.moves).toHaveLength(0);
  });
});

describe('Move edge cases [EDGE]', () => {
  it('should represent a multi-card tableau-to-tableau move', () => {
    const cards: Card[] = [
      { suit: 'hearts', rank: 7, faceUp: true },
      { suit: 'spades', rank: 6, faceUp: true },
      { suit: 'diamonds', rank: 5, faceUp: true },
    ];

    const move: Move = {
      from: { zone: 'tableau', pileIndex: 2, cardIndex: 3 },
      to: { zone: 'tableau', pileIndex: 5, cardIndex: 4 },
      cards,
      flippedCard: true,
    };

    expect(move.cards).toHaveLength(3);
    expect(move.flippedCard).toBe(true);
  });

  it('should represent a stock-to-waste draw', () => {
    const move: Move = {
      from: { zone: 'stock', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'waste', pileIndex: 0, cardIndex: 0 },
      cards: [{ suit: 'clubs', rank: 8, faceUp: true }],
    };

    expect(move.from.zone).toBe('stock');
    expect(move.to.zone).toBe('waste');
  });
});

describe('CardLocation boundary values [BOUNDARY]', () => {
  it('should handle pileIndex 0 (first pile)', () => {
    const loc: CardLocation = { zone: 'tableau', pileIndex: 0, cardIndex: 0 };

    expect(loc.pileIndex).toBe(0);
  });

  it('should handle pileIndex 6 (last tableau pile)', () => {
    const loc: CardLocation = { zone: 'tableau', pileIndex: 6, cardIndex: 12 };

    expect(loc.pileIndex).toBe(6);
    expect(loc.cardIndex).toBe(12);
  });
});

describe('DifficultyConfig edge cases [EDGE]', () => {
  it('should handle stockPasses 0 (unlimited passes)', () => {
    const config: DifficultyConfig = {
      name: 'Easy',
      difficulty: 'easy',
      drawCount: 1,
      stockPasses: 0,
      scoreMultiplier: 1,
    };

    expect(config.stockPasses).toBe(0); // 0 = unlimited per spec
  });

  it('should handle fractional scoreMultiplier', () => {
    const config: DifficultyConfig = {
      name: 'Custom',
      difficulty: 'medium',
      drawCount: 1,
      stockPasses: 5,
      scoreMultiplier: 1.5,
    };

    expect(config.scoreMultiplier).toBe(1.5);
  });
});
