import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter } from '../../src/persistence/storageAdapter';
import { FullBackupPayload } from '../../src/persistence/contracts';

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(async () => {
    adapter = new LocalStorageAdapter();
    await adapter.init();
    await adapter.clearAll();
  });

  it('provides default preferences and high scores', async () => {
    const prefs = await adapter.getPreferences();
    expect(prefs.locale).toBe('en');
    expect(prefs.theme).toBe('dark-nautical');
    expect(prefs.defaultDifficulty).toBe('normal');

    const scores = await adapter.getHighScores();
    expect(scores.normal.highScore).toBe(0);
  });

  it('saves and retrieves updated preferences and high scores', async () => {
    const prefs = await adapter.getPreferences();
    await adapter.savePreferences({
      ...prefs,
      locale: 'tr',
      theme: 'neon-arcade',
    });

    const updatedPrefs = await adapter.getPreferences();
    expect(updatedPrefs.locale).toBe('tr');
    expect(updatedPrefs.theme).toBe('neon-arcade');

    const scores = await adapter.getHighScores();
    await adapter.saveHighScores({
      ...scores,
      normal: {
        highScore: 12500,
        longestSurvivalSeconds: 142,
        highestCombo: 5,
        dateAchievedIso: '2026-10-13T12:00:00Z',
      },
    });

    const updatedScores = await adapter.getHighScores();
    expect(updatedScores.normal.highScore).toBe(12500);
    expect(updatedScores.normal.highestCombo).toBe(5);
  });

  it('exports and imports backup payloads in replace and merge modes', async () => {
    const backup = await adapter.exportFullBackup();
    expect(backup.metadata.schemaVersion).toBe(1);

    // Modify payload
    const modifiedPayload: FullBackupPayload = {
      ...backup,
      preferences: {
        ...backup.preferences,
        locale: 'el',
      },
      highScores: {
        ...backup.highScores,
        hard: {
          highScore: 50000,
          longestSurvivalSeconds: 300,
          highestCombo: 5,
          dateAchievedIso: '2026-10-13T12:00:00Z',
        },
      },
    };

    // Import with merge
    await adapter.importFullBackup(modifiedPayload, 'merge');
    const mergedPrefs = await adapter.getPreferences();
    expect(mergedPrefs.locale).toBe('el');

    const mergedScores = await adapter.getHighScores();
    expect(mergedScores.hard.highScore).toBe(50000);
  });

  it('rejects backup payload with unsupported schema version', async () => {
    const backup = await adapter.exportFullBackup();
    const badPayload = {
      ...backup,
      metadata: {
        ...backup.metadata,
        schemaVersion: 999, // Unsupported
      },
    };

    await expect(adapter.importFullBackup(badPayload, 'replace')).rejects.toThrow(
      'Incompatible or malformed backup schema version',
    );
  });
});
