/**
 * Edge case & boundary tests for GameEngine.
 *
 * Targets the specific coverage gaps (engine.ts lines 154-156, 190,
 * 329-343, 509-516, 561-563, 698-700) plus Klondike rule edge cases
 * the developer's unit tests don't cover.
 *
 * [QA Guardian] — Tests BEHAVIOR through the public interface only.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../../src/game/engine';
import { EASY, MEDIUM, HARD } from '../../src/game/difficulty';
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
/* EDGE: Auto-complete with waste pile cards                        */
/* Covers engine.ts lines 329-343 (waste branch of autoComplete)    */
/* ══════════════════════════════════════════════════════════════════ */

describe('Edge — Auto-complete with waste', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  /** [COVERAGE] autoComplete should move waste top card to foundation. */
  it('should move waste cards to foundation during auto-complete', () => {
    const state = customState({
      tableau: [[card('hearts', 2)], [card('diamonds', 2)], [], [], [], [], []],
      waste: [card('clubs', 1), card('spades', 1)],
      foundation: [[card('hearts', 1)], [card('diamonds', 1)], [], []],
      stock: [],
      difficulty: EASY,
    });

    const result = engine.autoComplete(state);
    const totalInFoundation = result.foundation.reduce((s, p) => s + p.length, 0);
    // Should have moved waste aces + tableau 2s to foundation
    expect(totalInFoundation).toBeGreaterThanOrEqual(4);
  });

  /** [COVERAGE] autoComplete should handle waste-only scenario. */
  it('should auto-complete when all remaining cards are in waste', () => {
    const state = customState({
      tableau: [[], [], [], [], [], [], []],
      waste: [card('hearts', 1)],
      foundation: [[], [], [], []],
      stock: [],
      difficulty: EASY,
    });

    const result = engine.autoComplete(state);
    expect(result.foundation.some((p) => p.length > 0)).toBe(true);
    expect(result.waste.length).toBeLessThan(state.waste.length);
  });

  /** [COVERAGE] autoComplete moves both tableau AND waste aces. */
  it('should interleave tableau and waste moves during auto-complete', () => {
    // All 3 aces: 2 in tableau, 1 in waste (as top card)
    const state = customState({
      tableau: [[card('hearts', 1)], [card('diamonds', 1)], [], [], [], [], []],
      waste: [card('clubs', 1)],
      foundation: [[], [], [], []],
      stock: [],
      difficulty: EASY,
    });

    const result = engine.autoComplete(state);
    const totalInFoundation = result.foundation.reduce((s, p) => s + p.length, 0);
    expect(totalInFoundation).toBe(3); // all 3 aces to foundation
    expect(result.waste).toHaveLength(0);
  });

  /** [COVERAGE] autoComplete sets isWon when all 52 cards reach foundation. */
  it('should set isWon = true when auto-complete finishes the game', () => {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const foundation = suits.map((suit) =>
      Array.from({ length: 13 }, (_, i) => card(suit, (i + 1) as Rank)),
    );
    // Remove last card from one foundation and put in tableau
    const removedCard = foundation[0]!.pop()!;

    const state = customState({
      tableau: [[removedCard], [], [], [], [], [], []],
      foundation,
      stock: [],
      waste: [],
      difficulty: EASY,
    });

    const result = engine.autoComplete(state);
    expect(result.isWon).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* EDGE: Foundation ↔ Tableau moves (getCardsToMove from foundation)*/
/* Covers engine.ts lines 509-516, 561-563, 698-700                 */
/* ══════════════════════════════════════════════════════════════════ */

describe('Edge — Foundation-to-Tableau moves', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  /** [COVERAGE] canMove should accept foundation→tableau if valid placement. */
  it('should allow moving top foundation card to valid tableau placement', () => {
    const state = customState({
      foundation: [[card('hearts', 1), card('hearts', 2)], [], [], []],
      tableau: [[card('spades', 3)], [], [], [], [], [], []],
    });

    // Hearts-2 (red) onto spades-3 (black) = valid
    const canDo = engine.canMove(
      state,
      { zone: 'foundation', pileIndex: 0, cardIndex: 1 },
      { zone: 'tableau', pileIndex: 0, cardIndex: 1 },
    );
    expect(canDo).toBe(true);
  });

  /** [COVERAGE] Execute foundation→tableau move removes from foundation. */
  it('should execute a foundation-to-tableau move correctly', () => {
    const state = customState({
      foundation: [[card('hearts', 1), card('hearts', 2)], [], [], []],
      tableau: [[card('spades', 3)], [], [], [], [], [], []],
    });

    const result = engine.move(state, {
      type: 'move',
      from: { zone: 'foundation', pileIndex: 0, cardIndex: 1 },
      to: { zone: 'tableau', pileIndex: 0, cardIndex: 1 },
    }) as GameState;

    expect(result.foundation[0]).toHaveLength(1); // H-A remains
    expect(result.tableau[0]).toHaveLength(2); // S-3 + H-2
    expect(result.tableau[0]![1]?.rank).toBe(2);
    expect(result.tableau[0]![1]?.suit).toBe('hearts');
  });

  /** [COVERAGE] Undo a foundation→tableau move restores foundation. */
  it('should undo a foundation-to-tableau move correctly', () => {
    const state = customState({
      foundation: [[card('hearts', 1), card('hearts', 2)], [], [], []],
      tableau: [[card('spades', 3)], [], [], [], [], [], []],
    });

    const afterMove = engine.move(state, {
      type: 'move',
      from: { zone: 'foundation', pileIndex: 0, cardIndex: 1 },
      to: { zone: 'tableau', pileIndex: 0, cardIndex: 1 },
    }) as GameState;

    const undone = engine.undo(afterMove);
    expect(undone.foundation[0]).toHaveLength(2);
    expect(undone.foundation[0]![1]?.rank).toBe(2);
    expect(undone.tableau[0]).toHaveLength(1);
  });

  /** [COVERAGE] Reject foundation→tableau with invalid placement. */
  it('should reject foundation card onto same-color tableau card', () => {
    const state = customState({
      foundation: [[card('hearts', 1), card('hearts', 2)], [], [], []],
      tableau: [[card('diamonds', 3)], [], [], [], [], [], []], // same color (red)
    });

    const canDo = engine.canMove(
      state,
      { zone: 'foundation', pileIndex: 0, cardIndex: 1 },
      { zone: 'tableau', pileIndex: 0, cardIndex: 1 },
    );
    expect(canDo).toBe(false);
  });

  /** [EDGE] Foundation cards should only move as singles (no stacks). */
  it('should only allow moving the top foundation card', () => {
    const state = customState({
      foundation: [[card('hearts', 1), card('hearts', 2), card('hearts', 3)], [], [], []],
      tableau: [[], [], [], [], [], [], []],
    });

    // Try moving the ace (bottom card) — should fail
    const canDo = engine.canMove(
      state,
      { zone: 'foundation', pileIndex: 0, cardIndex: 0 },
      { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
    );
    // Ace on empty tableau = only Kings allowed, so this should be false.
    expect(canDo).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* EDGE: canMove for unsupported destination zones                  */
/* Covers engine.ts line 190 (return false for non-tableau/foundation)*/
/* ══════════════════════════════════════════════════════════════════ */

describe('Edge — canMove unsupported destinations', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  /** [COVERAGE] canMove returns false for destination = stock. */
  it('should reject moves targeting the stock zone', () => {
    const state = customState({
      tableau: [[card('hearts', 7)], [], [], [], [], [], []],
    });
    const canDo = engine.canMove(
      state,
      { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
      { zone: 'stock', pileIndex: 0, cardIndex: 0 },
    );
    expect(canDo).toBe(false);
  });

  /** [COVERAGE] canMove returns false for destination = waste. */
  it('should reject moves targeting the waste zone', () => {
    const state = customState({
      tableau: [[card('hearts', 7)], [], [], [], [], [], []],
    });
    const canDo = engine.canMove(
      state,
      { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
      { zone: 'waste', pileIndex: 0, cardIndex: 0 },
    );
    expect(canDo).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* EDGE: Stock recycle at exact pass-limit boundary                 */
/* ══════════════════════════════════════════════════════════════════ */

describe('Edge — Stock recycle boundary', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  /** [BOUNDARY] Recycle at passes = limit - 1 succeeds, then limit fails. */
  it('should allow exactly N recycles in hard mode and reject N+1', () => {
    const state = customState({
      stock: [],
      waste: [card('hearts', 1, true)],
      stockPassesUsed: 0,
      difficulty: HARD, // 3 passes
    });

    // Pass 1
    let result = engine.recycleStock(state) as GameState;
    expect(result.stockPassesUsed).toBe(1);

    // Draw back to get cards in waste for next recycle
    result = engine.draw(result);
    result = { ...result, stock: [], waste: [card('hearts', 1, true)] } as GameState;

    // Pass 2
    result = engine.recycleStock(result) as GameState;
    expect(result.stockPassesUsed).toBe(2);
    result = engine.draw(result);
    result = { ...result, stock: [], waste: [card('hearts', 1, true)] } as GameState;

    // Pass 3 (final allowed)
    result = engine.recycleStock(result) as GameState;
    expect(result.stockPassesUsed).toBe(3);
    result = engine.draw(result);
    result = { ...result, stock: [], waste: [card('hearts', 1, true)] } as GameState;

    // Pass 4 — should FAIL
    const blocked = engine.recycleStock(result);
    expect(blocked).toHaveProperty('valid', false);
    expect(blocked).toHaveProperty('reason', 'Stock pass limit reached');
  });

  /** [BOUNDARY] Undo recycle at the limit restores previous pass count. */
  it('should restore stockPassesUsed on undo after hitting limit-1', () => {
    const state = customState({
      stock: [],
      waste: [card('hearts', 1, true)],
      stockPassesUsed: 2,
      difficulty: HARD,
    });

    const recycled = engine.recycleStock(state) as GameState;
    expect(recycled.stockPassesUsed).toBe(3);

    const undone = engine.undo(recycled);
    expect(undone.stockPassesUsed).toBe(2);
    expect(undone.stock).toHaveLength(0);
    expect(undone.waste).toHaveLength(1);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* EDGE: Draw when stock has fewer cards than drawCount             */
/* ══════════════════════════════════════════════════════════════════ */

describe('Edge — Partial draw scenarios', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  /** [BOUNDARY] Draw-3 with exactly 2 cards in stock. */
  it('should draw only 2 cards when stock has 2 and drawCount is 3', () => {
    const state = customState({
      stock: [card('hearts', 5, false), card('spades', 9, false)],
      waste: [],
      difficulty: HARD, // drawCount = 3
    });

    const next = engine.draw(state);
    expect(next.stock).toHaveLength(0);
    expect(next.waste).toHaveLength(2);
    expect(next.moves[0]?.drawCount).toBe(2);
  });

  /** [BOUNDARY] Draw-3 with exactly 1 card in stock. */
  it('should draw only 1 card when stock has 1 and drawCount is 3', () => {
    const state = customState({
      stock: [card('clubs', 7, false)],
      waste: [card('diamonds', 2, true)],
      difficulty: MEDIUM, // drawCount = 3
    });

    const next = engine.draw(state);
    expect(next.stock).toHaveLength(0);
    expect(next.waste).toHaveLength(2);
    expect(next.waste[1]?.suit).toBe('clubs');
    expect(next.waste[1]?.rank).toBe(7);
  });

  /** [BOUNDARY] Undo partial draw restores correct number of cards. */
  it('should undo a partial draw correctly', () => {
    const state = customState({
      stock: [card('hearts', 5, false), card('spades', 9, false)],
      waste: [card('diamonds', 3, true)],
      difficulty: HARD,
    });

    const afterDraw = engine.draw(state);
    expect(afterDraw.waste).toHaveLength(3);

    const undone = engine.undo(afterDraw);
    expect(undone.stock).toHaveLength(2);
    expect(undone.waste).toHaveLength(1);
    expect(undone.waste[0]?.suit).toBe('diamonds');
    expect(undone.waste[0]?.rank).toBe(3);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* EDGE: Hints — only foundation moves available                    */
/* ══════════════════════════════════════════════════════════════════ */

describe('Edge — Hint prioritization', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  /** [EDGE] getHint prioritizes foundation move over tableau move. */
  it('should suggest foundation move when both tableau and foundation moves exist', () => {
    const state = customState({
      tableau: [
        [card('hearts', 1)], // can go to foundation
        [card('spades', 8)],
        [],
        [],
        [],
        [],
        [],
      ],
      foundation: [[], [], [], []],
      stock: [],
      waste: [],
    });

    const hint = engine.getHint(state);
    expect(hint).not.toBeNull();
    expect(hint!.to.zone).toBe('foundation');
  });

  /** [EDGE] getHint returns foundation move from waste. */
  it('should suggest waste-to-foundation when waste has an ace', () => {
    const state = customState({
      waste: [card('spades', 1)],
      tableau: [[], [], [], [], [], [], []],
      foundation: [[], [], [], []],
      stock: [],
    });

    const hint = engine.getHint(state);
    expect(hint).not.toBeNull();
    expect(hint!.from.zone).toBe('waste');
    expect(hint!.to.zone).toBe('foundation');
  });

  /** [EDGE] getHint when only waste-to-tableau moves exist. */
  it('should suggest waste-to-tableau when no foundation moves exist', () => {
    const state = customState({
      waste: [card('hearts', 7)],
      tableau: [[card('spades', 8)], [], [], [], [], [], []],
      foundation: [[], [], [], []],
      stock: [],
    });

    const hint = engine.getHint(state);
    expect(hint).not.toBeNull();
    expect(hint!.from.zone).toBe('waste');
    expect(hint!.to.zone).toBe('tableau');
  });

  /** [EDGE] getHint returns null when only draw is possible. */
  it('should return null for hints when no card moves exist', () => {
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
      stock: [card('clubs', 1, false)],
      waste: [],
    });

    const hint = engine.getHint(state);
    expect(hint).toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* EDGE: Loss detection with tableau cards but no moves             */
/* ══════════════════════════════════════════════════════════════════ */

describe('Edge — Loss detection edge cases', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  /** [EDGE] isLost with face-down cards still in tableau (unreachable). */
  it('should detect loss with face-down tableau cards and no moves', () => {
    const state = customState({
      tableau: [
        [card('hearts', 3, false), card('hearts', 5)],
        [card('diamonds', 7, false), card('diamonds', 9)],
        [card('hearts', 11)],
        [],
        [],
        [],
        [],
      ],
      stock: [],
      waste: [],
      stockPassesUsed: 3,
      difficulty: HARD,
    });

    expect(engine.isLost(state)).toBe(true);
  });

  /** [EDGE] isLost = false when waste card has valid move. */
  it('should not be lost when waste top card can move to tableau', () => {
    const state = customState({
      tableau: [[card('spades', 8)], [], [], [], [], [], []],
      stock: [],
      waste: [card('hearts', 7)], // red 7 onto black 8 — valid
      stockPassesUsed: 3,
      difficulty: HARD,
    });

    expect(engine.isLost(state)).toBe(false);
  });

  /** [EDGE] isLost = false when waste has ace that can go to foundation. */
  it('should not be lost when waste ace can go to empty foundation', () => {
    const state = customState({
      tableau: [[card('hearts', 3)], [card('hearts', 5)], [], [], [], [], []],
      stock: [],
      waste: [card('spades', 1)],
      foundation: [[], [], [], []],
      stockPassesUsed: 3,
      difficulty: HARD,
    });

    expect(engine.isLost(state)).toBe(false);
  });

  /** [EDGE] isLost with only Kings on tableau and empty columns. */
  it('should not be lost when King can move to an empty column', () => {
    const state = customState({
      tableau: [
        [card('hearts', 13)], // King
        [],
        [],
        [],
        [],
        [],
        [],
      ],
      stock: [],
      waste: [],
      stockPassesUsed: 3,
      difficulty: HARD,
    });

    // King can move to empty column — not lost
    expect(engine.isLost(state)).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* EDGE: canMove with out-of-bounds / invalid locations             */
/* ══════════════════════════════════════════════════════════════════ */

describe('Edge — Invalid location handling', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  /** [EDGE] canMove returns false for out-of-bounds pile index. */
  it('should return false for out-of-bounds tableau pile index', () => {
    const state = customState({
      tableau: [[card('hearts', 7)], [], [], [], [], [], []],
    });
    const canDo = engine.canMove(
      state,
      { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
      { zone: 'tableau', pileIndex: 99, cardIndex: 0 },
    );
    expect(canDo).toBe(false);
  });

  /** [EDGE] canMove returns false for out-of-bounds card index. */
  it('should return false for out-of-bounds card index in source', () => {
    const state = customState({
      tableau: [[card('hearts', 7)], [card('spades', 8)], [], [], [], [], []],
    });
    const canDo = engine.canMove(
      state,
      { zone: 'tableau', pileIndex: 0, cardIndex: 5 },
      { zone: 'tableau', pileIndex: 1, cardIndex: 1 },
    );
    expect(canDo).toBe(false);
  });

  /** [EDGE] canMove returns false for empty source pile. */
  it('should return false when moving from an empty pile', () => {
    const state = customState({
      tableau: [[], [card('spades', 8)], [], [], [], [], []],
    });
    const canDo = engine.canMove(
      state,
      { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
      { zone: 'tableau', pileIndex: 1, cardIndex: 1 },
    );
    expect(canDo).toBe(false);
  });

  /** [EDGE] canMove returns false for out-of-bounds waste index. */
  it('should return false for out-of-bounds waste card index', () => {
    const state = customState({
      waste: [card('hearts', 7)],
      tableau: [[card('spades', 8)], [], [], [], [], [], []],
    });
    const canDo = engine.canMove(
      state,
      { zone: 'waste', pileIndex: 0, cardIndex: 99 },
      { zone: 'tableau', pileIndex: 0, cardIndex: 1 },
    );
    expect(canDo).toBe(false);
  });

  /** [EDGE] canMove returns false for out-of-bounds foundation source. */
  it('should return false for out-of-bounds foundation index', () => {
    const state = customState({
      foundation: [[], [], [], []],
      tableau: [[], [], [], [], [], [], []],
    });
    const canDo = engine.canMove(
      state,
      { zone: 'foundation', pileIndex: 0, cardIndex: 5 },
      { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
    );
    expect(canDo).toBe(false);
  });

  /** [COVERAGE] canMove returns false when source is stock zone (line 516). */
  it('should return false when trying to move cards from stock zone', () => {
    const state = customState({
      stock: [card('hearts', 7, false)],
      tableau: [[], [], [], [], [], [], []],
    });
    const canDo = engine.canMove(
      state,
      { zone: 'stock', pileIndex: 0, cardIndex: 0 },
      { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
    );
    expect(canDo).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* EDGE: Win detection integration (move triggers isWon flag)       */
/* ══════════════════════════════════════════════════════════════════ */

describe('Edge — Win detection on final move', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  /** [EDGE] Moving the last card to foundation auto-sets isWon = true. */
  it('should set isWon = true when the final card reaches foundation', () => {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const foundation = suits.map((suit) =>
      Array.from({ length: 13 }, (_, i) => card(suit, (i + 1) as Rank)),
    );
    // Remove king of spades from foundation and put in tableau
    const lastCard = foundation[3]!.pop()!;

    const state = customState({
      tableau: [[lastCard], [], [], [], [], [], []],
      foundation,
      stock: [],
      waste: [],
    });

    const result = engine.move(state, {
      type: 'move',
      from: { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'foundation', pileIndex: 3, cardIndex: 12 },
    }) as GameState;

    expect(result.isWon).toBe(true);
    expect(engine.isWon(result)).toBe(true);
  });

  /** [EDGE] Undo of the winning move should clear isWon. */
  it('should set isWon = false when undoing the winning move', () => {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const foundation = suits.map((suit) =>
      Array.from({ length: 13 }, (_, i) => card(suit, (i + 1) as Rank)),
    );
    const lastCard = foundation[3]!.pop()!;

    const state = customState({
      tableau: [[lastCard], [], [], [], [], [], []],
      foundation,
    });

    const won = engine.move(state, {
      type: 'move',
      from: { zone: 'tableau', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'foundation', pileIndex: 3, cardIndex: 12 },
    }) as GameState;
    expect(won.isWon).toBe(true);

    const undone = engine.undo(won);
    expect(undone.isWon).toBe(false);
    expect(undone.tableau[0]).toHaveLength(1);
    expect(undone.foundation[3]).toHaveLength(12);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* EDGE: Undo after draw-3 preserves exact waste ordering           */
/* ══════════════════════════════════════════════════════════════════ */

describe('Edge — Draw-3 undo waste order fidelity', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  /** [EDGE] After draw-3 + undo, waste order is identical to before draw. */
  it('should preserve waste card order through draw-3 → undo cycle', () => {
    const state = customState({
      stock: [card('clubs', 10, false), card('diamonds', 4, false), card('hearts', 8, false)],
      waste: [card('spades', 1, true), card('hearts', 3, true), card('diamonds', 6, true)],
      difficulty: MEDIUM, // draw 3
    });

    const afterDraw = engine.draw(state);
    expect(afterDraw.waste).toHaveLength(6);

    const undone = engine.undo(afterDraw);
    expect(undone.waste).toHaveLength(3);
    // Verify exact order matches original
    expect(undone.waste[0]?.suit).toBe('spades');
    expect(undone.waste[0]?.rank).toBe(1);
    expect(undone.waste[1]?.suit).toBe('hearts');
    expect(undone.waste[1]?.rank).toBe(3);
    expect(undone.waste[2]?.suit).toBe('diamonds');
    expect(undone.waste[2]?.rank).toBe(6);
    // Cards restored to stock should be face-down
    expect(undone.stock.every((c) => !c.faceUp)).toBe(true);
  });

  /** [EDGE] Multiple draw-3 cycles maintain waste integrity. */
  it('should maintain waste integrity across multiple draw-3 → undo cycles', () => {
    const state = customState({
      stock: Array.from({ length: 9 }, (_, i) => card('hearts', ((i % 13) + 1) as Rank, false)),
      waste: [],
      difficulty: HARD, // draw 3
    });

    // Draw 3 three times
    let current = engine.draw(state);
    current = engine.draw(current);
    current = engine.draw(current);
    expect(current.waste).toHaveLength(9);
    expect(current.stock).toHaveLength(0);

    // Undo all 3 draws
    current = engine.undo(current);
    expect(current.waste).toHaveLength(6);
    current = engine.undo(current);
    expect(current.waste).toHaveLength(3);
    current = engine.undo(current);
    expect(current.waste).toHaveLength(0);
    expect(current.stock).toHaveLength(9);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* EDGE: Difficulty defaults and backward compatibility             */
/* ══════════════════════════════════════════════════════════════════ */

describe('Edge — Difficulty defaults', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  /** [EDGE] newGame without arguments defaults to EASY. */
  it('should default to EASY when no config is passed', () => {
    const state = engine.newGame();
    expect(state.difficulty?.drawCount).toBe(1);
    expect(state.difficulty?.stockPasses).toBe(0); // unlimited
  });

  /** [EDGE] State without difficulty field defaults to EASY behavior. */
  it('should treat missing difficulty as EASY (draw 1, unlimited)', () => {
    const state = customState({
      stock: [card('hearts', 1, false), card('spades', 2, false), card('clubs', 3, false)],
      waste: [],
      difficulty: undefined,
    });

    const afterDraw = engine.draw(state);
    expect(afterDraw.waste).toHaveLength(1); // draw 1 (EASY default)
  });

  /** [EDGE] State without stockPassesUsed defaults to 0. */
  it('should treat missing stockPassesUsed as 0', () => {
    const state = customState({
      stock: [],
      waste: [card('hearts', 1, true)],
      stockPassesUsed: undefined,
      difficulty: EASY,
    });

    const result = engine.recycleStock(state) as GameState;
    expect(result.stockPassesUsed).toBe(1);
  });
});
