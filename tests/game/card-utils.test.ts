/**
 * Unit tests for card utility functions.
 *
 * [TDD] — Tests written first for the suitColor helper.
 */
import { describe, it, expect } from 'vitest';
import { suitColor } from '../../src/game/card-utils';
import type { Suit } from '../../src/types';

describe('suitColor()', () => {
  it('should return "red" for hearts', () => {
    expect(suitColor('hearts')).toBe('red');
  });

  it('should return "red" for diamonds', () => {
    expect(suitColor('diamonds')).toBe('red');
  });

  it('should return "black" for clubs', () => {
    expect(suitColor('clubs')).toBe('black');
  });

  it('should return "black" for spades', () => {
    expect(suitColor('spades')).toBe('black');
  });

  it('should map all four suits to exactly two colors', () => {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const colors = suits.map(suitColor);
    const uniqueColors = new Set(colors);

    expect(uniqueColors.size).toBe(2);
    expect(uniqueColors).toContain('red');
    expect(uniqueColors).toContain('black');
  });
});
