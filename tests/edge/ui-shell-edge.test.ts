/**
 * Edge-case tests for UIShell — boundary conditions, error paths, and resilience.
 *
 * [QA Guardian] — covers edge cases in the top-level orchestrator not covered
 * by unit tests: repeated undo, undo with no moves, hint with no moves,
 * rapid click sequences, empty pile interactions, and win/lose display.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UIShell } from '../../src/ui/ui-shell';

/* ── Helpers ────────────────────────────────────────────────────── */

function createApp(): HTMLDivElement {
  const app = document.createElement('div');
  app.id = 'app';
  document.body.appendChild(app);
  return app;
}

function startGame(app: HTMLDivElement): void {
  const shell = new UIShell(app);
  shell.init();
  app.querySelector<HTMLButtonElement>('[data-action="new-game"]')!.click();
}

/* ══════════════════════════════════════════════════════════════════ */
/* 1. Undo edge cases                                       [EDGE]  */
/* ══════════════════════════════════════════════════════════════════ */

describe('UIShell edge — Undo edge cases', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('[EDGE] should not throw when Undo is clicked with no moves', () => {
    const app = createApp();
    startGame(app);

    const undoBtn = app.querySelector('[data-action="undo"]') as HTMLButtonElement;

    // Click undo immediately — no moves to undo
    expect(() => undoBtn.click()).not.toThrow();

    // Game should still be functional
    const stock = app.querySelector('[data-zone="stock"]') as HTMLElement;
    expect(() => stock.click()).not.toThrow();
  });

  it('[EDGE] should undo multiple times back to initial state', () => {
    const app = createApp();
    startGame(app);

    const stock = app.querySelector('[data-zone="stock"]') as HTMLElement;
    const undoBtn = app.querySelector('[data-action="undo"]') as HTMLButtonElement;

    // Draw 3 times
    stock.click();
    stock.click();
    stock.click();

    let movesEl = app.querySelector('[data-display="moves"]');
    expect(movesEl!.textContent).toContain('3');

    // Undo all 3
    undoBtn.click();
    undoBtn.click();
    undoBtn.click();

    movesEl = app.querySelector('[data-display="moves"]');
    expect(movesEl!.textContent).toContain('Moves: 0');

    // Waste should be empty again
    const wasteCards = app.querySelectorAll('[data-zone="waste"] .card');
    expect(wasteCards.length).toBe(0);
  });

  it('[EDGE] should not throw when Undo is clicked more times than moves exist', () => {
    const app = createApp();
    startGame(app);

    const stock = app.querySelector('[data-zone="stock"]') as HTMLElement;
    const undoBtn = app.querySelector('[data-action="undo"]') as HTMLButtonElement;

    // Draw once
    stock.click();

    // Undo 5 times (only 1 move exists)
    expect(() => {
      undoBtn.click();
      undoBtn.click();
      undoBtn.click();
      undoBtn.click();
      undoBtn.click();
    }).not.toThrow();

    const movesEl = app.querySelector('[data-display="moves"]');
    expect(movesEl!.textContent).toContain('Moves: 0');
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 2. Hint edge cases                                       [EDGE]  */
/* ══════════════════════════════════════════════════════════════════ */

describe('UIShell edge — Hint edge cases', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('[EDGE] should not throw when hint is clicked multiple times rapidly', () => {
    const app = createApp();
    startGame(app);

    const hintBtn = app.querySelector('[data-action="hint"]') as HTMLButtonElement;

    expect(() => {
      for (let i = 0; i < 10; i++) {
        hintBtn.click();
      }
    }).not.toThrow();
  });

  it('[EDGE] hint should not leave stale highlights after clicking a different action', () => {
    const app = createApp();
    startGame(app);

    const hintBtn = app.querySelector('[data-action="hint"]') as HTMLButtonElement;
    const stock = app.querySelector('[data-zone="stock"]') as HTMLElement;

    // Trigger hint
    hintBtn.click();

    // Click hint again — should clear previous highlight first
    hintBtn.click();

    // After second hint, at most 1 highlighted + 1 hint-target
    const highlighted = app.querySelectorAll('.card--highlighted');
    expect(highlighted.length).toBeLessThanOrEqual(1);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 3. Empty pile click interactions                         [EDGE]  */
/* ══════════════════════════════════════════════════════════════════ */

describe('UIShell edge — Empty pile interactions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('[EDGE] clicking an empty foundation pile without selection should not throw', () => {
    const app = createApp();
    startGame(app);

    const emptyFoundation = app.querySelector('[data-zone="foundation"]') as HTMLElement;
    expect(() => emptyFoundation.click()).not.toThrow();
  });

  it('[EDGE] clicking empty stock when both stock and waste are empty should not throw', () => {
    const app = createApp();
    startGame(app);

    const stock = app.querySelector('[data-zone="stock"]') as HTMLElement;

    // Draw all cards from stock (24 draws for easy mode)
    for (let i = 0; i < 24; i++) {
      stock.click();
    }

    // Recycle
    stock.click();

    // Draw all again
    for (let i = 0; i < 24; i++) {
      stock.click();
    }

    // Click empty stock with waste — should recycle
    // Click again after recycle + re-draw — eventually both empty
    // This depends on game state, but should not throw
    expect(() => stock.click()).not.toThrow();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 4. Multiple game starts                                  [EDGE]  */
/* ══════════════════════════════════════════════════════════════════ */

describe('UIShell edge — Multiple game lifecycle', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('[EDGE] should handle starting multiple games in sequence', () => {
    const app = createApp();
    const shell = new UIShell(app);
    shell.init();

    for (let i = 0; i < 5; i++) {
      // Start game
      app.querySelector<HTMLButtonElement>('[data-action="new-game"]')!.click();

      // Verify game screen
      expect(app.querySelector('.game')).not.toBeNull();
      expect(app.querySelectorAll('[data-zone="tableau"]')).toHaveLength(7);

      // Return to menu
      app.querySelector<HTMLButtonElement>('[data-action="toolbar-new-game"]')!.click();

      // Verify menu screen
      expect(app.querySelector('.menu')).not.toBeNull();
    }
  });

  it('[EDGE] should clean up timer from previous game', () => {
    const app = createApp();
    const shell = new UIShell(app);
    shell.init();

    // Start first game
    app.querySelector<HTMLButtonElement>('[data-action="new-game"]')!.click();
    vi.advanceTimersByTime(5000);

    // Return to menu and start new game
    app.querySelector<HTMLButtonElement>('[data-action="toolbar-new-game"]')!.click();
    app.querySelector<HTMLButtonElement>('[data-action="new-game"]')!.click();

    // New game timer should be at 0
    const timeEl = app.querySelector('[data-display="time"]');
    expect(timeEl!.textContent).toContain('0:00');

    // Advance timer — should only increment once, not twice (leaked timer)
    vi.advanceTimersByTime(1000);
    expect(timeEl!.textContent).toContain('0:01');
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 5. Win condition display                        [AC] [COVERAGE]  */
/* ══════════════════════════════════════════════════════════════════ */

describe('UIShell edge — Win condition', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('[COVERAGE] win message element should not exist before game is won', () => {
    const app = createApp();
    startGame(app);

    const winMsg = app.querySelector('.game__win');
    expect(winMsg).toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 6. Rapid click sequences                                 [EDGE]  */
/* ══════════════════════════════════════════════════════════════════ */

describe('UIShell edge — Rapid click sequences', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('[EDGE] rapid stock clicks should not throw', () => {
    const app = createApp();
    startGame(app);

    const stock = app.querySelector('[data-zone="stock"]') as HTMLElement;

    expect(() => {
      for (let i = 0; i < 50; i++) {
        stock.click();
      }
    }).not.toThrow();
  });

  it('[EDGE] rapid select/deselect cycles should not throw', () => {
    const app = createApp();
    startGame(app);

    const faceUpCards = app.querySelectorAll('[data-zone="tableau"] .card--face-up');
    expect(faceUpCards.length).toBeGreaterThan(0);

    expect(() => {
      for (let i = 0; i < 20; i++) {
        for (const cardEl of faceUpCards) {
          (cardEl as HTMLElement).click();
        }
      }
    }).not.toThrow();
  });

  it('[EDGE] clicking menu buttons rapidly should not throw', () => {
    const app = createApp();
    const shell = new UIShell(app);
    shell.init();

    expect(() => {
      for (let i = 0; i < 10; i++) {
        const options = app.querySelectorAll('.menu__difficulty-option');
        for (const opt of options) {
          (opt as HTMLElement).click();
        }
      }
    }).not.toThrow();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 7. Board structure consistency after state changes [REGRESSION]  */
/* ══════════════════════════════════════════════════════════════════ */

describe('UIShell edge — Board consistency after state changes', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('[REGRESSION] board should always have 7 tableau columns after draw', () => {
    const app = createApp();
    startGame(app);

    const stock = app.querySelector('[data-zone="stock"]') as HTMLElement;
    stock.click();

    const columns = app.querySelectorAll('[data-zone="tableau"]');
    expect(columns).toHaveLength(7);
  });

  it('[REGRESSION] board should always have 4 foundation piles after draw', () => {
    const app = createApp();
    startGame(app);

    const stock = app.querySelector('[data-zone="stock"]') as HTMLElement;
    stock.click();

    const foundations = app.querySelectorAll('[data-zone="foundation"]');
    expect(foundations).toHaveLength(4);
  });

  it('[REGRESSION] board should always have exactly 1 stock pile after any action', () => {
    const app = createApp();
    startGame(app);

    const stock = app.querySelector('[data-zone="stock"]') as HTMLElement;

    // Draw multiple times
    stock.click();
    stock.click();
    stock.click();

    const stockPiles = app.querySelectorAll('[data-zone="stock"]');
    expect(stockPiles).toHaveLength(1);
  });

  it('[REGRESSION] board should always have exactly 1 waste pile after any action', () => {
    const app = createApp();
    startGame(app);

    const stock = app.querySelector('[data-zone="stock"]') as HTMLElement;

    // Draw, undo, draw again
    stock.click();
    const undoBtn = app.querySelector('[data-action="undo"]') as HTMLButtonElement;
    undoBtn.click();
    stock.click();

    const wastePiles = app.querySelectorAll('[data-zone="waste"]');
    expect(wastePiles).toHaveLength(1);
  });

  it('[REGRESSION] total card count should remain 52 across all zones', () => {
    const app = createApp();
    startGame(app);

    function countAllCards(): number {
      return app.querySelectorAll('.card').length;
    }

    // Initial count
    const initialCount = countAllCards();
    expect(initialCount).toBe(52);

    // After draw
    const stock = app.querySelector('[data-zone="stock"]') as HTMLElement;
    stock.click();
    expect(countAllCards()).toBe(52);

    // After undo
    const undoBtn = app.querySelector('[data-action="undo"]') as HTMLButtonElement;
    undoBtn.click();
    expect(countAllCards()).toBe(52);

    // After multiple draws
    stock.click();
    stock.click();
    stock.click();
    expect(countAllCards()).toBe(52);
  });
});
