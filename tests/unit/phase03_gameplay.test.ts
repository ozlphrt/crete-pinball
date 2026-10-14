import { describe, it, expect, beforeEach } from 'vitest';
import { ComboSystem } from '../../src/game/systems/comboSystem';
import { ScoringSystem } from '../../src/game/systems/scoringSystem';
import { LivesSystem } from '../../src/game/systems/livesSystem';
import { BonusTargetSystem } from '../../src/game/systems/bonusTargetSystem';
import { DifficultySystem, DIFFICULTY_CAPS } from '../../src/game/systems/difficultySystem';
import { SessionClock } from '../../src/game/systems/sessionClock';
import { RunController } from '../../src/game/systems/runController';
import { LocalStorageAdapter } from '../../src/persistence/storageAdapter';
import { PhysicsContactEvent } from '../../src/game/physics/physicsWorld';

describe('Phase 03 — Core Gameplay, Scoring, and Progression', () => {
  let comboSystem: ComboSystem;
  let livesSystem: LivesSystem;
  let targetSystem: BonusTargetSystem;
  let scoringSystem: ScoringSystem;
  let storage: LocalStorageAdapter;

  const mockIslandContact = (
    featureId: string,
    isNorthernPaddleHit = false,
    isBoundaryHit = false,
  ): PhysicsContactEvent => ({
    featureId,
    ballId: 'ball-primary',
    tick: 1,
    point: { x: 450, y: 700 },
    normal: { x: 0, y: -1 },
    incomingSpeed: 500,
    outgoingSpeed: 450,
    isNorthernPaddleHit,
    isBoundaryHit,
  });

  beforeEach(() => {
    comboSystem = new ComboSystem();
    livesSystem = new LivesSystem();
    targetSystem = new BonusTargetSystem({ initialSeed: 12345 });
    scoringSystem = new ScoringSystem(comboSystem, targetSystem, livesSystem);
    storage = new LocalStorageAdapter();
  });

  describe('1. Scoring System', () => {
    it('awards 100 base points for valid island collision', () => {
      const contact = mockIslandContact('cyclades-naxos');
      const scoreEvent = scoringSystem.processContact(contact, 10);

      expect(scoreEvent).not.toBeNull();
      expect(scoreEvent?.basePoints).toBe(100);
      expect(scoreEvent?.multiplier).toBe(1);
      expect(scoreEvent?.comboPoints).toBe(100);
      expect(scoringSystem.score).toBe(100);
      expect(scoringSystem.islandHits).toBe(1);
      expect(scoringSystem.distinctIslandsCount).toBe(1);
    });

    it('awards zero points for mainland collisions (mainland_greece, mainland_turkey)', () => {
      const greeceContact = mockIslandContact('mainland-attica');
      const turkeyContact = mockIslandContact('mainland-anatolia');

      const ev1 = scoringSystem.processContact(greeceContact, 10);
      const ev2 = scoringSystem.processContact(turkeyContact, 20);

      expect(ev1).toBeNull();
      expect(ev2).toBeNull();
      expect(scoringSystem.score).toBe(0);
      expect(scoringSystem.islandHits).toBe(0);
    });

    it('awards zero points for Crete paddle collisions and boundary hits', () => {
      const creteContact = mockIslandContact('island-crete', true, false);
      const boundaryContact = mockIslandContact('boundary_west', false, true);

      expect(scoringSystem.processContact(creteContact, 10)).toBeNull();
      expect(scoringSystem.processContact(boundaryContact, 20)).toBeNull();
      expect(scoringSystem.score).toBe(0);
    });

    it('prevents duplicate scoring from persistent contacts within cooldown ticks', () => {
      const contact = mockIslandContact('cyclades-paros');

      // First contact at tick 100: scores
      const ev1 = scoringSystem.processContact(contact, 100);
      expect(ev1).not.toBeNull();
      expect(scoringSystem.score).toBe(100);

      // Rapid persistent jitter contacts within 15 fixed ticks: 0 points
      const ev2 = scoringSystem.processContact(contact, 105);
      const ev3 = scoringSystem.processContact(contact, 114);
      expect(ev2).toBeNull();
      expect(ev3).toBeNull();
      expect(scoringSystem.score).toBe(100);

      // Contact after cooldown (>= 15 ticks later at tick 116): scores
      const ev4 = scoringSystem.processContact(contact, 116);
      expect(ev4).not.toBeNull();
      expect(scoringSystem.score).toBe(200);
    });
  });

  describe('2. Combo Rules and Multiplier', () => {
    it('consecutive hits on different islands build multiplier capped at x5', () => {
      const islands = [
        'cyclades-naxos',
        'cyclades-paros',
        'cyclades-mykonos',
        'cyclades-tinos',
        'cyclades-andros',
        'cyclades-syros',
      ];

      // Hit 1: naxos -> multiplier 1
      const res1 = comboSystem.recordIslandHit(islands[0]!);
      expect(res1.newMultiplier).toBe(1);
      expect(res1.isDistinct).toBe(true);

      // Hit 2: paros -> multiplier 2
      const res2 = comboSystem.recordIslandHit(islands[1]!);
      expect(res2.newMultiplier).toBe(2);

      // Hit 3: mykonos -> multiplier 3
      const res3 = comboSystem.recordIslandHit(islands[2]!);
      expect(res3.newMultiplier).toBe(3);

      // Hit 4: tinos -> multiplier 4
      const res4 = comboSystem.recordIslandHit(islands[3]!);
      expect(res4.newMultiplier).toBe(4);

      // Hit 5: andros -> multiplier 5 (cap)
      const res5 = comboSystem.recordIslandHit(islands[4]!);
      expect(res5.newMultiplier).toBe(5);

      // Hit 6: syros -> multiplier stays at 5
      const res6 = comboSystem.recordIslandHit(islands[5]!);
      expect(res6.newMultiplier).toBe(5);
      expect(comboSystem.highestMultiplier).toBe(5);
    });

    it('repeated hits on the same island earn base points but do not advance combo', () => {
      comboSystem.recordIslandHit('cyclades-naxos'); // mult 1
      comboSystem.recordIslandHit('cyclades-paros'); // mult 2
      expect(comboSystem.currentMultiplier).toBe(2);

      // Repeated hit on paros
      const repeatRes = comboSystem.recordIslandHit('cyclades-paros');
      expect(repeatRes.isDistinct).toBe(false);
      expect(repeatRes.newMultiplier).toBe(2); // does NOT advance
      expect(comboSystem.consecutiveDistinctIslands).toBe(2); // chain preserved

      // Hit a third island: advances combo to 3!
      const thirdRes = comboSystem.recordIslandHit('cyclades-milos');
      expect(thirdRes.isDistinct).toBe(true);
      expect(thirdRes.newMultiplier).toBe(3);
    });

    it('Crete rebounds preserve combos', () => {
      comboSystem.recordIslandHit('cyclades-naxos');
      comboSystem.recordIslandHit('cyclades-paros');
      expect(comboSystem.currentMultiplier).toBe(2);

      // Crete hit
      comboSystem.preserveCombo();
      expect(comboSystem.currentMultiplier).toBe(2);

      // Next distinct hit continues combo progression to 3
      const nextRes = comboSystem.recordIslandHit('cyclades-milos');
      expect(nextRes.newMultiplier).toBe(3);
    });

    it('losing a life resets combo multiplier to x1', () => {
      comboSystem.recordIslandHit('cyclades-naxos');
      comboSystem.recordIslandHit('cyclades-paros');
      comboSystem.recordIslandHit('cyclades-milos');
      expect(comboSystem.currentMultiplier).toBe(3);

      comboSystem.resetCombo();
      expect(comboSystem.currentMultiplier).toBe(1);
      expect(comboSystem.consecutiveDistinctIslands).toBe(0);
      expect(comboSystem.highestMultiplier).toBe(3); // tracks all-time highest for run
    });
  });

  describe('3. Lives System', () => {
    it('starts with single ball (1 life)', () => {
      expect(livesSystem.currentLives).toBe(1);
      expect(livesSystem.maxLives).toBe(5);
    });

    it('deducts one life at a time and detects game over at 0', () => {
      const l1 = livesSystem.loseLife();
      expect(l1.remainingLives).toBe(0);
      expect(l1.isGameOver).toBe(true);
    });

    it('awards extra lives at scoring milestones up to maxLives (5)', () => {
      // Starting: 1 life
      // Reach 5,000 pts -> 2 lives
      const m1 = livesSystem.checkExtraLifeMilestones(5500);
      expect(m1).toBe(true);
      expect(livesSystem.currentLives).toBe(2);

      // Repeat check at same milestone -> no duplicate life
      const m1Repeat = livesSystem.checkExtraLifeMilestones(6000);
      expect(m1Repeat).toBe(false);
      expect(livesSystem.currentLives).toBe(2);

      // Reach 15,000 pts -> 3 lives
      const m2 = livesSystem.checkExtraLifeMilestones(15500);
      expect(m2).toBe(true);
      expect(livesSystem.currentLives).toBe(3);

      // Directly add extra lives up to cap
      livesSystem.addExtraLife(); // 4
      livesSystem.addExtraLife(); // 5
      expect(livesSystem.currentLives).toBe(5);

      // Cannot exceed maxLives 5
      const overflow = livesSystem.addExtraLife();
      expect(overflow).toBe(false);
      expect(livesSystem.currentLives).toBe(5);
    });
  });

  describe('4. Bonus Target Selection and Scoring', () => {
    it('selects valid geographic Aegean island and provides +500 bonus', () => {
      const initialTarget = targetSystem.currentTarget;
      expect(initialTarget).toBeDefined();
      expect(initialTarget.id).not.toBe('island-crete');
      expect(initialTarget.bonusPoints).toBe(500);

      // Hit a non-target island
      const nonTargetHit = targetSystem.checkHit('random-island-not-target');
      expect(nonTargetHit).toBe(0);

      // Hit the target island
      const targetId = initialTarget.id;
      const bonusAwarded = targetSystem.checkHit(targetId);
      expect(bonusAwarded).toBe(500);

      // Automatically rotates to a new target
      const newTarget = targetSystem.currentTarget;
      expect(newTarget.id).toBeDefined();
      expect(newTarget.id).not.toBe(targetId);
    });
  });

  describe('5. Difficulty Modes and Progressive Ramp', () => {
    it('configures distinct presets for Easy, Normal, and Hard modes', () => {
      const easySys = new DifficultySystem('easy');
      const normalSys = new DifficultySystem('normal');
      const hardSys = new DifficultySystem('hard');

      const easyCfg = easySys.getInitialConfig();
      const normalCfg = normalSys.getInitialConfig();
      const hardCfg = hardSys.getInitialConfig();

      expect(easyCfg.gravity.y).toBeLessThan(normalCfg.gravity.y);
      expect(normalCfg.gravity.y).toBeLessThan(hardCfg.gravity.y);
      expect(easyCfg.maxBallSpeed).toBeLessThan(normalCfg.maxBallSpeed);
      expect(normalCfg.maxBallSpeed).toBeLessThan(hardCfg.maxBallSpeed);
    });

    it('smoothly ramps speed and gravity over time without exceeding safety caps', () => {
      const normalSys = new DifficultySystem('normal');
      const caps = DIFFICULTY_CAPS.normal;

      const at0 = normalSys.computeConfig(0);
      const at180 = normalSys.computeConfig(180); // 3 minutes
      const at3600 = normalSys.computeConfig(3600); // 60 minutes (extreme)

      // Speed ramps up
      expect(at180.maxBallSpeed).toBeGreaterThan(at0.maxBallSpeed);
      expect(at180.gravity.y).toBeGreaterThan(at0.gravity.y);

      // At extreme time, strictly respects hard caps
      expect(at3600.maxBallSpeed).toBe(caps.maxBallSpeedCap);
      expect(at3600.gravity.y).toBe(caps.maxGravityYCap);
    });
  });

  describe('6. Game Lifecycle and Session Management', () => {
    it('manages ready -> playing -> paused -> resume -> gameOver transitions', async () => {
      const controller = new RunController(storage, 'normal');
      await controller.startRun('normal');

      expect(controller.state).toBe('ready');
      expect(controller.lives).toBe(1);
      expect(controller.score).toBe(0);

      // Launch ball
      const launched = controller.launchBall();
      expect(launched).toBe(true);
      expect(controller.state).toBe('playing');

      // Pause game
      const paused = controller.pause();
      expect(paused).toBe(true);
      expect(controller.state).toBe('paused');

      // Simulation clock does not advance during pause
      controller.update(5.0);
      expect(controller.activeSeconds).toBe(0);

      // Resume transitions (paused -> resumeCountdown -> playing)
      controller.getStateManager.transitionTo('resumeCountdown');
      controller.getStateManager.transitionTo('playing');

      // Earn a bonus ball to reach 2 lives for testing lifeLost transition
      controller.getLivesSystem().addExtraLife();
      expect(controller.lives).toBe(2);

      const ballLostRes = controller.handleBallLost();
      expect(ballLostRes.remainingLives).toBe(1);
      expect(controller.state).toBe('lifeLost');

      // Reposition ball
      controller.handleBallRepositioned();
      expect(controller.state).toBe('ready');

      // Lose final ball -> Game Over
      controller.launchBall(); // ready -> playing
      const finalLost = controller.handleBallLost(); // 0 lives -> gameOver
      expect(finalLost.isGameOver).toBe(true);
      expect(controller.state).toBe('gameOver');
    });

    it('formats survival session duration cleanly', () => {
      const clock = new SessionClock();
      clock.advance(65.5);
      expect(clock.formattedDuration).toBe('01:05');
      clock.advance(180);
      expect(clock.formattedDuration).toBe('04:05');
    });
  });

  describe('7. Local Persistence and High Scores', () => {
    it('persists and isolates high scores per difficulty mode', async () => {
      await storage.init();
      const scores = await storage.getHighScores();

      const updatedScores = {
        easy: { ...scores.easy, highScore: 5200 },
        normal: { ...scores.normal, highScore: 14800 },
        hard: { ...scores.hard, highScore: 8600 },
      };

      await storage.saveHighScores(updatedScores);

      const loaded = await storage.getHighScores();
      expect(loaded.easy.highScore).toBe(5200);
      expect(loaded.normal.highScore).toBe(14800);
      expect(loaded.hard.highScore).toBe(8600);
    });

    it('persists active session snapshots for safe recovery', async () => {
      await storage.init();
      const controller = new RunController(storage, 'normal');
      await controller.startRun('normal');
      controller.launchBall();

      // Score some points
      const hit = mockIslandContact('cyclades-naxos');
      controller.handleContact(hit, 10);
      expect(controller.score).toBe(100);

      // Pausing automatically saves snapshot
      controller.pause();

      const activeSession = await storage.getActiveSession();
      expect(activeSession).not.toBeNull();
      expect(activeSession?.snapshot.score.currentScore).toBe(100);
      expect(activeSession?.snapshot.difficulty).toBe('normal');
      expect(activeSession?.snapshot.lives.currentLives).toBe(1);
    });

    it('faithfully restores active session state without corrupting high scores', async () => {
      await storage.init();
      const controller1 = new RunController(storage, 'hard');
      await controller1.startRun('hard');
      controller1.launchBall();

      // Score and combo
      controller1.handleContact(mockIslandContact('cyclades-naxos'), 10);
      controller1.handleContact(mockIslandContact('cyclades-paros'), 30);
      expect(controller1.score).toBe(300);
      expect(controller1.comboMultiplier).toBe(2);

      // Pause to save snapshot
      controller1.pause();
      const savedSession = await storage.getActiveSession();
      expect(savedSession).not.toBeNull();

      // Create fresh controller and restore session
      const controller2 = new RunController(storage, 'easy');
      const restored = controller2.restoreActiveSession(savedSession!);

      expect(restored).toBe(true);
      expect(controller2.difficulty).toBe('hard');
      expect(controller2.score).toBe(300);
      expect(controller2.comboMultiplier).toBe(2);
      expect(controller2.lives).toBe(1);
      expect(controller2.state).toBe('paused');
    });

    it('rejects corrupt or incompatible schema saved sessions safely', () => {
      const controller = new RunController(storage, 'normal');

      // Invalid schema version
      const corrupt1 = {
        schemaVersion: 999,
        snapshot: {},
      } as unknown as import('../../src/persistence/contracts').SavedGameSession;
      expect(controller.restoreActiveSession(corrupt1)).toBe(false);

      // Null or missing snapshot
      const corrupt2 =
        null as unknown as import('../../src/persistence/contracts').SavedGameSession;
      expect(controller.restoreActiveSession(corrupt2)).toBe(false);

      // Invalid difficulty
      const corrupt3 = {
        schemaVersion: 1,
        snapshot: { difficulty: 'extreme_impossible' },
      } as unknown as import('../../src/persistence/contracts').SavedGameSession;
      expect(controller.restoreActiveSession(corrupt3)).toBe(false);
    });

    it('clears active saved session upon game over', async () => {
      await storage.init();
      const controller = new RunController(storage, 'normal');
      await controller.startRun('normal');
      controller.launchBall();
      controller.pause();

      // Active session exists while paused
      expect(await storage.getActiveSession()).not.toBeNull();

      // Return to playing state and drain single ball to reach Game Over
      controller.getStateManager.forceState('playing');
      const finalLost = controller.handleBallLost();
      expect(finalLost.isGameOver).toBe(true);
      expect(controller.state).toBe('gameOver');

      // Verify active session was cleared from storage
      const sessionAfterGameOver = await storage.getActiveSession();
      expect(sessionAfterGameOver).toBeNull();
    });
  });
});
