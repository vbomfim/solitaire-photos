/**
 * Sample test suite — validates the type system and project scaffold.
 *
 * Written FIRST as part of TDD Red phase [TDD]:
 * these tests define the expectations, then the code satisfies them.
 */
import { describe, it, expect } from 'vitest';
import type { Card, Suit, Rank, GameState, DifficultyConfig, Difficulty } from '../../types';

describe('Type system smoke tests', () => {
  describe('Card', () => {
    it('should create a valid face-down card', () => {
      const card: Card = { suit: 'hearts', rank: 1, faceUp: false };

      expect(card.suit).toBe('hearts');
      expect(card.rank).toBe(1);
      expect(card.faceUp).toBe(false);
      expect(card.photoUrl).toBeUndefined();
    });

    it('should create a card with a photo URL', () => {
      const card: Card = {
        suit: 'spades',
        rank: 13,
        faceUp: true,
        photoUrl: 'https://photos.example.com/image.jpg',
      };

      expect(card.photoUrl).toBe('https://photos.example.com/image.jpg');
      expect(card.faceUp).toBe(true);
    });

    it('should allow toggling faceUp state', () => {
      const card: Card = { suit: 'diamonds', rank: 7, faceUp: false };
      card.faceUp = true;

      expect(card.faceUp).toBe(true);
    });
  });

  describe('Suit', () => {
    it('should accept all four standard suits', () => {
      const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

      expect(suits).toHaveLength(4);
      expect(new Set(suits).size).toBe(4);
    });
  });

  describe('Rank', () => {
    it('should cover ranks 1 through 13', () => {
      const ranks: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

      expect(ranks).toHaveLength(13);
      expect(Math.min(...ranks)).toBe(1);
      expect(Math.max(...ranks)).toBe(13);
    });
  });

  describe('GameState', () => {
    it('should represent an initial game state', () => {
      const state: GameState = {
        tableau: [[], [], [], [], [], [], []],
        foundation: [[], [], [], []],
        stock: [],
        waste: [],
        moves: [],
        moveCount: 0,
        elapsedSeconds: 0,
        score: 0,
        isWon: false,
      };

      expect(state.tableau).toHaveLength(7);
      expect(state.foundation).toHaveLength(4);
      expect(state.moveCount).toBe(0);
      expect(state.isWon).toBe(false);
    });
  });

  describe('DifficultyConfig', () => {
    it('should define easy difficulty with draw-1', () => {
      const easy: DifficultyConfig = {
        name: 'Easy',
        difficulty: 'easy',
        drawCount: 1,
        stockPasses: 0,
        scoreMultiplier: 1,
      };

      expect(easy.drawCount).toBe(1);
      expect(easy.stockPasses).toBe(0);
    });

    it('should define hard difficulty with draw-3', () => {
      const hard: DifficultyConfig = {
        name: 'Hard',
        difficulty: 'hard',
        drawCount: 3,
        stockPasses: 3,
        scoreMultiplier: 2,
      };

      expect(hard.drawCount).toBe(3);
      expect(hard.stockPasses).toBe(3);
      expect(hard.scoreMultiplier).toBe(2);
    });

    it('should accept all valid difficulty levels', () => {
      const levels: Difficulty[] = ['easy', 'medium', 'hard'];

      expect(levels).toHaveLength(3);
    });
  });
});
