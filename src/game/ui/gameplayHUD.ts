import Phaser from 'phaser';
import { GameDifficulty } from '../../types';
import { WeatherEventType } from '../events/gameEventBus';

export interface HUDPhase04State {
  readonly powerCharge: number; // 0 to 1
  readonly isPowerArmed: boolean;
  readonly weatherType: WeatherEventType;
  readonly weatherDurationRemainingSeconds: number;
  readonly isMultiballActive: boolean;
  readonly multiballDurationRemainingSeconds: number;
}

export class GameplayHUD {
  private readonly scene: Phaser.Scene;
  public static readonly HUD_HEIGHT = 152;

  // DOM elements for the HTML/CSS overlay
  private rootElement: HTMLDivElement | null = null;
  private scoreValEl: HTMLElement | null = null;
  private comboValEl: HTMLElement | null = null;
  private livesContainerEl: HTMLElement | null = null;
  private pauseBtn: HTMLButtonElement | null = null;
  private settingsBtn: HTMLButtonElement | null = null;
  private zoomBtn: HTMLButtonElement | null = null;
  private targetNameEl: HTMLElement | null = null;
  private targetBonusEl: HTMLElement | null = null;
  private statusTextEl: HTMLElement | null = null;
  private powerFillEl: HTMLElement | null = null;

  // Event callbacks
  private onPauseClickCallback?: () => void;
  private onSettingsClickCallback?: () => void;
  private onToggleZoomCallback?: () => void;
  private resizeHandler: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // Animation & change state tracking
  private lastCombo = 1;
  private lastTargetName = '';
  private lastPaused = false;
  private lastScore = -1;
  private lastLives = -1;
  private lastCharge = -1;
  private lastArmed = false;
  private lastStatusKey = '';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initDOM();
  }

  private initDOM(): void {
    if (typeof document === 'undefined') return;

    // Remove any stale overlay element
    const existing = document.getElementById('hud-overlay');
    if (existing) {
      existing.remove();
    }

    const container = document.getElementById('game-container') ?? document.body;

    const overlay = document.createElement('div');
    overlay.id = 'hud-overlay';
    overlay.className = 'hud-overlay';

    // SVG icons
    const pauseIconSvg = `<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="2" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="2" fill="currentColor"/></svg>`;
    const settingsIconSvg = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`;
    const zoomIconSvg = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`;

    overlay.innerHTML = `
      <div class="hud-header">
        <!-- ROW 1: PRIMARY INFORMATION (SCORE, COMBO, BALLS, ZOOM, SETTINGS, PAUSE) -->
        <div class="hud-row-1">
          <!-- A. SCORE -->
          <div class="hud-score-col">
            <span class="hud-score-label">SCORE</span>
            <span class="hud-score-val" id="hud-score-val">0</span>
          </div>

          <!-- B. COMBO -->
          <div class="hud-combo-col">
            <span class="hud-combo-val" id="hud-combo-val">×1</span>
          </div>

          <!-- C. BALLS / LIVES -->
          <div class="hud-lives-col" id="hud-lives-container" aria-label="1 ball remaining">
            <div class="hud-life-sphere filled"></div>
          </div>

          <!-- D. ACTIONS: ZOOM, SETTINGS & PAUSE -->
          <div class="hud-pause-col">
            <button class="hud-pause-btn hud-zoom-btn" id="hud-zoom-btn" aria-label="Dynamic Zoom" title="Dynamic Zoom">
              ${zoomIconSvg}
            </button>
            <button class="hud-pause-btn hud-settings-btn" id="hud-settings-btn" aria-label="Settings">
              ${settingsIconSvg}
            </button>
            <button class="hud-pause-btn" id="hud-pause-btn" aria-label="Pause Game">
              ${pauseIconSvg}
            </button>
          </div>
        </div>
      </div>

      <!-- BOTTOM HUD (ROW 2: TARGET & STATUS + SLIM POWER METER) -->
      <div class="hud-footer">
        <!-- ROW 2: TARGET & STATUS (SECONDARY SLIM STRIP WITH INTEGRATED POWER TRACK) -->
        <div class="hud-row-2">
          <!-- LEFT: CURRENT TARGET -->
          <div class="hud-target-group">
            <span class="hud-target-label">TARGET</span>
            <span class="hud-target-name" id="hud-target-name">NAXOS</span>
            <span class="hud-target-bonus" id="hud-target-bonus">+500</span>
          </div>

          <!-- RIGHT: TEMPORARY STATUS -->
          <div class="hud-status-col">
            <span class="hud-status-text" id="hud-status-text">NORMAL</span>
          </div>

          <!-- INTEGRATED POWER METER TRACK -->
          <div class="hud-power-meter">
            <div class="hud-power-fill" id="hud-power-fill"></div>
          </div>
        </div>
      </div>
    `;

    container.appendChild(overlay);
    this.rootElement = overlay;

    // Cache element references
    this.scoreValEl = overlay.querySelector('#hud-score-val');
    this.comboValEl = overlay.querySelector('#hud-combo-val');
    this.livesContainerEl = overlay.querySelector('#hud-lives-container');
    this.zoomBtn = overlay.querySelector('#hud-zoom-btn');
    this.settingsBtn = overlay.querySelector('#hud-settings-btn');
    this.pauseBtn = overlay.querySelector('#hud-pause-btn');
    this.targetNameEl = overlay.querySelector('#hud-target-name');
    this.targetBonusEl = overlay.querySelector('#hud-target-bonus');
    this.statusTextEl = overlay.querySelector('#hud-status-text');
    this.powerFillEl = overlay.querySelector('#hud-power-fill');

    // Wire zoom button click
    if (this.zoomBtn) {
      this.zoomBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (this.onToggleZoomCallback) {
          this.onToggleZoomCallback();
        }
      });
      this.zoomBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
      });
    }

    // Wire pause button click
    if (this.pauseBtn) {
      this.pauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (this.onPauseClickCallback) {
          this.onPauseClickCallback();
        }
      });
      this.pauseBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
      });
    }

    // Wire settings button click
    if (this.settingsBtn) {
      this.settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (this.onSettingsClickCallback) {
          this.onSettingsClickCallback();
        }
      });
      this.settingsBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
      });
    }

    // Set up bounds synchronization
    this.syncLayout();

    this.resizeHandler = () => this.syncLayout();
    window.addEventListener('resize', this.resizeHandler);
    window.addEventListener('orientationchange', this.resizeHandler);

    if (this.scene.scale) {
      this.scene.scale.on('resize', this.resizeHandler);
    }

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.syncLayout());
      const canvas = this.scene.game.canvas;
      if (canvas) {
        this.resizeObserver.observe(canvas);
      }
      if (container) {
        this.resizeObserver.observe(container);
      }
    }
  }

  /**
   * Positions the HTML/CSS HUD independently of the game canvas:
   * - Spans 100% of the viewport height (100dvh).
   * - Top panel is anchored to the top safe area.
   * - Bottom power meter is anchored above the bottom safe area.
   * - On mobile portrait, spans 100% width edge-to-edge.
   * - On desktop landscape, constrains to the game arena width so it stays aligned above the playfield.
   */
  public syncLayout(): void {
    if (!this.rootElement) return;

    const canvas = this.scene.game?.canvas;
    const canvasRect = canvas ? canvas.getBoundingClientRect() : null;
    const isDesktopLandscape =
      typeof window !== 'undefined' &&
      window.innerWidth > window.innerHeight &&
      window.innerWidth > 600;

    if (isDesktopLandscape && canvasRect && canvasRect.width > 0) {
      const arenaW = Math.min(canvasRect.width, 600);
      this.rootElement.style.width = `${Math.round(arenaW)}px`;
      this.rootElement.style.maxWidth = `${Math.round(arenaW)}px`;
    } else {
      this.rootElement.style.width = '100%';
      this.rootElement.style.maxWidth = '100%';
    }

    this.rootElement.style.left = '50%';
    this.rootElement.style.transform = 'translateX(-50%)';
    this.rootElement.style.top = '0px';
    this.rootElement.style.height = '100%';
    this.rootElement.style.height = '100dvh';
  }

  public onPauseClick(callback: () => void): void {
    this.onPauseClickCallback = callback;
  }

  public onSettingsClick(callback: () => void): void {
    this.onSettingsClickCallback = callback;
  }

  public onToggleZoom(callback: () => void): void {
    this.onToggleZoomCallback = callback;
  }

  public setZoomActive(active: boolean): void {
    if (this.zoomBtn) {
      if (active) {
        this.zoomBtn.classList.add('active');
        this.zoomBtn.setAttribute('aria-pressed', 'true');
      } else {
        this.zoomBtn.classList.remove('active');
        this.zoomBtn.setAttribute('aria-pressed', 'false');
      }
    }
  }

  public update(
    score: number,
    comboMultiplier: number,
    lives: number,
    targetName: string,
    targetBonus: number,
    difficulty: GameDifficulty,
    isPaused: boolean,
    phase04State?: HUDPhase04State,
  ): void {
    // Periodically verify layout bounds
    this.syncLayout();

    // 1. SCORE: Tabular numerals with comma formatting
    if (this.scoreValEl && this.lastScore !== score) {
      this.lastScore = score;
      const str = score.toLocaleString();
      this.scoreValEl.textContent = str;

      // Auto-scale font size for massive score strings so digits never crowd or clip
      if (str.length >= 12) {
        this.scoreValEl.style.fontSize = 'clamp(18px, 4.8vw, 22px)';
      } else if (str.length >= 10) {
        this.scoreValEl.style.fontSize = 'clamp(21px, 5.6vw, 26px)';
      } else {
        this.scoreValEl.style.fontSize = '';
      }
    }

    // 2. COMBO: Large ×5 with pulse and max-glow
    if (this.comboValEl && this.lastCombo !== comboMultiplier) {
      const prev = this.lastCombo;
      this.lastCombo = comboMultiplier;
      this.comboValEl.textContent = `×${comboMultiplier}`;

      if (comboMultiplier >= 5) {
        this.comboValEl.classList.add('max-combo');
      } else {
        this.comboValEl.classList.remove('max-combo');
      }

      if (comboMultiplier > prev && comboMultiplier > 1) {
        this.comboValEl.classList.remove('hud-combo-pulse');
        // Trigger reflow to restart CSS animation
        void this.comboValEl.offsetWidth;
        this.comboValEl.classList.add('hud-combo-pulse');
      }
    }

    // 3. BALLS / LIVES: Dynamic luminous spheres representing available balls
    if (this.livesContainerEl && this.lastLives !== lives) {
      const prevLives = this.lastLives;
      this.lastLives = lives;
      this.livesContainerEl.setAttribute(
        'aria-label',
        `${lives} ball${lives === 1 ? '' : 's'} remaining`,
      );
      this.livesContainerEl.innerHTML = '';
      for (let i = 0; i < lives; i++) {
        const sphere = document.createElement('div');
        sphere.className = 'hud-life-sphere filled';
        if (prevLives >= 0 && i >= prevLives) {
          sphere.classList.add('spawning');
        }
        this.livesContainerEl.appendChild(sphere);
      }
    }

    // 4. PAUSE BUTTON: Icon updates based on play/pause
    if (this.pauseBtn && this.lastPaused !== isPaused) {
      this.lastPaused = isPaused;
      if (isPaused) {
        this.pauseBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M7 4.5v15c0 .8.9 1.3 1.6.9l12-7.5c.7-.4.7-1.4 0-1.8l-12-7.5c-.7-.4-1.6.1-1.6.9z" fill="currentColor"/></svg>`;
        this.pauseBtn.setAttribute('aria-label', 'Resume Game');
      } else {
        this.pauseBtn.innerHTML = `<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="2" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="2" fill="currentColor"/></svg>`;
        this.pauseBtn.setAttribute('aria-label', 'Pause Game');
      }
    }

    // 5. TARGET MISSION: Island name dominates in gold, ivory label, cyan bonus
    if (this.targetNameEl && this.lastTargetName !== targetName) {
      this.lastTargetName = targetName;
      this.targetNameEl.style.opacity = '0';
      this.targetNameEl.style.transform = 'translateY(-2px)';
      setTimeout(() => {
        if (this.targetNameEl) {
          this.targetNameEl.textContent = targetName.toUpperCase();
          this.targetNameEl.style.opacity = '1';
          this.targetNameEl.style.transform = 'translateY(0)';
        }
      }, 120);
    }

    if (this.targetBonusEl) {
      this.targetBonusEl.textContent = `+${targetBonus}`;
    }

    // 6. TEMPORARY STATUS: Display only the SINGLE highest-priority status
    // Priority order:
    // 1. Multiball active
    // 2. Power bounce armed
    // 3. Power ready
    // 4. Weather event
    // 5. Difficulty indicator
    if (this.statusTextEl && phase04State) {
      let statusLabel = '';
      let statusClass = '';

      if (phase04State.isMultiballActive) {
        const secs = Math.ceil(phase04State.multiballDurationRemainingSeconds);
        statusLabel = `3-BALL · ${secs}s`;
        statusClass = 'status-multiball';
      } else if (phase04State.isPowerArmed) {
        statusLabel = 'ARMED';
        statusClass = 'status-armed';
      } else if (phase04State.powerCharge >= 1) {
        statusLabel = 'POWER READY';
        statusClass = 'status-ready';
      } else if (phase04State.weatherType !== 'none') {
        const secs = Math.ceil(phase04State.weatherDurationRemainingSeconds);
        const name = phase04State.weatherType.toUpperCase();
        statusLabel = `${name} · ${secs}s`;
        statusClass = 'status-weather';
      } else {
        statusLabel = difficulty.toUpperCase();
        statusClass = '';
      }

      const statusKey = `${statusLabel}|${statusClass}`;
      if (this.lastStatusKey !== statusKey) {
        this.lastStatusKey = statusKey;
        this.statusTextEl.className = `hud-status-text ${statusClass}`.trim();
        this.statusTextEl.textContent = statusLabel;
      }
    }

    // 7. BOTTOM SLIM POWER METER: Elegant slim bar near bottom
    if (this.powerFillEl && phase04State) {
      const charge = Math.max(0, Math.min(1, phase04State.powerCharge));
      const isArmed = phase04State.isPowerArmed;

      if (this.lastCharge !== charge || this.lastArmed !== isArmed) {
        this.lastCharge = charge;
        this.lastArmed = isArmed;

        this.powerFillEl.style.width = `${Math.round(charge * 100)}%`;

        if (isArmed) {
          this.powerFillEl.className = 'hud-power-fill armed';
        } else if (charge >= 1) {
          this.powerFillEl.className = 'hud-power-fill charged';
        } else {
          this.powerFillEl.className = 'hud-power-fill';
        }
      }
    }
  }

  /**
   * Spawns an in-world floating score popup on the Phaser canvas at (x, y).
   */
  public spawnFloatingScore(x: number, y: number, pointsText: string, isTarget = false): void {
    const color = isTarget ? '#55E0C3' : '#43C9F0';
    const popup = this.scene.add
      .text(x, y - 10, pointsText, {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: isTarget ? '32px' : '26px',
        fontStyle: 'bold',
        color,
        stroke: '#020617',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(150);

    this.scene.tweens.add({
      targets: popup,
      y: y - 44,
      alpha: 0,
      duration: 550,
      ease: 'Power1',
      onComplete: () => {
        popup.destroy();
      },
    });
  }

  public setVisible(visible: boolean): void {
    if (this.rootElement) {
      this.rootElement.style.display = visible ? 'flex' : 'none';
    }
  }

  public destroy(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      window.removeEventListener('orientationchange', this.resizeHandler);
      if (this.scene.scale) {
        this.scene.scale.off('resize', this.resizeHandler);
      }
      this.resizeHandler = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.rootElement) {
      this.rootElement.remove();
      this.rootElement = null;
    }
  }
}
