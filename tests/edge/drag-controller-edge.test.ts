/**
 * Edge-case tests for DragController — pointer events, boundaries, and resilience.
 *
 * [QA Guardian] — covers edge cases and boundary conditions missed by unit tests.
 * Tests drag lifecycle resilience, multi-card collection, non-primary buttons,
 * rapid sequences, and cleanup during active drag.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DragController } from '../../src/ui/drag-controller';
import { GameEngine } from '../../src/game/engine';
import { CardRenderer } from '../../src/ui/card-renderer';
import { BoardLayout } from '../../src/ui/board-layout';
import { EASY } from '../../src/game/difficulty';
import type { GameState } from '../../src/types';

/* ── Helpers ────────────────────────────────────────────────────── */

function createBoardWithGame(seed = 42): {
  container: HTMLElement;
  engine: GameEngine;
  state: GameState;
  layout: BoardLayout;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const engine = new GameEngine();
  const state = engine.newGame(EASY, seed);
  const renderer = new CardRenderer();
  const layout = new BoardLayout(renderer);
  layout.render(state, container);

  return { container, engine, state, layout };
}

function firePointerEvent(
  el: HTMLElement | Document,
  type: string,
  options: Partial<PointerEvent> = {},
): void {
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: 100,
    clientY: 100,
    button: 0,
    ...options,
  });
  el.dispatchEvent(event);
}

/* ══════════════════════════════════════════════════════════════════ */
/* 1. Non-primary button rejection                          [EDGE]  */
/* ══════════════════════════════════════════════════════════════════ */

describe('DragController edge — Non-primary button', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('[EDGE] should ignore right-click (button=2) on face-up card', () => {
    const { container, engine, state } = createBoardWithGame();
    const controller = new DragController(
      container,
      engine,
      () => state,
      () => {},
    );

    const col = container.querySelector('[data-zone="tableau"][data-pile-index="0"]');
    const faceUpCard = col?.querySelector('.card--face-up') as HTMLElement;
    expect(faceUpCard).not.toBeNull();

    // Right-click (button=2)
    firePointerEvent(faceUpCard, 'pointerdown', { button: 2, clientX: 100, clientY: 100 });
    firePointerEvent(document, 'pointermove', { clientX: 200, clientY: 200 });

    expect(faceUpCard.classList.contains('card--dragging')).toBe(false);

    controller.destroy();
  });

  it('[EDGE] should ignore middle-click (button=1) on face-up card', () => {
    const { container, engine, state } = createBoardWithGame();
    const controller = new DragController(
      container,
      engine,
      () => state,
      () => {},
    );

    const col = container.querySelector('[data-zone="tableau"][data-pile-index="0"]');
    const faceUpCard = col?.querySelector('.card--face-up') as HTMLElement;

    // Middle-click (button=1)
    firePointerEvent(faceUpCard, 'pointerdown', { button: 1, clientX: 100, clientY: 100 });
    firePointerEvent(document, 'pointermove', { clientX: 200, clientY: 200 });

    expect(faceUpCard.classList.contains('card--dragging')).toBe(false);

    controller.destroy();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 2. Drag threshold boundary                          [BOUNDARY]   */
/* ══════════════════════════════════════════════════════════════════ */

describe('DragController edge — Threshold boundary', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('[BOUNDARY] should NOT start drag at exactly 4px displacement', () => {
    const { container, engine, state } = createBoardWithGame();
    const controller = new DragController(
      container,
      engine,
      () => state,
      () => {},
    );

    const col = container.querySelector('[data-zone="tableau"][data-pile-index="0"]');
    const faceUpCard = col?.querySelector('.card--face-up') as HTMLElement;

    firePointerEvent(faceUpCard, 'pointerdown', { clientX: 100, clientY: 100 });
    firePointerEvent(document, 'pointermove', { clientX: 104, clientY: 100 });

    expect(faceUpCard.classList.contains('card--dragging')).toBe(false);

    firePointerEvent(document, 'pointerup', { clientX: 104, clientY: 100 });
    controller.destroy();
  });

  it('[BOUNDARY] should start drag at exactly 5px displacement', () => {
    const { container, engine, state } = createBoardWithGame();
    const controller = new DragController(
      container,
      engine,
      () => state,
      () => {},
    );

    const col = container.querySelector('[data-zone="tableau"][data-pile-index="0"]');
    const faceUpCard = col?.querySelector('.card--face-up') as HTMLElement;

    firePointerEvent(faceUpCard, 'pointerdown', { clientX: 100, clientY: 100 });
    firePointerEvent(document, 'pointermove', { clientX: 105, clientY: 100 });

    expect(faceUpCard.classList.contains('card--dragging')).toBe(true);

    firePointerEvent(document, 'pointerup', { clientX: 105, clientY: 100 });
    controller.destroy();
  });

  it('[BOUNDARY] should start drag at 5px in negative direction', () => {
    const { container, engine, state } = createBoardWithGame();
    const controller = new DragController(
      container,
      engine,
      () => state,
      () => {},
    );

    const col = container.querySelector('[data-zone="tableau"][data-pile-index="0"]');
    const faceUpCard = col?.querySelector('.card--face-up') as HTMLElement;

    firePointerEvent(faceUpCard, 'pointerdown', { clientX: 100, clientY: 100 });
    firePointerEvent(document, 'pointermove', { clientX: 95, clientY: 100 });

    expect(faceUpCard.classList.contains('card--dragging')).toBe(true);

    firePointerEvent(document, 'pointerup', { clientX: 95, clientY: 100 });
    controller.destroy();
  });

  it('[BOUNDARY] should start drag at 5px in Y-only direction', () => {
    const { container, engine, state } = createBoardWithGame();
    const controller = new DragController(
      container,
      engine,
      () => state,
      () => {},
    );

    const col = container.querySelector('[data-zone="tableau"][data-pile-index="0"]');
    const faceUpCard = col?.querySelector('.card--face-up') as HTMLElement;

    firePointerEvent(faceUpCard, 'pointerdown', { clientX: 100, clientY: 100 });
    firePointerEvent(document, 'pointermove', { clientX: 100, clientY: 105 });

    expect(faceUpCard.classList.contains('card--dragging')).toBe(true);

    firePointerEvent(document, 'pointerup', { clientX: 100, clientY: 105 });
    controller.destroy();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 3. Multi-card drag from tableau                          [EDGE]  */
/* ══════════════════════════════════════════════════════════════════ */

describe('DragController edge — Multi-card collection in tableau', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('[EDGE] should drag only one card from waste', () => {
    const { container, engine, state, layout } = createBoardWithGame();

    // Draw a card to waste
    const newState = engine.draw(state);
    layout.update(newState);

    const controller = new DragController(
      container,
      engine,
      () => newState,
      () => {},
    );

    const wasteCard = container.querySelector('[data-zone="waste"] .card--face-up') as HTMLElement;
    expect(wasteCard).not.toBeNull();

    firePointerEvent(wasteCard, 'pointerdown', { clientX: 100, clientY: 100 });
    firePointerEvent(document, 'pointermove', { clientX: 200, clientY: 200 });

    // Only this card should be dragging
    const draggingCards = container.querySelectorAll('.card--dragging');
    expect(draggingCards.length).toBe(1);

    firePointerEvent(document, 'pointerup', { clientX: 200, clientY: 200 });
    controller.destroy();
  });

  it('[EDGE] should pick up single top card from column with one face-up card', () => {
    const { container, engine, state } = createBoardWithGame();
    const controller = new DragController(
      container,
      engine,
      () => state,
      () => {},
    );

    // Column 0 has exactly 1 card (face-up)
    const col = container.querySelector('[data-zone="tableau"][data-pile-index="0"]');
    const faceUpCard = col?.querySelector('.card--face-up') as HTMLElement;

    firePointerEvent(faceUpCard, 'pointerdown', { clientX: 100, clientY: 100 });
    firePointerEvent(document, 'pointermove', { clientX: 200, clientY: 200 });

    const draggingCards = container.querySelectorAll('.card--dragging');
    expect(draggingCards.length).toBe(1);

    firePointerEvent(document, 'pointerup', { clientX: 200, clientY: 200 });
    controller.destroy();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 4. Selection cleared on drag start                       [EDGE]  */
/* ══════════════════════════════════════════════════════════════════ */

describe('DragController edge — Selection cleared on drag', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('[EDGE] should remove card--selected from all cards when drag begins', () => {
    const { container, engine, state } = createBoardWithGame();
    const controller = new DragController(
      container,
      engine,
      () => state,
      () => {},
    );

    // Manually select a card (simulating click-to-move selection)
    const cards = container.querySelectorAll('[data-zone="tableau"] .card--face-up');
    const first = cards[0] as HTMLElement;
    const second = cards[1] as HTMLElement;

    first.classList.add('card--selected');
    expect(first.classList.contains('card--selected')).toBe(true);

    // Start dragging a different card
    firePointerEvent(second, 'pointerdown', { clientX: 100, clientY: 100 });
    firePointerEvent(document, 'pointermove', { clientX: 200, clientY: 200 });

    // Selection should be cleared
    expect(first.classList.contains('card--selected')).toBe(false);

    firePointerEvent(document, 'pointerup', { clientX: 200, clientY: 200 });
    controller.destroy();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 5. Destroy during active drag                            [EDGE]  */
/* ══════════════════════════════════════════════════════════════════ */

describe('DragController edge — Destroy during drag', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('[EDGE] should clean up dragging classes when destroyed mid-drag', () => {
    const { container, engine, state } = createBoardWithGame();
    const controller = new DragController(
      container,
      engine,
      () => state,
      () => {},
    );

    const col = container.querySelector('[data-zone="tableau"][data-pile-index="0"]');
    const faceUpCard = col?.querySelector('.card--face-up') as HTMLElement;

    // Start drag
    firePointerEvent(faceUpCard, 'pointerdown', { clientX: 100, clientY: 100 });
    firePointerEvent(document, 'pointermove', { clientX: 200, clientY: 200 });
    expect(faceUpCard.classList.contains('card--dragging')).toBe(true);

    // Destroy while dragging
    controller.destroy();

    // Dragging class should be removed
    expect(faceUpCard.classList.contains('card--dragging')).toBe(false);
  });

  it('[EDGE] should not throw when destroy is called multiple times', () => {
    const { container, engine, state } = createBoardWithGame();
    const controller = new DragController(
      container,
      engine,
      () => state,
      () => {},
    );

    expect(() => {
      controller.destroy();
      controller.destroy();
    }).not.toThrow();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 6. Rapid successive pointer events                       [EDGE]  */
/* ══════════════════════════════════════════════════════════════════ */

describe('DragController edge — Rapid pointer sequences', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('[EDGE] should handle rapid pointerdown + pointerup without drag (click)', () => {
    const { container, engine, state } = createBoardWithGame();
    const applyState = vi.fn();
    const controller = new DragController(container, engine, () => state, applyState);

    const col = container.querySelector('[data-zone="tableau"][data-pile-index="0"]');
    const faceUpCard = col?.querySelector('.card--face-up') as HTMLElement;

    // Quick click (no movement — below threshold)
    firePointerEvent(faceUpCard, 'pointerdown', { clientX: 100, clientY: 100 });
    firePointerEvent(document, 'pointerup', { clientX: 100, clientY: 100 });

    // Should not have started dragging
    expect(faceUpCard.classList.contains('card--dragging')).toBe(false);
    // Should not have applied any state
    expect(applyState).not.toHaveBeenCalled();

    controller.destroy();
  });

  it('[EDGE] should handle two consecutive drag attempts cleanly', () => {
    const { container, engine, state } = createBoardWithGame();
    const controller = new DragController(
      container,
      engine,
      () => state,
      () => {},
    );

    const col = container.querySelector('[data-zone="tableau"][data-pile-index="0"]');
    const faceUpCard = col?.querySelector('.card--face-up') as HTMLElement;

    // First drag
    firePointerEvent(faceUpCard, 'pointerdown', { clientX: 100, clientY: 100 });
    firePointerEvent(document, 'pointermove', { clientX: 200, clientY: 200 });
    expect(faceUpCard.classList.contains('card--dragging')).toBe(true);
    firePointerEvent(document, 'pointerup', { clientX: 200, clientY: 200 });
    expect(faceUpCard.classList.contains('card--dragging')).toBe(false);

    // Second drag — should work the same
    firePointerEvent(faceUpCard, 'pointerdown', { clientX: 100, clientY: 100 });
    firePointerEvent(document, 'pointermove', { clientX: 200, clientY: 200 });
    expect(faceUpCard.classList.contains('card--dragging')).toBe(true);
    firePointerEvent(document, 'pointerup', { clientX: 200, clientY: 200 });
    expect(faceUpCard.classList.contains('card--dragging')).toBe(false);

    controller.destroy();
  });
});

/* ══════════════════════════════════════════════════════════════════ */
/* 7. Null/missing state handling                           [EDGE]  */
/* ══════════════════════════════════════════════════════════════════ */

describe('DragController edge — Null state', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('[EDGE] should handle getState returning null gracefully during drop', () => {
    const { container, engine, state } = createBoardWithGame();
    let returnNull = false;
    const controller = new DragController(
      container,
      engine,
      () => (returnNull ? null : state),
      () => {},
    );

    const col = container.querySelector('[data-zone="tableau"][data-pile-index="0"]');
    const faceUpCard = col?.querySelector('.card--face-up') as HTMLElement;

    // Start drag
    firePointerEvent(faceUpCard, 'pointerdown', { clientX: 100, clientY: 100 });
    firePointerEvent(document, 'pointermove', { clientX: 200, clientY: 200 });

    // Switch to null state before drop
    returnNull = true;

    // Drop — should snap back without error
    expect(() => {
      firePointerEvent(document, 'pointerup', { clientX: 200, clientY: 200 });
    }).not.toThrow();

    expect(faceUpCard.classList.contains('card--dragging')).toBe(false);

    controller.destroy();
  });
});
