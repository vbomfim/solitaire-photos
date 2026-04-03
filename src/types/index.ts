/**
 * Shared type definitions for the Solitaire Photos game.
 *
 * These types model the core domain: cards, game state, and configuration.
 * All components depend on these — they form the innermost layer of the
 * architecture. [CLEAN-ARCH]
 */

/** The four standard playing card suits. */
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

/** Card ranks from Ace (1) through King (13). */
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

/** Suit color — derived from the suit itself. */
export type Color = 'red' | 'black';

/** A single playing card in the game. */
export interface Card {
  readonly suit: Suit;
  readonly rank: Rank;
  /** Whether the card is currently face-up on the board. */
  faceUp: boolean;
  /** Optional photo URL used as the card back image. */
  photoUrl?: string | undefined;
}

/** A mutable pile of cards — used by engine internals for in-place manipulation. */
export type Pile = Card[];

/** A read-only pile of cards — used in GameState and public interfaces. */
export type ReadonlyPile = readonly Card[];

/** Identifies where a card or group of cards is located. */
export interface CardLocation {
  readonly zone: 'tableau' | 'foundation' | 'stock' | 'waste';
  /** Index of the pile within the zone (0-based). */
  readonly pileIndex: number;
  /** Index of the card within the pile (0-based, top = last). */
  readonly cardIndex: number;
}

/** Represents a single move in the game (for undo support). */
export interface Move {
  readonly from: CardLocation;
  readonly to: CardLocation;
  readonly cards: readonly Card[];
  readonly flippedCard?: boolean | undefined;
}

/** Complete snapshot of the game at a point in time. */
export interface GameState {
  /** Seven tableau columns (Klondike standard). */
  readonly tableau: readonly ReadonlyPile[];
  /** Four foundation piles, one per suit. */
  readonly foundation: readonly ReadonlyPile[];
  /** The draw pile (face-down). */
  readonly stock: ReadonlyPile;
  /** Cards drawn from the stock (face-up). */
  readonly waste: ReadonlyPile;
  /** Ordered list of moves made so far (for undo). Move count = moves.length. */
  readonly moves: readonly Move[];
  /** Elapsed time in seconds. */
  readonly elapsedSeconds: number;
  /** Current score. */
  readonly score: number;
  /** Whether the game has been won. */
  readonly isWon: boolean;
}

/** Difficulty levels supported by the game. */
export type Difficulty = 'easy' | 'medium' | 'hard';

/** Configuration for a difficulty level. */
export interface DifficultyConfig {
  readonly name: string;
  readonly difficulty: Difficulty;
  /** Number of cards drawn from stock at a time (1 or 3). */
  readonly drawCount: 1 | 3;
  /** Number of passes through the stock allowed (0 = unlimited). */
  readonly stockPasses: number;
  /** Score multiplier for this difficulty. */
  readonly scoreMultiplier: number;
}
