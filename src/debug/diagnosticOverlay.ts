import { ViewportTransform, WorldPoint, ScreenPoint, GameState } from '../types';
import { worldToLonLat } from '../geography/aegeanData';

export interface GeographyDiagnosticData {
  readonly hoveredFeatureId: string | null;
  readonly hoveredFeatureName: string | null;
  readonly hoveredClassification: string | null;
  readonly totalIslandsCount: number;
  readonly collidableCount: number;
  readonly visualOnlyCount: number;
  readonly cretePaddleX: number;
  readonly creteVelocityX: number;
  readonly creteMinX: number;
  readonly creteMaxX: number;
  readonly collisionSegmentsVisible: boolean;
  readonly boundingBoxesVisible: boolean;
  readonly labelsVisible: boolean;
}

export interface PhysicsDiagnosticData {
  readonly ballX: number;
  readonly ballY: number;
  readonly ballVx: number;
  readonly ballVy: number;
  readonly ballSpeed: number;
  readonly ballSpin: number;
  readonly ballState: string;
  readonly gravityY: number;
  readonly simTick: number;
  readonly sweptInterventionsCount: number;
  readonly antiStuckCount: number;
  readonly lastContactFeatureId: string | null;
  readonly lastContactSpeed: number | null;
  readonly isLastContactNorthPaddle: boolean;
  readonly physicsOverlayVisible: boolean;
  readonly ballRadius?: number;
  readonly ballGlowRadius?: number;
}

export interface DiagnosticData {
  readonly state: GameState;
  readonly transform: ViewportTransform;
  readonly pointerScreen: ScreenPoint | null;
  readonly pointerWorld: WorldPoint | null;
  readonly targetPaddleX: number | null;
  readonly fps: number;
  readonly isDevMode: boolean;
  readonly geo?: GeographyDiagnosticData;
  readonly physics?: PhysicsDiagnosticData;
}

export class DiagnosticOverlay {
  private container: HTMLDivElement | null = null;
  private isVisible = false;

  constructor() {
    this.createDomElement();
  }

  private createDomElement(): void {
    if (typeof document === 'undefined') return;

    this.container = document.createElement('div');
    this.container.id = 'dev-diagnostics-panel';
    this.container.style.position = 'fixed';
    this.container.style.top = '10px';
    this.container.style.left = '10px';
    this.container.style.backgroundColor = 'rgba(5, 11, 20, 0.92)';
    this.container.style.color = '#58a6ff';
    this.container.style.fontFamily = 'monospace';
    this.container.style.fontSize = '11px';
    this.container.style.padding = '10px 14px';
    this.container.style.borderRadius = '6px';
    this.container.style.border = '1px solid #1f6feb';
    this.container.style.zIndex = '99999';
    this.container.style.pointerEvents = 'none';
    this.container.style.display = 'none';
    this.container.style.lineHeight = '1.45';
    this.container.style.boxShadow = '0 6px 16px rgba(0,0,0,0.6)';

    document.body.appendChild(this.container);
  }

  private lastData: DiagnosticData | null = null;

  public get visible(): boolean {
    return this.isVisible;
  }

  public toggle(): boolean {
    this.isVisible = !this.isVisible;
    if (this.container) {
      this.container.style.display = this.isVisible ? 'block' : 'none';
      if (this.isVisible && this.lastData) {
        this.render(this.lastData);
      }
    }
    return this.isVisible;
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    if (this.container) {
      this.container.style.display = visible ? 'block' : 'none';
      if (this.isVisible && this.lastData) {
        this.render(this.lastData);
      }
    }
  }

  public update(data: DiagnosticData): void {
    this.lastData = data;
    if (!this.container || !this.isVisible) return;
    this.render(data);
  }

  private render(data: DiagnosticData): void {
    if (!this.container) return;

    const { transform, pointerScreen, pointerWorld, targetPaddleX, state, fps, geo, physics } =
      data;

    let coordsStr = 'Lat/Lon: None';
    if (pointerWorld) {
      const { lon, lat } = worldToLonLat(pointerWorld.x, pointerWorld.y);
      coordsStr = `Lat/Lon: ${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`;
    }

    const geoHtml = geo
      ? `
      <div style="border-top: 1px solid #30363d; margin-top: 4px; padding-top: 4px;">
        <div>Hover: <span style="color:#f0883e">${geo.hoveredFeatureName || 'Water'}</span> (${geo.hoveredFeatureId || 'sea'}) [${geo.hoveredClassification || 'water'}]</div>
        <div>Crete: X=${geo.cretePaddleX.toFixed(0)} [${geo.creteMinX.toFixed(0)}..${geo.creteMaxX.toFixed(0)}] | Vx=${geo.creteVelocityX.toFixed(0)} u/s</div>
        <div>Islands: ${geo.totalIslandsCount} total (${geo.collidableCount} targets, ${geo.visualOnlyCount} islets)</div>
        <div>Colliders (${geo.collisionSegmentsVisible ? 'ON' : 'OFF'}) | Bounds (${geo.boundingBoxesVisible ? 'ON' : 'OFF'}) | Labels (${geo.labelsVisible ? 'ON' : 'OFF'})</div>
      </div>
    `
      : '';

    const physHtml = physics
      ? `
      <div style="border-top: 1px solid #30363d; margin-top: 4px; padding-top: 4px;">
        <div>Ball: (${physics.ballX.toFixed(0)}, ${physics.ballY.toFixed(0)}) | V: (${physics.ballVx.toFixed(0)}, ${physics.ballVy.toFixed(0)}) | Speed: <span style="color:#79c0ff">${physics.ballSpeed.toFixed(0)}</span> u/s</div>
        <div>State: <span style="color:#7ee787">${physics.ballState.toUpperCase()}</span> | Radius: <span style="color:#79c0ff">${physics.ballRadius ?? 10}u</span> | Glow: <span style="color:#58a6ff">${physics.ballGlowRadius ?? 24}u</span></div>
        <div>Last Contact: <span style="color:#f0883e">${physics.lastContactFeatureId || 'None'}</span> ${physics.isLastContactNorthPaddle ? '(★ NORTH PADDLE)' : ''}</div>
        <div>Swept Solves: ${physics.sweptInterventionsCount} | Anti-Stuck: ${physics.antiStuckCount} | Grav: +${physics.gravityY} u/s²</div>
        <div style="color: #8b949e; font-size: 10px; margin-top: 2px;">Hotkeys: [SPACE] Launch/Pause | [P] Vectors (${physics.physicsOverlayVisible ? 'ON' : 'OFF'}) | [C] Colliders | [B] Bounds | [ / ] Radius | - / + Glow</div>
      </div>
    `
      : '';

    this.container.innerHTML = `
      <div style="color: #f0883e; font-weight: bold; margin-bottom: 4px;">[DEV DIAGNOSTICS — PHASE 01 GEOGRAPHY & PHASE 02 BALL PHYSICS]</div>
      <div>State: <span style="color:#7ee787">${state}</span> | FPS: ${fps.toFixed(0)} | Scale: ${transform.scale.toFixed(4)}</div>
      <div>Pointer: Screen (${pointerScreen ? `${pointerScreen.x.toFixed(0)}, ${pointerScreen.y.toFixed(0)}` : 'None'}) | World (${pointerWorld ? `${pointerWorld.x.toFixed(0)}, ${pointerWorld.y.toFixed(0)}` : 'None'})</div>
      <div>${coordsStr} | Target Paddle X: ${targetPaddleX !== null ? targetPaddleX.toFixed(0) : 'None'}</div>
      ${geoHtml}
      ${physHtml}
    `;
  }

  public destroy(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }
  }
}
