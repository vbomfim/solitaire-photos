/**
 * UIShell — the top-level UI container and app orchestrator.
 *
 * Manages screens (menu → game → end), wires up the game engine,
 * board layout, and toolbar controls (undo, hint, new game, timer).
 *
 * [SOLID] SRP — screen management and event wiring only.
 * [CLEAN-CODE] Small methods, clear screen transitions.
 */
import type { Difficulty, DifficultyConfig, GameState } from '../types';
import { GameEngine } from '../game/engine';
import { getDifficultyConfig } from '../game/difficulty';
import { CardRenderer } from './card-renderer';
import { BoardLayout } from './board-layout';

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
  private gameState: GameState | null = null;
  private selectedDifficulty: Difficulty = 'easy';
  private timerId: ReturnType<typeof setInterval> | null = null;
  private elapsedSeconds = 0;

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

    // Wire card clicks for moving
    this.wireCardClicks(boardContainer);

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

    this.boardLayout?.update(this.gameState);
    this.updateDisplays();
    this.wireCardClicks(this.container.querySelector('.game__board')!);
  }

  /** Handle undo button click. */
  private handleUndo(): void {
    if (!this.gameState || this.gameState.moves.length === 0) return;

    this.gameState = this.engine.undo(this.gameState);
    this.boardLayout?.update(this.gameState);
    this.updateDisplays();
    this.wireCardClicks(this.container.querySelector('.game__board')!);
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

  /** Clear all card highlights. */
  private clearHighlights(): void {
    const highlighted = this.container.querySelectorAll('.card--highlighted');
    for (const el of highlighted) {
      this.cardRenderer.highlightCard(el as HTMLElement, false);
    }
    const hintTargets = this.container.querySelectorAll('.pile--hint-target');
    for (const el of hintTargets) {
      el.classList.remove('pile--hint-target');
    }
    const selected = this.container.querySelectorAll('.card--selected');
    for (const el of selected) {
      this.cardRenderer.selectCard(el as HTMLElement, false);
    }
  }

  /* ── Card click handling (click-to-move) ──────────────────────── */

  /** Selected card location for click-to-move. */
  private selectedLocation: { zone: string; pileIndex: number; cardIndex: number } | null = null;

  /** Wire click handlers on all face-up cards for click-to-move. */
  private wireCardClicks(boardContainer: HTMLElement): void {
    const allCards = boardContainer.querySelectorAll('.card');
    for (const cardEl of allCards) {
      const htmlCard = cardEl as HTMLElement;
      // Remove old listener by cloning (simple approach for re-wiring)
      const clone = htmlCard.cloneNode(true) as HTMLElement;
      htmlCard.parentNode?.replaceChild(clone, htmlCard);

      if (clone.classList.contains('card--face-up')) {
        clone.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleCardClick(clone);
        });
      }
    }
  }

  /** Handle a click on a face-up card. */
  private handleCardClick(cardEl: HTMLElement): void {
    if (!this.gameState || !this.boardLayout) return;

    const zone = cardEl.closest('[data-zone]')?.getAttribute('data-zone');
    const pileIndex = Number(cardEl.closest('[data-zone]')?.getAttribute('data-pile-index') ?? 0);
    const cardIndex = Number(cardEl.dataset['cardIndex'] ?? 0);

    if (!zone) return;

    if (this.selectedLocation) {
      // Second click — try to move
      this.clearHighlights();

      const from = {
        zone: this.selectedLocation.zone as 'tableau' | 'foundation' | 'stock' | 'waste',
        pileIndex: this.selectedLocation.pileIndex,
        cardIndex: this.selectedLocation.cardIndex,
      };
      const to = {
        zone: zone as 'tableau' | 'foundation' | 'stock' | 'waste',
        pileIndex,
        cardIndex: 0,
      };

      const result = this.engine.move(this.gameState, {
        type: 'move',
        from,
        to,
      });

      if (!('valid' in result)) {
        this.gameState = result;
        this.boardLayout.update(this.gameState);
        this.updateDisplays();
        this.wireCardClicks(this.container.querySelector('.game__board')!);

        // Check win
        if (this.engine.isWon(this.gameState)) {
          this.handleWin();
        }
      }

      this.selectedLocation = null;
    } else {
      // First click — select card
      this.clearHighlights();
      this.cardRenderer.selectCard(cardEl, true);
      this.selectedLocation = { zone, pileIndex, cardIndex };
    }
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
