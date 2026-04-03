/**
 * DragController — handles drag-and-drop interactions for card moves.
 *
 * Uses the Pointer Events API for unified mouse / touch / pen support.
 * Manages pointer capture, drag ghost positioning, drop target validation,
 * and snap-back animation on invalid drops.
 *
 * [SOLID] SRP — interaction handling only, delegates move validation to GameEngine.
 * [CLEAN-CODE] Small methods, clear state machine (idle → dragging → drop).
 */
import type { CardLocation, GameState } from '../types';
import { GameEngine } from '../game/engine';
import { escapeCssValue } from '../utils/css';

/* ── Constants ──────────────────────────────────────────────────── */

/** Minimum pointer displacement (px) before drag starts — avoids accidental drags. */
const DRAG_THRESHOLD = 5;

/* ── DragController class ───────────────────────────────────────── */

export class DragController {
  private readonly boardContainer: HTMLElement;
  private readonly engine: GameEngine;
  private readonly getState: () => GameState | null;
  private readonly applyState: (state: GameState) => void;

  /** Cards being dragged (in DOM order). */
  private draggedCards: HTMLElement[] = [];
  /** Original positions for snap-back. */
  private originalPositions: { left: string; top: string; position: string }[] = [];
  /** Card location of the drag source. */
  private dragFrom: CardLocation | null = null;
  /** Pointer starting position. */
  private startX = 0;
  private startY = 0;
  /** Whether a real drag has started (past threshold). */
  private isDragging = false;
  /** Currently highlighted drop target. */
  private highlightedPile: HTMLElement | null = null;

  /** Bound handlers for cleanup. */
  private readonly onPointerDownBound: (e: PointerEvent) => void;
  private readonly onPointerMoveBound: (e: PointerEvent) => void;
  private readonly onPointerUpBound: (e: PointerEvent) => void;

  constructor(
    boardContainer: HTMLElement,
    engine: GameEngine,
    getState: () => GameState | null,
    applyState: (state: GameState) => void,
  ) {
    this.boardContainer = boardContainer;
    this.engine = engine;
    this.getState = getState;
    this.applyState = applyState;

    // Bind handlers once
    this.onPointerDownBound = (e) => this.onPointerDown(e);
    this.onPointerMoveBound = (e) => this.onPointerMove(e);
    this.onPointerUpBound = (e) => this.onPointerUp(e);

    this.boardContainer.addEventListener('pointerdown', this.onPointerDownBound);
  }

  /** Remove all event listeners. */
  destroy(): void {
    this.boardContainer.removeEventListener('pointerdown', this.onPointerDownBound);
    document.removeEventListener('pointermove', this.onPointerMoveBound);
    document.removeEventListener('pointerup', this.onPointerUpBound);
    this.cancelDrag();
  }

  /* ── Pointer down: start potential drag ───────────────────────── */

  private onPointerDown(e: PointerEvent): void {
    // Only primary button
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    const cardEl = target.closest<HTMLElement>('.card');
    if (!cardEl || !cardEl.classList.contains('card--face-up')) return;

    const pileEl = cardEl.closest<HTMLElement>('[data-zone]');
    if (!pileEl) return;

    const zone = pileEl.getAttribute('data-zone') as CardLocation['zone'];
    // Don't drag from stock
    if (zone === 'stock') return;

    const pileIndex = Number(pileEl.getAttribute('data-pile-index') ?? 0);
    const cardIndex = Number(cardEl.dataset['cardIndex'] ?? 0);

    this.dragFrom = { zone, pileIndex, cardIndex };
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.isDragging = false;

    // Collect cards to drag (this card + all cards after it in tableau)
    this.draggedCards = this.collectDragCards(cardEl, pileEl, zone);

    // Prevent text selection during drag
    e.preventDefault();

    // Listen on document for move/up (pointer capture approach)
    document.addEventListener('pointermove', this.onPointerMoveBound);
    document.addEventListener('pointerup', this.onPointerUpBound);
  }

  /* ── Pointer move: update drag position ───────────────────────── */

  private onPointerMove(e: PointerEvent): void {
    if (this.draggedCards.length === 0) return;

    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;

    // Check threshold before initiating drag
    if (!this.isDragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
        return;
      }
      // Clear any click-to-move selection when drag begins
      this.boardContainer.querySelectorAll('.card--selected').forEach((el) => {
        el.classList.remove('card--selected');
      });
      this.startDragVisual();
    }

    // Move all dragged cards
    for (let i = 0; i < this.draggedCards.length; i++) {
      const card = this.draggedCards[i]!;
      const orig = this.originalPositions[i]!;
      card.style.left = `${parseFloat(orig.left || '0') + dx}px`;
      card.style.top = `${parseFloat(orig.top || '0') + dy}px`;
    }

    // Highlight drop target
    this.updateDropTarget(e.clientX, e.clientY);
  }

  /* ── Pointer up: attempt drop ─────────────────────────────────── */

  private onPointerUp(e: PointerEvent): void {
    document.removeEventListener('pointermove', this.onPointerMoveBound);
    document.removeEventListener('pointerup', this.onPointerUpBound);

    if (!this.isDragging) {
      // Never crossed threshold — treat as click (handled by UIShell)
      this.draggedCards = [];
      this.dragFrom = null;
      return;
    }

    const dropTarget = this.findDropTarget(e.clientX, e.clientY);

    if (dropTarget && this.dragFrom) {
      const state = this.getState();
      if (state) {
        const to: CardLocation = {
          zone: dropTarget.zone,
          pileIndex: dropTarget.pileIndex,
          cardIndex: 0,
        };

        const result = this.engine.move(state, {
          type: 'move',
          from: this.dragFrom,
          to,
        });

        if (!('valid' in result)) {
          // Successful move — apply state (which re-renders the board)
          this.endDrag();
          this.applyState(result);
          return;
        }
      }
    }

    // Invalid drop — snap back
    this.endDrag();
  }

  /* ── Visual: start drag appearance ────────────────────────────── */

  private startDragVisual(): void {
    this.isDragging = true;
    this.originalPositions = [];

    for (const card of this.draggedCards) {
      const rect = card.getBoundingClientRect();
      this.originalPositions.push({
        left: `${String(rect.left)}`,
        top: `${String(rect.top)}`,
        position: card.style.position,
      });

      card.classList.add('card--dragging');
      card.style.left = `${String(rect.left)}px`;
      card.style.top = `${String(rect.top)}px`;
      card.style.width = `${String(rect.width)}px`;
      card.style.height = `${String(rect.height)}px`;
    }
  }

  /* ── Visual: clean up drag state ───────────────────────────────── */

  /** End drag and reset all visual state. [DRY] Used for both valid drops and snap-backs. */
  private endDrag(): void {
    for (const card of this.draggedCards) {
      card.classList.remove('card--dragging');
      card.style.left = '';
      card.style.top = '';
      card.style.width = '';
      card.style.height = '';
      card.style.position = '';
    }
    this.clearDropHighlight();
    this.draggedCards = [];
    this.originalPositions = [];
    this.dragFrom = null;
  }

  /* ── Cancel any in-progress drag ──────────────────────────────── */

  private cancelDrag(): void {
    if (this.isDragging) {
      this.endDrag();
    }
    this.isDragging = false;
  }

  /* ── Collect the cards to drag ────────────────────────────────── */

  /**
   * In tableau: pick up the clicked card + all cards after it (face-up stack).
   * In waste/foundation: pick up only the single card.
   */
  private collectDragCards(cardEl: HTMLElement, _pileEl: HTMLElement, zone: string): HTMLElement[] {
    if (zone !== 'tableau') {
      return [cardEl];
    }

    // Collect this card and all subsequent siblings that are cards
    const cards: HTMLElement[] = [];
    let current: Element | null = cardEl;
    while (current) {
      if (current.classList.contains('card') && current.classList.contains('card--face-up')) {
        cards.push(current as HTMLElement);
      }
      current = current.nextElementSibling;
    }
    return cards;
  }

  /* ── Drop target detection ────────────────────────────────────── */

  /** Find the pile under the pointer for potential drop. */
  private findDropTarget(
    x: number,
    y: number,
  ): { zone: CardLocation['zone']; pileIndex: number } | null {
    // Guard: elementFromPoint is not available in jsdom
    if (typeof document.elementFromPoint !== 'function') return null;

    // Temporarily hide dragged cards so elementFromPoint finds what's beneath
    for (const card of this.draggedCards) {
      card.style.pointerEvents = 'none';
    }

    const el = document.elementFromPoint(x, y) as HTMLElement | null;

    for (const card of this.draggedCards) {
      card.style.pointerEvents = '';
    }

    if (!el) return null;

    const pileEl = el.closest('[data-zone]');
    if (!pileEl) return null;

    const zone = pileEl.getAttribute('data-zone') as CardLocation['zone'];
    if (zone === 'stock' || zone === 'waste') return null; // Can't drop on stock/waste

    const pileIndex = Number(pileEl.getAttribute('data-pile-index') ?? 0);
    return { zone, pileIndex };
  }

  /** Update the highlighted drop target during drag. */
  private updateDropTarget(x: number, y: number): void {
    this.clearDropHighlight();

    const target = this.findDropTarget(x, y);
    if (!target || !this.dragFrom) return;

    const state = this.getState();
    if (!state) return;

    // Check if this would be a valid move
    const to: CardLocation = { zone: target.zone, pileIndex: target.pileIndex, cardIndex: 0 };
    if (this.engine.canMove(state, this.dragFrom, to)) {
      const pileEl = this.boardContainer.querySelector(
        `[data-zone="${escapeCssValue(target.zone)}"][data-pile-index="${escapeCssValue(String(target.pileIndex))}"]`,
      );
      if (pileEl) {
        pileEl.classList.add('pile--drop-target');
        this.highlightedPile = pileEl as HTMLElement;
      }
    }
  }

  /** Clear the current drop target highlight. */
  private clearDropHighlight(): void {
    if (this.highlightedPile) {
      this.highlightedPile.classList.remove('pile--drop-target');
      this.highlightedPile = null;
    }
  }
}
