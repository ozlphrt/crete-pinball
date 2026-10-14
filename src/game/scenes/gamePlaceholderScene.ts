import Phaser from 'phaser';
import { ARENA_CONFIG } from '../../config';
import { CoordinateTransformer } from '../world/coordinateTransformer';
import { InputAdapter } from '../input/inputAdapter';
import { I18nManager } from '../../i18n';
import {
  DiagnosticOverlay,
  GeographyDiagnosticData,
  PhysicsDiagnosticData,
} from '../../debug/diagnosticOverlay';
import { GameStateManager } from '../systems/gameStateManager';
import { CretePaddle } from '../entities/cretePaddle';
import { GeographyRenderer } from '../rendering/geographyRenderer';
import { getStaticFeatures } from '../../geography/aegeanData';
import { IslandFeature } from '../../geography/contracts';
import { PhysicsWorld } from '../physics/physicsWorld';
import { BallRenderer } from '../rendering/ballRenderer';
import { PhysicsOverlay } from '../../debug/physicsOverlay';
import { GameplayHUD, HUDPhase04State } from '../ui/gameplayHUD';
import { ResultsScreen } from '../ui/resultsScreen';
import { ResumeCountdown } from '../ui/resumeCountdown';
import { RunController, RunSummary } from '../systems/runController';
import { GameDifficulty } from '../../types';
import { LocalStorageAdapter } from '../../persistence/storageAdapter';
import { NorthernBallSpawner } from '../physics/northernBallSpawner';
import { GameEventBus } from '../events/gameEventBus';
import { PhysicsTuningPanel } from '../../debug/physicsTuningPanel';
import { BallBody } from '../physics/ballBody';
import { AudioManager } from '../../audio/audioManager';
import { EffectDirector } from '../rendering/effectDirector';
import { AdaptiveQualityController } from '../rendering/adaptiveQuality';
import { TutorialDirector } from '../tutorial/tutorialDirector';
import { TutorialOverlay } from '../ui/tutorialOverlay';
import { SettingsModal } from '../ui/settingsModal';
import { IslandProgressService } from '../../progress/IslandProgressService';
import { HighScoreService } from '../../progress/HighScoreService';
import { AchievementEvaluator } from '../../progress/AchievementEvaluator';
import { AchievementToast } from '../ui/achievementToast';
import { AchievementsModal } from '../ui/achievementsModal';
import { AnalyticsCollector } from '../../analytics/AnalyticsCollector';
import { SessionCheckpointService } from '../../persistence/SessionCheckpointService';
import { SCHEMA_VERSION, GEO_DATA_VERSION, PHYSICS_RULESET_VERSION } from '../../config';
import { VISUAL_ASSETS } from '../../assets/visuals';
import { CameraZoomController } from '../camera/cameraZoomController';

export class GamePlaceholderScene extends Phaser.Scene {
  private i18n!: I18nManager;
  private stateManager!: GameStateManager;
  private transformer!: CoordinateTransformer;
  private inputAdapter!: InputAdapter;
  private diagnosticOverlay!: DiagnosticOverlay;
  private cretePaddle!: CretePaddle;
  private geographyRenderer!: GeographyRenderer;
  private physicsWorld!: PhysicsWorld;
  private ballRenderer!: BallRenderer;
  private physicsOverlay!: PhysicsOverlay;
  private cameraZoomController!: CameraZoomController;

  // Phase 05 Audio, Effects, Tutorial, Accessibility & Quality
  private audioManager!: AudioManager;
  private effectDirector!: EffectDirector;
  private qualityController!: AdaptiveQualityController;
  private tutorialDirector!: TutorialDirector;
  private tutorialOverlay!: TutorialOverlay;
  private settingsModal!: SettingsModal;

  // Phase 03 & 04 Gameplay Systems & UI
  private runController!: RunController;
  private storageAdapter!: LocalStorageAdapter;
  private difficulty: GameDifficulty = 'normal';
  private restoreRequested = false;
  private hud!: GameplayHUD;
  private resultsScreen!: ResultsScreen;

  // Phase 06 Progression, Analytics, and Persistence
  private progressService!: IslandProgressService;
  private highScoreService!: HighScoreService;
  private achievementEvaluator!: AchievementEvaluator;
  private analyticsCollector!: AnalyticsCollector;
  private checkpointService!: SessionCheckpointService;
  private resumeCountdown!: ResumeCountdown;
  private targetReticleGraphics!: Phaser.GameObjects.Graphics;
  private trajectoryGraphics!: Phaser.GameObjects.Graphics;
  private specialIslandFlashGraphics!: Phaser.GameObjects.Graphics;
  private announcementText!: Phaser.GameObjects.Text;
  private tuningPanel!: PhysicsTuningPanel;
  private northernSpawner!: NorthernBallSpawner;
  private dropCount = 0;
  private countdownTimer: Phaser.Time.TimerEvent | null = null;
  private northernDropIntervalId: number | null = null;
  private lastDropOrLaunchTimestamp = 0;
  private noBallsDetectedTimestamp = 0;
  private hasPlayerMovedPaddle = false;

  // Graphics objects & developer guidelines
  private guidelinesGraphics!: Phaser.GameObjects.Graphics;
  private devGuideLinesContainer!: Phaser.GameObjects.Container;
  private pointerMarker!: Phaser.GameObjects.Arc;
  private intentFeedbackText!: Phaser.GameObjects.Text;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super({ key: 'GamePlaceholderScene' });
  }

  public init(data?: {
    i18n?: I18nManager;
    stateManager?: GameStateManager;
    difficulty?: GameDifficulty;
    storageAdapter?: LocalStorageAdapter;
    restoreSession?: boolean;
  }): void {
    const d = data ?? {};
    this.i18n = d.i18n ?? new I18nManager('en');
    this.hasPlayerMovedPaddle = false;
    this.stateManager = d.stateManager ?? new GameStateManager('ready');
    this.difficulty = d.difficulty ?? 'normal';
    this.storageAdapter = d.storageAdapter ?? new LocalStorageAdapter();
    this.restoreRequested = !!d.restoreSession;

    this.transformer = new CoordinateTransformer(
      ARENA_CONFIG.worldWidth,
      ARENA_CONFIG.worldHeight,
      {
        width: this.scale.width,
        height: this.scale.height,
        dpr: window.devicePixelRatio || 1,
      },
    );
    this.inputAdapter = new InputAdapter(this.transformer);
    this.diagnosticOverlay = new DiagnosticOverlay();
    this.cretePaddle = new CretePaddle();
    this.northernSpawner = new NorthernBallSpawner();
    this.dropCount = 0;

    // Phase 06 Services
    this.progressService = IslandProgressService.getInstance();
    this.highScoreService = HighScoreService.getInstance();
    this.checkpointService = new SessionCheckpointService();
    this.analyticsCollector = AnalyticsCollector.getInstance();
  }

  public preload(): void {
    if (!this.textures.exists('aegean_background')) {
      this.load.image('aegean_background', VISUAL_ASSETS.aegean_background);
    }
    if (!this.textures.exists('aegean_terrain')) {
      this.load.image('aegean_terrain', VISUAL_ASSETS.aegean_terrain);
    }
    if (!this.textures.exists('aegean_terrain_daylight')) {
      this.load.image('aegean_terrain_daylight', VISUAL_ASSETS.aegean_terrain_daylight);
    }
    if (!this.textures.exists('aegean_terrain_normal')) {
      this.load.image('aegean_terrain_normal', VISUAL_ASSETS.aegean_terrain_normal);
    }
    if (!this.textures.exists('crete_paddle')) {
      this.load.image('crete_paddle', VISUAL_ASSETS.crete_paddle);
    }
    if (!this.textures.exists('crete_paddle_daylight')) {
      this.load.image('crete_paddle_daylight', VISUAL_ASSETS.crete_paddle_daylight);
    }
    if (!this.textures.exists('crete_paddle_normal')) {
      this.load.image('crete_paddle_normal', VISUAL_ASSETS.crete_paddle_normal);
    }
  }

  public create(): void {
    // Camera setup
    const arenaH = Math.max(ARENA_CONFIG.worldHeight, this.scale.height);
    this.cameras.main.setBackgroundColor('#061328');
    this.cameras.main.setBounds(0, 0, ARENA_CONFIG.worldWidth, arenaH);

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const newH = Math.max(ARENA_CONFIG.worldHeight, gameSize.height);
      this.cameras.main.setBounds(0, 0, ARENA_CONFIG.worldWidth, newH);
      this.geographyRenderer.refreshStaticGeography();
    });

    // Playfield guidelines & structural frame
    this.guidelinesGraphics = this.add.graphics();
    this.guidelinesGraphics.setDepth(0);
    this.renderPlayfieldGuidelines();

    // Geography Renderer (Static Layer, Dynamic Crete, Labels)
    this.geographyRenderer = new GeographyRenderer(this, this.cretePaddle, this.i18n);

    // Physics Simulation Engine & Ball Renderer
    this.physicsWorld = new PhysicsWorld(this.cretePaddle);
    this.ballRenderer = new BallRenderer(this);
    this.physicsOverlay = new PhysicsOverlay(this);

    // Graphics layers for Trajectory & Island Special Flash
    this.trajectoryGraphics = this.add.graphics().setDepth(12);
    this.specialIslandFlashGraphics = this.add.graphics().setDepth(14);
    this.targetReticleGraphics = this.add.graphics().setDepth(15);

    // Phase 03 & 04 Run Controller & Storage
    this.runController = new RunController(this.storageAdapter, this.difficulty, this.stateManager);
    this.physicsWorld.setSpecialIslandSystem(this.runController.getSpecialIslandSystem());

    if (this.restoreRequested) {
      const activeSaved = this.storageAdapter.getActiveSessionSync();
      if (activeSaved && activeSaved.snapshot && activeSaved.snapshot.lives.currentLives > 0) {
        const ok = this.runController.restoreActiveSession(activeSaved);
        if (ok) {
          this.difficulty = activeSaved.snapshot.difficulty;
          this.stateManager.forceState('ready');
        } else {
          this.runController.startRun(this.difficulty);
        }
      } else {
        this.runController.startRun(this.difficulty);
      }
    } else {
      this.runController.startRun(this.difficulty);
    }

    // Apply difficulty physics limits
    const diffSys = this.runController.getDifficultySystem();
    this.physicsWorld.setGravity(0, diffSys.getGravity());
    this.physicsWorld.setMaxBallSpeed(diffSys.getMaxBallSpeed());

    // Phase 03 & 04 UI Components
    this.hud = new GameplayHUD(this);
    this.resultsScreen = new ResultsScreen(this);
    this.resumeCountdown = new ResumeCountdown(this);

    // Phase 05 Audio System
    const prefs = this.storageAdapter.getPreferencesSync();
    this.audioManager = AudioManager.getInstance();
    this.audioManager.setSfxVolume(prefs.soundVolume);
    this.audioManager.setAmbienceVolume(prefs.ambienceVolume);
    this.audioManager.setMusicVolume(prefs.musicVolume);
    this.audioManager.setSfxMuted(prefs.soundMuted);
    this.audioManager.setAmbienceMuted(prefs.ambienceMuted);
    this.audioManager.setMusicMuted(prefs.musicMuted);
    this.audioManager.startAmbience();

    // High Contrast Accessibility
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('high-contrast', !!prefs.highContrast);
    }

    // Phase 05 Visual Effects & Adaptive Graphics Quality
    const eventBus = GameEventBus.getInstance();
    this.audioManager.bindToEventBus(eventBus);
    this.effectDirector = new EffectDirector(this);
    this.effectDirector.bindToEventBus(eventBus);
    this.effectDirector.setReducedMotion(prefs.reducedMotion);
    this.effectDirector.setQuality(prefs.graphicsQuality);

    this.qualityController = new AdaptiveQualityController(prefs.graphicsQuality);
    this.qualityController.onQualityChanged((tier) => {
      this.effectDirector.setQuality(tier);
    });

    // Phase 06 Achievements Evaluator & Toast Banner
    this.achievementEvaluator = AchievementEvaluator.getInstance(
      undefined,
      eventBus,
      this.progressService,
      this.i18n,
    );
    eventBus.on('achievementUnlocked', (payload) => {
      AchievementToast.show(payload);
    });

    // Phase 05 Interactive Tutorial
    this.tutorialDirector = new TutorialDirector(this.storageAdapter, this.i18n);
    this.tutorialOverlay = new TutorialOverlay(this.tutorialDirector, this.i18n);
    this.tutorialDirector.onComplete(() => {
      this.tutorialOverlay.hide();
      this.physicsWorld.setPaused(false);
      if (this.stateManager.getState() === 'ready') {
        this.startNorthernBallDrop();
      }
    });

    // Phase 05 Settings Modal
    this.settingsModal = new SettingsModal(this.storageAdapter, this.i18n, this.audioManager, {
      onResumeClick: () => {
        this.settingsModal.hide();
        if (this.stateManager.getState() === 'paused') {
          this.togglePause();
        }
      },
      onRestartClick: () => {
        this.settingsModal.hide();
        this.restartGame();
      },
      onReplayTutorialClick: () => {
        this.settingsModal.hide();
        this.physicsWorld.setPaused(true);
        this.tutorialDirector.start();
        this.tutorialOverlay.show();
      },
      onLocaleChanged: (loc) => {
        this.i18n.setLocale(loc);
        this.geographyRenderer.refreshLabels();
        this.tutorialOverlay.updateLocale();
        this.hud.setCreteLabel(this.i18n.t('game.crete'));
      },
      onReducedMotionChanged: (enabled) => {
        this.effectDirector.setReducedMotion(enabled);
      },
      onQualityChanged: (q) => {
        this.qualityController.setPreference(q);
        this.effectDirector.setQuality(this.qualityController.getEffectiveQuality());
      },
      onDifficultyChanged: (diff) => {
        this.difficulty = diff;
        this.runController.startRun(diff);
        const dSys = this.runController.getDifficultySystem();
        this.physicsWorld.setGravity(0, dSys.getGravity());
        this.physicsWorld.setMaxBallSpeed(dSys.getMaxBallSpeed());
      },
      onExploreClick: () => {
        this.scene.start('ExploreScene', { i18n: this.i18n });
      },
    });

    // Dynamic Camera Zoom Controller (default: ON, smooth & seasickness-free tracking)
    this.cameraZoomController = new CameraZoomController(
      this.cameras.main,
      this.cretePaddle,
      { enabledByDefault: true },
    );
    this.hud.setZoomActive(true);
    this.hud.setCreteLabel(this.i18n.t('game.crete'));

    // Wire HUD buttons
    this.hud.onToggleZoom(() => {
      const isEnabled = this.cameraZoomController.toggle();
      this.hud.setZoomActive(isEnabled);
    });
    this.hud.onPauseClick(() => {
      this.togglePause();
    });
    this.hud.onSettingsClick(() => {
      const curState = this.stateManager.getState();
      if (curState === 'playing') {
        this.togglePause();
      }
      this.settingsModal.show();
    });

    // Centered Banner Announcement Text (Weather, Multiball, Abilities)
    this.announcementText = this.add
      .text(ARENA_CONFIG.worldWidth / 2, 280, '', {
        fontFamily: 'monospace',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#f1e05a',
        align: 'center',
        stroke: '#040810',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(210)
      .setAlpha(0);

    // Automatically pause and checkpoint simulation state when genuinely backgrounded/hidden
    const handleVisibilityHidden = (): void => {
      if (typeof document !== 'undefined' && !document.hidden) {
        return;
      }
      const curState = this.stateManager.getState();
      if (curState === 'playing') {
        this.runController.pause();
        this.physicsWorld.setPaused(true);
        this.saveActiveCheckpoint();
      }
    };

    this.game.events.on('app_backgrounded', handleVisibilityHidden);

    this.events.once('shutdown', () => {
      this.game.events.off('app_backgrounded', handleVisibilityHidden);
      this.hud?.destroy();
      this.effectDirector?.destroy();
      this.tutorialOverlay?.destroy();
      this.settingsModal?.destroy();
      this.audioManager?.stopAmbience();
    });
    this.events.once('destroy', () => {
      this.game.events.off('app_backgrounded', handleVisibilityHidden);
      this.hud?.destroy();
      this.effectDirector?.destroy();
      this.tutorialOverlay?.destroy();
      this.settingsModal?.destroy();
      this.audioManager?.stopAmbience();
    });

    // Wire Results screen callbacks
    this.resultsScreen.setI18n(this.i18n);
    this.resultsScreen.onPlayAgain(() => {
      this.restartGame();
    });
    this.resultsScreen.onExplore(() => {
      this.scene.start('ExploreScene', { i18n: this.i18n });
    });
    this.resultsScreen.onAchievements(() => {
      new AchievementsModal(undefined, this.i18n).show();
    });

    // Wire Physics Contact to Scoring System, Audio and Visual Effects
    this.physicsWorld.setOnContact((event) => {
      const currentTick = this.physicsWorld.getSimTick();
      const scored = this.runController.handleContact(event, currentTick);

      if (event.isNorthernPaddleHit || event.featureId === 'island-crete') {
        const isCharged = !!this.runController.getCreteEnergySystem().isArmed;
        eventBus.emit('creteRebound', {
          impactPoint: event.point,
          impactSpeed: event.incomingSpeed,
          isCharged,
        });
      } else if (event.featureId.includes('mainland')) {
        eventBus.emit('mainlandHit', {
          mainlandId: event.featureId,
          impactPoint: event.point,
          impactSpeed: event.incomingSpeed,
        });
      } else {
        const isTarget = this.runController.currentTarget.islandId === event.featureId;
        const isSpecial = this.runController
          .getSpecialIslandSystem()
          .getRegistry()
          .isSpecialIsland(event.featureId);
        eventBus.emit('islandHit', {
          islandId: event.featureId,
          islandName: event.featureId,
          isSpecial,
          isTarget,
          points: scored ? scored.totalPointsAwarded : 0,
          combo: this.runController.comboMultiplier,
          impactPoint: event.point,
          impactSpeed: event.incomingSpeed,
        });
      }

      if (scored) {
        this.progressService.recordHit(event.featureId, scored.totalPointsAwarded);
        if (scored.isTargetHit) {
          eventBus.emit('bonusTargetHit', {
            islandId: event.featureId,
            bonusPoints: scored.targetBonus || 500,
          });
        }
        if (scored.multiplier > 1 && scored.multiplier !== this.runController.comboMultiplier) {
          eventBus.emit('comboIncreased', {
            combo: scored.multiplier,
            points: scored.totalPointsAwarded,
          });
        }
        if (scored.extraLifeGranted) {
          this.showAnnouncement('🌟 EXTRA BALL EARNED!', '#55E0C3');
          eventBus.emit('extraBallEarned', { totalLives: this.runController.lives });
        }
      }
      // Flash illuminated coastline & reveal localized daylight terrain on impact
      this.geographyRenderer.flashIslandImpact(event.featureId, event.point, event.incomingSpeed);
    });

    // Wire Ball Lost (Southern Drain) -> Primary ball loss vs Bonus ball exit
    this.physicsWorld.setOnBallLost((ballId) => {
      eventBus.emit('ballLost', { remainingLives: this.runController.lives });
      const actualBallId = ballId || 'ball-primary';
      const outcome = this.runController.handleBallLost(actualBallId);
      if (!outcome.isBonusExit && !outcome.isGameOver) {
        this.time.delayedCall(600, () => {
          this.runController.handleBallRepositioned();
          this.startNorthernBallDrop();
        });
      }
    });

    this.physicsWorld.setOnBonusBallLost((ballId) => {
      this.runController.handleBallLost(ballId);
      this.hud.spawnFloatingScore(ARENA_CONFIG.worldWidth / 2, 1550, 'BONUS BALL EXITED', false);
    });

    this.physicsWorld.setOnPowerBounceConsumed((point) => {
      this.hud.spawnFloatingScore(point.x, point.y - 20, '⚡ CHARGED POWER BOUNCE!', true);
      this.flashSpecialIslandRipple(point.x, point.y, 0xf1e05a);
      eventBus.emit('powerBounceFired', { point, outgoingSpeed: 950 });
    });

    // Wire Game Over
    this.runController.onGameOver(async (summary: RunSummary) => {
      eventBus.emit('gameOver', {
        finalScore: summary.finalScore,
        survivalSeconds: summary.survivalSeconds,
      });

      const sessionHitCounts = this.progressService.getSessionHitCounts();
      const evalRes = await this.highScoreService.evaluateAndRecord({
        difficulty: summary.difficulty,
        finalScore: summary.finalScore,
        survivalDurationSeconds: summary.survivalSeconds,
        formattedDuration: summary.formattedDuration,
        totalIslandHits: summary.totalIslandHits,
        distinctIslandsCount: summary.distinctIslandsCount,
        highestCombo: summary.highestCombo,
      });

      this.analyticsCollector.recordSessionCompleted(summary.survivalSeconds, summary.highestCombo);
      await this.checkpointService.clearCheckpoint();

      const fullSummary: RunSummary = {
        ...summary,
        isNewHighScore: evalRes.isNewRecord,
        previousHighScore: evalRes.previousHighScore,
      };

      this.resultsScreen.show(fullSummary, sessionHitCounts);
    });

    // Wire Multiball System Spawner
    const multiSys = this.runController.getMultiballSystem();
    multiSys.onSpawnBonusBalls(() => {
      const initialSpeed = this.runController.getDifficultySystem().getInitialBallSpeed();
      const spawn1 = this.northernSpawner.generateSpawn(this.dropCount++, initialSpeed);
      const spawn2 = this.northernSpawner.generateSpawn(this.dropCount++, initialSpeed);
      this.physicsWorld.addBonusBall(
        spawn1.point.x,
        spawn1.point.y,
        spawn1.velocity.x,
        spawn1.velocity.y,
        'ball-bonus-1',
      );
      this.physicsWorld.addBonusBall(
        spawn2.point.x,
        spawn2.point.y,
        spawn2.velocity.x,
        spawn2.velocity.y,
        'ball-bonus-2',
      );
      this.showAnnouncement('⚡ 3-BALL MULTIBALL ACTIVATED!', '#f1e05a');
    });

    multiSys.onRetireBonusBalls((survivingBallId) => {
      this.physicsWorld.retireBonusBalls(survivingBallId);
      this.showAnnouncement('Multiball Concluded', '#8b949e');

      // If no balls are active after retiring bonus balls, safely drop a northern replacement ball!
      if (!this.physicsWorld.hasActiveBalls() && this.runController.lives > 0 && this.stateManager.getState() === 'playing') {
        this.startNorthernBallDrop();
      }
    });

    // Wire Game Events
    eventBus.on('specialIslandActivated', (ev) => {
      this.flashSpecialIslandRipple(ev.point.x, ev.point.y);
      this.geographyRenderer.flashSpecialActivation(ev.islandId);
      const desc =
        ev.ability === 'explosive_bumper'
          ? '💥 SANTORINI EXPLOSIVE BUMPER!'
          : ev.ability === 'speed_boost'
            ? '⚡ RHODES SPEED BOOST (+250 u/s)!'
            : ev.ability === 'score_multiplier'
              ? '✨ MYKONOS ×2 SCORE MULTIPLIER!'
              : '💰 LESBOS BONUS (+1,000 PTS)!';
      this.hud.spawnFloatingScore(ev.point.x, ev.point.y, desc, true);
    });

    eventBus.on('weatherChanged', (ev) => {
      const force = this.runController.getWeatherDirector().activeForce;
      this.physicsWorld.setWeatherForce(force.x, force.y);
      if (ev.type !== 'none' && ev.description) {
        this.showAnnouncement(ev.description, '#79c0ff');
      }
    });

    eventBus.on('slowMotionChanged', (ev) => {
      this.physicsWorld.setTimeDilationFactor(ev.factor);
      if (ev.active) {
        this.hud.spawnFloatingScore(this.cretePaddle.x, 1400, '⏱️ SLOW MOTION', true);
      }
    });

    // Developer Physics Tuning Panel
    this.tuningPanel = new PhysicsTuningPanel(this.physicsWorld, this.runController);

    // Pointer World Marker
    this.pointerMarker = this.add.circle(ARENA_CONFIG.worldWidth / 2, 1200, 10, 0xf0883e, 0.8);
    this.pointerMarker.setDepth(30);
    this.pointerMarker.setVisible(false);

    // Intent Feedback Text
    this.intentFeedbackText = this.add
      .text(
        ARENA_CONFIG.worldWidth / 2,
        1380,
        '⚠️ INCOMING BALL FROM NORTH — POSITION CRETE TO DEFEND!',
        {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '24px',
          fontStyle: 'bold',
          color: '#7ee787',
          align: 'center',
          stroke: '#040810',
          strokeThickness: 4,
        },
      )
      .setOrigin(0.5)
      .setDepth(30);

    // Wire countdown tap-to-drop
    this.resumeCountdown.onTap(() => {
      if (this.stateManager.getState() === 'ready') {
        this.triggerImmediateDropIfReady();
      }
    });

    // Start northern ball drop into active play
    this.startNorthernBallDrop();

    // Pointer Listeners (full-screen touch & drag control)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y < GameplayHUD.HUD_HEIGHT) return; // Ignore HUD interactions
      this.inputAdapter.handlePointerDown(pointer.worldX, pointer.worldY);

      // Skip countdown and drop immediately if in ready state
      if (this.stateManager.getState() === 'ready') {
        this.triggerImmediateDropIfReady();
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.inputAdapter.handlePointerMove(pointer.worldX, pointer.worldY);
    });

    this.input.on('pointerup', () => {
      this.inputAdapter.handlePointerUp();
    });

    // Forward container-level touch events from outside canvas (e.g., extended ocean area below Crete)
    if (typeof document !== 'undefined') {
      const container = document.getElementById('game-container');
      if (container) {
        const handleExternalPointer = (e: PointerEvent, type: 'down' | 'move' | 'up'): void => {
          if (e.target === this.game.canvas) return;
          if ((e.target as HTMLElement)?.closest?.('.hud-pause-btn')) return;

          const canvas = this.game.canvas;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return;

          const canvasX = ((e.clientX - rect.left) / rect.width) * ARENA_CONFIG.worldWidth;
          const canvasY = ((e.clientY - rect.top) / rect.height) * ARENA_CONFIG.worldHeight;
          const wp = this.cameras.main.getWorldPoint(canvasX, canvasY);
          const worldX = wp.x;
          const worldY = wp.y;

          if (type === 'down') {
            this.audioManager.resumeContext();
            if (worldY < GameplayHUD.HUD_HEIGHT) return;
            this.inputAdapter.handlePointerDown(worldX, worldY);
            if (this.stateManager.getState() === 'ready') {
              this.triggerImmediateDropIfReady();
            }
          } else if (type === 'move') {
            if (e.buttons > 0 || e.pointerType === 'touch') {
              this.inputAdapter.handlePointerMove(worldX, worldY);
            }
          } else if (type === 'up') {
            this.inputAdapter.handlePointerUp();
          }
        };

        const extDown = (e: PointerEvent): void => handleExternalPointer(e, 'down');
        const extMove = (e: PointerEvent): void => handleExternalPointer(e, 'move');
        const extUp = (e: PointerEvent): void => handleExternalPointer(e, 'up');

        container.addEventListener('pointerdown', extDown);
        window.addEventListener('pointermove', extMove);
        window.addEventListener('pointerup', extUp);

        this.events.once('shutdown', () => {
          container.removeEventListener('pointerdown', extDown);
          window.removeEventListener('pointermove', extMove);
          window.removeEventListener('pointerup', extUp);
        });
        this.events.once('destroy', () => {
          container.removeEventListener('pointerdown', extDown);
          window.removeEventListener('pointermove', extMove);
          window.removeEventListener('pointerup', extUp);
        });
      }
    }

    // Keyboard controls
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event && event.repeat) return;
      const key = (event.key || '').toUpperCase();
      const code = event.code || '';

      if (code === 'Space' || key === ' ' || key === 'SPACE') {
        const curState = this.stateManager.getState();
        if (curState === 'ready') {
          this.triggerImmediateDropIfReady();
        } else if (curState === 'playing') {
          if (Date.now() - this.lastDropOrLaunchTimestamp < 500) {
            return;
          }
          this.togglePause();
        } else if (curState === 'paused') {
          this.togglePause();
        }
      } else if (code === 'KeyD' || key === 'D') {
        this.toggleDiagnostics();
      } else if (code === 'KeyP' || key === 'P') {
        this.physicsOverlay.toggle();
      } else if (code === 'KeyT' || key === 'T') {
        this.tuningPanel.toggle();
      } else if (code === 'KeyE' || key === 'E') {
        // Arm power bounce if ready
        if (this.runController.getCreteEnergySystem().arm()) {
          this.physicsWorld.setPowerBounceArmed(true);
        }
      } else if (code === 'KeyM' || key === 'M') {
        // Dev trigger multiball
        this.runController.getMultiballSystem().triggerMultiball();
      } else if (code === 'KeyC' || key === 'C') {
        this.geographyRenderer.toggleCollisionSegments();
      } else if (code === 'KeyB' || key === 'B') {
        this.geographyRenderer.toggleBoundingBoxes();
      } else if (code === 'KeyL' || key === 'L') {
        this.geographyRenderer.toggleLabels();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    this.events.once('shutdown', () => {
      this.clearNorthernDropTimer();
      this.tuningPanel?.destroy();
      window.removeEventListener('keydown', onKeyDown);
    });
    this.events.once('destroy', () => {
      this.clearNorthernDropTimer();
      this.tuningPanel?.destroy();
      window.removeEventListener('keydown', onKeyDown);
    });

    // Scale resize listener
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.transformer.updateViewport({
        width: gameSize.width,
        height: gameSize.height,
        dpr: window.devicePixelRatio || 1,
      });
    });
  }

  private showAnnouncement(text: string, color = '#f1e05a'): void {
    this.announcementText.setText(text);
    this.announcementText.setColor(color);
    this.announcementText.setAlpha(1);

    this.tweens.killTweensOf(this.announcementText);
    this.tweens.add({
      targets: this.announcementText,
      alpha: 0,
      duration: 1800,
      ease: 'Power2',
    });
  }

  private flashSpecialIslandRipple(x: number, y: number, color = 0x58a6ff): void {
    const g = this.specialIslandFlashGraphics;
    let radius = 10;
    const maxRadius = 65;

    const timer = this.time.addEvent({
      delay: 20,
      repeat: 20,
      callback: () => {
        g.clear();
        radius += 2.5;
        const alpha = Math.max(0, 1 - radius / maxRadius);
        g.lineStyle(2, color, alpha);
        g.strokeCircle(x, y, radius);
        if (radius >= maxRadius) {
          g.clear();
          timer.remove();
        }
      },
    });
  }

  private clearNorthernDropTimer(): void {
    if (this.countdownTimer) {
      this.countdownTimer.remove();
      this.countdownTimer = null;
    }
    if (this.northernDropIntervalId !== null) {
      window.clearInterval(this.northernDropIntervalId);
      this.northernDropIntervalId = null;
    }
  }

  private startNorthernBallDrop(immediate = false): void {
    this.clearNorthernDropTimer();

    // Show first-time interactive tutorial if not yet completed
    if (!immediate && this.tutorialDirector.shouldShowTutorialSync()) {
      this.physicsWorld.setPaused(true);
      this.tutorialDirector.start();
      this.tutorialOverlay.show();
      return;
    }

    const ball = this.physicsWorld.getBall();
    const initialSpeed = this.runController.getDifficultySystem().getInitialBallSpeed();
    const spawnData = this.northernSpawner.generateSpawn(this.dropCount++, initialSpeed);

    ball.spawnAt(spawnData.point.x, spawnData.point.y);
    this.physicsWorld.setPaused(true);

    if (immediate) {
      this.lastDropOrLaunchTimestamp = Date.now();
      this.resumeCountdown.hide();
      ball.drop(spawnData.velocity.x, spawnData.velocity.y);
      this.physicsWorld.setPaused(false);
      if (this.stateManager.getState() === 'ready') {
        this.runController.launchBall();
      }
      return;
    }

    let secsLeft = 3;
    this.resumeCountdown.show(secsLeft, 'INCOMING BALL FROM THE NORTH...', spawnData.point);

    this.northernDropIntervalId = window.setInterval(() => {
      secsLeft--;
      if (secsLeft > 0) {
        this.resumeCountdown.show(secsLeft, 'INCOMING BALL FROM THE NORTH...', spawnData.point);
      } else {
        this.clearNorthernDropTimer();
        this.resumeCountdown.show(0, 'INCOMING BALL FROM THE NORTH...', spawnData.point);
        window.setTimeout(() => {
          this.lastDropOrLaunchTimestamp = Date.now();
          this.resumeCountdown.hide();
          ball.drop(spawnData.velocity.x, spawnData.velocity.y);
          this.physicsWorld.setPaused(false);
          if (this.stateManager.getState() === 'ready') {
            this.runController.launchBall();
          }
        }, 200);
      }
    }, 1000);
  }

  private triggerImmediateDropIfReady(): void {
    if (this.stateManager.getState() === 'ready') {
      this.startNorthernBallDrop(true);
    }
  }

  private togglePause(): void {
    const curState = this.stateManager.getState();
    if (curState === 'playing') {
      this.runController.pause();
      this.physicsWorld.setPaused(true);
    } else if (curState === 'paused') {
      this.runController.resume(
        (secsLeft) => {
          this.resumeCountdown.show(secsLeft);
        },
        () => {
          this.resumeCountdown.hide();
          this.physicsWorld.setPaused(false);
        },
      );
    }
  }

  private restartGame(): void {
    this.audioManager.resumeContext();
    this.resultsScreen.hide();
    this.dropCount = 0;
    this.physicsWorld.retireBonusBalls();
    this.progressService.resetSession();
    this.achievementEvaluator.resetSession();
    this.checkpointService.clearCheckpoint().catch(() => {});
    this.hasPlayerMovedPaddle = false;
    this.runController.startRun(this.difficulty);
    this.startNorthernBallDrop();
  }

  private async saveActiveCheckpoint(): Promise<void> {
    try {
      const physSnap = this.physicsWorld.createSnapshot();
      const runSnap = this.runController.getPlayStateSnapshot();

      await this.checkpointService.saveCheckpoint({
        schemaVersion: SCHEMA_VERSION,
        geoDataVersion: GEO_DATA_VERSION,
        physicsRulesetVersion: PHYSICS_RULESET_VERSION,
        savedAtTimestamp: Date.now(),
        difficulty: this.difficulty,
        gameState: this.stateManager.getState(),
        score: runSnap.score,
        lives: runSnap.lives,
        weather: runSnap.weather,
        powerBounce: runSnap.powerBounce,
        multiball: runSnap.multiball,
        balls: [
          {
            x: physSnap.ball.x,
            y: physSnap.ball.y,
            vx: physSnap.ball.vx,
            vy: physSnap.ball.vy,
            spin: physSnap.ball.angularVelocity,
            ballId: 'ball-primary',
            isBonus: false,
          },
          ...(physSnap.bonusBalls ?? []).map((b) => ({
            x: b.x,
            y: b.y,
            vx: b.vx,
            vy: b.vy,
            spin: b.angularVelocity,
            ballId: b.id,
            isBonus: true,
          })),
        ],
        paddle: {
          x: this.cretePaddle.x,
          vx: this.cretePaddle.velocityX,
          powerBounceCharge: runSnap.powerBounce.chargeLevel,
          powerBounceArmed: runSnap.powerBounce.isArmed,
        },
        sessionHitCounts: this.progressService.getSessionHitCounts(),
        currentDropCount: this.dropCount,
        survivalDurationSeconds: runSnap.simulatedTimeMs / 1000,
      });
    } catch (err) {
      console.warn('[GamePlaceholderScene] saveActiveCheckpoint error:', err);
    }
  }

  private renderPlayfieldGuidelines(): void {
    const g = this.guidelinesGraphics;
    g.clear();

    const w = ARENA_CONFIG.worldWidth;
    const h = ARENA_CONFIG.worldHeight;

    // Subtle dark arena outer frame vignette (non-distracting, cinematic)
    g.lineStyle(1.5, 0x0f172a, 0.4);
    g.strokeRect(0, 0, w, h);

    // Developer guide lines container (hidden in normal gameplay, toggled via KeyD)
    this.devGuideLinesContainer = this.add.container(0, 0);
    this.devGuideLinesContainer.setDepth(2);
    this.devGuideLinesContainer.setVisible(false);

    const devLinesG = this.add.graphics();
    this.devGuideLinesContainer.add(devLinesG);

    // Coordinate grid lines every 300 units (developer mode only)
    devLinesG.lineStyle(1, 0x161b22, 0.35);
    for (let x = 300; x < w; x += 300) {
      devLinesG.lineBetween(x, 0, x, h);
    }
    for (let y = 300; y < h; y += 300) {
      devLinesG.lineBetween(0, y, w, y);
    }

    // Lower control zone divider (Y = 1000)
    devLinesG.lineStyle(1.5, 0x238636, 0.5);
    devLinesG.lineBetween(0, 1000, w, 1000);
    const controlText = this.add
      .text(20, 1008, '↑ OPEN AEGEAN BASIN / ↓ TOUCH CONTROL ZONE (Y: 1000)', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#2ea043',
      })
      .setOrigin(0, 0);
    this.devGuideLinesContainer.add(controlText);

    // Crete defensive guide line (Y = 1460)
    devLinesG.lineStyle(1.5, 0x58a6ff, 0.5);
    devLinesG.lineBetween(
      this.cretePaddle.minX,
      ARENA_CONFIG.creteBaselineY,
      this.cretePaddle.maxX,
      ARENA_CONFIG.creteBaselineY,
    );
    const creteZoneText = this.add
      .text(
        ARENA_CONFIG.worldWidth / 2,
        ARENA_CONFIG.creteBaselineY - 32,
        this.i18n.t('game.creteZone'),
        {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#58a6ff',
        },
      )
      .setOrigin(0.5);
    this.devGuideLinesContainer.add(creteZoneText);

    // Southern escape drain line (Y = 1580)
    devLinesG.lineStyle(2.5, 0xda3633, 0.7);
    devLinesG.lineBetween(0, ARENA_CONFIG.escapeBoundaryY, w, ARENA_CONFIG.escapeBoundaryY);
    const drainText = this.add
      .text(
        ARENA_CONFIG.worldWidth / 2,
        ARENA_CONFIG.escapeBoundaryY - 14,
        this.i18n.t('game.southernDrain'),
        {
          fontFamily: 'monospace',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#f85149',
        },
      )
      .setOrigin(0.5);
    this.devGuideLinesContainer.add(drainText);
  }

  private toggleDiagnostics(): void {
    const isVisible = this.diagnosticOverlay.toggle();
    if (this.devGuideLinesContainer) {
      this.devGuideLinesContainer.setVisible(isVisible);
    }
  }

  public override update(time: number, delta: number): void {
    const curState = this.stateManager.getState();
    const isPaused = curState === 'paused' || curState === 'resumeCountdown';

    const deltaSeconds = Math.min(delta / 1000, 0.1);

    if (!isPaused && curState !== 'gameOver') {
      // Keyboard Arrow navigation
      const userMovedKeyboard = !!(this.cursors?.left?.isDown || this.cursors?.right?.isDown);

      // Input intent polling (from mouse / touch drag)
      const intent = this.inputAdapter.pollIntent();
      const userMovedPointer = intent.targetPaddleWorldX !== null;

      if (userMovedKeyboard || userMovedPointer) {
        this.hasPlayerMovedPaddle = true;
      }

      if (!this.hasPlayerMovedPaddle) {
        // At the beginning, gently oscillate Crete back and forth (amplitude ±50px, period ~2.4s)
        // so the player intuitively discovers that Crete is the moveable paddle!
        const baseCenterX = ARENA_CONFIG.worldWidth / 2;
        const oscillationAmp = 50;
        const oscillationSpeed = 0.0026;
        const oscX = baseCenterX + Math.sin(time * oscillationSpeed) * oscillationAmp;
        this.cretePaddle.setTargetX(oscX);
      } else {
        if (this.cursors?.left.isDown) {
          this.cretePaddle.moveLeft(25);
        } else if (this.cursors?.right.isDown) {
          this.cretePaddle.moveRight(25);
        }

        if (intent.targetPaddleWorldX !== null) {
          this.cretePaddle.setTargetX(intent.targetPaddleWorldX);
        }
      }

      // Check double-tap intent for power bounce arming
      if (intent.powerBounceTriggered) {
        if (this.runController.getCreteEnergySystem().arm()) {
          this.physicsWorld.setPowerBounceArmed(true);
        }
      }

      // Advance Crete horizontal physics (clamped, speed limited, instant stop)
      this.cretePaddle.update(deltaSeconds);

      // Trigger immediate drop from intent tap if in ready state
      if (intent.launchTriggered && curState === 'ready') {
        this.triggerImmediateDropIfReady();
      }

      // Step continuous physics simulation at fixed 120 Hz
      this.physicsWorld.update(delta);

      // Update Phase 03 & 04 Systems & Dynamic Difficulty Ramp
      this.runController.update(deltaSeconds);
      const diffSys = this.runController.getDifficultySystem();
      this.physicsWorld.setGravity(0, diffSys.getGravity());
      this.physicsWorld.setMaxBallSpeed(diffSys.getMaxBallSpeed());

      // Check Critical Approach for Cinematic Slow Motion
      const activeBalls = this.physicsWorld.getActiveBalls();
      for (const b of activeBalls) {
        this.runController.getTimeDilationController().checkCriticalApproach(b.y, b.vy);
      }

      // Progress & Achievement evaluation
      this.achievementEvaluator.updateSurvivalTime(this.runController.activeSeconds);
      this.achievementEvaluator.updateScore(this.runController.score);

      // Fail-safe watchdog: ensure the player is never stranded with 0 active balls during active play
      const activeBallsNow = this.physicsWorld.getActiveBalls();
      if (activeBallsNow.length === 0) {
        if (!this.noBallsDetectedTimestamp) {
          this.noBallsDetectedTimestamp = time;
        } else if (time - this.noBallsDetectedTimestamp > 1000) {
          console.warn('[GamePlaceholderScene] Watchdog: No active balls detected during play. Recovering ball...');
          this.noBallsDetectedTimestamp = 0;
          this.runController.getMultiballSystem().reset();
          this.physicsWorld.retireBonusBalls();

          if (this.runController.lives > 0) {
            this.showAnnouncement('BALL RECOVERED', '#38bdf8');
            this.runController.handleBallRepositioned();
            this.startNorthernBallDrop(true);
          } else {
            this.runController.handleBallLost('ball-primary');
          }
        }
      } else {
        this.noBallsDetectedTimestamp = 0;
      }
    } else {
      this.noBallsDetectedTimestamp = 0;
    }

    // Render ball(s) and dynamic graphics
    const activeBalls = this.physicsWorld.getActiveBalls();
    this.cameraZoomController.update(deltaSeconds, activeBalls);
    this.ballRenderer.update(activeBalls, deltaSeconds);
    this.physicsOverlay.update(this.physicsWorld);
    this.geographyRenderer.update();

    // Update Phase 05 Visual Effects & Adaptive Graphics Quality
    this.effectDirector.update(time, delta);
    this.qualityController.update(time, delta);

    // Update Trajectory Prediction
    this.updateTrajectoryPrediction(activeBalls);

    // Update HUD with Phase 04 State
    const target = this.runController.currentTarget;
    const p4State: HUDPhase04State = {
      powerCharge: this.runController.getCreteEnergySystem().charge,
      isPowerArmed: this.runController.getCreteEnergySystem().isArmed,
      weatherType: this.runController.getWeatherDirector().activeType,
      weatherDurationRemainingSeconds: this.runController.getWeatherDirector().durationRemaining,
      isMultiballActive: this.runController.getMultiballSystem().isActive,
      multiballDurationRemainingSeconds:
        this.runController.getMultiballSystem().durationRemaining / 1000,
    };

    const targetDisplayName = this.runController.getTargetDisplayName(
      this.i18n.getLocale() as any,
    );

    this.hud.update(
      this.runController.score,
      this.runController.comboMultiplier,
      this.runController.lives,
      targetDisplayName,
      target.bonusPoints,
      this.runController.difficulty,
      curState === 'paused',
      p4State,
    );

    // Update Floating Off-Screen Crete Indicator Beacon
    const offscreenFactor = this.cameraZoomController.getCreteOffscreenFactor();
    const creteNormX = this.cameraZoomController.getCreteScreenNormalizedX();
    const isArmed = this.runController.getCreteEnergySystem().isArmed;
    const isCharged = this.runController.getCreteEnergySystem().charge >= 1.0;
    this.hud.updateCreteIndicator(offscreenFactor, creteNormX, isArmed, isCharged);

    // Update Target Reticle on Island & geography renderer target highlight
    this.updateTargetReticle(target.islandId, time);
    this.geographyRenderer.setTargetIsland(target.islandId);

    // Intent and state feedback message (developer diagnostic mode only)
    const primaryBall = this.physicsWorld.getBall();
    if (this.diagnosticOverlay.visible) {
      if (curState === 'ready' || primaryBall.state === 'held') {
        this.intentFeedbackText.setText('⚠️ INCOMING BALL FROM NORTH — POSITION CRETE TO DEFEND!');
        this.intentFeedbackText.setColor('#34d399');
        this.intentFeedbackText.setVisible(true);
      } else if (curState === 'lifeLost' || primaryBall.state === 'lost') {
        this.intentFeedbackText.setText('🌊 Southern Drain Exit! Respawning from the North...');
        this.intentFeedbackText.setColor('#f87171');
        this.intentFeedbackText.setVisible(true);
      } else if (curState === 'gameOver') {
        this.intentFeedbackText.setVisible(false);
      } else {
        const contacts = this.physicsWorld.getContactEvents();
        const lastHit = contacts[contacts.length - 1];
        const hitStr = lastHit
          ? `${lastHit.featureId} (${lastHit.incomingSpeed.toFixed(0)} u/s)`
          : 'None';
        const ballCountStr = activeBalls.length > 1 ? ` | Balls: ${activeBalls.length}` : '';
        this.intentFeedbackText.setText(
          `Ball: ${primaryBall.speed.toFixed(0)} u/s | Spin: ${primaryBall.angularVelocity.toFixed(1)} rad/s | Last: ${hitStr}${ballCountStr}`,
        );
        this.intentFeedbackText.setColor('#38bdf8');
        this.intentFeedbackText.setVisible(true);
      }
    } else {
      this.intentFeedbackText.setVisible(false);
    }

    // Telemetry updates
    const diag = this.inputAdapter.getDiagnostics();
    const hoveredIsland = diag.lastWorldPoint
      ? this.findHoveredIsland(diag.lastWorldPoint.x, diag.lastWorldPoint.y)
      : null;

    const renderOptions = this.geographyRenderer.getOptions();
    const staticFeatures = getStaticFeatures();
    const collidableCount = staticFeatures.filter((f) => f.isCollidable).length;
    const visualOnlyCount = staticFeatures.filter(
      (f) => !f.isCollidable && !f.classification.includes('mainland'),
    ).length;

    const geoDiag: GeographyDiagnosticData = {
      hoveredFeatureId: hoveredIsland ? hoveredIsland.id : null,
      hoveredFeatureName: hoveredIsland
        ? hoveredIsland.names[this.i18n.getLocale()] || hoveredIsland.names.en
        : null,
      hoveredClassification: hoveredIsland ? hoveredIsland.classification : null,
      totalIslandsCount:
        staticFeatures.filter((f) => !f.classification.includes('mainland')).length + 1,
      collidableCount: collidableCount + 1,
      visualOnlyCount,
      cretePaddleX: this.cretePaddle.x,
      creteVelocityX: this.cretePaddle.velocityX,
      creteMinX: this.cretePaddle.minX,
      creteMaxX: this.cretePaddle.maxX,
      collisionSegmentsVisible: !!renderOptions.showCollisionSegments,
      boundingBoxesVisible: !!renderOptions.showBoundingBoxes,
      labelsVisible: !!renderOptions.showLabels,
    };

    const contacts = this.physicsWorld.getContactEvents();
    const lastContact = contacts[contacts.length - 1] ?? null;

    const physDiag: PhysicsDiagnosticData = {
      ballX: primaryBall.x,
      ballY: primaryBall.y,
      ballVx: primaryBall.vx,
      ballVy: primaryBall.vy,
      ballSpeed: primaryBall.speed,
      ballSpin: primaryBall.angularVelocity,
      ballState: primaryBall.state,
      gravityY: this.physicsWorld.getConfig().gravity.y,
      simTick: this.physicsWorld.getSimTick(),
      sweptInterventionsCount: this.physicsWorld.getSweptInterventionsCount(),
      antiStuckCount: this.physicsWorld.getLastAntiStuckEvent() ? 1 : 0,
      lastContactFeatureId: lastContact ? lastContact.featureId : null,
      lastContactSpeed: lastContact ? lastContact.incomingSpeed : null,
      isLastContactNorthPaddle: lastContact ? lastContact.isNorthernPaddleHit : false,
      physicsOverlayVisible: this.physicsOverlay.isVisible,
      ballRadius: primaryBall.radius,
      ballGlowRadius: this.ballRenderer.getGlowRadius(),
    };

    this.diagnosticOverlay.update({
      state: this.stateManager.getState(),
      transform: this.transformer.getTransform(),
      pointerScreen: diag.lastScreenPoint,
      pointerWorld: diag.lastWorldPoint,
      targetPaddleX: this.cretePaddle.targetX,
      fps: this.game.loop.actualFps,
      isDevMode: true,
      geo: geoDiag,
      physics: physDiag,
    });
  }

  private updateTrajectoryPrediction(balls: readonly BallBody[]): void {
    const g = this.trajectoryGraphics;
    g.clear();

    if (balls.length === 0) return;

    // Select the lowest descending ball approaching Crete
    let candidate: BallBody | null = null;
    let maxY = -Infinity;

    for (const b of balls) {
      if (b.state === 'in_play' && b.vy > 80 && b.y > maxY) {
        maxY = b.y;
        candidate = b;
      }
    }

    if (!candidate) return;

    const pred = this.runController
      .getLandingPredictor()
      .predict(
        candidate.position,
        candidate.velocity,
        candidate.radius,
        this.physicsWorld.getEffectiveGravity(),
        this.physicsWorld.getGrid(),
      );

    if (pred.isReliable && pred.predictedLandingX !== null) {
      // Draw subtle dashed trajectory only when developer diagnostics are active
      if (this.diagnosticOverlay.visible) {
        g.lineStyle(1.5, 0x388bfd, 0.4);
        for (let i = 0; i < pred.trajectoryPoints.length - 1; i += 2) {
          const p1 = pred.trajectoryPoints[i]!;
          const p2 = pred.trajectoryPoints[i + 1] ?? p1;
          g.lineBetween(p1.x, p1.y, p2.x, p2.y);
        }
      }

      // Draw subtle landing tick on Crete baseline
      const lx = pred.predictedLandingX;
      const ly = ARENA_CONFIG.creteBaselineY;
      g.lineStyle(2, 0x58a6ff, 0.8);
      g.lineBetween(lx - 12, ly, lx + 12, ly);
      g.lineBetween(lx, ly - 8, lx, ly + 8);
      g.fillStyle(0x79c0ff, 0.5);
      g.fillCircle(lx, ly, 4);
    }
  }

  private updateTargetReticle(targetIslandId: string, time: number): void {
    const g = this.targetReticleGraphics;
    g.clear();

    const features = getStaticFeatures();
    const feat = features.find((f) => f.id === targetIslandId);
    if (!feat) return;

    const cx = feat.centroid.x;
    const cy = feat.centroid.y;

    const pulse = (Math.sin(time * 0.005) + 1) * 0.5;
    const radius = 24 + pulse * 5;

    // Subtle glowing beacon halo around active target island
    g.fillStyle(0x10b981, 0.04 + pulse * 0.04);
    g.fillCircle(cx, cy, radius);

    g.lineStyle(1.2, 0x10b981, 0.40);
    g.strokeCircle(cx, cy, radius);

    g.fillStyle(0x34d399, 0.65);
    g.fillCircle(cx, cy, 2.0);
  }

  private findHoveredIsland(worldX: number, worldY: number): IslandFeature | null {
    const staticFeatures = getStaticFeatures();
    return (
      staticFeatures.find((f) => {
        const b = f.boundingBox;
        return worldX >= b.minX && worldX <= b.maxX && worldY >= b.minY && worldY <= b.maxY;
      }) ?? null
    );
  }
}
