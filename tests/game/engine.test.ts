/**
 * Unit tests for GameEngine — Klondike solitaire game logic.
 *
 * [TDD] — Tests written first for all GameEngine methods.
 * Organized by test category from the spec.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../../src/game/engine';
import { EASY, MEDIUM, HARD } from '../../src/game/difficulty';
import type { GameState, Card, Rank, Suit, MoveCardAction } from '../../src/types';

/* ── Helpers ────────────────────────────────────────────────────── */

/** Create a card shorthand. */
function card(suit: Suit, rank: Rank, faceUp = true): Card {
  return { suit, rank, faceUp };
}

/** Build a custom game state for targeted testing. */
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
/* 1. DEALING                                                       */
/* ══════════════════════════════════════════════════════════════════ */

describe('GameEngine — Dealing', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('should create a game with 7 tableau columns', () => {
    const state = engine.newGame(EASY, 42);
    expect(state.tableau).toHaveLength(7);
  });

  it('should deal correct card counts per column (1-7)', () => {
    const state = engine.newGame(EASY, 42);
    for (let i = 0; i < 7; i++) {
      expect(state.tableau[i]).toHaveLength(i + 1);
    }
  });

  it('should have exactly 28 cards in tableau (1+2+...+7)', () => {
    const state = engine.newGame(EASY, 42);
    const total = state.tableau.reduce((sum, col) => sum + col.length, 0);
    expect(total).toBe(28);
  });

  it('should have exactly 24 cards in stock', () => {
    const state = engine.newGame(EASY, 42);
    expect(state.stock).toHaveLength(24);
  });

  it('should have the top card of each column face-up', () => {
    const state = engine.newGame(EASY, 42);
    for (let i = 0; i < 7; i++) {
      const col = state.tableau[i]!;
      const topCard = col[col.length - 1];
      expect(topCard?.faceUp).toBe(true);
    }
  });

  it('should have all non-top cards face-down', () => {
    const state = engine.newGame(EASY, 42);
    for (let i = 0; i < 7; i++) {
      const col = state.tableau[i]!;
      for (let j = 0; j < col.length - 1; j++) {
        expect(col[j]?.faceUp).toBe(false);
      }
    }
  });

  it('should have all stock cards face-down', () => {
    const state = engine.newGame(EASY, 42);
    expect(state.stock.every((c) => !c.faceUp)).toBe(true);
  });

  it('should start with empty waste', () => {
    const state = engine.newGame(EASY, 42);
    expect(state.waste).toHaveLength(0);
  });

  it('should start with empty foundation', () => {
    const state = engine.newGame(EASY, 42);
    expect(state.foundation).toHaveLength(4);
    for (const pile of state.foundation) {
      expect(pile).toHaveLength(0);
    }
  });

  it('should have 52 total unique cards across all zones', () => {
    const state = engine.newGame(EASY, 42);
    const allCards: Card[] = [
      ...state.tableau.flat(),
      ...state.foundation.flat(),
      ...state.stock,
      ...state.waste,
    ];
    expect(allCards).toHaveLength(52);
    const keys = new Set(allCards.map((c) => `${c.suit}-${c.rank}`));
    expect(keys.size).toBe(52);
  });

  it('should start with score 0', () => {
    const state = engine.newGame(EASY, 42);
    expect(state.score).toBe(0);
  });

  it('should start with 0 elapsed seconds', () => {
    const state = engine.newGame(EASY, 42);
    expect(state.elapsedSeconds).toBe(0);
  });

  it('should start with isWon = false', () => {
    const state = engine.newGame(EASY, 42);
    expect(state.isWon).toBe(false);
  });

  it('should start with empty moves array', () => {
    const state = engine.newGame(EASY, 42);
    expect(state.moves).toHaveLength(0);
  });

  it('should start with stockPassesUsed = 0', () => {
    const state = engine.newGame(EASY, 42);
    expect(state.stockPassesUsed).toBe(0);
  });

  it('should store the difficulty config', () => {
    const state = engine.newGame(HARD, 42);
    expect(state.difficulty).toEqual(HARD);
  });

  it('should produce deterministic deals with the same seed', () => {
    const state1 = engine.newGame(EASY, 99);
    const state2 = engine.newGame(EASY, 99);
    expect(state1.tableau).toEqual(state2.tableau);
    expect(state1.stock).toEqual(state2.stock);
  });

  it('should produce different deals with different seeds', () => {
    const state1 = engine.newGame(EASY, 1);
    const state2 = engine.newGame(EASY, 2);
    // At least one tableau column should differ
    const differs = state1.tableau.some(
      (col, i) =>
        col.length !== state2.tableau[i]?.length ||
        col.some(
          (c, j) =>
            c.suit !== state2.tableau[i]![j]?.suit || c.rank !== state2.tableau[i]![j]?.rank,
        ),
    );
    expect(differs).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 2. STOCK / WASTE — Draw & Recycle                                */
/* ══════════════════════════════════════════════════════════════════ */

describe('GameEngine — Stock/Waste', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  describe('draw()', () => {
    it('should draw 1 card from stock to waste in easy mode', () => {
      const state = engine.newGame(EASY, 42);
      const next = engine.draw(state);
      expect(next.stock).toHaveLength(23);
      expect(next.waste).toHaveLength(1);
    });

    it('should draw 3 cards from stock to waste in medium mode', () => {
      const state = engine.newGame(MEDIUM, 42);
      const next = engine.draw(state);
      expect(next.stock).toHaveLength(21);
      expect(next.waste).toHaveLength(3);
    });

    it('should draw 3 cards from stock to waste in hard mode', () => {
      const state = engine.newGame(HARD, 42);
      const next = engine.draw(state);
      expect(next.stock).toHaveLength(21);
      expect(next.waste).toHaveLength(3);
    });

    it('should make drawn cards face-up', () => {
      const state = engine.newGame(EASY, 42);
      const next = engine.draw(state);
      expect(next.waste.every((c) => c.faceUp)).toBe(true);
    });

    it('should draw fewer cards if stock has less than drawCount', () => {
      const state = customState({
        stock: [card('hearts', 1, false), card('spades', 2, false)],
        waste: [],
        difficulty: MEDIUM, // drawCount = 3
      });
      const next = engine.draw(state);
      expect(next.stock).toHaveLength(0);
      expect(next.waste).toHaveLength(2);
    });

    it('should add a move record for the draw', () => {
      const state = engine.newGame(EASY, 42);
      const next = engine.draw(state);
      expect(next.moves).toHaveLength(1);
      expect(next.moves[0]?.from.zone).toBe('stock');
      expect(next.moves[0]?.to.zone).toBe('waste');
    });

    it('should append drawn cards to existing waste', () => {
      const state = customState({
        stock: [card('hearts', 1, false), card('spades', 2, false), card('clubs', 3, false)],
        waste: [card('diamonds', 10, true)],
        difficulty: EASY,
      });
      const next = engine.draw(state);
      expect(next.waste).toHaveLength(2);
      expect(next.waste[0]?.suit).toBe('diamonds'); // existing waste card preserved
    });

    it('should return same state if stock is empty', () => {
      const state = customState({
        stock: [],
        waste: [card('hearts', 5, true)],
        difficulty: EASY,
      });
      const next = engine.draw(state);
      // No change — stock is empty, can't draw
      expect(next.stock).toHaveLength(0);
      expect(next.waste).toHaveLength(1);
    });

    it('should not mutate the original state (immutability)', () => {
      const state = engine.newGame(EASY, 42);
      const originalStockLen = state.stock.length;
      engine.draw(state);
      expect(state.stock).toHaveLength(originalStockLen);
    });
  });

  describe('recycleStock()', () => {
    it('should move all waste cards back to stock', () => {
      const state = customState({
        stock: [],
        waste: [card('hearts', 1, true), card('spades', 2, true), card('clubs', 3, true)],
        difficulty: EASY,
      });
      const result = engine.recycleStock(state);
      expect('valid' in result).toBe(false); // success, not InvalidMove
      const next = result as GameState;
      expect(next.stock).toHaveLength(3);
      expect(next.waste).toHaveLength(0);
    });

    it('should make recycled cards face-down', () => {
      const state = customState({
        stock: [],
        waste: [card('hearts', 1, true), card('spades', 2, true)],
        difficulty: EASY,
      });
      const next = engine.recycleStock(state) as GameState;
      expect(next.stock.every((c) => !c.faceUp)).toBe(true);
    });

    it('should reverse waste order for stock (FIFO to LIFO)', () => {
      const state = customState({
        stock: [],
        waste: [card('hearts', 1, true), card('spades', 2, true), card('clubs', 3, true)],
        difficulty: EASY,
      });
      const next = engine.recycleStock(state) as GameState;
      // Waste [H1, S2, C3] reversed to stock [C3, S2, H1]
      // So drawing will reveal H1 first (top of stock = last element)
      expect(next.stock[next.stock.length - 1]?.suit).toBe('hearts');
      expect(next.stock[next.stock.length - 1]?.rank).toBe(1);
    });

    it('should increment stockPassesUsed', () => {
      const state = customState({
        stock: [],
        waste: [card('hearts', 1, true)],
        stockPassesUsed: 0,
        difficulty: EASY,
      });
      const next = engine.recycleStock(state) as GameState;
      expect(next.stockPassesUsed).toBe(1);
    });

    it('should allow unlimited recycling in easy mode', () => {
      const state = customState({
        stock: [],
        waste: [card('hearts', 1, true)],
        stockPassesUsed: 100,
        difficulty: EASY,
      });
      const result = engine.recycleStock(state);
      expect('valid' in result).toBe(false); // success
    });

    it('should allow unlimited recycling in medium mode', () => {
      const state = customState({
        stock: [],
        waste: [card('hearts', 1, true)],
        stockPassesUsed: 100,
        difficulty: MEDIUM,
      });
      const result = engine.recycleStock(state);
      expect('valid' in result).toBe(false);
    });

    it('should enforce pass limit in hard mode', () => {
      const state = customState({
        stock: [],
        waste: [card('hearts', 1, true)],
        stockPassesUsed: 3, // Already used all 3 passes
        difficulty: HARD,
      });
      const result = engine.recycleStock(state);
      expect(result).toHaveProperty('valid', false);
      expect(result).toHaveProperty('reason');
    });

    it('should allow recycling up to the limit in hard mode', () => {
      const state = customState({
        stock: [],
        waste: [card('hearts', 1, true)],
        stockPassesUsed: 2, // One pass remaining
        difficulty: HARD,
      });
      const result = engine.recycleStock(state);
      expect('valid' in result).toBe(false); // success
      const next = result as GameState;
      expect(next.stockPassesUsed).toBe(3);
    });

    it('should return InvalidMove if waste is empty', () => {
      const state = customState({
        stock: [],
        waste: [],
        difficulty: EASY,
      });
      const result = engine.recycleStock(state);
      expect(result).toHaveProperty('valid', false);
    });

    it('should return InvalidMove if stock is not empty', () => {
      const state = customState({
        stock: [card('hearts', 1, false)],
        waste: [card('spades', 2, true)],
        difficulty: EASY,
      });
      const result = engine.recycleStock(state);
      expect(result).toHaveProperty('valid', false);
    });

    it('should record the recycle in moves history', () => {
      const state = customState({
        stock: [],
        waste: [card('hearts', 1, true)],
        difficulty: EASY,
      });
      const next = engine.recycleStock(state) as GameState;
      expect(next.moves.length).toBeGreaterThan(state.moves.length);
    });
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 3. MOVE VALIDATION                                               */
/* ══════════════════════════════════════════════════════════════════ */

describe('GameEngine — Move Validation (canMove)', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  describe('Tableau-to-tableau moves', () => {
    it('should allow descending rank + alternating color', () => {
      const state = customState({
        tableau: [
          [card('hearts', 7)], // red 7
          [card('spades', 8)], // black 8
          [],
          [],
          [],
          [],
          [],
        ],
      });
      // Moving red 7 onto black 8
      const canDo = engine.canMove(
        state,
        { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
        { zone: 'tableau', pileIndex: 1, cardIndex: 1 },
      );
      expect(canDo).toBe(true);
    });

    it('should reject same-color placement', () => {
      const state = customState({
        tableau: [
          [card('hearts', 7)], // red 7
          [card('diamonds', 8)], // red 8
          [],
          [],
          [],
          [],
          [],
        ],
      });
      const canDo = engine.canMove(
        state,
        { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
        { zone: 'tableau', pileIndex: 1, cardIndex: 1 },
      );
      expect(canDo).toBe(false);
    });

    it('should reject non-descending rank', () => {
      const state = customState({
        tableau: [
          [card('hearts', 9)], // 9
          [card('spades', 8)], // 8
          [],
          [],
          [],
          [],
          [],
        ],
      });
      // 9 onto 8 — wrong direction
      const canDo = engine.canMove(
        state,
        { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
        { zone: 'tableau', pileIndex: 1, cardIndex: 1 },
      );
      expect(canDo).toBe(false);
    });

    it('should allow King on empty column', () => {
      const state = customState({
        tableau: [[card('hearts', 13)], [], [], [], [], [], []],
      });
      const canDo = engine.canMove(
        state,
        { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
        { zone: 'tableau', pileIndex: 1, cardIndex: 0 },
      );
      expect(canDo).toBe(true);
    });

    it('should reject non-King on empty column', () => {
      const state = customState({
        tableau: [[card('hearts', 7)], [], [], [], [], [], []],
      });
      const canDo = engine.canMove(
        state,
        { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
        { zone: 'tableau', pileIndex: 1, cardIndex: 0 },
      );
      expect(canDo).toBe(false);
    });

    it('should allow moving a stack of face-up cards', () => {
      const state = customState({
        tableau: [
          [card('spades', 8), card('hearts', 7), card('clubs', 6)], // stack: 8,7,6
          [card('diamonds', 9)], // red 9
          [],
          [],
          [],
          [],
          [],
        ],
      });
      // Move black 8 + red 7 + black 6 onto red 9
      const canDo = engine.canMove(
        state,
        { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
        { zone: 'tableau', pileIndex: 1, cardIndex: 1 },
      );
      expect(canDo).toBe(true);
    });

    it('should reject moving face-down cards', () => {
      const state = customState({
        tableau: [
          [card('hearts', 7, false), card('spades', 6)],
          [card('clubs', 8)],
          [],
          [],
          [],
          [],
          [],
        ],
      });
      // Try to move face-down card
      const canDo = engine.canMove(
        state,
        { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
        { zone: 'tableau', pileIndex: 1, cardIndex: 1 },
      );
      expect(canDo).toBe(false);
    });
  });

  describe('Foundation moves', () => {
    it('should allow Ace on empty foundation', () => {
      const state = customState({
        tableau: [[card('hearts', 1)], [], [], [], [], [], []],
        foundation: [[], [], [], []],
      });
      const canDo = engine.canMove(
        state,
        { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
        { zone: 'foundation', pileIndex: 0, cardIndex: 0 },
      );
      expect(canDo).toBe(true);
    });

    it('should reject non-Ace on empty foundation', () => {
      const state = customState({
        tableau: [[card('hearts', 2)], [], [], [], [], [], []],
        foundation: [[], [], [], []],
      });
      const canDo = engine.canMove(
        state,
        { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
        { zone: 'foundation', pileIndex: 0, cardIndex: 0 },
      );
      expect(canDo).toBe(false);
    });

    it('should allow same suit ascending rank on foundation', () => {
      const state = customState({
        tableau: [[card('hearts', 2)], [], [], [], [], [], []],
        foundation: [[card('hearts', 1)], [], [], []],
      });
      const canDo = engine.canMove(
        state,
        { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
        { zone: 'foundation', pileIndex: 0, cardIndex: 1 },
      );
      expect(canDo).toBe(true);
    });

    it('should reject different suit on foundation', () => {
      const state = customState({
        tableau: [[card('spades', 2)], [], [], [], [], [], []],
        foundation: [[card('hearts', 1)], [], [], []],
      });
      const canDo = engine.canMove(
        state,
        { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
        { zone: 'foundation', pileIndex: 0, cardIndex: 1 },
      );
      expect(canDo).toBe(false);
    });

    it('should reject skipping ranks on foundation', () => {
      const state = customState({
        tableau: [[card('hearts', 3)], [], [], [], [], [], []],
        foundation: [[card('hearts', 1)], [], [], []],
      });
      const canDo = engine.canMove(
        state,
        { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
        { zone: 'foundation', pileIndex: 0, cardIndex: 1 },
      );
      expect(canDo).toBe(false);
    });

    it('should allow waste to foundation', () => {
      const state = customState({
        waste: [card('hearts', 1)],
        foundation: [[], [], [], []],
      });
      const canDo = engine.canMove(
        state,
        { zone: 'waste', pileIndex: 0, cardIndex: 0 },
        { zone: 'foundation', pileIndex: 0, cardIndex: 0 },
      );
      expect(canDo).toBe(true);
    });

    it('should only allow single card to foundation (no stacks)', () => {
      const state = customState({
        tableau: [
          [card('hearts', 1), card('hearts', 2)], // two cards
          [],
          [],
          [],
          [],
          [],
          [],
        ],
        foundation: [[], [], [], []],
      });
      // Try to move from cardIndex 0 (bottom card = Ace, with 2 on top)
      // Since it would move the whole stack, and only Ace should go to foundation
      // This should fail because you can't move a stack to foundation
      const canDo = engine.canMove(
        state,
        { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
        { zone: 'foundation', pileIndex: 0, cardIndex: 0 },
      );
      expect(canDo).toBe(false);
    });
  });

  describe('Waste-to-tableau moves', () => {
    it('should allow valid waste to tableau move', () => {
      const state = customState({
        waste: [card('hearts', 7)],
        tableau: [[card('spades', 8)], [], [], [], [], [], []],
      });
      const canDo = engine.canMove(
        state,
        { zone: 'waste', pileIndex: 0, cardIndex: 0 },
        { zone: 'tableau', pileIndex: 0, cardIndex: 1 },
      );
      expect(canDo).toBe(true);
    });

    it('should reject invalid waste to tableau move', () => {
      const state = customState({
        waste: [card('hearts', 7)],
        tableau: [[card('diamonds', 8)], [], [], [], [], [], []],
      });
      // Same color — invalid
      const canDo = engine.canMove(
        state,
        { zone: 'waste', pileIndex: 0, cardIndex: 0 },
        { zone: 'tableau', pileIndex: 0, cardIndex: 1 },
      );
      expect(canDo).toBe(false);
    });

    it('should allow only top waste card to be played', () => {
      const state = customState({
        waste: [card('hearts', 7), card('spades', 1)],
        foundation: [[], [], [], []],
      });
      // Try to move the bottom waste card (not top)
      const canDo = engine.canMove(
        state,
        { zone: 'waste', pileIndex: 0, cardIndex: 0 },
        { zone: 'foundation', pileIndex: 0, cardIndex: 0 },
      );
      // The bottom card is hearts 7, not an ace — but more importantly,
      // only the TOP waste card should be playable
      expect(canDo).toBe(false);
    });
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 4. MOVE EXECUTION                                                */
/* ══════════════════════════════════════════════════════════════════ */

describe('GameEngine — Move Execution', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('should execute a valid tableau-to-tableau move', () => {
    const state = customState({
      tableau: [[card('hearts', 7)], [card('spades', 8)], [], [], [], [], []],
    });
    const action: MoveCardAction = {
      type: 'move',
      from: { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'tableau', pileIndex: 1, cardIndex: 1 },
    };
    const result = engine.move(state, action);
    expect('valid' in result).toBe(false);
    const next = result as GameState;
    expect(next.tableau[0]).toHaveLength(0);
    expect(next.tableau[1]).toHaveLength(2);
  });

  it('should flip the newly exposed card after moving from tableau', () => {
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
    const action: MoveCardAction = {
      type: 'move',
      from: { zone: 'tableau', pileIndex: 0, cardIndex: 1 },
      to: { zone: 'tableau', pileIndex: 1, cardIndex: 1 },
    };
    const result = engine.move(state, action) as GameState;
    // The clubs-10 should now be face-up
    expect(result.tableau[0]![0]?.faceUp).toBe(true);
  });

  it('should record the move in history', () => {
    const state = customState({
      tableau: [[card('hearts', 7)], [card('spades', 8)], [], [], [], [], []],
    });
    const action: MoveCardAction = {
      type: 'move',
      from: { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'tableau', pileIndex: 1, cardIndex: 1 },
    };
    const result = engine.move(state, action) as GameState;
    expect(result.moves).toHaveLength(1);
    expect(result.moves[0]?.from.zone).toBe('tableau');
    expect(result.moves[0]?.to.zone).toBe('tableau');
  });

  it('should execute waste-to-foundation move', () => {
    const state = customState({
      waste: [card('hearts', 1)],
      foundation: [[], [], [], []],
    });
    const action: MoveCardAction = {
      type: 'move',
      from: { zone: 'waste', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'foundation', pileIndex: 0, cardIndex: 0 },
    };
    const result = engine.move(state, action) as GameState;
    expect(result.waste).toHaveLength(0);
    expect(result.foundation[0]).toHaveLength(1);
    expect(result.foundation[0]![0]?.rank).toBe(1);
  });

  it('should execute a stack move (multiple cards)', () => {
    const state = customState({
      tableau: [
        [card('spades', 8), card('hearts', 7), card('clubs', 6)],
        [card('diamonds', 9)],
        [],
        [],
        [],
        [],
        [],
      ],
    });
    const action: MoveCardAction = {
      type: 'move',
      from: { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'tableau', pileIndex: 1, cardIndex: 1 },
    };
    const result = engine.move(state, action) as GameState;
    expect(result.tableau[0]).toHaveLength(0);
    expect(result.tableau[1]).toHaveLength(4);
  });

  it('should return InvalidMove for invalid move', () => {
    const state = customState({
      tableau: [
        [card('hearts', 7)],
        [card('diamonds', 8)], // same color!
        [],
        [],
        [],
        [],
        [],
      ],
    });
    const action: MoveCardAction = {
      type: 'move',
      from: { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'tableau', pileIndex: 1, cardIndex: 1 },
    };
    const result = engine.move(state, action);
    expect(result).toHaveProperty('valid', false);
    expect(result).toHaveProperty('reason');
  });

  it('should dispatch draw action through move()', () => {
    const state = engine.newGame(EASY, 42);
    const result = engine.move(state, { type: 'draw' });
    expect('valid' in result).toBe(false);
    const next = result as GameState;
    expect(next.waste.length).toBeGreaterThan(0);
  });

  it('should dispatch recycle action through move()', () => {
    const state = customState({
      stock: [],
      waste: [card('hearts', 1, true)],
      difficulty: EASY,
    });
    const result = engine.move(state, { type: 'recycle' });
    expect('valid' in result).toBe(false);
    const next = result as GameState;
    expect(next.stock).toHaveLength(1);
  });

  it('should not mutate original state', () => {
    const state = customState({
      tableau: [[card('hearts', 7)], [card('spades', 8)], [], [], [], [], []],
    });
    const orig = JSON.stringify(state);
    engine.move(state, {
      type: 'move',
      from: { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'tableau', pileIndex: 1, cardIndex: 1 },
    });
    expect(JSON.stringify(state)).toBe(orig);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 5. WIN DETECTION                                                 */
/* ══════════════════════════════════════════════════════════════════ */

describe('GameEngine — Win Detection', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('should detect win when all foundations have 13 cards', () => {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const foundation = suits.map((suit) =>
      Array.from({ length: 13 }, (_, i) => card(suit, (i + 1) as Rank)),
    );
    const state = customState({ foundation });
    expect(engine.isWon(state)).toBe(true);
  });

  it('should not detect win with incomplete foundations', () => {
    const state = customState({
      foundation: [
        Array.from({ length: 13 }, (_, i) => card('hearts', (i + 1) as Rank)),
        Array.from({ length: 12 }, (_, i) => card('diamonds', (i + 1) as Rank)),
        [],
        [],
      ],
    });
    expect(engine.isWon(state)).toBe(false);
  });

  it('should not detect win with empty foundations', () => {
    const state = customState();
    expect(engine.isWon(state)).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 6. LOSS DETECTION                                                */
/* ══════════════════════════════════════════════════════════════════ */

describe('GameEngine — Loss Detection', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('should detect loss when no moves, stock empty, waste empty', () => {
    // Create a state with no possible moves
    const state = customState({
      tableau: [
        [card('hearts', 3)],
        [card('hearts', 5)],
        [card('hearts', 7)],
        [card('hearts', 9)],
        [card('hearts', 11)],
        [card('diamonds', 3)],
        [card('diamonds', 5)],
      ],
      stock: [],
      waste: [],
      difficulty: EASY,
    });
    expect(engine.isLost(state)).toBe(true);
  });

  it('should not detect loss if stock has cards', () => {
    const state = customState({
      tableau: [[card('hearts', 3)], [], [], [], [], [], []],
      stock: [card('spades', 5, false)],
      waste: [],
      difficulty: EASY,
    });
    expect(engine.isLost(state)).toBe(false);
  });

  it('should not detect loss if valid moves exist', () => {
    const state = customState({
      tableau: [[card('hearts', 7)], [card('spades', 8)], [], [], [], [], []],
      stock: [],
      waste: [],
      difficulty: EASY,
    });
    expect(engine.isLost(state)).toBe(false);
  });

  it('should not detect loss if waste can be recycled', () => {
    const state = customState({
      tableau: [[card('hearts', 3)], [], [], [], [], [], []],
      stock: [],
      waste: [card('spades', 5, true)],
      stockPassesUsed: 0,
      difficulty: EASY,
    });
    expect(engine.isLost(state)).toBe(false);
  });

  it('should detect loss in hard mode when pass limit reached and no moves', () => {
    // All same-color tableau (red) + waste card (red) that can't go anywhere
    const state = customState({
      tableau: [
        [card('hearts', 3)],
        [card('hearts', 5)],
        [card('hearts', 7)],
        [card('hearts', 9)],
        [card('hearts', 11)],
        [card('diamonds', 3)],
        [card('diamonds', 5)],
      ],
      stock: [],
      waste: [card('diamonds', 13, true)], // red King — can't place on any red card
      stockPassesUsed: 3,
      difficulty: HARD,
    });
    expect(engine.isLost(state)).toBe(true);
  });

  it('should not be lost if game is won', () => {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const foundation = suits.map((suit) =>
      Array.from({ length: 13 }, (_, i) => card(suit, (i + 1) as Rank)),
    );
    const state = customState({
      foundation,
      stock: [],
      waste: [],
      isWon: true,
    });
    expect(engine.isLost(state)).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 7. UNDO                                                          */
/* ══════════════════════════════════════════════════════════════════ */

describe('GameEngine — Undo', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('should revert a tableau-to-tableau move', () => {
    const initial = customState({
      tableau: [[card('hearts', 7)], [card('spades', 8)], [], [], [], [], []],
    });
    const afterMove = engine.move(initial, {
      type: 'move',
      from: { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'tableau', pileIndex: 1, cardIndex: 1 },
    }) as GameState;

    const undone = engine.undo(afterMove);
    expect(undone.tableau[0]).toHaveLength(1);
    expect(undone.tableau[1]).toHaveLength(1);
    expect(undone.moves).toHaveLength(0);
  });

  it('should revert a draw action', () => {
    const initial = engine.newGame(EASY, 42);
    const afterDraw = engine.draw(initial);
    const undone = engine.undo(afterDraw);
    expect(undone.stock).toHaveLength(initial.stock.length);
    expect(undone.waste).toHaveLength(initial.waste.length);
  });

  it('should revert card flip when undoing a tableau move', () => {
    const initial = customState({
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
    const afterMove = engine.move(initial, {
      type: 'move',
      from: { zone: 'tableau', pileIndex: 0, cardIndex: 1 },
      to: { zone: 'tableau', pileIndex: 1, cardIndex: 1 },
    }) as GameState;

    // After move, clubs-10 should be face-up
    expect(afterMove.tableau[0]![0]?.faceUp).toBe(true);

    const undone = engine.undo(afterMove);
    // After undo, clubs-10 should be face-down again
    expect(undone.tableau[0]![0]?.faceUp).toBe(false);
    expect(undone.tableau[0]).toHaveLength(2);
  });

  it('should return same state if no moves to undo', () => {
    const state = customState();
    const undone = engine.undo(state);
    expect(undone.moves).toHaveLength(0);
    expect(undone).toEqual(state);
  });

  it('should revert a recycle action', () => {
    const initial = customState({
      stock: [],
      waste: [card('hearts', 1, true), card('spades', 2, true)],
      stockPassesUsed: 0,
      difficulty: EASY,
    });
    const afterRecycle = engine.recycleStock(initial) as GameState;
    expect(afterRecycle.stock).toHaveLength(2);
    expect(afterRecycle.waste).toHaveLength(0);

    const undone = engine.undo(afterRecycle);
    expect(undone.stock).toHaveLength(0);
    expect(undone.waste).toHaveLength(2);
    expect(undone.stockPassesUsed).toBe(0);
  });

  it('should support multiple undos in sequence', () => {
    const state0 = customState({
      tableau: [
        [card('hearts', 7)],
        [card('spades', 8)],
        [card('diamonds', 9)], // red 9 — so black 8 can go on it
        [],
        [],
        [],
        [],
      ],
    });

    // Move 1: hearts-7 (red) onto spades-8 (black) — valid (descending + alternating)
    const state1 = engine.move(state0, {
      type: 'move',
      from: { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'tableau', pileIndex: 1, cardIndex: 1 },
    }) as GameState;

    // Move 2: spades-8 (black) + hearts-7 (red) stack onto diamonds-9 (red)
    const state2 = engine.move(state1, {
      type: 'move',
      from: { zone: 'tableau', pileIndex: 1, cardIndex: 0 },
      to: { zone: 'tableau', pileIndex: 2, cardIndex: 1 },
    }) as GameState;

    // Undo move 2
    const undo1 = engine.undo(state2);
    expect(undo1.tableau[1]).toHaveLength(2);
    expect(undo1.tableau[2]).toHaveLength(1);

    // Undo move 1
    const undo2 = engine.undo(undo1);
    expect(undo2.tableau[0]).toHaveLength(1);
    expect(undo2.tableau[1]).toHaveLength(1);
  });

  it('should revert a waste-to-foundation move', () => {
    const initial = customState({
      waste: [card('hearts', 1)],
      foundation: [[], [], [], []],
    });
    const afterMove = engine.move(initial, {
      type: 'move',
      from: { zone: 'waste', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'foundation', pileIndex: 0, cardIndex: 0 },
    }) as GameState;
    expect(afterMove.foundation[0]).toHaveLength(1);

    const undone = engine.undo(afterMove);
    expect(undone.waste).toHaveLength(1);
    expect(undone.foundation[0]).toHaveLength(0);
  });

  it('should revert a tableau-to-foundation move', () => {
    const initial = customState({
      tableau: [[card('hearts', 1)], [], [], [], [], [], []],
      foundation: [[], [], [], []],
    });
    const afterMove = engine.move(initial, {
      type: 'move',
      from: { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'foundation', pileIndex: 0, cardIndex: 0 },
    }) as GameState;
    expect(afterMove.foundation[0]).toHaveLength(1);

    const undone = engine.undo(afterMove);
    expect(undone.tableau[0]).toHaveLength(1);
    expect(undone.foundation[0]).toHaveLength(0);
  });

  it('should revert a waste-to-tableau move', () => {
    const initial = customState({
      waste: [card('hearts', 7)],
      tableau: [[card('spades', 8)], [], [], [], [], [], []],
    });
    const afterMove = engine.move(initial, {
      type: 'move',
      from: { zone: 'waste', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'tableau', pileIndex: 0, cardIndex: 1 },
    }) as GameState;
    expect(afterMove.tableau[0]).toHaveLength(2);

    const undone = engine.undo(afterMove);
    expect(undone.waste).toHaveLength(1);
    expect(undone.tableau[0]).toHaveLength(1);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 8. AUTO-COMPLETE                                                 */
/* ══════════════════════════════════════════════════════════════════ */

describe('GameEngine — Auto-Complete', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  describe('canAutoComplete()', () => {
    it('should return true when all cards are face-up', () => {
      const state = customState({
        tableau: [
          [card('hearts', 13), card('spades', 12)],
          [card('clubs', 11)],
          [],
          [],
          [],
          [],
          [],
        ],
        stock: [],
        waste: [],
      });
      expect(engine.canAutoComplete(state)).toBe(true);
    });

    it('should return false when face-down cards exist', () => {
      const state = customState({
        tableau: [[card('hearts', 13, false), card('spades', 12)], [], [], [], [], [], []],
        stock: [],
        waste: [],
      });
      expect(engine.canAutoComplete(state)).toBe(false);
    });

    it('should return false when stock has cards', () => {
      const state = customState({
        tableau: [[card('hearts', 13)], [], [], [], [], [], []],
        stock: [card('spades', 1, false)],
        waste: [],
      });
      expect(engine.canAutoComplete(state)).toBe(false);
    });

    it('should return false when waste has cards', () => {
      const state = customState({
        tableau: [[card('hearts', 13)], [], [], [], [], [], []],
        stock: [],
        waste: [card('spades', 1)],
      });
      expect(engine.canAutoComplete(state)).toBe(false);
    });

    it('should return true for already-won game (empty tableau)', () => {
      const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
      const foundation = suits.map((suit) =>
        Array.from({ length: 13 }, (_, i) => card(suit, (i + 1) as Rank)),
      );
      const state = customState({ foundation, stock: [], waste: [] });
      expect(engine.canAutoComplete(state)).toBe(true);
    });
  });

  describe('autoComplete()', () => {
    it('should move all cards to foundation', () => {
      // Set up a state where auto-complete is possible
      const state = customState({
        tableau: [
          [card('hearts', 1)],
          [card('diamonds', 1)],
          [card('clubs', 1)],
          [card('spades', 1)],
          [],
          [],
          [],
        ],
        foundation: [[], [], [], []],
        stock: [],
        waste: [],
        difficulty: EASY,
      });
      const result = engine.autoComplete(state);
      const foundationTotal = result.foundation.reduce((sum, pile) => sum + pile.length, 0);
      expect(foundationTotal).toBe(4);
      expect(result.tableau.every((col) => col.length === 0)).toBe(true);
    });

    it('should result in a won game when all cards are moved', () => {
      // Build a state with all 52 cards face-up in tableau
      const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
      const allCards: Card[] = [];
      for (const suit of suits) {
        for (let r = 13; r >= 1; r--) {
          allCards.push(card(suit, r as Rank));
        }
      }
      // Distribute across tableau columns
      const tableau: Card[][] = [[], [], [], [], [], [], []];
      allCards.forEach((c, i) => {
        tableau[i % 7]!.push(c);
      });

      const state = customState({
        tableau,
        foundation: [[], [], [], []],
        stock: [],
        waste: [],
        difficulty: EASY,
      });
      const result = engine.autoComplete(state);
      expect(engine.isWon(result)).toBe(true);
    });
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 9. HINTS                                                         */
/* ══════════════════════════════════════════════════════════════════ */

describe('GameEngine — Hints', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('should suggest a valid move when one exists', () => {
    const state = customState({
      tableau: [[card('hearts', 7)], [card('spades', 8)], [], [], [], [], []],
      stock: [],
      waste: [],
      difficulty: EASY,
    });
    const hint = engine.getHint(state);
    expect(hint).not.toBeNull();
    expect(hint?.from.zone).toBe('tableau');
  });

  it('should return null when no moves exist', () => {
    const state = customState({
      tableau: [
        [card('hearts', 3)],
        [card('hearts', 5)],
        [card('hearts', 7)],
        [card('hearts', 9)],
        [card('hearts', 11)],
        [card('diamonds', 3)],
        [card('diamonds', 5)],
      ],
      stock: [],
      waste: [],
      difficulty: EASY,
    });
    const hint = engine.getHint(state);
    expect(hint).toBeNull();
  });

  it('should suggest foundation move when ace is available', () => {
    const state = customState({
      tableau: [[card('hearts', 1)], [], [], [], [], [], []],
      foundation: [[], [], [], []],
      stock: [],
      waste: [],
      difficulty: EASY,
    });
    const hint = engine.getHint(state);
    expect(hint).not.toBeNull();
    expect(hint?.to.zone).toBe('foundation');
  });

  it('should return a Move with correct structure', () => {
    const state = customState({
      tableau: [[card('hearts', 7)], [card('spades', 8)], [], [], [], [], []],
      stock: [],
      waste: [],
      difficulty: EASY,
    });
    const hint = engine.getHint(state);
    expect(hint).toHaveProperty('from');
    expect(hint).toHaveProperty('to');
    expect(hint).toHaveProperty('cards');
    expect(hint!.from).toHaveProperty('zone');
    expect(hint!.to).toHaveProperty('zone');
    expect(hint!.cards.length).toBeGreaterThan(0);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 10. getValidMoves                                                */
/* ══════════════════════════════════════════════════════════════════ */

describe('GameEngine — getValidMoves', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('should return an array of valid moves', () => {
    const state = customState({
      tableau: [[card('hearts', 7)], [card('spades', 8)], [], [], [], [], []],
      stock: [],
      waste: [],
      difficulty: EASY,
    });
    const moves = engine.getValidMoves(state);
    expect(moves.length).toBeGreaterThan(0);
  });

  it('should return empty array when no moves exist', () => {
    const state = customState({
      tableau: [
        [card('hearts', 3)],
        [card('hearts', 5)],
        [card('hearts', 7)],
        [card('hearts', 9)],
        [card('hearts', 11)],
        [card('diamonds', 3)],
        [card('diamonds', 5)],
      ],
      stock: [],
      waste: [],
      difficulty: EASY,
    });
    const moves = engine.getValidMoves(state);
    expect(moves).toHaveLength(0);
  });

  it('should include foundation moves when aces are available', () => {
    const state = customState({
      tableau: [[card('hearts', 1)], [], [], [], [], [], []],
      foundation: [[], [], [], []],
      stock: [],
      waste: [],
      difficulty: EASY,
    });
    const moves = engine.getValidMoves(state);
    const foundationMoves = moves.filter((m) => m.to.zone === 'foundation');
    expect(foundationMoves.length).toBeGreaterThan(0);
  });

  it('should include waste-to-tableau moves', () => {
    const state = customState({
      waste: [card('hearts', 7)],
      tableau: [[card('spades', 8)], [], [], [], [], [], []],
      foundation: [[], [], [], []],
      stock: [],
      difficulty: EASY,
    });
    const moves = engine.getValidMoves(state);
    const wasteToTableau = moves.filter((m) => m.from.zone === 'waste' && m.to.zone === 'tableau');
    expect(wasteToTableau.length).toBeGreaterThan(0);
  });

  it('should include waste-to-foundation moves', () => {
    const state = customState({
      waste: [card('hearts', 1)],
      tableau: [[], [], [], [], [], [], []],
      foundation: [[], [], [], []],
      stock: [],
      difficulty: EASY,
    });
    const moves = engine.getValidMoves(state);
    const wasteToFoundation = moves.filter(
      (m) => m.from.zone === 'waste' && m.to.zone === 'foundation',
    );
    expect(wasteToFoundation.length).toBeGreaterThan(0);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 11. EDGE CASES                                                   */
/* ══════════════════════════════════════════════════════════════════ */

describe('GameEngine — Edge Cases', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('should handle empty tableau column correctly', () => {
    const state = customState({
      tableau: [
        [card('hearts', 13)], // King
        [], // empty
        [],
        [],
        [],
        [],
        [],
      ],
    });
    // King can move to empty column
    const canDo = engine.canMove(
      state,
      { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
      { zone: 'tableau', pileIndex: 1, cardIndex: 0 },
    );
    expect(canDo).toBe(true);
  });

  it('should handle moving single card vs stack', () => {
    const state = customState({
      tableau: [
        [card('spades', 8), card('hearts', 7)], // black 8, red 7
        [card('clubs', 8)], // black 8 — hearts-7 (red) goes on it
        [],
        [],
        [],
        [],
        [],
      ],
    });
    // Move just the top card (hearts-7, red) onto clubs-8 (black)
    const single = engine.move(state, {
      type: 'move',
      from: { zone: 'tableau', pileIndex: 0, cardIndex: 1 },
      to: { zone: 'tableau', pileIndex: 1, cardIndex: 1 },
    }) as GameState;
    expect(single.tableau[0]).toHaveLength(1);
    expect(single.tableau[1]).toHaveLength(2);
  });

  it('should handle King-to-empty-foundation correctly (reject)', () => {
    // King cannot go to empty foundation — only Ace can
    const state = customState({
      tableau: [[card('hearts', 13)], [], [], [], [], [], []],
      foundation: [[], [], [], []],
    });
    const canDo = engine.canMove(
      state,
      { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
      { zone: 'foundation', pileIndex: 0, cardIndex: 0 },
    );
    expect(canDo).toBe(false);
  });

  it('should handle Ace-to-empty-foundation correctly (accept)', () => {
    const state = customState({
      tableau: [[card('spades', 1)], [], [], [], [], [], []],
      foundation: [[], [], [], []],
    });
    const canDo = engine.canMove(
      state,
      { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
      { zone: 'foundation', pileIndex: 0, cardIndex: 0 },
    );
    expect(canDo).toBe(true);
  });

  it('should handle draw when stock has exactly 1 card (draw-3 mode)', () => {
    const state = customState({
      stock: [card('hearts', 1, false)],
      waste: [],
      difficulty: HARD, // draw 3
    });
    const next = engine.draw(state);
    expect(next.stock).toHaveLength(0);
    expect(next.waste).toHaveLength(1);
  });

  it('should handle foundation build-up from ace to king', () => {
    // Build entire hearts foundation
    let state = customState({
      foundation: [[], [], [], []],
      difficulty: EASY,
    });

    for (let r = 1; r <= 13; r++) {
      const cardToMove = card('hearts', r as Rank);
      state = customState({
        ...state,
        tableau: [[cardToMove], [], [], [], [], [], []],
        foundation: state.foundation.map((pile, i) => (i === 0 ? [...pile] : [...pile])),
      });

      const result = engine.move(state, {
        type: 'move',
        from: { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
        to: { zone: 'foundation', pileIndex: 0, cardIndex: state.foundation[0]!.length },
      }) as GameState;

      state = result;
    }

    expect(state.foundation[0]).toHaveLength(13);
  });

  it('should instantiate with no arguments (backward compat)', () => {
    const e = new GameEngine();
    expect(e).toBeInstanceOf(GameEngine);
  });
});
