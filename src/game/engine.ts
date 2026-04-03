/**
 * GameEngine — orchestrates game logic for Klondike solitaire.
 *
 * Responsibilities: deal cards, validate moves, track state, detect win/loss.
 * All methods are pure: GameState in → GameState out (never mutates). [CLEAN-CODE]
 *
 * [SOLID] Single Responsibility — game rules only, no UI or persistence.
 * [HEXAGONAL] — This is the core domain; depends only on types and card-utils.
 */
import type {
  Action,
  Card,
  CardLocation,
  DifficultyConfig,
  GameState,
  InvalidMove,
  Move,
  ReadonlyPile,
} from '../types';
import { createDeck, isAlternatingColor, isNextRank, shuffle } from './card-utils';
import { EASY } from './difficulty';

/* ── Constants ──────────────────────────────────────────────────── */

const TABLEAU_COLUMNS = 7;
const FOUNDATION_PILES = 4;

/* ── Scoring constants (standard Klondike) ──────────────────────── */

const SCORE_WASTE_TO_TABLEAU = 5;
const SCORE_WASTE_TO_FOUNDATION = 10;
const SCORE_TABLEAU_TO_FOUNDATION = 10;
const SCORE_FLIP_TABLEAU_CARD = 5;

/* ── Internal helpers ───────────────────────────────────────────── */

/** Deep-clone a Card (for immutability). */
function cloneCard(c: Card): Card {
  return { suit: c.suit, rank: c.rank, faceUp: c.faceUp };
}

/** Clone a pile of cards. */
function clonePile(pile: ReadonlyPile): Card[] {
  return pile.map(cloneCard);
}

/** Get the effective difficulty config from state, defaulting to EASY. */
function getConfig(state: GameState): DifficultyConfig {
  return state.difficulty ?? EASY;
}

/** Get the stock passes used, defaulting to 0. */
function getPasses(state: GameState): number {
  return state.stockPassesUsed ?? 0;
}

/** Check if stock can be recycled (pass limit not exceeded). */
function canRecycle(state: GameState): boolean {
  const config = getConfig(state);
  if (state.waste.length === 0) return false;
  if (state.stock.length > 0) return false;
  if (config.stockPasses === 0) return true; // unlimited
  return getPasses(state) < config.stockPasses;
}

/** Get the top card of a pile, or undefined if empty. */
function topCard(pile: ReadonlyPile): Card | undefined {
  return pile[pile.length - 1];
}

/**
 * Validate a tableau-to-tableau placement.
 * The card being placed must be one rank lower and alternating color.
 * Kings can go on empty columns.
 */
function isValidTableauPlacement(movingCard: Card, targetPile: ReadonlyPile): boolean {
  if (targetPile.length === 0) {
    return movingCard.rank === 13; // Only Kings on empty columns
  }
  const target = topCard(targetPile)!;
  return isAlternatingColor(movingCard, target) && isNextRank(movingCard, target);
}

/**
 * Validate a foundation placement.
 * Aces on empty foundations; same suit + ascending rank otherwise.
 */
function isValidFoundationPlacement(movingCard: Card, foundationPile: ReadonlyPile): boolean {
  if (foundationPile.length === 0) {
    return movingCard.rank === 1; // Only Aces on empty foundations
  }
  const target = topCard(foundationPile)!;
  return movingCard.suit === target.suit && isNextRank(target, movingCard);
}

/** Build an InvalidMove result. */
function invalid(reason: string): InvalidMove {
  return { valid: false, reason };
}

/* ── GameEngine class ───────────────────────────────────────────── */

export class GameEngine {
  /* ── newGame ──────────────────────────────────────────────────── */

  /** Create a new game with shuffled deck, dealt to tableau, remaining to stock. */
  newGame(config: DifficultyConfig = EASY, seed?: number): GameState {
    const deck = seed !== undefined ? shuffle(createDeck(), seed) : shuffle(createDeck());

    // Deal to tableau: column i gets i+1 cards (top card face-up)
    const tableau: Card[][] = Array.from({ length: TABLEAU_COLUMNS }, () => []);
    let cardIndex = 0;
    for (let col = 0; col < TABLEAU_COLUMNS; col++) {
      for (let row = 0; row <= col; row++) {
        const c = cloneCard(deck[cardIndex]!);
        c.faceUp = row === col; // top card face-up
        tableau[col]!.push(c);
        cardIndex++;
      }
    }

    // Remaining cards go to stock (face-down)
    const stock: Card[] = [];
    for (let i = cardIndex; i < deck.length; i++) {
      const c = cloneCard(deck[i]!);
      c.faceUp = false;
      stock.push(c);
    }

    return {
      tableau,
      foundation: [[], [], [], []],
      stock,
      waste: [],
      moves: [],
      elapsedSeconds: 0,
      score: 0,
      isWon: false,
      stockPassesUsed: 0,
      difficulty: config,
    };
  }

  /* ── move (action dispatcher) ─────────────────────────────────── */

  /** Validate and apply a game action. Returns new state or InvalidMove. */
  move(state: GameState, action: Action): GameState | InvalidMove {
    switch (action.type) {
      case 'draw':
        return this.draw(state);
      case 'recycle':
        return this.recycleStock(state);
      case 'undo':
        return this.undo(state);
      case 'auto-complete':
        return this.autoComplete(state);
      case 'move':
        return this.executeMove(state, action.from, action.to);
    }
  }

  /* ── canMove ──────────────────────────────────────────────────── */

  /** Check if a move from one location to another is valid. */
  canMove(state: GameState, from: CardLocation, to: CardLocation): boolean {
    const movingCards = this.getCardsToMove(state, from);
    if (movingCards === null || movingCards.length === 0) return false;

    // Only top waste card is playable
    if (from.zone === 'waste' && from.cardIndex !== state.waste.length - 1) {
      return false;
    }

    const leadCard = movingCards[0]!;

    if (to.zone === 'tableau') {
      const targetPile = state.tableau[to.pileIndex];
      if (!targetPile) return false;
      return isValidTableauPlacement(leadCard, targetPile);
    }

    if (to.zone === 'foundation') {
      // Only single cards to foundation
      if (movingCards.length > 1) return false;
      const targetPile = state.foundation[to.pileIndex];
      if (!targetPile) return false;
      return isValidFoundationPlacement(leadCard, targetPile);
    }

    return false;
  }

  /* ── draw ──────────────────────────────────────────────────────── */

  /** Draw cards from stock to waste. Returns same state if stock is empty. */
  draw(state: GameState): GameState {
    if (state.stock.length === 0) return state;

    const config = getConfig(state);
    const count = Math.min(config.drawCount, state.stock.length);
    const newStock = clonePile(state.stock);
    const newWaste = clonePile(state.waste);

    // Draw from end of stock (top of pile)
    const drawn: Card[] = [];
    for (let i = 0; i < count; i++) {
      const c = newStock.pop()!;
      c.faceUp = true;
      drawn.push(c);
      newWaste.push(c);
    }

    const moveRecord: Move = {
      from: { zone: 'stock', pileIndex: 0, cardIndex: state.stock.length - 1 },
      to: { zone: 'waste', pileIndex: 0, cardIndex: state.waste.length },
      cards: drawn,
      drawCount: count,
    };

    return {
      ...state,
      stock: newStock,
      waste: newWaste,
      moves: [...state.moves, moveRecord],
    };
  }

  /* ── recycleStock ─────────────────────────────────────────────── */

  /** Flip waste back to stock. Returns InvalidMove if not allowed. */
  recycleStock(state: GameState): GameState | InvalidMove {
    if (state.waste.length === 0) {
      return invalid('Waste is empty — nothing to recycle');
    }
    if (state.stock.length > 0) {
      return invalid('Stock is not empty — draw first');
    }
    if (!canRecycle(state)) {
      return invalid('Stock pass limit reached');
    }

    // Reverse waste and make face-down for new stock
    const newStock = clonePile(state.waste)
      .reverse()
      .map((c) => {
        c.faceUp = false;
        return c;
      });

    const moveRecord: Move = {
      from: { zone: 'waste', pileIndex: 0, cardIndex: 0 },
      to: { zone: 'stock', pileIndex: 0, cardIndex: 0 },
      cards: clonePile(state.waste),
      previousStockPasses: getPasses(state),
    };

    return {
      ...state,
      stock: newStock,
      waste: [],
      moves: [...state.moves, moveRecord],
      stockPassesUsed: getPasses(state) + 1,
    };
  }

  /* ── undo ─────────────────────────────────────────────────────── */

  /** Revert the last move. Returns same state if no moves to undo. */
  undo(state: GameState): GameState {
    if (state.moves.length === 0) return state;

    const lastMove = state.moves[state.moves.length - 1]!;
    const newMoves = state.moves.slice(0, -1);

    // Undo a draw (stock → waste)
    if (lastMove.from.zone === 'stock' && lastMove.to.zone === 'waste') {
      return this.undoDraw(state, lastMove, newMoves);
    }

    // Undo a recycle (waste → stock)
    if (
      lastMove.from.zone === 'waste' &&
      lastMove.to.zone === 'stock' &&
      lastMove.previousStockPasses !== undefined
    ) {
      return this.undoRecycle(state, lastMove, newMoves);
    }

    // Undo a card move
    return this.undoCardMove(state, lastMove, newMoves);
  }

  /* ── autoComplete ─────────────────────────────────────────────── */

  /** Move all remaining cards to foundation automatically. */
  autoComplete(state: GameState): GameState {
    let current = { ...state };
    let moved = true;

    while (moved) {
      moved = false;

      // Try moving from each tableau column to any foundation
      for (let col = 0; col < TABLEAU_COLUMNS; col++) {
        const pile = current.tableau[col];
        if (!pile || pile.length === 0) continue;

        const topC = pile[pile.length - 1]!;
        const foundationIdx = this.findTargetFoundation(current, topC);
        if (foundationIdx >= 0) {
          const result = this.executeMove(
            current,
            { zone: 'tableau', pileIndex: col, cardIndex: pile.length - 1 },
            {
              zone: 'foundation',
              pileIndex: foundationIdx,
              cardIndex: current.foundation[foundationIdx]!.length,
            },
          );
          if (!('valid' in result)) {
            current = result;
            moved = true;
          }
        }
      }

      // Try moving from waste to any foundation
      if (current.waste.length > 0) {
        const wasteTop = current.waste[current.waste.length - 1]!;
        const foundationIdx = this.findTargetFoundation(current, wasteTop);
        if (foundationIdx >= 0) {
          const result = this.executeMove(
            current,
            { zone: 'waste', pileIndex: 0, cardIndex: current.waste.length - 1 },
            {
              zone: 'foundation',
              pileIndex: foundationIdx,
              cardIndex: current.foundation[foundationIdx]!.length,
            },
          );
          if (!('valid' in result)) {
            current = result;
            moved = true;
          }
        }
      }
    }

    // Check if won
    const won = this.isWon(current);
    return won ? { ...current, isWon: true } : current;
  }

  /* ── canAutoComplete ──────────────────────────────────────────── */

  /** True when all face-down cards are revealed and stock/waste are empty. */
  canAutoComplete(state: GameState): boolean {
    if (state.stock.length > 0) return false;
    if (state.waste.length > 0) return false;

    for (const col of state.tableau) {
      for (const c of col) {
        if (!c.faceUp) return false;
      }
    }
    return true;
  }

  /* ── isWon ────────────────────────────────────────────────────── */

  /** All 4 foundations have 13 cards each → game won. */
  isWon(state: GameState): boolean {
    return state.foundation.every((pile) => pile.length === 13);
  }

  /* ── isLost ───────────────────────────────────────────────────── */

  /** No valid card moves AND stock exhausted/pass limit reached. */
  isLost(state: GameState): boolean {
    if (this.isWon(state) || state.isWon) return false;

    // If stock has cards, player can draw
    if (state.stock.length > 0) return false;

    // If waste can be recycled, not lost
    if (canRecycle(state)) return false;

    // If any valid card moves exist, not lost
    return this.getValidMoves(state).length === 0;
  }

  /* ── getHint ──────────────────────────────────────────────────── */

  /** Suggest the next valid move, prioritizing foundation. Returns null if none. */
  getHint(state: GameState): Move | null {
    const moves = this.getValidMoves(state);
    if (moves.length === 0) return null;

    // Prioritize foundation moves
    const foundationMove = moves.find((m) => m.to.zone === 'foundation');
    return foundationMove ?? moves[0]!;
  }

  /* ── getValidMoves ────────────────────────────────────────────── */

  /** List all valid card moves from the current state. */
  getValidMoves(state: GameState): Move[] {
    const moves: Move[] = [];

    // Tableau-to-foundation and tableau-to-tableau
    for (let col = 0; col < TABLEAU_COLUMNS; col++) {
      const pile = state.tableau[col];
      if (!pile || pile.length === 0) continue;

      // Find first face-up card in column
      const firstFaceUp = pile.findIndex((c) => c.faceUp);
      if (firstFaceUp < 0) continue;

      // Try each face-up sub-stack
      for (let ci = firstFaceUp; ci < pile.length; ci++) {
        const movingCards = pile.slice(ci);
        const from: CardLocation = { zone: 'tableau', pileIndex: col, cardIndex: ci };

        // Single card → try foundation
        if (ci === pile.length - 1) {
          for (let fi = 0; fi < FOUNDATION_PILES; fi++) {
            const to: CardLocation = {
              zone: 'foundation',
              pileIndex: fi,
              cardIndex: state.foundation[fi]!.length,
            };
            if (this.canMove(state, from, to)) {
              moves.push({ from, to, cards: movingCards });
            }
          }
        }

        // Any sub-stack → try tableau
        for (let destCol = 0; destCol < TABLEAU_COLUMNS; destCol++) {
          if (destCol === col) continue;
          const to: CardLocation = {
            zone: 'tableau',
            pileIndex: destCol,
            cardIndex: state.tableau[destCol]!.length,
          };
          if (this.canMove(state, from, to)) {
            moves.push({ from, to, cards: movingCards });
          }
        }
      }
    }

    // Waste-to-foundation and waste-to-tableau
    if (state.waste.length > 0) {
      const wasteFrom: CardLocation = {
        zone: 'waste',
        pileIndex: 0,
        cardIndex: state.waste.length - 1,
      };
      const wasteCard = state.waste[state.waste.length - 1]!;

      // Foundation
      for (let fi = 0; fi < FOUNDATION_PILES; fi++) {
        const to: CardLocation = {
          zone: 'foundation',
          pileIndex: fi,
          cardIndex: state.foundation[fi]!.length,
        };
        if (this.canMove(state, wasteFrom, to)) {
          moves.push({ from: wasteFrom, to, cards: [wasteCard] });
        }
      }

      // Tableau
      for (let col = 0; col < TABLEAU_COLUMNS; col++) {
        const to: CardLocation = {
          zone: 'tableau',
          pileIndex: col,
          cardIndex: state.tableau[col]!.length,
        };
        if (this.canMove(state, wasteFrom, to)) {
          moves.push({ from: wasteFrom, to, cards: [wasteCard] });
        }
      }
    }

    return moves;
  }

  /* ── Private helpers ──────────────────────────────────────────── */

  /** Get the cards to move from a given location. Returns null if invalid. */
  private getCardsToMove(state: GameState, from: CardLocation): Card[] | null {
    switch (from.zone) {
      case 'tableau': {
        const pile = state.tableau[from.pileIndex];
        if (!pile || from.cardIndex >= pile.length) return null;
        const card = pile[from.cardIndex];
        if (!card || !card.faceUp) return null;
        return pile.slice(from.cardIndex);
      }
      case 'waste': {
        if (from.cardIndex >= state.waste.length) return null;
        const card = state.waste[from.cardIndex];
        if (!card) return null;
        return [card];
      }
      case 'foundation': {
        const pile = state.foundation[from.pileIndex];
        if (!pile || from.cardIndex >= pile.length) return null;
        const card = pile[from.cardIndex];
        if (!card) return null;
        return [card];
      }
      default:
        return null;
    }
  }

  /** Execute a card move between locations. */
  private executeMove(
    state: GameState,
    from: CardLocation,
    to: CardLocation,
  ): GameState | InvalidMove {
    if (!this.canMove(state, from, to)) {
      return invalid('Invalid move');
    }

    const movingCards = this.getCardsToMove(state, from)!;
    let score = state.score;
    let flippedCard = false;

    // Clone tableau
    const newTableau = state.tableau.map(clonePile);
    const newFoundation = state.foundation.map(clonePile);
    let newWaste = clonePile(state.waste);

    // Remove cards from source
    switch (from.zone) {
      case 'tableau': {
        const srcPile = newTableau[from.pileIndex]!;
        srcPile.splice(from.cardIndex);
        // Flip newly exposed card
        if (srcPile.length > 0) {
          const newTop = srcPile[srcPile.length - 1]!;
          if (!newTop.faceUp) {
            newTop.faceUp = true;
            flippedCard = true;
            score += SCORE_FLIP_TABLEAU_CARD;
          }
        }
        break;
      }
      case 'waste': {
        // Remove top card from waste
        newWaste = newWaste.slice(0, -1);
        break;
      }
      case 'foundation': {
        const srcPile = newFoundation[from.pileIndex]!;
        srcPile.splice(from.cardIndex);
        break;
      }
    }

    // Add cards to destination
    const clonedMovingCards = movingCards.map(cloneCard);
    switch (to.zone) {
      case 'tableau': {
        const destPile = newTableau[to.pileIndex]!;
        destPile.push(...clonedMovingCards);
        if (from.zone === 'waste') score += SCORE_WASTE_TO_TABLEAU;
        break;
      }
      case 'foundation': {
        const destPile = newFoundation[to.pileIndex]!;
        destPile.push(...clonedMovingCards);
        if (from.zone === 'waste') score += SCORE_WASTE_TO_FOUNDATION;
        else if (from.zone === 'tableau') score += SCORE_TABLEAU_TO_FOUNDATION;
        break;
      }
    }

    const moveRecord: Move = {
      from,
      to,
      cards: movingCards,
      flippedCard: flippedCard || undefined,
    };

    const newState: GameState = {
      ...state,
      tableau: newTableau,
      foundation: newFoundation,
      waste: newWaste,
      moves: [...state.moves, moveRecord],
      score,
    };

    // Check for win
    if (this.isWon(newState)) {
      return { ...newState, isWon: true };
    }

    return newState;
  }

  /** Undo a draw action. */
  private undoDraw(state: GameState, lastMove: Move, newMoves: readonly Move[]): GameState {
    const count = lastMove.drawCount ?? lastMove.cards.length;
    const newWaste = clonePile(state.waste);
    const newStock = clonePile(state.stock);

    // Move cards back from waste to stock (in reverse)
    for (let i = 0; i < count; i++) {
      const c = newWaste.pop();
      if (c) {
        c.faceUp = false;
        newStock.push(c);
      }
    }

    return {
      ...state,
      stock: newStock,
      waste: newWaste,
      moves: newMoves,
    };
  }

  /** Undo a recycle action. */
  private undoRecycle(state: GameState, lastMove: Move, newMoves: readonly Move[]): GameState {
    // Restore waste from stock (reverse the recycle)
    const newWaste = clonePile(state.stock)
      .reverse()
      .map((c) => {
        c.faceUp = true;
        return c;
      });

    return {
      ...state,
      stock: [],
      waste: newWaste,
      moves: newMoves,
      stockPassesUsed: lastMove.previousStockPasses ?? 0,
    };
  }

  /** Undo a card move between zones. */
  private undoCardMove(state: GameState, lastMove: Move, newMoves: readonly Move[]): GameState {
    const newTableau = state.tableau.map(clonePile);
    const newFoundation = state.foundation.map(clonePile);
    const newWaste = clonePile(state.waste);
    let score = state.score;

    // Remove cards from destination
    const cardCount = lastMove.cards.length;
    switch (lastMove.to.zone) {
      case 'tableau': {
        const destPile = newTableau[lastMove.to.pileIndex]!;
        destPile.splice(destPile.length - cardCount);
        if (lastMove.from.zone === 'waste') score -= SCORE_WASTE_TO_TABLEAU;
        break;
      }
      case 'foundation': {
        const destPile = newFoundation[lastMove.to.pileIndex]!;
        destPile.splice(destPile.length - cardCount);
        if (lastMove.from.zone === 'waste') score -= SCORE_WASTE_TO_FOUNDATION;
        else if (lastMove.from.zone === 'tableau') score -= SCORE_TABLEAU_TO_FOUNDATION;
        break;
      }
    }

    // Un-flip the card that was flipped
    if (lastMove.flippedCard && lastMove.from.zone === 'tableau') {
      const srcPile = newTableau[lastMove.from.pileIndex]!;
      if (srcPile.length > 0) {
        srcPile[srcPile.length - 1]!.faceUp = false;
        score -= SCORE_FLIP_TABLEAU_CARD;
      }
    }

    // Add cards back to source
    const restoredCards = lastMove.cards.map(cloneCard);
    switch (lastMove.from.zone) {
      case 'tableau': {
        const srcPile = newTableau[lastMove.from.pileIndex]!;
        srcPile.push(...restoredCards);
        break;
      }
      case 'waste': {
        newWaste.push(...restoredCards);
        break;
      }
      case 'foundation': {
        const srcPile = newFoundation[lastMove.from.pileIndex]!;
        srcPile.push(...restoredCards);
        break;
      }
    }

    return {
      ...state,
      tableau: newTableau,
      foundation: newFoundation,
      waste: newWaste,
      moves: newMoves,
      score,
      isWon: false,
    };
  }

  /** Find the correct foundation pile index for a card, or -1 if none. */
  private findTargetFoundation(state: GameState, c: Card): number {
    for (let fi = 0; fi < FOUNDATION_PILES; fi++) {
      const pile = state.foundation[fi]!;
      if (isValidFoundationPlacement(c, pile)) {
        return fi;
      }
    }
    return -1;
  }
}
