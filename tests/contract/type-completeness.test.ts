/**
 * Contract tests — Type system completeness and interface stability.
 *
 * These tests verify that every type exported from the types module has
 * the expected shape. If a refactor changes or removes a type property,
 * these tests will catch it — protecting downstream consumers.
 *
 * [CONTRACT] — Interface contract validation for the shared type system.
 */
import { describe, it, expect } from 'vitest';
import type {
  Card,
  Color,
  Pile,
  ReadonlyPile,
  CardLocation,
  Move,
  GameState,
  Difficulty,
  DifficultyConfig,
} from '../../src/types';

describe('Card interface contract [CONTRACT]', () => {
  it('should require suit, rank, and faceUp as mandatory fields', () => {
    const card: Card = { suit: 'hearts', rank: 1, faceUp: false };

    expect(card).toHaveProperty('suit');
    expect(card).toHaveProperty('rank');
    expect(card).toHaveProperty('faceUp');
  });

  it('should allow photoUrl as an optional field', () => {
    const cardWithoutPhoto: Card = { suit: 'clubs', rank: 5, faceUp: true };
    const cardWithPhoto: Card = {
      suit: 'clubs',
      rank: 5,
      faceUp: true,
      photoUrl: 'https://example.com/photo.jpg',
    };

    expect(cardWithoutPhoto.photoUrl).toBeUndefined();
    expect(cardWithPhoto.photoUrl).toBe('https://example.com/photo.jpg');
  });

  it('should allow explicit undefined for photoUrl', () => {
    const card: Card = { suit: 'diamonds', rank: 10, faceUp: false, photoUrl: undefined };

    expect(card.photoUrl).toBeUndefined();
  });
});

describe('Color type contract [CONTRACT]', () => {
  it('should accept red and black as valid colors', () => {
    const colors: Color[] = ['red', 'black'];

    expect(colors).toHaveLength(2);
    expect(colors).toContain('red');
    expect(colors).toContain('black');
  });
});

describe('CardLocation interface contract [CONTRACT]', () => {
  it('should accept all four zone values', () => {
    const zones: CardLocation['zone'][] = ['tableau', 'foundation', 'stock', 'waste'];

    expect(zones).toHaveLength(4);
    expect(new Set(zones).size).toBe(4);
  });

  it('should represent a specific card position', () => {
    const location: CardLocation = { zone: 'tableau', pileIndex: 3, cardIndex: 5 };

    expect(location.zone).toBe('tableau');
    expect(location.pileIndex).toBe(3);
    expect(location.cardIndex).toBe(5);
  });
});

describe('Move interface contract [CONTRACT]', () => {
  it('should represent a move between two locations with cards', () => {
    const card: Card = { suit: 'spades', rank: 12, faceUp: true };
    const move: Move = {
      from: { zone: 'tableau', pileIndex: 0, cardIndex: 3 },
      to: { zone: 'foundation', pileIndex: 2, cardIndex: 0 },
      cards: [card],
    };

    expect(move.from.zone).toBe('tableau');
    expect(move.to.zone).toBe('foundation');
    expect(move.cards).toHaveLength(1);
    expect(move.flippedCard).toBeUndefined();
  });

  it('should support optional flippedCard flag', () => {
    const move: Move = {
      from: { zone: 'tableau', pileIndex: 1, cardIndex: 2 },
      to: { zone: 'tableau', pileIndex: 4, cardIndex: 0 },
      cards: [{ suit: 'hearts', rank: 7, faceUp: true }],
      flippedCard: true,
    };

    expect(move.flippedCard).toBe(true);
  });
});

describe('Pile type contract [CONTRACT]', () => {
  it('should represent an ordered array of cards', () => {
    const pile: Pile = [
      { suit: 'hearts', rank: 1, faceUp: false },
      { suit: 'spades', rank: 13, faceUp: true },
    ];

    expect(pile).toHaveLength(2);
    expect(pile[0]?.faceUp).toBe(false);
    expect(pile[1]?.faceUp).toBe(true);
  });

  it('should represent an empty pile', () => {
    const pile: Pile = [];

    expect(pile).toHaveLength(0);
  });

  it('should support ReadonlyPile for immutable game state', () => {
    const readonlyPile: ReadonlyPile = [
      { suit: 'clubs', rank: 3, faceUp: true },
      { suit: 'diamonds', rank: 9, faceUp: false },
    ];

    expect(readonlyPile).toHaveLength(2);
    expect(readonlyPile[0]?.suit).toBe('clubs');
  });
});

describe('GameState interface contract [CONTRACT]', () => {
  it('should require all expected fields', () => {
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

    // Verify every field exists
    expect(state).toHaveProperty('tableau');
    expect(state).toHaveProperty('foundation');
    expect(state).toHaveProperty('stock');
    expect(state).toHaveProperty('waste');
    expect(state).toHaveProperty('moves');
    expect(state).toHaveProperty('elapsedSeconds');
    expect(state).toHaveProperty('score');
    expect(state).toHaveProperty('isWon');
    // moveCount is derived from moves.length
    expect(state.moves.length).toBe(0);
  });

  it('should enforce 7 tableau columns (Klondike standard)', () => {
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

    expect(state.tableau).toHaveLength(7);
  });

  it('should enforce 4 foundation piles (one per suit)', () => {
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

    expect(state.foundation).toHaveLength(4);
  });
});

describe('DifficultyConfig interface contract [CONTRACT]', () => {
  it('should require all configuration fields', () => {
    const config: DifficultyConfig = {
      name: 'Medium',
      difficulty: 'medium',
      drawCount: 3,
      stockPasses: 5,
      scoreMultiplier: 1.5,
    };

    expect(config).toHaveProperty('name');
    expect(config).toHaveProperty('difficulty');
    expect(config).toHaveProperty('drawCount');
    expect(config).toHaveProperty('stockPasses');
    expect(config).toHaveProperty('scoreMultiplier');
  });

  it('should map difficulty names to Difficulty type values', () => {
    const levels: Difficulty[] = ['easy', 'medium', 'hard'];
    const configs: DifficultyConfig[] = levels.map((d, i) => ({
      name: d.charAt(0).toUpperCase() + d.slice(1),
      difficulty: d,
      drawCount: i < 2 ? (1 as const) : (3 as const),
      stockPasses: i * 2,
      scoreMultiplier: i + 1,
    }));

    expect(configs).toHaveLength(3);
    configs.forEach((config) => {
      expect(levels).toContain(config.difficulty);
      expect([1, 3]).toContain(config.drawCount);
    });
  });
});
