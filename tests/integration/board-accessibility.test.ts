/**
 * Integration tests — ARIA accessibility and semantic structure.
 *
 * [QA Guardian] — verifies accessibility contract across the full board.
 * Tests ARIA attributes, role assignments, aria-hidden on decorative elements,
 * semantic button structure, and dynamic updates after state changes.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UIShell } from '../../src/ui/ui-shell';
import { CardRenderer } from '../../src/ui/card-renderer';
import type { Card, Rank, Suit } from '../../src/types';

/* ── Helpers ────────────────────────────────────────────────────── */

function card(suit: Suit, rank: Rank, faceUp = true): Card {
  return { suit, rank, faceUp };
}

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
/* 1. Card ARIA attributes                           [CONTRACT]     */
/* ══════════════════════════════════════════════════════════════════ */

describe('Accessibility — Card ARIA attributes', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('[CONTRACT] face-up cards should have role="img"', () => {
    const renderer = new CardRenderer();
    const el = renderer.createCard(card('hearts', 1, true));
    expect(el.getAttribute('role')).toBe('img');
  });

  it('[CONTRACT] face-up cards should have descriptive aria-label', () => {
    const renderer = new CardRenderer();

    // Test Ace of Hearts
    const ace = renderer.createCard(card('hearts', 1, true));
    expect(ace.getAttribute('aria-label')).toBe('Ace of Hearts');

    // Test King of Spades
    const king = renderer.createCard(card('spades', 13, true));
    expect(king.getAttribute('aria-label')).toBe('King of Spades');

    // Test 10 of Diamonds
    const ten = renderer.createCard(card('diamonds', 10, true));
    expect(ten.getAttribute('aria-label')).toBe('10 of Diamonds');

    // Test Jack of Clubs
    const jack = renderer.createCard(card('clubs', 11, true));
    expect(jack.getAttribute('aria-label')).toBe('Jack of Clubs');

    // Test Queen of Hearts
    const queen = renderer.createCard(card('hearts', 12, true));
    expect(queen.getAttribute('aria-label')).toBe('Queen of Hearts');
  });

  it('[CONTRACT] face-down cards should have aria-hidden="true"', () => {
    const renderer = new CardRenderer();
    const el = renderer.createCard(card('hearts', 1, false));
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('[CONTRACT] face-down cards should NOT have role or aria-label', () => {
    const renderer = new CardRenderer();
    const el = renderer.createCard(card('hearts', 1, false));
    expect(el.getAttribute('role')).toBeNull();
    expect(el.getAttribute('aria-label')).toBeNull();
  });

  it('[CONTRACT] inline SVG should have aria-hidden="true"', () => {
    const renderer = new CardRenderer();
    const el = renderer.createCard(card('hearts', 1, true));
    const svg = el.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('aria-hidden')).toBe('true');
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 2. ARIA updates on flip                           [CONTRACT]     */
/* ══════════════════════════════════════════════════════════════════ */

describe('Accessibility — Dynamic ARIA updates on flip', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('[CONTRACT] flipping face-down → face-up should add role and aria-label', () => {
    const renderer = new CardRenderer();
    const el = renderer.createCard(card('clubs', 5, false));

    // Initially face-down
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.getAttribute('role')).toBeNull();

    // Flip to face-up
    renderer.flipCard(el, true);

    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('5 of Clubs');
    expect(el.getAttribute('aria-hidden')).toBeNull();
  });

  it('[CONTRACT] flipping face-up → face-down should set aria-hidden', () => {
    const renderer = new CardRenderer();
    const el = renderer.createCard(card('diamonds', 7, true));

    // Initially face-up
    expect(el.getAttribute('role')).toBe('img');

    // Flip to face-down
    renderer.flipCard(el, false);

    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.getAttribute('role')).toBeNull();
    expect(el.getAttribute('aria-label')).toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 3. Full board ARIA audit                          [CONTRACT]     */
/* ══════════════════════════════════════════════════════════════════ */

describe('Accessibility — Full board ARIA audit', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('[CONTRACT] all face-up cards on the board should have role="img" and aria-label', () => {
    const app = createApp();
    startGame(app);

    const faceUpCards = app.querySelectorAll('.card--face-up');
    expect(faceUpCards.length).toBeGreaterThan(0);

    for (const cardEl of faceUpCards) {
      const el = cardEl as HTMLElement;
      expect(el.getAttribute('role')).toBe('img');
      expect(el.getAttribute('aria-label')).not.toBeNull();
      expect(el.getAttribute('aria-label')!.length).toBeGreaterThan(0);
    }
  });

  it('[CONTRACT] all face-down cards on the board should have aria-hidden="true"', () => {
    const app = createApp();
    startGame(app);

    const faceDownCards = app.querySelectorAll('.card--face-down');
    expect(faceDownCards.length).toBeGreaterThan(0);

    for (const cardEl of faceDownCards) {
      const el = cardEl as HTMLElement;
      expect(el.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('[CONTRACT] ARIA labels follow "Rank of Suit" pattern', () => {
    const app = createApp();
    startGame(app);

    const faceUpCards = app.querySelectorAll('.card--face-up');
    const labelPattern = /^(Ace|[2-9]|10|Jack|Queen|King) of (Hearts|Diamonds|Clubs|Spades)$/;

    for (const cardEl of faceUpCards) {
      const label = (cardEl as HTMLElement).getAttribute('aria-label')!;
      expect(label).toMatch(labelPattern);
    }
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 4. Semantic button structure                      [CONTRACT]     */
/* ══════════════════════════════════════════════════════════════════ */

describe('Accessibility — Semantic button structure', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('[CONTRACT] menu buttons should be <button> elements', () => {
    const app = createApp();
    const shell = new UIShell(app);
    shell.init();

    const newGameBtn = app.querySelector('[data-action="new-game"]');
    expect(newGameBtn!.tagName).toBe('BUTTON');

    const photosBtn = app.querySelector('[data-action="connect-photos"]');
    expect(photosBtn!.tagName).toBe('BUTTON');
  });

  it('[CONTRACT] difficulty options should be <button> elements', () => {
    const app = createApp();
    const shell = new UIShell(app);
    shell.init();

    const options = app.querySelectorAll('.menu__difficulty-option');
    for (const opt of options) {
      expect(opt.tagName).toBe('BUTTON');
    }
  });

  it('[CONTRACT] toolbar buttons should be <button> elements', () => {
    const app = createApp();
    startGame(app);

    const undoBtn = app.querySelector('[data-action="undo"]');
    expect(undoBtn!.tagName).toBe('BUTTON');

    const hintBtn = app.querySelector('[data-action="hint"]');
    expect(hintBtn!.tagName).toBe('BUTTON');

    const newGameBtn = app.querySelector('[data-action="toolbar-new-game"]');
    expect(newGameBtn!.tagName).toBe('BUTTON');
  });

  it('[CONTRACT] disabled Google Photos button should have disabled attribute', () => {
    const app = createApp();
    const shell = new UIShell(app);
    shell.init();

    const photosBtn = app.querySelector('[data-action="connect-photos"]') as HTMLButtonElement;
    expect(photosBtn.disabled).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 5. ARIA state after board interactions            [CONTRACT]     */
/* ══════════════════════════════════════════════════════════════════ */

describe('Accessibility — ARIA state after interactions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('[CONTRACT] drawing from stock should produce face-up waste cards with ARIA', () => {
    const app = createApp();
    startGame(app);

    const stock = app.querySelector('[data-zone="stock"]') as HTMLElement;
    stock.click();

    const wasteCards = app.querySelectorAll('[data-zone="waste"] .card--face-up');
    expect(wasteCards.length).toBeGreaterThan(0);

    for (const cardEl of wasteCards) {
      const el = cardEl as HTMLElement;
      expect(el.getAttribute('role')).toBe('img');
      expect(el.getAttribute('aria-label')).not.toBeNull();
    }
  });

  it('[CONTRACT] undo should preserve ARIA attributes on restored cards', () => {
    const app = createApp();
    startGame(app);

    // Draw
    const stock = app.querySelector('[data-zone="stock"]') as HTMLElement;
    stock.click();

    // Undo
    const undoBtn = app.querySelector('[data-action="undo"]') as HTMLButtonElement;
    undoBtn.click();

    // All face-up cards should still have proper ARIA
    const faceUpCards = app.querySelectorAll('.card--face-up');
    for (const cardEl of faceUpCards) {
      const el = cardEl as HTMLElement;
      expect(el.getAttribute('role')).toBe('img');
      expect(el.getAttribute('aria-label')).not.toBeNull();
    }

    // All face-down cards should still be hidden
    const faceDownCards = app.querySelectorAll('.card--face-down');
    for (const cardEl of faceDownCards) {
      const el = cardEl as HTMLElement;
      expect(el.getAttribute('aria-hidden')).toBe('true');
    }
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 6. Data attribute contract                        [CONTRACT]     */
/* ══════════════════════════════════════════════════════════════════ */

describe('Accessibility — Data attribute contracts', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('[CONTRACT] every card should have data-suit and data-rank attributes', () => {
    const renderer = new CardRenderer();
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const validRanks = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'];

    for (const suit of suits) {
      for (let rank = 1; rank <= 13; rank++) {
        const el = renderer.createCard(card(suit, rank as Rank, true));
        expect(el.dataset['suit']).toBe(suit);
        expect(validRanks).toContain(el.dataset['rank']);
      }
    }
  });

  it('[CONTRACT] red suits should have card--red class', () => {
    const renderer = new CardRenderer();
    const heartsEl = renderer.createCard(card('hearts', 1, true));
    expect(heartsEl.classList.contains('card--red')).toBe(true);

    const diamondsEl = renderer.createCard(card('diamonds', 5, true));
    expect(diamondsEl.classList.contains('card--red')).toBe(true);
  });

  it('[CONTRACT] black suits should have card--black class', () => {
    const renderer = new CardRenderer();
    const clubsEl = renderer.createCard(card('clubs', 1, true));
    expect(clubsEl.classList.contains('card--black')).toBe(true);

    const spadesEl = renderer.createCard(card('spades', 13, true));
    expect(spadesEl.classList.contains('card--black')).toBe(true);
  });
});
