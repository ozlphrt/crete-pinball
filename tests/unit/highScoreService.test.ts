import { describe, it, expect, beforeEach } from 'vitest';
import { HighScoreService, SessionRunData } from '../../src/progress/HighScoreService';
import { GameDatabase } from '../../src/persistence/GameDatabase';

describe('HighScoreService', () => {
  let db: GameDatabase;
  let service: HighScoreService;

  beforeEach(async () => {
    db = new GameDatabase();
    await db.init();
    await db.clearAll();
    service = new HighScoreService(db);
    await service.loadHighScores();
  });

  it('initializes with default zero high scores across all difficulties', () => {
    const easy = service.getHighScore('easy');
    const normal = service.getHighScore('normal');
    const hard = service.getHighScore('hard');

    expect(easy.highScore).toBe(0);
    expect(normal.highScore).toBe(0);
    expect(hard.highScore).toBe(0);
  });

  it('records a new high score for easy without affecting normal or hard', async () => {
    const run: SessionRunData = {
      difficulty: 'easy',
      finalScore: 12000,
      survivalDurationSeconds: 95,
      formattedDuration: '01:35',
      totalIslandHits: 22,
      distinctIslandsCount: 14,
      highestCombo: 4,
    };

    const evalResult = await service.evaluateAndRecord(run);

    expect(evalResult.isNewRecord).toBe(true);
    expect(evalResult.previousHighScore).toBe(0);
    expect(evalResult.currentHighScore).toBe(12000);

    const easy = service.getHighScore('easy');
    expect(easy.highScore).toBe(12000);
    expect(easy.longestSurvivalSeconds).toBe(95);
    expect(easy.highestCombo).toBe(4);

    expect(service.getHighScore('normal').highScore).toBe(0);
    expect(service.getHighScore('hard').highScore).toBe(0);
  });

  it('does not overwrite higher score when a subsequent run is lower', async () => {
    await service.evaluateAndRecord({
      difficulty: 'normal',
      finalScore: 25000,
      survivalDurationSeconds: 150,
      formattedDuration: '02:30',
      totalIslandHits: 40,
      distinctIslandsCount: 20,
      highestCombo: 6,
    });

    const lowerRun: SessionRunData = {
      difficulty: 'normal',
      finalScore: 18000,
      survivalDurationSeconds: 120,
      formattedDuration: '02:00',
      totalIslandHits: 28,
      distinctIslandsCount: 16,
      highestCombo: 3,
    };

    const evalResult = await service.evaluateAndRecord(lowerRun);

    expect(evalResult.isNewRecord).toBe(false);
    expect(evalResult.previousHighScore).toBe(25000);
    expect(evalResult.currentHighScore).toBe(25000);

    const normal = service.getHighScore('normal');
    expect(normal.highScore).toBe(25000);
    expect(normal.longestSurvivalSeconds).toBe(150);
  });

  it('updates longest survival when score ties and survival duration is longer', async () => {
    await service.evaluateAndRecord({
      difficulty: 'hard',
      finalScore: 10000,
      survivalDurationSeconds: 80,
      formattedDuration: '01:20',
      totalIslandHits: 15,
      distinctIslandsCount: 10,
      highestCombo: 3,
    });

    const tiedRun: SessionRunData = {
      difficulty: 'hard',
      finalScore: 10000,
      survivalDurationSeconds: 110, // Longer survival!
      formattedDuration: '01:50',
      totalIslandHits: 20,
      distinctIslandsCount: 12,
      highestCombo: 3,
    };

    const evalResult = await service.evaluateAndRecord(tiedRun);
    expect(evalResult.isNewRecord).toBe(false);

    const hard = service.getHighScore('hard');
    expect(hard.highScore).toBe(10000);
    expect(hard.longestSurvivalSeconds).toBe(110);
  });

  it('maintains bounded history of recent session summaries', async () => {
    for (let i = 1; i <= 5; i++) {
      await service.evaluateAndRecord({
        difficulty: 'normal',
        finalScore: i * 1000,
        survivalDurationSeconds: i * 20,
        formattedDuration: `00:${i * 20}`,
        totalIslandHits: i * 5,
        distinctIslandsCount: i * 3,
        highestCombo: i,
      });
    }

    const summaries = await service.getRecentSessionSummaries();
    expect(summaries.length).toBe(5);
    // Most recent first
    expect(summaries[0]!.finalScore).toBe(5000);
    expect(summaries[4]!.finalScore).toBe(1000);
  });
});
