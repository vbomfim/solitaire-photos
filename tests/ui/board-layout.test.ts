/**
 * Unit tests for BoardLayout — positions all card piles on screen.
 *
 * [TDD] — Tests written FIRST for all BoardLayout public methods.
 * Uses jsdom environment for DOM APIs.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BoardLayout } from '../../src/ui/board-layout';
import { CardRenderer } from '../../src/ui/card-renderer';
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

function createContainer(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'board';
  document.body.appendChild(container);
  return container;
}

/* ══════════════════════════════════════════════════════════════════ */
/* 1. render                                                         */
/* ══════════════════════════════════════════════════════════════════ */

describe('BoardLayout — render', () => {
  let layout: BoardLayout;
  let container: HTMLElement;
  let engine: GameEngine;

  beforeEach(() => {
    document.body.innerHTML = '';
    layout = new BoardLayout(new CardRenderer());
    container = createContainer();
    engine = new GameEngine();
  });

  it('should render the board into the container', () => {
    const state = engine.newGame(EASY, 42);
    layout.render(state, container);
    expect(container.children.length).toBeGreaterThan(0);
  });

  it('should create a top-row zone with stock, waste, and 4 foundation piles', () => {
    const state = engine.newGame(EASY, 42);
    layout.render(state, container);

    const topRow = container.querySelector('.board__top-row');
    expect(topRow).not.toBeNull();

    const stockPile = topRow!.querySelector('[data-zone="stock"]');
    expect(stockPile).not.toBeNull();

    const wastePile = topRow!.querySelector('[data-zone="waste"]');
    expect(wastePile).not.toBeNull();

    const foundationPiles = topRow!.querySelectorAll('[data-zone="foundation"]');
    expect(foundationPiles).toHaveLength(4);
  });

  it('should create 7 tableau columns', () => {
    const state = engine.newGame(EASY, 42);
    layout.render(state, container);

    const tableauArea = container.querySelector('.board__tableau');
    expect(tableauArea).not.toBeNull();

    const columns = tableauArea!.querySelectorAll('[data-zone="tableau"]');
    expect(columns).toHaveLength(7);
  });

  it('should render correct number of cards in each tableau column', () => {
    const state = engine.newGame(EASY, 42);
    layout.render(state, container);

    for (let i = 0; i < 7; i++) {
      const col = container.querySelector(`[data-zone="tableau"][data-pile-index="${i}"]`);
      expect(col).not.toBeNull();
      const cards = col!.querySelectorAll('.card');
      expect(cards).toHaveLength(i + 1);
    }
  });

  it('should render stock cards', () => {
    const state = engine.newGame(EASY, 42);
    layout.render(state, container);

    const stockPile = container.querySelector('[data-zone="stock"]');
    expect(stockPile).not.toBeNull();
    // Stock should show at least one card (the top)
    const cards = stockPile!.querySelectorAll('.card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('should render empty waste initially', () => {
    const state = engine.newGame(EASY, 42);
    layout.render(state, container);

    const wastePile = container.querySelector('[data-zone="waste"]');
    expect(wastePile).not.toBeNull();
    const cards = wastePile!.querySelectorAll('.card');
    expect(cards).toHaveLength(0);
  });

  it('should render empty foundation piles initially', () => {
    const state = engine.newGame(EASY, 42);
    layout.render(state, container);

    const foundationPiles = container.querySelectorAll('[data-zone="foundation"]');
    for (const pile of foundationPiles) {
      const cards = pile.querySelectorAll('.card');
      expect(cards).toHaveLength(0);
    }
  });

  /* ── Empty pile indicators ──────────────────────────────────────── */

  it('should show empty indicator on empty tableau columns', () => {
    const state = customState();
    layout.render(state, container);

    const cols = container.querySelectorAll('[data-zone="tableau"]');
    for (const col of cols) {
      const emptyIndicator = col.querySelector('.pile--empty');
      expect(emptyIndicator).not.toBeNull();
    }
  });

  it('should show empty indicator on empty foundation piles', () => {
    const state = customState();
    layout.render(state, container);

    const piles = container.querySelectorAll('[data-zone="foundation"]');
    for (const pile of piles) {
      const emptyIndicator = pile.querySelector('.pile--empty');
      expect(emptyIndicator).not.toBeNull();
    }
  });

  it('should show empty indicator on empty stock pile', () => {
    const state = customState();
    layout.render(state, container);

    const stockPile = container.querySelector('[data-zone="stock"]');
    expect(stockPile).not.toBeNull();
    const emptyIndicator = stockPile!.querySelector('.pile--empty');
    expect(emptyIndicator).not.toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 2. update                                                         */
/* ══════════════════════════════════════════════════════════════════ */

describe('BoardLayout — update', () => {
  let layout: BoardLayout;
  let container: HTMLElement;
  let engine: GameEngine;

  beforeEach(() => {
    document.body.innerHTML = '';
    layout = new BoardLayout(new CardRenderer());
    container = createContainer();
    engine = new GameEngine();
  });

  it('should update the board after a draw action', () => {
    const state = engine.newGame(EASY, 42);
    layout.render(state, container);

    // Perform draw
    const result = engine.draw(state);
    layout.update(result);

    const wastePile = container.querySelector('[data-zone="waste"]');
    expect(wastePile).not.toBeNull();
    const cards = wastePile!.querySelectorAll('.card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('should update waste to show drawn cards', () => {
    const state = engine.newGame(EASY, 42);
    layout.render(state, container);

    const newState = engine.draw(state);
    layout.update(newState);

    const wastePile = container.querySelector('[data-zone="waste"]');
    const wasteCards = wastePile!.querySelectorAll('.card');
    expect(wasteCards.length).toBe(newState.waste.length);
  });

  it('should not replace the container element on update', () => {
    const state = engine.newGame(EASY, 42);
    layout.render(state, container);

    const boardEl = container.querySelector('.board');
    const newState = engine.draw(state);
    layout.update(newState);

    // Same board element should still be there
    const boardElAfter = container.querySelector('.board');
    expect(boardElAfter).toBe(boardEl);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 3. getCardElement / getPileElement                                */
/* ══════════════════════════════════════════════════════════════════ */

describe('BoardLayout — element lookups', () => {
  let layout: BoardLayout;
  let container: HTMLElement;
  let engine: GameEngine;

  beforeEach(() => {
    document.body.innerHTML = '';
    layout = new BoardLayout(new CardRenderer());
    container = createContainer();
    engine = new GameEngine();
  });

  it('getCardElement should return card element for valid tableau location', () => {
    const state = engine.newGame(EASY, 42);
    layout.render(state, container);

    const el = layout.getCardElement({ zone: 'tableau', pileIndex: 0, cardIndex: 0 });
    expect(el).not.toBeNull();
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el!.classList.contains('card')).toBe(true);
  });

  it('getCardElement should return null for out-of-range location', () => {
    const state = engine.newGame(EASY, 42);
    layout.render(state, container);

    const el = layout.getCardElement({ zone: 'tableau', pileIndex: 0, cardIndex: 99 });
    expect(el).toBeNull();
  });

  it('getPileElement should return pile element for valid zone/index', () => {
    const state = engine.newGame(EASY, 42);
    layout.render(state, container);

    const el = layout.getPileElement('tableau', 3);
    expect(el).not.toBeNull();
    expect(el!.getAttribute('data-zone')).toBe('tableau');
    expect(el!.getAttribute('data-pile-index')).toBe('3');
  });

  it('getPileElement should return stock pile', () => {
    const state = engine.newGame(EASY, 42);
    layout.render(state, container);

    const el = layout.getPileElement('stock', 0);
    expect(el).not.toBeNull();
    expect(el!.getAttribute('data-zone')).toBe('stock');
  });

  it('getPileElement should return null for invalid zone', () => {
    const state = engine.newGame(EASY, 42);
    layout.render(state, container);

    const el = layout.getPileElement('invalid', 0);
    expect(el).toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 4. onStockClick                                                   */
/* ══════════════════════════════════════════════════════════════════ */

describe('BoardLayout — onStockClick', () => {
  let layout: BoardLayout;
  let container: HTMLElement;
  let engine: GameEngine;

  beforeEach(() => {
    document.body.innerHTML = '';
    layout = new BoardLayout(new CardRenderer());
    container = createContainer();
    engine = new GameEngine();
  });

  it('should call callback when stock pile is clicked', () => {
    const state = engine.newGame(EASY, 42);
    layout.render(state, container);

    const callback = vi.fn();
    layout.onStockClick(callback);

    const stockPile = container.querySelector('[data-zone="stock"]') as HTMLElement;
    stockPile.click();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not throw if onStockClick called before render', () => {
    const callback = vi.fn();
    expect(() => layout.onStockClick(callback)).not.toThrow();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 5. Board structure with game state                                */
/* ══════════════════════════════════════════════════════════════════ */

describe('BoardLayout — game state rendering', () => {
  let layout: BoardLayout;
  let container: HTMLElement;
  let engine: GameEngine;

  beforeEach(() => {
    document.body.innerHTML = '';
    layout = new BoardLayout(new CardRenderer());
    container = createContainer();
    engine = new GameEngine();
  });

  it('should render waste cards for draw-3 mode', () => {
    let state = engine.newGame(MEDIUM, 42); // draw-3
    layout.render(state, container);

    // Draw to get waste cards
    state = engine.draw(state);
    layout.update(state);

    const wastePile = container.querySelector('[data-zone="waste"]');
    const wasteCards = wastePile!.querySelectorAll('.card');
    expect(wasteCards.length).toBe(3); // draw-3 puts 3 cards on waste
  });

  it('should show face-up top cards in tableau', () => {
    const state = engine.newGame(EASY, 42);
    layout.render(state, container);

    for (let i = 0; i < 7; i++) {
      const col = container.querySelector(`[data-zone="tableau"][data-pile-index="${i}"]`);
      const cards = col!.querySelectorAll('.card');
      const lastCard = cards[cards.length - 1] as HTMLElement;
      expect(lastCard.classList.contains('card--face-up')).toBe(true);
    }
  });

  it('should show face-down non-top cards in tableau', () => {
    const state = engine.newGame(EASY, 42);
    layout.render(state, container);

    // Column 6 (index) has 7 cards, first 6 face-down
    const col = container.querySelector('[data-zone="tableau"][data-pile-index="6"]');
    const cards = col!.querySelectorAll('.card');
    for (let i = 0; i < cards.length - 1; i++) {
      expect((cards[i] as HTMLElement).classList.contains('card--face-down')).toBe(true);
    }
  });

  it('should render foundation cards when present', () => {
    const state = customState({
      foundation: [[card('hearts', 1)], [], [], []],
    });
    layout.render(state, container);

    const foundationPiles = container.querySelectorAll('[data-zone="foundation"]');
    const firstPile = foundationPiles[0]!;
    const cards = firstPile.querySelectorAll('.card');
    expect(cards).toHaveLength(1);
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 6. Data attributes                                                */
/* ══════════════════════════════════════════════════════════════════ */

describe('BoardLayout — data attributes', () => {
  let layout: BoardLayout;
  let container: HTMLElement;
  let engine: GameEngine;

  beforeEach(() => {
    document.body.innerHTML = '';
    layout = new BoardLayout(new CardRenderer());
    container = createContainer();
    engine = new GameEngine();
  });

  it('should set data-pile-index on each tableau column', () => {
    const state = engine.newGame(EASY, 42);
    layout.render(state, container);

    const columns = container.querySelectorAll('[data-zone="tableau"]');
    columns.forEach((col, i) => {
      expect(col.getAttribute('data-pile-index')).toBe(String(i));
    });
  });

  it('should set data-pile-index on each foundation pile', () => {
    const state = engine.newGame(EASY, 42);
    layout.render(state, container);

    const piles = container.querySelectorAll('[data-zone="foundation"]');
    piles.forEach((pile, i) => {
      expect(pile.getAttribute('data-pile-index')).toBe(String(i));
    });
  });

  it('should set data-card-index on each card in a tableau column', () => {
    const state = engine.newGame(EASY, 42);
    layout.render(state, container);

    const col = container.querySelector('[data-zone="tableau"][data-pile-index="3"]');
    const cards = col!.querySelectorAll('.card');
    cards.forEach((cardEl, i) => {
      expect((cardEl as HTMLElement).dataset['cardIndex']).toBe(String(i));
    });
  });
});
