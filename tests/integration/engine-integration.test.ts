/**
 * Integration tests for GameEngine — multi-step game flows.
 *
 * Tests complete user journeys through the engine's public API,
 * verifying that methods compose correctly across sequences of actions.
 *
 * [QA Guardian] — These test BEHAVIOR through the public interface,
 * not implementation details. They should survive a full rewrite.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../../src/game/engine';
import { EASY, MEDIUM } from '../../src/game/difficulty';
import type { GameState, Card, Rank, Suit } from '../../src/types';

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
/* INTEGRATION: Draw → Move → Undo chains                          */
/* ══════════════════════════════════════════════════════════════════ */

describe('Integration — Draw → Move → Undo flows', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  /** [AC-1][COVERAGE] Draw from stock, play to tableau, undo both steps. */
  it('should support draw → waste-to-tableau → undo → undo round-trip', () => {
    const state = customState({
      stock: [card('hearts', 7, false)],
      waste: [],
      tableau: [[card('spades', 8)], [], [], [], [], [], []],
      difficulty: EASY,
    });

    // Step 1: Draw
    const afterDraw = engine.draw(state);
    expect(afterDraw.waste).toHaveLength(1);
    expect(afterDraw.stock).toHaveLength(0);

    // Step 2: Move waste card to tableau
    const afterMove = engine.move(afterDraw, {
      type: 'move',
      from: { zone: 'waste', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'tableau', pileIndex: 0, cardIndex: 1 },
    }) as GameState;
    expect(afterMove.tableau[0]).toHaveLength(2);
    expect(afterMove.waste).toHaveLength(0);

    // Step 3: Undo the waste-to-tableau move
    const undoMove = engine.undo(afterMove);
    expect(undoMove.tableau[0]).toHaveLength(1);
    expect(undoMove.waste).toHaveLength(1);

    // Step 4: Undo the draw
    const undoDraw = engine.undo(undoMove);
    expect(undoDraw.stock).toHaveLength(1);
    expect(undoDraw.waste).toHaveLength(0);
    expect(undoDraw.moves).toHaveLength(0);
  });

  /** [AC-2][COVERAGE] Draw-3 then undo restores exact waste state. */
  it('should restore exact waste state when undoing draw-3', () => {
    const state = customState({
      stock: [
        card('hearts', 5, false),
        card('spades', 9, false),
        card('clubs', 2, false),
        card('diamonds', 7, false),
        card('hearts', 3, false),
      ],
      waste: [card('spades', 1, true), card('diamonds', 10, true)],
      difficulty: MEDIUM, // drawCount = 3
    });

    // Draw 3 cards
    const afterDraw = engine.draw(state);
    expect(afterDraw.stock).toHaveLength(2);
    expect(afterDraw.waste).toHaveLength(5);

    // Undo should restore exact waste
    const undone = engine.undo(afterDraw);
    expect(undone.stock).toHaveLength(5);
    expect(undone.waste).toHaveLength(2);
    // Original waste cards preserved
    expect(undone.waste[0]?.suit).toBe('spades');
    expect(undone.waste[0]?.rank).toBe(1);
    expect(undone.waste[1]?.suit).toBe('diamonds');
    expect(undone.waste[1]?.rank).toBe(10);
  });

  /** [AC-3][COVERAGE] Multiple draws followed by undo restores each step. */
  it('should correctly undo multiple sequential draws', () => {
    const state = engine.newGame(EASY, 42);
    const stockLen0 = state.stock.length;

    // Draw 3 times
    const draw1 = engine.draw(state);
    const draw2 = engine.draw(draw1);
    const draw3 = engine.draw(draw2);
    expect(draw3.waste).toHaveLength(3);
    expect(draw3.stock).toHaveLength(stockLen0 - 3);

    // Undo all 3 draws
    const undo1 = engine.undo(draw3);
    expect(undo1.waste).toHaveLength(2);
    const undo2 = engine.undo(undo1);
    expect(undo2.waste).toHaveLength(1);
    const undo3 = engine.undo(undo2);
    expect(undo3.waste).toHaveLength(0);
    expect(undo3.stock).toHaveLength(stockLen0);
  });

  /** [COVERAGE] Draw → recycle → draw → undo → undo → undo round-trip. */
  it('should support draw-all → recycle → draw → undo chain', () => {
    const state = customState({
      stock: [card('hearts', 1, false), card('spades', 2, false)],
      waste: [],
      stockPassesUsed: 0,
      difficulty: EASY,
    });

    // Draw all stock
    const draw1 = engine.draw(state);
    const draw2 = engine.draw(draw1);
    expect(draw2.stock).toHaveLength(0);
    expect(draw2.waste).toHaveLength(2);

    // Recycle
    const recycled = engine.recycleStock(draw2) as GameState;
    expect(recycled.stock).toHaveLength(2);
    expect(recycled.waste).toHaveLength(0);
    expect(recycled.stockPassesUsed).toBe(1);

    // Draw again
    const draw3 = engine.draw(recycled);
    expect(draw3.waste).toHaveLength(1);

    // Undo draw
    const undo1 = engine.undo(draw3);
    expect(undo1.waste).toHaveLength(0);
    expect(undo1.stock).toHaveLength(2);

    // Undo recycle
    const undo2 = engine.undo(undo1);
    expect(undo2.stock).toHaveLength(0);
    expect(undo2.waste).toHaveLength(2);
    expect(undo2.stockPassesUsed).toBe(0);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* INTEGRATION: Tableau → Foundation → Undo flows                   */
/* ══════════════════════════════════════════════════════════════════ */

describe('Integration — Tableau ↔ Foundation flows', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  /** [AC-1][COVERAGE] Build full foundation suit Ace → King in one sequence. */
  it('should build an entire foundation suit through sequential moves', () => {
    let state = customState({ difficulty: EASY });

    for (let r = 1; r <= 13; r++) {
      const c = card('hearts', r as Rank);
      state = customState({
        ...state,
        tableau: [[c], [], [], [], [], [], []],
        foundation: state.foundation.map((pile) => [...pile]),
      });

      const result = engine.move(state, {
        type: 'move',
        from: { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
        to: { zone: 'foundation', pileIndex: 0, cardIndex: state.foundation[0]!.length },
      }) as GameState;

      state = result;
    }

    expect(state.foundation[0]).toHaveLength(13);
    expect(state.foundation[0]![0]?.rank).toBe(1); // Ace at bottom
    expect(state.foundation[0]![12]?.rank).toBe(13); // King at top
  });

  /** [COVERAGE] Move from foundation back to tableau (undo a foundation move). */
  it('should undo a tableau-to-foundation move and restore both piles', () => {
    const state = customState({
      tableau: [[card('hearts', 2)], [], [], [], [], [], []],
      foundation: [[card('hearts', 1)], [], [], []],
    });

    const afterMove = engine.move(state, {
      type: 'move',
      from: { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'foundation', pileIndex: 0, cardIndex: 1 },
    }) as GameState;

    expect(afterMove.foundation[0]).toHaveLength(2);
    expect(afterMove.tableau[0]).toHaveLength(0);

    const undone = engine.undo(afterMove);
    expect(undone.tableau[0]).toHaveLength(1);
    expect(undone.tableau[0]![0]?.rank).toBe(2);
    expect(undone.foundation[0]).toHaveLength(1);
  });

  /** [COVERAGE] Undo dispatched through move() action dispatcher (line 154). */
  it('should dispatch undo through the move() action dispatcher', () => {
    const state = customState({
      tableau: [[card('hearts', 7)], [card('spades', 8)], [], [], [], [], []],
    });
    const afterMove = engine.move(state, {
      type: 'move',
      from: { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'tableau', pileIndex: 1, cardIndex: 1 },
    }) as GameState;

    // Undo via the move() dispatcher
    const undone = engine.move(afterMove, { type: 'undo' }) as GameState;
    expect(undone.tableau[0]).toHaveLength(1);
    expect(undone.tableau[1]).toHaveLength(1);
    expect(undone.moves).toHaveLength(0);
  });

  /** [COVERAGE] Auto-complete dispatched through move() action dispatcher. */
  it('should dispatch auto-complete through the move() action dispatcher', () => {
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

    const result = engine.move(state, { type: 'auto-complete' });
    expect('valid' in result).toBe(false);
    const next = result as GameState;
    const totalInFoundation = next.foundation.reduce((s, p) => s + p.length, 0);
    expect(totalInFoundation).toBe(4);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* INTEGRATION: Score tracking across action sequences              */
/* ══════════════════════════════════════════════════════════════════ */

describe('Integration — Score tracking', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  /** [AC-4][COVERAGE] Scores accumulate correctly across move types. */
  it('should accumulate score: waste→tableau (+5), waste→foundation (+10)', () => {
    // Waste → Tableau
    let state = customState({
      waste: [card('hearts', 7)],
      tableau: [[card('spades', 8)], [], [], [], [], [], []],
      score: 0,
    });
    const wasteToTableau = engine.move(state, {
      type: 'move',
      from: { zone: 'waste', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'tableau', pileIndex: 0, cardIndex: 1 },
    }) as GameState;
    expect(wasteToTableau.score).toBe(5);

    // Waste → Foundation
    state = customState({
      waste: [card('hearts', 1)],
      foundation: [[], [], [], []],
      score: 0,
    });
    const wasteToFoundation = engine.move(state, {
      type: 'move',
      from: { zone: 'waste', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'foundation', pileIndex: 0, cardIndex: 0 },
    }) as GameState;
    expect(wasteToFoundation.score).toBe(10);
  });

  /** [COVERAGE] Tableau → Foundation awards 10 points. */
  it('should award 10 points for tableau-to-foundation move', () => {
    const state = customState({
      tableau: [[card('hearts', 1)], [], [], [], [], [], []],
      foundation: [[], [], [], []],
      score: 0,
    });
    const result = engine.move(state, {
      type: 'move',
      from: { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'foundation', pileIndex: 0, cardIndex: 0 },
    }) as GameState;
    expect(result.score).toBe(10);
  });

  /** [COVERAGE] Flipping a face-down card awards 5 points. */
  it('should award 5 points when a face-down card is revealed', () => {
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
      score: 0,
    });
    const result = engine.move(state, {
      type: 'move',
      from: { zone: 'tableau', pileIndex: 0, cardIndex: 1 },
      to: { zone: 'tableau', pileIndex: 1, cardIndex: 1 },
    }) as GameState;
    expect(result.score).toBe(5); // flip bonus only
  });

  /** [COVERAGE] Score is correctly reversed on undo. */
  it('should reverse score on undo for waste-to-foundation', () => {
    const state = customState({
      waste: [card('hearts', 1)],
      foundation: [[], [], [], []],
      score: 50,
    });
    const afterMove = engine.move(state, {
      type: 'move',
      from: { zone: 'waste', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'foundation', pileIndex: 0, cardIndex: 0 },
    }) as GameState;
    expect(afterMove.score).toBe(60); // +10

    const undone = engine.undo(afterMove);
    expect(undone.score).toBe(50); // restored
  });

  /** [COVERAGE] Score reversal on undo includes flip penalty. */
  it('should reverse flip score on undo', () => {
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
      score: 20,
    });
    const afterMove = engine.move(state, {
      type: 'move',
      from: { zone: 'tableau', pileIndex: 0, cardIndex: 1 },
      to: { zone: 'tableau', pileIndex: 1, cardIndex: 1 },
    }) as GameState;
    expect(afterMove.score).toBe(25); // +5 for flip

    const undone = engine.undo(afterMove);
    expect(undone.score).toBe(20); // reversed
    expect(undone.tableau[0]![0]?.faceUp).toBe(false); // un-flipped
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* INTEGRATION: Full game simulation with seeded deck               */
/* ══════════════════════════════════════════════════════════════════ */

describe('Integration — Full game simulation', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  /** [AC-5] Seeded game produces consistent, playable state. */
  it('should create a playable game with valid initial moves', () => {
    const state = engine.newGame(EASY, 42);
    const moves = engine.getValidMoves(state);

    expect(Array.isArray(moves)).toBe(true);

    // Every returned move should be executable
    for (const m of moves) {
      const result = engine.move(state, {
        type: 'move',
        from: m.from,
        to: m.to,
      });
      expect('valid' in result).toBe(false); // should succeed
    }
  });

  /** [AC-6] getValidMoves is consistent with canMove. */
  it('should return only moves that canMove validates', () => {
    const state = engine.newGame(MEDIUM, 123);
    const moves = engine.getValidMoves(state);
    for (const m of moves) {
      expect(engine.canMove(state, m.from, m.to)).toBe(true);
    }
  });

  /** [AC-7] Game state immutability across multi-step flows. */
  it('should never mutate any intermediate state in a flow', () => {
    const state = engine.newGame(EASY, 42);
    const snapshot = JSON.stringify(state);

    // Perform several operations
    const s1 = engine.draw(state);
    const s2 = engine.draw(s1);
    engine.undo(s2);
    engine.getValidMoves(state);
    engine.getHint(state);
    engine.isWon(state);
    engine.isLost(state);

    // Original state must be unchanged
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});
