import { FullBackupPayload, ImportReport } from './contracts';
import { GameDatabase } from './GameDatabase';
import { BackupValidationResult, BackupValidator } from './BackupValidator';

export class ImportExportService {
  private readonly db: GameDatabase;

  constructor(db?: GameDatabase) {
    this.db = db ?? GameDatabase.getInstance();
  }

  /**
   * Generates a validated JSON backup string of all persistent user progress.
   */
  public async exportBackupJson(): Promise<string> {
    const backup = await this.db.exportFullBackup();
    return JSON.stringify(backup, null, 2);
  }

  /**
   * Triggers a browser download of the backup file.
   */
  public async downloadBackupFile(customFilename?: string): Promise<void> {
    const jsonString = await this.exportBackupJson();
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = customFilename || `crete-pinball-backup-${dateStr}.json`;

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Validates a backup string or payload without applying changes.
   */
  public validateBackup(rawInput: string | unknown): BackupValidationResult {
    return BackupValidator.validate(rawInput);
  }

  /**
   * Imports and applies a backup payload into the database in either 'merge' or 'replace' mode.
   */
  public async importBackup(
    rawInput: string | FullBackupPayload,
    mode: 'merge' | 'replace',
  ): Promise<ImportReport> {
    const validation = this.validateBackup(rawInput);
    if (!validation.isValid || !validation.payload) {
      throw new Error(`Backup validation failed: ${validation.errors.join(', ')}`);
    }

    const payload = validation.payload;
    const prevScores = await this.db.getHighScores();
    const prevIslands = await this.db.getIslandProgress();
    const prevAchs = await this.db.getAchievements();

    await this.db.importFullBackup(payload, mode);

    const afterScores = await this.db.getHighScores();
    const afterIslands = await this.db.getIslandProgress();
    const afterAchs = await this.db.getAchievements();

    const updatedHighScores: string[] = [];
    for (const diff of ['easy', 'normal', 'hard'] as const) {
      if (afterScores[diff].highScore > prevScores[diff].highScore) {
        updatedHighScores.push(diff);
      }
    }

    const prevIslandCount = Object.keys(prevIslands.discoveredIslands).length;
    const afterIslandCount = Object.keys(afterIslands.discoveredIslands).length;
    const newDiscoveriesCount = Math.max(0, afterIslandCount - prevIslandCount);

    const prevAchCount = Object.keys(prevAchs.unlocked).length;
    const afterAchCount = Object.keys(afterAchs.unlocked).length;
    const newAchievementsCount = Math.max(0, afterAchCount - prevAchCount);

    return {
      success: true,
      mode,
      updatedHighScores,
      newDiscoveriesCount,
      newAchievementsCount,
      warnings: [...validation.warnings],
    };
  }
}
