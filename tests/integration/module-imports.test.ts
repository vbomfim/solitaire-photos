/**
 * Integration tests — Module import chain.
 *
 * Verifies that all scaffold modules can be imported without errors,
 * no circular dependency issues exist, and the module graph is sound.
 * These tests exercise the real import chain — not mocks.
 *
 * [COVERAGE] — No existing tests verify that placeholder modules are importable.
 * [AC-1] — "Vite produces dist/ with zero TypeScript compilation errors" implies
 *           all modules must be valid and importable.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';

describe('Module import chain [COVERAGE]', () => {
  it('should import all game modules without errors', async () => {
    const engine = await import('../../src/game/engine');
    const difficulty = await import('../../src/game/difficulty');

    expect(engine.GameEngine).toBeDefined();
    expect(typeof engine.GameEngine).toBe('function'); // class constructor
    expect(difficulty).toBeDefined();
  });

  it('should import all service modules without errors', async () => {
    const auth = await import('../../src/services/auth-service');
    const photos = await import('../../src/services/photos-service');
    const cache = await import('../../src/services/photo-cache');
    const score = await import('../../src/services/score-keeper');

    expect(auth.AuthService).toBeDefined();
    expect(photos.PhotosService).toBeDefined();
    expect(cache.PhotoCache).toBeDefined();
    expect(score.ScoreKeeper).toBeDefined();
  });

  it('should import all UI modules without errors', async () => {
    const board = await import('../../src/ui/board-layout');
    const card = await import('../../src/ui/card-renderer');
    const drag = await import('../../src/ui/drag-controller');
    const endGame = await import('../../src/ui/end-game-reveal');
    const shell = await import('../../src/ui/ui-shell');

    expect(board.BoardLayout).toBeDefined();
    expect(card.CardRenderer).toBeDefined();
    expect(drag.DragController).toBeDefined();
    expect(endGame.EndGameReveal).toBeDefined();
    expect(shell.UIShell).toBeDefined();
  });

  it('should import types module and all type exports', async () => {
    const types = await import('../../src/types/index');

    // types/index.ts exports only type aliases — no runtime exports expected
    // This test verifies the module itself is parseable and loadable
    expect(types).toBeDefined();
  });

  it('should instantiate all placeholder classes [BOUNDARY]', async () => {
    // Verifies the class constructors work (no unexpected base class issues)
    const { GameEngine } = await import('../../src/game/engine');
    const { AuthService } = await import('../../src/services/auth-service');
    const { PhotosService } = await import('../../src/services/photos-service');
    const { PhotoCache } = await import('../../src/services/photo-cache');
    const { ScoreKeeper } = await import('../../src/services/score-keeper');
    const { BoardLayout } = await import('../../src/ui/board-layout');
    const { CardRenderer } = await import('../../src/ui/card-renderer');
    const { DragController } = await import('../../src/ui/drag-controller');
    const { EndGameReveal } = await import('../../src/ui/end-game-reveal');
    const { UIShell } = await import('../../src/ui/ui-shell');

    // All 10 placeholder classes should be instantiable
    expect(new GameEngine()).toBeInstanceOf(GameEngine);
    expect(new AuthService()).toBeInstanceOf(AuthService);
    expect(new PhotosService()).toBeInstanceOf(PhotosService);
    expect(new PhotoCache()).toBeInstanceOf(PhotoCache);
    expect(new ScoreKeeper()).toBeInstanceOf(ScoreKeeper);
    expect(new BoardLayout(new CardRenderer())).toBeInstanceOf(BoardLayout);
    expect(new CardRenderer()).toBeInstanceOf(CardRenderer);
    expect(new DragController()).toBeInstanceOf(DragController);
    expect(new EndGameReveal()).toBeInstanceOf(EndGameReveal);
    expect(new UIShell(document.createElement('div'))).toBeInstanceOf(UIShell);
  });
});

describe('Module re-export chain [CONTRACT]', () => {
  it('should re-export DifficultyConfig from game/difficulty', async () => {
    // difficulty.ts re-exports DifficultyConfig from types — verify this chain works
    const difficultyModule = await import('../../src/game/difficulty');

    // The module should at minimum be importable (re-export of type only = no runtime values)
    expect(difficultyModule).toBeDefined();
  });
});
