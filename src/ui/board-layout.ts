/**
 * BoardLayout — manages the overall solitaire board layout.
 *
 * Positions tableau, foundation, stock, and waste piles using
 * CSS grid. Handles responsive sizing, card cascading, and
 * empty-pile indicators. Provides element lookups for interaction.
 *
 * [SOLID] SRP — layout and rendering only, no game logic.
 * [CLEAN-CODE] Small, focused methods.
 */
import type { CardLocation, GameState, ReadonlyPile } from '../types';
import { CardRenderer } from './card-renderer';

/* ── Constants ──────────────────────────────────────────────────── */

const TABLEAU_COUNT = 7;
const FOUNDATION_COUNT = 4;

/** Suit symbols for empty foundation placeholders. */
const FOUNDATION_SUITS = ['♥', '♦', '♣', '♠'] as const;

/* ── BoardLayout class ──────────────────────────────────────────── */

export class BoardLayout {
  private readonly cardRenderer: CardRenderer;
  private container: HTMLElement | null = null;
  private boardEl: HTMLElement | null = null;
  private stockClickCallback: (() => void) | null = null;

  constructor(cardRenderer: CardRenderer) {
    this.cardRenderer = cardRenderer;
  }

  /**
   * Render the full board from scratch into the container.
   * Clears any previous content.
   */
  render(state: GameState, container: HTMLElement): void {
    this.container = container;

    // Clear container
    container.innerHTML = '';

    // Create board wrapper
    const board = document.createElement('div');
    board.classList.add('board');

    // Top row: stock + waste + gap + foundations
    const topRow = this.createTopRow(state);
    board.appendChild(topRow);

    // Tableau area: 7 columns
    const tableau = this.createTableauArea(state);
    board.appendChild(tableau);

    container.appendChild(board);
    this.boardEl = board;

    // Re-attach stock click handler if one was registered
    this.attachStockClickHandler();
  }

  /**
   * Update the existing board DOM to reflect a new game state.
   * More efficient than full re-render — reuses the board wrapper.
   */
  update(state: GameState): void {
    if (!this.boardEl || !this.container) return;

    // Update stock pile
    this.updatePile('stock', 0, state.stock);

    // Update waste pile
    this.updatePile('waste', 0, state.waste);

    // Update foundation piles
    for (let i = 0; i < FOUNDATION_COUNT; i++) {
      this.updatePile('foundation', i, state.foundation[i]!);
    }

    // Update tableau columns
    for (let i = 0; i < TABLEAU_COUNT; i++) {
      this.updatePile('tableau', i, state.tableau[i]!);
    }
  }

  /**
   * Get a card DOM element by its location in the game state.
   * Returns null if location is out of range.
   */
  getCardElement(location: CardLocation): HTMLElement | null {
    const pile = this.getPileElement(location.zone, location.pileIndex);
    if (!pile) return null;

    const cards = pile.querySelectorAll('.card');
    if (location.cardIndex >= cards.length) return null;

    return (cards[location.cardIndex] as HTMLElement) ?? null;
  }

  /**
   * Get a pile DOM element by zone name and pile index.
   * Returns null if not found.
   */
  getPileElement(zone: string, index: number): HTMLElement | null {
    if (!this.container) return null;

    return this.container.querySelector(
      `[data-zone="${zone}"][data-pile-index="${String(index)}"]`,
    );
  }

  /**
   * Register a callback for stock pile clicks.
   * Can be called before or after render — callback is attached/re-attached.
   */
  onStockClick(callback: () => void): void {
    this.stockClickCallback = callback;
    this.attachStockClickHandler();
  }

  /* ── Private: Top Row ─────────────────────────────────────────── */

  /** Create the top row containing stock, waste, and foundations. */
  private createTopRow(state: GameState): HTMLElement {
    const row = document.createElement('div');
    row.classList.add('board__top-row');

    // Stock pile
    const stockEl = this.createPileElement('stock', 0, state.stock);
    this.addEmptyIndicator(stockEl, state.stock, '♻');
    row.appendChild(stockEl);

    // Waste pile
    const wasteEl = this.createPileElement('waste', 0, state.waste);
    row.appendChild(wasteEl);

    // Gap spacer
    const gap = document.createElement('div');
    gap.classList.add('board__gap');
    row.appendChild(gap);

    // Foundation piles
    for (let i = 0; i < FOUNDATION_COUNT; i++) {
      const pile = state.foundation[i]!;
      const el = this.createPileElement('foundation', i, pile);
      this.addEmptyIndicator(el, pile, FOUNDATION_SUITS[i]!);
      row.appendChild(el);
    }

    return row;
  }

  /* ── Private: Tableau ─────────────────────────────────────────── */

  /** Create the tableau area with 7 cascading columns. */
  private createTableauArea(state: GameState): HTMLElement {
    const area = document.createElement('div');
    area.classList.add('board__tableau');

    for (let i = 0; i < TABLEAU_COUNT; i++) {
      const pile = state.tableau[i]!;
      const col = this.createPileElement('tableau', i, pile);
      col.classList.add('pile--tableau');
      this.addEmptyIndicator(col, pile, '');
      area.appendChild(col);
    }

    return area;
  }

  /* ── Private: Pile rendering ──────────────────────────────────── */

  /** Create a pile element with its cards rendered. */
  private createPileElement(zone: string, pileIndex: number, pile: ReadonlyPile): HTMLElement {
    const el = document.createElement('div');
    el.classList.add('pile');
    el.setAttribute('data-zone', zone);
    el.setAttribute('data-pile-index', String(pileIndex));

    this.renderCardsIntoPile(el, pile);

    return el;
  }

  /** Render card elements into a pile element. */
  private renderCardsIntoPile(pileEl: HTMLElement, pile: ReadonlyPile): void {
    for (let i = 0; i < pile.length; i++) {
      const cardData = pile[i]!;
      const cardEl = this.cardRenderer.createCard(cardData);
      cardEl.dataset['cardIndex'] = String(i);
      pileEl.appendChild(cardEl);
    }
  }

  /** Add an empty-pile indicator if the pile is empty. */
  private addEmptyIndicator(pileEl: HTMLElement, pile: ReadonlyPile, symbol: string): void {
    if (pile.length > 0) return;

    const indicator = document.createElement('div');
    indicator.classList.add('pile--empty');
    indicator.textContent = symbol;
    pileEl.appendChild(indicator);
  }

  /** Update a single pile's contents in the DOM. */
  private updatePile(zone: string, index: number, pile: ReadonlyPile): void {
    const pileEl = this.getPileElement(zone, index);
    if (!pileEl) return;

    // Remove existing cards and empty indicators
    pileEl.innerHTML = '';

    // Re-render cards
    this.renderCardsIntoPile(pileEl, pile);

    // Add empty indicator if needed
    const symbol = this.getEmptySymbol(zone, index);
    this.addEmptyIndicator(pileEl, pile, symbol);
  }

  /** Get the empty-pile symbol for a given zone and index. */
  private getEmptySymbol(zone: string, index: number): string {
    if (zone === 'stock') return '♻';
    if (zone === 'foundation') return FOUNDATION_SUITS[index] ?? '';
    return '';
  }

  /** Attach the stock click handler to the current stock pile element. */
  private attachStockClickHandler(): void {
    if (!this.stockClickCallback || !this.container) return;

    const stockEl = this.container.querySelector('[data-zone="stock"]');
    if (!stockEl) return;

    // Clone and replace to remove old listeners
    const cb = this.stockClickCallback;
    stockEl.addEventListener('click', () => cb());
  }
}
