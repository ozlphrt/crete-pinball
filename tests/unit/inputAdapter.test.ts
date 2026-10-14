import { describe, it, expect, beforeEach } from 'vitest';
import { InputAdapter } from '../../src/game/input/inputAdapter';
import { CoordinateTransformer } from '../../src/game/world/coordinateTransformer';
import { ARENA_CONFIG } from '../../src/config';

describe('InputAdapter — Full Screen Touch & Motion Control', () => {
  let transformer: CoordinateTransformer;
  let adapter: InputAdapter;

  beforeEach(() => {
    // 900x1600 1:1 coordinate transformer
    transformer = new CoordinateTransformer(ARENA_CONFIG.worldWidth, ARENA_CONFIG.worldHeight, {
      width: ARENA_CONFIG.worldWidth,
      height: ARENA_CONFIG.worldHeight,
    });
    adapter = new InputAdapter(transformer);
  });

  it('controls Crete horizontal position when touching in the upper screen (Aegean Sea/Thrace, Y = 200)', () => {
    adapter.handlePointerDown(320, 200);
    const intent = adapter.pollIntent();
    expect(intent.targetPaddleWorldX).toBe(320);
    expect(intent.isTouchActive).toBe(true);
  });

  it('controls Crete horizontal position when touching in the middle screen (Cyclades, Y = 750)', () => {
    adapter.handlePointerDown(680, 750);
    const intent = adapter.pollIntent();
    expect(intent.targetPaddleWorldX).toBe(680);
    expect(intent.isTouchActive).toBe(true);
  });

  it('controls Crete horizontal position when touching in the lower screen (Y = 1450)', () => {
    adapter.handlePointerDown(500, 1450);
    const intent = adapter.pollIntent();
    expect(intent.targetPaddleWorldX).toBe(500);
    expect(intent.isTouchActive).toBe(true);
  });

  it('tracks left and right horizontal dragging no matter where on screen the user drags', () => {
    // User starts touch in upper Aegean sea at X=450, Y=350
    adapter.handlePointerDown(450, 350);
    expect(adapter.pollIntent().targetPaddleWorldX).toBe(450);

    // Drags left to X=250 while still in upper sea
    adapter.handlePointerMove(250, 370);
    expect(adapter.pollIntent().targetPaddleWorldX).toBe(250);

    // Drags right to X=700 across middle sea
    adapter.handlePointerMove(700, 800);
    expect(adapter.pollIntent().targetPaddleWorldX).toBe(700);
  });

  it('clamps horizontal paddle position to world boundaries', () => {
    adapter.handlePointerDown(-100, 500);
    expect(adapter.pollIntent().targetPaddleWorldX).toBe(0);

    adapter.handlePointerMove(1500, 500);
    expect(adapter.pollIntent().targetPaddleWorldX).toBe(ARENA_CONFIG.worldWidth);
  });

  it('stops active touch state on pointer up', () => {
    adapter.handlePointerDown(400, 500);
    expect(adapter.pollIntent().isTouchActive).toBe(true);

    adapter.handlePointerUp();
    expect(adapter.pollIntent().isTouchActive).toBe(false);
  });
});
