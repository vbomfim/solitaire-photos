/**
 * Difficulty presets for the Klondike solitaire game.
 *
 * Exports configuration objects that control draw count, stock passes,
 * and score multipliers per difficulty level. [CLEAN-CODE]
 */
import type { Difficulty, DifficultyConfig } from '../types';

export type { DifficultyConfig };

/** Easy — draw 1, unlimited passes, 1× score. */
export const EASY: DifficultyConfig = Object.freeze({
  name: 'Easy',
  difficulty: 'easy' as const,
  drawCount: 1 as const,
  stockPasses: 0,
  scoreMultiplier: 1,
});

/** Medium — draw 3, unlimited passes, 2× score. */
export const MEDIUM: DifficultyConfig = Object.freeze({
  name: 'Medium',
  difficulty: 'medium' as const,
  drawCount: 3 as const,
  stockPasses: 0,
  scoreMultiplier: 2,
});

/** Hard — draw 3, 3 passes max, 3× score. */
export const HARD: DifficultyConfig = Object.freeze({
  name: 'Hard',
  difficulty: 'hard' as const,
  drawCount: 3 as const,
  stockPasses: 3,
  scoreMultiplier: 3,
});

/** Preset map for lookup by difficulty name. */
const PRESETS: Readonly<Record<Difficulty, DifficultyConfig>> = {
  easy: EASY,
  medium: MEDIUM,
  hard: HARD,
};

/** Returns the frozen DifficultyConfig for the given level. */
export function getDifficultyConfig(level: Difficulty): DifficultyConfig {
  return PRESETS[level];
}
