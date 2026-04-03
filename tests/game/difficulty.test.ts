/**
 * Unit tests for difficulty configuration presets.
 *
 * [TDD] — Tests written first for EASY, MEDIUM, HARD constants
 * and getDifficultyConfig() factory.
 */
import { describe, it, expect } from 'vitest';
import { EASY, MEDIUM, HARD, getDifficultyConfig } from '../../src/game/difficulty';
import type { Difficulty } from '../../src/types';

/* ── EASY preset ────────────────────────────────────────────────── */

describe('EASY preset', () => {
  it('should draw 1 card at a time', () => {
    expect(EASY.drawCount).toBe(1);
  });

  it('should have unlimited stock passes (0)', () => {
    expect(EASY.stockPasses).toBe(0);
  });

  it('should have 1x score multiplier', () => {
    expect(EASY.scoreMultiplier).toBe(1);
  });

  it('should be named "Easy"', () => {
    expect(EASY.name).toBe('Easy');
  });

  it('should have difficulty "easy"', () => {
    expect(EASY.difficulty).toBe('easy');
  });
});

/* ── MEDIUM preset ──────────────────────────────────────────────── */

describe('MEDIUM preset', () => {
  it('should draw 3 cards at a time', () => {
    expect(MEDIUM.drawCount).toBe(3);
  });

  it('should have unlimited stock passes (0)', () => {
    expect(MEDIUM.stockPasses).toBe(0);
  });

  it('should have 2x score multiplier', () => {
    expect(MEDIUM.scoreMultiplier).toBe(2);
  });

  it('should be named "Medium"', () => {
    expect(MEDIUM.name).toBe('Medium');
  });

  it('should have difficulty "medium"', () => {
    expect(MEDIUM.difficulty).toBe('medium');
  });
});

/* ── HARD preset ────────────────────────────────────────────────── */

describe('HARD preset', () => {
  it('should draw 3 cards at a time', () => {
    expect(HARD.drawCount).toBe(3);
  });

  it('should allow 3 stock passes', () => {
    expect(HARD.stockPasses).toBe(3);
  });

  it('should have 3x score multiplier', () => {
    expect(HARD.scoreMultiplier).toBe(3);
  });

  it('should be named "Hard"', () => {
    expect(HARD.name).toBe('Hard');
  });

  it('should have difficulty "hard"', () => {
    expect(HARD.difficulty).toBe('hard');
  });
});

/* ── getDifficultyConfig ────────────────────────────────────────── */

describe('getDifficultyConfig()', () => {
  it('should return EASY config for "easy"', () => {
    expect(getDifficultyConfig('easy')).toEqual(EASY);
  });

  it('should return MEDIUM config for "medium"', () => {
    expect(getDifficultyConfig('medium')).toEqual(MEDIUM);
  });

  it('should return HARD config for "hard"', () => {
    expect(getDifficultyConfig('hard')).toEqual(HARD);
  });

  it('should return configs with correct drawCount values', () => {
    const levels: Difficulty[] = ['easy', 'medium', 'hard'];
    const drawCounts = levels.map((l) => getDifficultyConfig(l).drawCount);
    expect(drawCounts).toEqual([1, 3, 3]);
  });

  it('should return frozen/immutable config objects', () => {
    const config = getDifficultyConfig('easy');
    expect(Object.isFrozen(config)).toBe(true);
  });
});
