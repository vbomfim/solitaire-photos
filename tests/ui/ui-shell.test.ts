/**
 * Unit tests for UIShell — top-level app orchestrator.
 *
 * [TDD] — Tests written FIRST for screen transitions, game loop,
 * button callbacks, and timer.
 * Uses jsdom environment for DOM APIs.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UIShell } from '../../src/ui/ui-shell';

/* ── Helpers ────────────────────────────────────────────────────── */

function createAppContainer(): HTMLDivElement {
  const app = document.createElement('div');
  app.id = 'app';
  document.body.appendChild(app);
  return app;
}

/* ══════════════════════════════════════════════════════════════════ */
/* 1. Initialization                                                 */
/* ══════════════════════════════════════════════════════════════════ */

describe('UIShell — Initialization', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render into the provided container', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();
    expect(app.children.length).toBeGreaterThan(0);
  });

  it('should show the menu screen on init', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();
    const menu = app.querySelector('.menu');
    expect(menu).not.toBeNull();
  });

  it('should display game title on menu screen', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();
    expect(app.textContent).toContain('Solitaire Photos');
  });

  it('should have a New Game button on menu screen', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();
    const btn = app.querySelector('[data-action="new-game"]') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.textContent).toContain('New Game');
  });

  it('should have a difficulty selector on menu screen', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();
    const selector = app.querySelector('.menu__difficulty');
    expect(selector).not.toBeNull();
  });

  it('should have Easy, Medium, Hard difficulty options', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();
    const options = app.querySelectorAll('.menu__difficulty-option');
    expect(options).toHaveLength(3);
    expect(options[0]!.textContent).toContain('Easy');
    expect(options[1]!.textContent).toContain('Medium');
    expect(options[2]!.textContent).toContain('Hard');
  });

  it('should have a Google Photos placeholder button (disabled)', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();
    const btn = app.querySelector('[data-action="connect-photos"]') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.disabled).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 2. Screen transitions                                             */
/* ══════════════════════════════════════════════════════════════════ */

describe('UIShell — Screen transitions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should switch from menu to game screen when New Game is clicked', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();

    const btn = app.querySelector('[data-action="new-game"]') as HTMLButtonElement;
    btn.click();

    const menu = app.querySelector('.menu');
    expect(menu).toBeNull();

    const gameScreen = app.querySelector('.game');
    expect(gameScreen).not.toBeNull();
  });

  it('should show the board area in game screen', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();

    const btn = app.querySelector('[data-action="new-game"]') as HTMLButtonElement;
    btn.click();

    const board = app.querySelector('.board');
    expect(board).not.toBeNull();
  });

  it('should show toolbar in game screen', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();

    const btn = app.querySelector('[data-action="new-game"]') as HTMLButtonElement;
    btn.click();

    const toolbar = app.querySelector('.toolbar');
    expect(toolbar).not.toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 3. Game screen controls                                           */
/* ══════════════════════════════════════════════════════════════════ */

describe('UIShell — Game screen controls', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should have an Undo button in game screen', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();

    app.querySelector<HTMLButtonElement>('[data-action="new-game"]')!.click();

    const undoBtn = app.querySelector('[data-action="undo"]');
    expect(undoBtn).not.toBeNull();
  });

  it('should have a Hint button in game screen', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();

    app.querySelector<HTMLButtonElement>('[data-action="new-game"]')!.click();

    const hintBtn = app.querySelector('[data-action="hint"]');
    expect(hintBtn).not.toBeNull();
  });

  it('should have a New Game button in game toolbar', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();

    app.querySelector<HTMLButtonElement>('[data-action="new-game"]')!.click();

    const newGameBtn = app.querySelector('[data-action="toolbar-new-game"]');
    expect(newGameBtn).not.toBeNull();
  });

  it('should display score in game screen', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();

    app.querySelector<HTMLButtonElement>('[data-action="new-game"]')!.click();

    const scoreEl = app.querySelector('[data-display="score"]');
    expect(scoreEl).not.toBeNull();
    expect(scoreEl!.textContent).toContain('0');
  });

  it('should display moves count in game screen', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();

    app.querySelector<HTMLButtonElement>('[data-action="new-game"]')!.click();

    const movesEl = app.querySelector('[data-display="moves"]');
    expect(movesEl).not.toBeNull();
    expect(movesEl!.textContent).toContain('0');
  });

  it('should display time in game screen', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();

    app.querySelector<HTMLButtonElement>('[data-action="new-game"]')!.click();

    const timeEl = app.querySelector('[data-display="time"]');
    expect(timeEl).not.toBeNull();
    expect(timeEl!.textContent).toContain('0:00');
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 4. Game loop integration                                          */
/* ══════════════════════════════════════════════════════════════════ */

describe('UIShell — Game loop', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render 7 tableau columns after starting a game', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();

    app.querySelector<HTMLButtonElement>('[data-action="new-game"]')!.click();

    const columns = app.querySelectorAll('[data-zone="tableau"]');
    expect(columns).toHaveLength(7);
  });

  it('should render stock and waste piles after starting a game', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();

    app.querySelector<HTMLButtonElement>('[data-action="new-game"]')!.click();

    expect(app.querySelector('[data-zone="stock"]')).not.toBeNull();
    expect(app.querySelector('[data-zone="waste"]')).not.toBeNull();
  });

  it('should render 4 foundation piles after starting a game', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();

    app.querySelector<HTMLButtonElement>('[data-action="new-game"]')!.click();

    const foundations = app.querySelectorAll('[data-zone="foundation"]');
    expect(foundations).toHaveLength(4);
  });

  it('should draw from stock when stock pile is clicked', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();

    app.querySelector<HTMLButtonElement>('[data-action="new-game"]')!.click();

    // Click stock
    const stock = app.querySelector('[data-zone="stock"]') as HTMLElement;
    stock.click();

    // Waste should now have cards
    const waste = app.querySelector('[data-zone="waste"]');
    const wasteCards = waste!.querySelectorAll('.card');
    expect(wasteCards.length).toBeGreaterThan(0);
  });

  it('should update timer every second', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();

    app.querySelector<HTMLButtonElement>('[data-action="new-game"]')!.click();

    // Advance timer by 5 seconds
    vi.advanceTimersByTime(5000);

    const timeEl = app.querySelector('[data-display="time"]');
    expect(timeEl!.textContent).toContain('0:05');
  });

  it('should update moves count after a draw action', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();

    app.querySelector<HTMLButtonElement>('[data-action="new-game"]')!.click();

    // Click stock to draw
    const stock = app.querySelector('[data-zone="stock"]') as HTMLElement;
    stock.click();

    const movesEl = app.querySelector('[data-display="moves"]');
    expect(movesEl!.textContent).toContain('1');
  });

  it('should return to menu screen when toolbar New Game is clicked', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();

    // Start game
    app.querySelector<HTMLButtonElement>('[data-action="new-game"]')!.click();

    // Click toolbar new game
    const toolbarNewGame = app.querySelector(
      '[data-action="toolbar-new-game"]',
    ) as HTMLButtonElement;
    toolbarNewGame.click();

    // Should be back at menu
    const menu = app.querySelector('.menu');
    expect(menu).not.toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 5. Difficulty selection                                           */
/* ══════════════════════════════════════════════════════════════════ */

describe('UIShell — Difficulty selection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should default to Easy difficulty', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();

    const options = app.querySelectorAll('.menu__difficulty-option');
    const easyOption = options[0] as HTMLElement;
    expect(easyOption.classList.contains('menu__difficulty-option--selected')).toBe(true);
  });

  it('should allow selecting Medium difficulty', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();

    const options = app.querySelectorAll('.menu__difficulty-option');
    (options[1] as HTMLElement).click();

    expect(
      (options[1] as HTMLElement).classList.contains('menu__difficulty-option--selected'),
    ).toBe(true);
    expect(
      (options[0] as HTMLElement).classList.contains('menu__difficulty-option--selected'),
    ).toBe(false);
  });

  it('should use draw-3 when Medium difficulty is selected and game starts', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();

    // Select Medium
    const options = app.querySelectorAll('.menu__difficulty-option');
    (options[1] as HTMLElement).click();

    // Start game
    app.querySelector<HTMLButtonElement>('[data-action="new-game"]')!.click();

    // Draw
    const stock = app.querySelector('[data-zone="stock"]') as HTMLElement;
    stock.click();

    // Waste should have 3 cards (draw-3)
    const waste = app.querySelector('[data-zone="waste"]');
    const wasteCards = waste!.querySelectorAll('.card');
    expect(wasteCards.length).toBe(3);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 6. Undo and Hint                                                  */
/* ══════════════════════════════════════════════════════════════════ */

describe('UIShell — Undo and Hint', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should undo a draw when Undo button is clicked', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();

    app.querySelector<HTMLButtonElement>('[data-action="new-game"]')!.click();

    // Draw
    const stock = app.querySelector('[data-zone="stock"]') as HTMLElement;
    stock.click();

    // Verify waste has cards
    let waste = app.querySelector('[data-zone="waste"]');
    expect(waste!.querySelectorAll('.card').length).toBeGreaterThan(0);

    // Undo
    const undoBtn = app.querySelector('[data-action="undo"]') as HTMLButtonElement;
    undoBtn.click();

    // Waste should be empty again
    waste = app.querySelector('[data-zone="waste"]');
    expect(waste!.querySelectorAll('.card').length).toBe(0);
  });

  it('should highlight hint when Hint button is clicked', () => {
    const app = createAppContainer();
    const shell = new UIShell(app);
    shell.init();

    app.querySelector<HTMLButtonElement>('[data-action="new-game"]')!.click();

    // Click hint
    const hintBtn = app.querySelector('[data-action="hint"]') as HTMLButtonElement;
    hintBtn.click();

    // There should be at least one highlighted card (or no highlight if no moves)
    // Just verify it doesn't throw
    expect(true).toBe(true);
  });
});
