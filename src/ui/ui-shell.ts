/**
 * UIShell — the top-level UI container and app orchestrator.
 *
 * Manages screens (menu → game → end), wires up the game engine,
 * board layout, and toolbar controls (undo, hint, new game, timer).
 * Uses event delegation for card interactions (click-to-move + double-click).
 *
 * [SOLID] SRP — screen management and event wiring only.
 * [CLEAN-CODE] Small methods, clear screen transitions.
 */
import type { CardLocation, Difficulty, DifficultyConfig, GameState } from '../types';
import { GameEngine } from '../game/engine';
import { getDifficultyConfig } from '../game/difficulty';
import { CardRenderer } from './card-renderer';
import { BoardLayout } from './board-layout';
import { DragController } from './drag-controller';

/* ── Constants ──────────────────────────────────────────────────── */

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'] as const;
const DIFFICULTY_LABELS: Readonly<Record<Difficulty, string>> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

/* ── UIShell class ──────────────────────────────────────────────── */

export class UIShell {
  private readonly container: HTMLElement;
  private readonly engine: GameEngine;
  private readonly cardRenderer: CardRenderer;

  private boardLayout: BoardLayout | null = null;
  private dragController: DragController | null = null;
  private gameState: GameState | null = null;
  private selectedDifficulty: Difficulty = 'easy';
  private timerId: ReturnType<typeof setInterval> | null = null;
  private elapsedSeconds = 0;

  /** Selected card location for click-to-move. */
  private selectedLocation: CardLocation | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.engine = new GameEngine();
    this.cardRenderer = new CardRenderer();
  }

  /** Initialize the app — show the menu screen. */
  init(): void {
    this.showMenuScreen();
  }

  /* ── Menu Screen ──────────────────────────────────────────────── */

  /** Render the menu screen. [CLEAN-CODE] */
  private showMenuScreen(): void {
    this.stopTimer();
    this.dragController?.destroy();
    this.dragController = null;
    this.container.innerHTML = '';

    const menu = document.createElement('div');
    menu.classList.add('menu');

    // Title
    const title = document.createElement('h1');
    title.classList.add('menu__title');
    title.textContent = '♠ Solitaire Photos';
    menu.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.classList.add('menu__subtitle');
    subtitle.textContent = 'Klondike solitaire with your Google Photos as card backs.';
    menu.appendChild(subtitle);

    // Difficulty selector
    const difficultyGroup = document.createElement('div');
    difficultyGroup.classList.add('menu__difficulty');

    for (const diff of DIFFICULTIES) {
      const option = document.createElement('button');
      option.classList.add('menu__difficulty-option');
      option.textContent = DIFFICULTY_LABELS[diff];
      option.dataset['difficulty'] = diff;

      if (diff === this.selectedDifficulty) {
        option.classList.add('menu__difficulty-option--selected');
      }

      option.addEventListener('click', () => {
        this.selectedDifficulty = diff;
        this.updateDifficultySelection(difficultyGroup);
      });

      difficultyGroup.appendChild(option);
    }
    menu.appendChild(difficultyGroup);

    // New Game button
    const newGameBtn = document.createElement('button');
    newGameBtn.classList.add('menu__button', 'menu__button--primary');
    newGameBtn.setAttribute('data-action', 'new-game');
    newGameBtn.textContent = '🃏 New Game';
    newGameBtn.addEventListener('click', () => this.startGame());
    menu.appendChild(newGameBtn);

    // Google Photos placeholder
    const photosBtn = document.createElement('button');
    photosBtn.classList.add('menu__button', 'menu__button--secondary');
    photosBtn.setAttribute('data-action', 'connect-photos');
    photosBtn.textContent = '📷 Connect Google Photos';
    photosBtn.disabled = true;
    menu.appendChild(photosBtn);

    this.container.appendChild(menu);
  }

  /** Update difficulty option selection styling. [DRY] */
  private updateDifficultySelection(group: HTMLElement): void {
    const options = group.querySelectorAll('.menu__difficulty-option');
    for (const opt of options) {
      const el = opt as HTMLElement;
      el.classList.toggle(
        'menu__difficulty-option--selected',
        el.dataset['difficulty'] === this.selectedDifficulty,
      );
    }
  }

  /* ── Game Screen ──────────────────────────────────────────────── */

  /** Start a new game and show the game screen. */
  private startGame(): void {
    const config: DifficultyConfig = getDifficultyConfig(this.selectedDifficulty);
    this.gameState = this.engine.newGame(config);
    this.elapsedSeconds = 0;
    this.selectedLocation = null;

    this.container.innerHTML = '';

    const gameScreen = document.createElement('div');
    gameScreen.classList.add('game');

    // Toolbar
    const toolbar = this.createToolbar();
    gameScreen.appendChild(toolbar);

    // Board container
    const boardContainer = document.createElement('div');
    boardContainer.classList.add('game__board');

    this.boardLayout = new BoardLayout(this.cardRenderer);
    this.boardLayout.render(this.gameState, boardContainer);

    // Wire stock click to draw
    this.boardLayout.onStockClick(() => this.handleDraw());

    gameScreen.appendChild(boardContainer);
    this.container.appendChild(gameScreen);

    // Wire event-delegated interactions on the board
    this.wireEventDelegation(boardContainer);

    // Initialize drag-and-drop controller
    this.dragController = new DragController(
      boardContainer,
      this.engine,
      () => this.gameState,
      (newState: GameState) => this.applyState(newState),
    );

    // Start timer
    this.startTimer();

    // Update displays
    this.updateDisplays();
  }

  /** Create the game toolbar with controls and displays. */
  private createToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.classList.add('toolbar');

    // Undo button
    const undoBtn = document.createElement('button');
    undoBtn.classList.add('toolbar__button');
    undoBtn.setAttribute('data-action', 'undo');
    undoBtn.textContent = '↩ Undo';
    undoBtn.addEventListener('click', () => this.handleUndo());
    toolbar.appendChild(undoBtn);

    // Hint button
    const hintBtn = document.createElement('button');
    hintBtn.classList.add('toolbar__button');
    hintBtn.setAttribute('data-action', 'hint');
    hintBtn.textContent = '💡 Hint';
    hintBtn.addEventListener('click', () => this.handleHint());
    toolbar.appendChild(hintBtn);

    // Displays
    const displays = document.createElement('div');
    displays.classList.add('toolbar__displays');

    const scoreEl = document.createElement('span');
    scoreEl.classList.add('toolbar__display');
    scoreEl.setAttribute('data-display', 'score');
    scoreEl.textContent = 'Score: 0';
    displays.appendChild(scoreEl);

    const movesEl = document.createElement('span');
    movesEl.classList.add('toolbar__display');
    movesEl.setAttribute('data-display', 'moves');
    movesEl.textContent = 'Moves: 0';
    displays.appendChild(movesEl);

    const timeEl = document.createElement('span');
    timeEl.classList.add('toolbar__display');
    timeEl.setAttribute('data-display', 'time');
    timeEl.textContent = '⏱ 0:00';
    displays.appendChild(timeEl);

    toolbar.appendChild(displays);

    // New Game button (in toolbar)
    const newGameBtn = document.createElement('button');
    newGameBtn.classList.add('toolbar__button');
    newGameBtn.setAttribute('data-action', 'toolbar-new-game');
    newGameBtn.textContent = '🔄 New Game';
    newGameBtn.addEventListener('click', () => this.showMenuScreen());
    toolbar.appendChild(newGameBtn);

    return toolbar;
  }

  /* ── Event delegation ─────────────────────────────────────────── */

  /**
   * Wire event-delegated click and dblclick on the board container.
   * Uses event delegation — a single listener walks up from the target
   * to find the card/pile, so no per-card re-wiring is needed. [DRY]
   */
  private wireEventDelegation(boardContainer: HTMLElement): void {
    boardContainer.addEventListener('click', (e) => this.onBoardClick(e));
    boardContainer.addEventListener('dblclick', (e) => this.onBoardDblClick(e));
  }

  /** Delegated click handler on the board. */
  private onBoardClick(e: Event): void {
    const target = e.target as HTMLElement;

    // Walk up to find the card element
    const cardEl = target.closest<HTMLElement>('.card');
    const pileEl = target.closest<HTMLElement>('[data-zone]');

    if (!pileEl) return;

    const zone = pileEl.getAttribute('data-zone');
    if (!zone) return;

    // If stock pile, ignore (handled by onStockClick)
    if (zone === 'stock') return;

    if (cardEl && cardEl.classList.contains('card--face-up')) {
      this.handleCardClick(cardEl, pileEl);
    } else if (!cardEl && this.selectedLocation) {
      // Clicked on empty pile area — use as drop target
      this.handlePileClick(pileEl);
    } else if (cardEl && cardEl.classList.contains('card--face-up') === false) {
      // Clicked on face-down card — deselect
      this.clearSelection();
    }
  }

  /** Delegated double-click handler — auto-move to foundation. */
  private onBoardDblClick(e: Event): void {
    const target = e.target as HTMLElement;
    const cardEl = target.closest<HTMLElement>('.card');

    if (!cardEl || !cardEl.classList.contains('card--face-up')) return;

    this.tryAutoMoveToFoundation(cardEl);
  }

  /* ── Game actions ─────────────────────────────────────────────── */

  /** Handle stock pile click — draw cards. */
  private handleDraw(): void {
    if (!this.gameState) return;

    // If stock is empty and waste has cards, recycle
    if (this.gameState.stock.length === 0 && this.gameState.waste.length > 0) {
      const result = this.engine.move(this.gameState, { type: 'recycle' });
      if ('valid' in result && !result.valid) return;
      this.gameState = result as GameState;
    } else if (this.gameState.stock.length > 0) {
      this.gameState = this.engine.draw(this.gameState);
    } else {
      return; // Nothing to do
    }

    this.refreshBoard();
  }

  /** Handle undo button click. */
  private handleUndo(): void {
    if (!this.gameState || this.gameState.moves.length === 0) return;

    this.gameState = this.engine.undo(this.gameState);
    this.refreshBoard();
  }

  /** Handle hint button click. */
  private handleHint(): void {
    if (!this.gameState) return;

    // Clear any previous highlights
    this.clearHighlights();

    const hint = this.engine.getHint(this.gameState);
    if (!hint) return;

    // Highlight the source card
    const fromEl = this.boardLayout?.getCardElement(hint.from);
    if (fromEl) {
      this.cardRenderer.highlightCard(fromEl, true);
    }

    // Highlight the target pile
    const toEl = this.boardLayout?.getPileElement(hint.to.zone, hint.to.pileIndex);
    if (toEl) {
      toEl.classList.add('pile--hint-target');
    }
  }

  /** Clear all card highlights and selection. */
  private clearHighlights(): void {
    const highlighted = this.container.querySelectorAll('.card--highlighted');
    for (const el of highlighted) {
      this.cardRenderer.highlightCard(el as HTMLElement, false);
    }
    const hintTargets = this.container.querySelectorAll('.pile--hint-target');
    for (const el of hintTargets) {
      el.classList.remove('pile--hint-target');
    }
    this.clearSelection();
  }

  /** Clear selected card state. */
  private clearSelection(): void {
    const selected = this.container.querySelectorAll('.card--selected');
    for (const el of selected) {
      this.cardRenderer.selectCard(el as HTMLElement, false);
    }
    this.selectedLocation = null;
  }

  /* ── Click-to-move ────────────────────────────────────────────── */

  /** Handle a click on a face-up card. */
  private handleCardClick(cardEl: HTMLElement, pileEl: HTMLElement): void {
    if (!this.gameState || !this.boardLayout) return;

    const location = this.resolveCardLocation(cardEl, pileEl);
    if (!location) return;

    if (this.selectedLocation) {
      // Second click — try to move to the pile this card is in
      const from = this.selectedLocation;
      const to: CardLocation = {
        zone: location.zone,
        pileIndex: location.pileIndex,
        cardIndex: 0,
      };

      this.clearSelection();
      this.tryMove(from, to);
    } else {
      // First click — select card
      this.clearSelection();
      this.cardRenderer.selectCard(cardEl, true);
      this.selectedLocation = location;
    }
  }

  /** Handle a click on an empty pile area (as move target). */
  private handlePileClick(pileEl: HTMLElement): void {
    if (!this.selectedLocation || !this.gameState) return;

    const zone = pileEl.getAttribute('data-zone') as CardLocation['zone'];
    const pileIndex = Number(pileEl.getAttribute('data-pile-index') ?? 0);

    const from = this.selectedLocation;
    const to: CardLocation = { zone, pileIndex, cardIndex: 0 };

    this.clearSelection();
    this.tryMove(from, to);
  }

  /** Try auto-moving a card to any valid foundation pile. */
  private tryAutoMoveToFoundation(cardEl: HTMLElement): void {
    if (!this.gameState || !this.boardLayout) return;

    const pileEl = cardEl.closest<HTMLElement>('[data-zone]');
    if (!pileEl) return;

    const from = this.resolveCardLocation(cardEl, pileEl);
    if (!from) return;

    // Try each foundation pile
    for (let i = 0; i < 4; i++) {
      const to: CardLocation = { zone: 'foundation', pileIndex: i, cardIndex: 0 };
      if (this.engine.canMove(this.gameState, from, to)) {
        this.clearSelection();
        this.tryMove(from, to);
        return;
      }
    }
  }

  /** Attempt a move and update board if successful. */
  private tryMove(from: CardLocation, to: CardLocation): void {
    if (!this.gameState) return;

    const result = this.engine.move(this.gameState, { type: 'move', from, to });

    if (!('valid' in result)) {
      this.gameState = result;
      this.refreshBoard();

      // Check win
      if (this.engine.isWon(this.gameState)) {
        this.handleWin();
      }
    }
  }

  /** Apply an externally-produced new state (e.g. from DragController). */
  private applyState(newState: GameState): void {
    this.gameState = newState;
    this.refreshBoard();

    if (this.engine.isWon(this.gameState)) {
      this.handleWin();
    }
  }

  /** Refresh board and stat displays after any state change. [DRY] */
  private refreshBoard(): void {
    if (!this.gameState || !this.boardLayout) return;
    this.boardLayout.update(this.gameState);
    this.updateDisplays();
  }

  /** Resolve a card element + pile element to a CardLocation. */
  private resolveCardLocation(cardEl: HTMLElement, pileEl: HTMLElement): CardLocation | null {
    const zone = pileEl.getAttribute('data-zone') as CardLocation['zone'] | null;
    const pileIndex = Number(pileEl.getAttribute('data-pile-index') ?? 0);
    const cardIndex = Number(cardEl.dataset['cardIndex'] ?? 0);

    if (!zone) return null;
    return { zone, pileIndex, cardIndex };
  }

  /** Handle game won state. */
  private handleWin(): void {
    this.stopTimer();
    // Placeholder — Story 6 will implement EndGameReveal
    const gameScreen = this.container.querySelector('.game');
    if (gameScreen) {
      const winMsg = document.createElement('div');
      winMsg.classList.add('game__win');
      winMsg.textContent = '🎉 You Won!';
      gameScreen.appendChild(winMsg);
    }
  }

  /* ── Timer ────────────────────────────────────────────────────── */

  /** Start the game timer (1-second interval). */
  private startTimer(): void {
    this.stopTimer();
    this.timerId = setInterval(() => {
      this.elapsedSeconds++;
      this.updateTimeDisplay();
    }, 1000);
  }

  /** Stop the game timer. */
  private stopTimer(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  /* ── Display updates ──────────────────────────────────────────── */

  /** Update all stat displays (score, moves, time). */
  private updateDisplays(): void {
    if (!this.gameState) return;

    const scoreEl = this.container.querySelector('[data-display="score"]');
    if (scoreEl) scoreEl.textContent = `Score: ${String(this.gameState.score)}`;

    const movesEl = this.container.querySelector('[data-display="moves"]');
    if (movesEl) movesEl.textContent = `Moves: ${String(this.gameState.moves.length)}`;

    this.updateTimeDisplay();
  }

  /** Update the time display. */
  private updateTimeDisplay(): void {
    const timeEl = this.container.querySelector('[data-display="time"]');
    if (timeEl) timeEl.textContent = `⏱ ${this.formatTime(this.elapsedSeconds)}`;
  }

  /** Format seconds as m:ss. */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins)}:${String(secs).padStart(2, '0')}`;
  }
}
