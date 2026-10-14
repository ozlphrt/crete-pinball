import { describe, it, expect, vi } from 'vitest';
import { CameraZoomController } from '../../src/game/camera/cameraZoomController';
import { ARENA_CONFIG } from '../../src/config';
import { BallBody } from '../../src/game/physics/ballBody';
import { CretePaddle } from '../../src/game/entities/cretePaddle';

function createMockCamera() {
  return {
    centerOn: vi.fn(),
    setZoom: vi.fn(),
  } as unknown as Phaser.Cameras.Scene2D.Camera;
}

function createMockPaddle(x = 450, y = 1450) {
  return {
    x,
    y,
  } as unknown as CretePaddle;
}

function createMockBall(x: number, y: number, radius = 12): BallBody {
  return {
    x,
    y,
    radius,
  } as unknown as BallBody;
}

describe('CameraZoomController', () => {
  it('initializes with zoom enabled by default', () => {
    const camera = createMockCamera();
    const paddle = createMockPaddle();
    const controller = new CameraZoomController(camera, paddle);

    expect(controller.isZoomEnabled()).toBe(true);
    expect(controller.getZoom()).toBe(1.0);
    const center = controller.getCenter();
    expect(center.x).toBe(ARENA_CONFIG.worldWidth / 2);
    expect(center.y).toBe(ARENA_CONFIG.worldHeight / 2);
  });

  it('can be configured with zoom disabled by default', () => {
    const camera = createMockCamera();
    const paddle = createMockPaddle();
    const controller = new CameraZoomController(camera, paddle, { enabledByDefault: false });

    expect(controller.isZoomEnabled()).toBe(false);
  });

  it('toggles zoom state cleanly on demand', () => {
    const camera = createMockCamera();
    const paddle = createMockPaddle();
    const controller = new CameraZoomController(camera, paddle);

    // Initial state is true
    expect(controller.isZoomEnabled()).toBe(true);

    // Toggle to false
    expect(controller.toggle()).toBe(false);
    expect(controller.isZoomEnabled()).toBe(false);

    // Toggle back to true
    expect(controller.toggle()).toBe(true);
    expect(controller.isZoomEnabled()).toBe(true);

    controller.setZoomEnabled(false);
    expect(controller.isZoomEnabled()).toBe(false);
  });

  it('accurately computes Crete offscreen factor and normalized screen X', () => {
    const camera = {
      centerOn: vi.fn(),
      setZoom: vi.fn(),
      worldView: {
        x: 0,
        y: 0,
        width: 900,
        height: 1200,
        bottom: 1200,
      },
      width: 900,
      height: 1200,
      zoom: 1.2,
    } as unknown as Phaser.Cameras.Scene2D.Camera;

    const paddle = {
      x: 450,
      y: 1460,
      halfHeight: 18,
    } as unknown as CretePaddle;

    const controller = new CameraZoomController(camera, paddle, { enabledByDefault: true });

    // When bottom of camera is at Y=1200 and footer takes space, Crete (Y=1460) is completely offscreen
    expect(controller.isCreteOffscreen()).toBe(true);
    expect(controller.getCreteOffscreenFactor()).toBe(1.0);
    expect(controller.getCreteScreenNormalizedX()).toBeCloseTo(0.5, 2);

    // If paddle moves right to X=720, screen normalized X updates accordingly
    (paddle as any).x = 720;
    expect(controller.getCreteScreenNormalizedX()).toBeCloseTo(720 / 900, 2);

    // If camera moves down to frame Crete fully (e.g. bottom at Y=1600)
    (camera as any).worldView.bottom = 1600;
    (camera as any).worldView.y = 400;
    expect(controller.getCreteOffscreenFactor()).toBe(0);
    expect(controller.isCreteOffscreen()).toBe(false);
  });

  it('keeps camera at 1.0x full view when disabled', () => {
    const camera = createMockCamera();
    const paddle = createMockPaddle();
    const controller = new CameraZoomController(camera, paddle, { enabledByDefault: false });

    const balls = [createMockBall(450, 400)];
    // Step simulation several frames
    for (let i = 0; i < 60; i++) {
      controller.update(1 / 60, balls);
    }

    expect(controller.getZoom()).toBe(1.0);
    expect(controller.getCenter().x).toBe(450);
    expect(controller.getCenter().y).toBe(800);
    expect(camera.setZoom).toHaveBeenCalledWith(1.0);
    expect(camera.centerOn).toHaveBeenCalledWith(450, 800);
  });

  it('zooms in up to maxZoom (1.30x) when a single ball is in play', () => {
    const camera = createMockCamera();
    const paddle = createMockPaddle();
    const controller = new CameraZoomController(camera, paddle, {
      enabledByDefault: true,
      maxZoom: 1.30,
    });

    const balls = [createMockBall(450, 800)];
    // Step over 3 seconds to allow exponential smoothing to settle
    for (let i = 0; i < 180; i++) {
      controller.update(1 / 60, balls);
    }

    // Zoom should have smoothly reached 1.30x
    expect(controller.getZoom()).toBeCloseTo(1.30, 2);
    expect(controller.getCenter().x).toBeCloseTo(450, 1);
    expect(controller.getCenter().y).toBeCloseTo(800, 1);
  });

  it('automatically backs out zoom when multiple balls spread across the arena to keep all balls visible', () => {
    const camera = createMockCamera();
    const paddle = createMockPaddle();
    const controller = new CameraZoomController(camera, paddle, {
      enabledByDefault: true,
      maxZoom: 1.30,
      minZoom: 1.0,
      marginX: 100,
      marginY: 100,
    });

    // Two balls spread across the width (x=80 and x=820)
    const balls = [createMockBall(80, 500), createMockBall(820, 1100)];
    for (let i = 0; i < 180; i++) {
      controller.update(1 / 60, balls);
    }

    // Spread is (820 - 80) + 200 margin = 940 > 900 world width, so safe zoom must back down to 1.0x
    expect(controller.getZoom()).toBeCloseTo(1.0, 1);
  });

  it('clamps camera center so the visible viewport never views outside arena bounds', () => {
    const camera = createMockCamera();
    const paddle = createMockPaddle();
    const controller = new CameraZoomController(camera, paddle, {
      enabledByDefault: true,
      maxZoom: 1.30,
    });

    // Ball near the extreme top-left corner
    const balls = [createMockBall(10, 10)];
    for (let i = 0; i < 240; i++) {
      controller.update(1 / 60, balls);
    }

    const zoom = controller.getZoom();
    const halfVisibleW = ARENA_CONFIG.worldWidth / (2 * zoom);
    const halfVisibleH = ARENA_CONFIG.worldHeight / (2 * zoom);

    const center = controller.getCenter();
    // Center must stay within valid clamped frame bounds
    expect(center.x).toBeGreaterThanOrEqual(halfVisibleW - 2);
    expect(center.y).toBeGreaterThanOrEqual(halfVisibleH - 2);
  });

  it('prevents seasickness via exponential damping (no single-frame jerks)', () => {
    const camera = createMockCamera();
    const paddle = createMockPaddle();
    const controller = new CameraZoomController(camera, paddle, {
      enabledByDefault: true,
      posLambda: 2.8,
      zoomLambda: 2.2,
    });

    // Ball starts at (450, 400)
    const balls = [createMockBall(450, 400)];
    for (let i = 0; i < 60; i++) {
      controller.update(1 / 60, balls);
    }

    const initialY = controller.getCenter().y;

    // Ball instantly teleports 600px south (sudden bounce)
    balls[0] = createMockBall(450, 1000);
    controller.update(1 / 60, balls);

    const afterOneStepY = controller.getCenter().y;
    const singleStepMovement = Math.abs(afterOneStepY - initialY);

    // Damping should ensure the camera does not jump hundreds of pixels in a single frame
    expect(singleStepMovement).toBeLessThan(35);
  });
});
