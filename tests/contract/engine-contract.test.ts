/**
 * API contract tests for GameEngine.
 *
 * Validates that the engine's public interface returns correctly-shaped
 * data structures. These tests should survive a complete rewrite of the
 * engine internals — they only test the CONTRACT, not the implementation.
 *
 * [QA Guardian] [CONTRACT]
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../../src/game/engine';
import { EASY, MEDIUM, HARD } from '../../src/game/difficulty';
import type { GameState, Card, Rank, Suit, InvalidMove } from '../../src/types';

/* ── Helpers ────────────────────────────────────────────────────── */

function card(suit: Suit, rank: Rank, faceUp = true): Card {
  return { suit, rank, faceUp };
}

function customState(overrides: Partial<GameState> = {}): GameState {
  return {
    tableau: [[], [], [], [], [], [], []],
    foundation: [[], [], [], []],
    stock: [],
    waste: [],
    moves: [],
    elapsedSeconds: 0,
    score: 0,
    isWon: false,
    stockPassesUsed: 0,
    difficulty: EASY,
    ...overrides,
  };
}

/* ══════════════════════════════════════════════════════════════════ */
/* CONTRACT: GameState shape from newGame                           */
/* ══════════════════════════════════════════════════════════════════ */

describe('Contract — GameState shape', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  /** [CONTRACT] newGame returns a GameState with all required fields. */
  it('should return complete GameState with all required fields', () => {
    const state = engine.newGame(EASY, 42);

    // Required fields exist
    expect(state).toHaveProperty('tableau');
    expect(state).toHaveProperty('foundation');
    expect(state).toHaveProperty('stock');
    expect(state).toHaveProperty('waste');
    expect(state).toHaveProperty('moves');
    expect(state).toHaveProperty('elapsedSeconds');
    expect(state).toHaveProperty('score');
    expect(state).toHaveProperty('isWon');

    // Optional but expected fields
    expect(state).toHaveProperty('stockPassesUsed');
    expect(state).toHaveProperty('difficulty');

    // Type checks
    expect(Array.isArray(state.tableau)).toBe(true);
    expect(Array.isArray(state.foundation)).toBe(true);
    expect(Array.isArray(state.stock)).toBe(true);
    expect(Array.isArray(state.waste)).toBe(true);
    expect(Array.isArray(state.moves)).toBe(true);
    expect(typeof state.elapsedSeconds).toBe('number');
    expect(typeof state.score).toBe('number');
    expect(typeof state.isWon).toBe('boolean');
  });

  /** [CONTRACT] tableau has exactly 7 piles, foundation has exactly 4. */
  it('should have 7 tableau piles and 4 foundation piles', () => {
    const state = engine.newGame(MEDIUM, 99);
    expect(state.tableau).toHaveLength(7);
    expect(state.foundation).toHaveLength(4);
  });

  /** [CONTRACT] Every card in the state has suit, rank, faceUp. */
  it('should have properly-shaped cards everywhere', () => {
    const state = engine.newGame(HARD, 77);
    const allCards: Card[] = [...state.tableau.flat(), ...state.stock, ...state.waste];

    const validSuits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const validRanks: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

    for (const c of allCards) {
      expect(validSuits).toContain(c.suit);
      expect(validRanks).toContain(c.rank);
      expect(typeof c.faceUp).toBe('boolean');
    }
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* CONTRACT: InvalidMove shape                                      */
/* ══════════════════════════════════════════════════════════════════ */

describe('Contract — InvalidMove shape', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  /** [CONTRACT] Invalid moves return { valid: false, reason: string }. */
  it('should return InvalidMove with valid=false and reason string', () => {
    const state = customState({
      tableau: [
        [card('hearts', 7)],
        [card('diamonds', 8)], // same color
        [],
        [],
        [],
        [],
        [],
      ],
    });
    const result = engine.move(state, {
      type: 'move',
      from: { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'tableau', pileIndex: 1, cardIndex: 1 },
    }) as InvalidMove;

    expect(result.valid).toBe(false);
    expect(typeof result.reason).toBe('string');
    expect(result.reason.length).toBeGreaterThan(0);
  });

  /** [CONTRACT] recycleStock returns InvalidMove shape on failure. */
  it('should return InvalidMove from recycleStock with reason', () => {
    const state = customState({
      stock: [card('hearts', 1, false)],
      waste: [card('spades', 2, true)],
    });

    const result = engine.recycleStock(state) as InvalidMove;
    expect(result.valid).toBe(false);
    expect(typeof result.reason).toBe('string');
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* CONTRACT: Move record shape                                      */
/* ══════════════════════════════════════════════════════════════════ */

describe('Contract — Move record shape', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  /** [CONTRACT] Card move records have from, to, and cards. */
  it('should record moves with correct shape for card moves', () => {
    const state = customState({
      tableau: [[card('hearts', 7)], [card('spades', 8)], [], [], [], [], []],
    });
    const result = engine.move(state, {
      type: 'move',
      from: { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'tableau', pileIndex: 1, cardIndex: 1 },
    }) as GameState;

    const move = result.moves[0]!;
    expect(move.from).toHaveProperty('zone');
    expect(move.from).toHaveProperty('pileIndex');
    expect(move.from).toHaveProperty('cardIndex');
    expect(move.to).toHaveProperty('zone');
    expect(move.to).toHaveProperty('pileIndex');
    expect(move.to).toHaveProperty('cardIndex');
    expect(Array.isArray(move.cards)).toBe(true);
    expect(move.cards.length).toBeGreaterThan(0);
  });

  /** [CONTRACT] Draw records include drawCount. */
  it('should record draw moves with drawCount field', () => {
    const state = engine.newGame(MEDIUM, 42);
    const afterDraw = engine.draw(state);

    const move = afterDraw.moves[0]!;
    expect(move.from.zone).toBe('stock');
    expect(move.to.zone).toBe('waste');
    expect(move.drawCount).toBeDefined();
    expect(typeof move.drawCount).toBe('number');
    expect(move.drawCount).toBeGreaterThan(0);
  });

  /** [CONTRACT] Recycle records include previousStockPasses. */
  it('should record recycle moves with previousStockPasses', () => {
    const state = customState({
      stock: [],
      waste: [card('hearts', 1, true)],
      stockPassesUsed: 1,
      difficulty: EASY,
    });
    const result = engine.recycleStock(state) as GameState;

    const move = result.moves[0]!;
    expect(move.from.zone).toBe('waste');
    expect(move.to.zone).toBe('stock');
    expect(move.previousStockPasses).toBe(1);
  });

  /** [CONTRACT] Flip record includes flippedCard flag. */
  it('should record flippedCard boolean when a card is revealed', () => {
    const state = customState({
      tableau: [
        [card('clubs', 10, false), card('hearts', 7)],
        [card('spades', 8)],
        [],
        [],
        [],
        [],
        [],
      ],
    });

    const result = engine.move(state, {
      type: 'move',
      from: { zone: 'tableau', pileIndex: 0, cardIndex: 1 },
      to: { zone: 'tableau', pileIndex: 1, cardIndex: 1 },
    }) as GameState;

    const move = result.moves[0]!;
    expect(move.flippedCard).toBe(true);
  });

  /** [CONTRACT] Move without flip has undefined flippedCard. */
  it('should have undefined flippedCard when no card is revealed', () => {
    const state = customState({
      tableau: [[card('hearts', 7)], [card('spades', 8)], [], [], [], [], []],
    });

    const result = engine.move(state, {
      type: 'move',
      from: { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'tableau', pileIndex: 1, cardIndex: 1 },
    }) as GameState;

    const move = result.moves[0]!;
    expect(move.flippedCard).toBeUndefined();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* CONTRACT: getValidMoves + getHint return shape                   */
/* ══════════════════════════════════════════════════════════════════ */

describe('Contract — getValidMoves & getHint shape', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  /** [CONTRACT] getValidMoves returns Move[] with correct shape. */
  it('should return array of Move objects with from, to, cards', () => {
    const state = engine.newGame(EASY, 42);
    const moves = engine.getValidMoves(state);

    expect(Array.isArray(moves)).toBe(true);
    for (const m of moves) {
      expect(m).toHaveProperty('from');
      expect(m).toHaveProperty('to');
      expect(m).toHaveProperty('cards');
      expect(['tableau', 'waste', 'foundation']).toContain(m.from.zone);
      expect(['tableau', 'foundation']).toContain(m.to.zone);
    }
  });

  /** [CONTRACT] getHint returns null or a valid Move. */
  it('should return null or a Move with from/to/cards', () => {
    const state = engine.newGame(EASY, 42);
    const hint = engine.getHint(state);

    if (hint !== null) {
      expect(hint).toHaveProperty('from');
      expect(hint).toHaveProperty('to');
      expect(hint).toHaveProperty('cards');
      expect(hint.cards.length).toBeGreaterThan(0);
    }
  });

  /** [CONTRACT] Every move returned by getValidMoves is executable. */
  it('should only return executable moves from getValidMoves', () => {
    const state = engine.newGame(EASY, 42);
    const moves = engine.getValidMoves(state);

    for (const m of moves) {
      const result = engine.move(state, {
        type: 'move',
        from: m.from,
        to: m.to,
      });
      // Should not return InvalidMove
      expect('valid' in result).toBe(false);
    }
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* CONTRACT: Boolean query methods                                  */
/* ══════════════════════════════════════════════════════════════════ */

describe('Contract — Boolean query methods', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  /** [CONTRACT] isWon returns boolean. */
  it('should always return boolean from isWon', () => {
    const state = engine.newGame(EASY, 42);
    expect(typeof engine.isWon(state)).toBe('boolean');
  });

  /** [CONTRACT] isLost returns boolean. */
  it('should always return boolean from isLost', () => {
    const state = engine.newGame(EASY, 42);
    expect(typeof engine.isLost(state)).toBe('boolean');
  });

  /** [CONTRACT] canAutoComplete returns boolean. */
  it('should always return boolean from canAutoComplete', () => {
    const state = engine.newGame(EASY, 42);
    expect(typeof engine.canAutoComplete(state)).toBe('boolean');
  });

  /** [CONTRACT] canMove returns boolean. */
  it('should always return boolean from canMove', () => {
    const state = engine.newGame(EASY, 42);
    const result = engine.canMove(
      state,
      { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
      { zone: 'tableau', pileIndex: 1, cardIndex: 0 },
    );
    expect(typeof result).toBe('boolean');
  });
});
