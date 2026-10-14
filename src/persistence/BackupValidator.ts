import { FullBackupPayload } from './contracts';
import { SchemaMigrations } from './SchemaMigrations';

export interface BackupValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly payload?: FullBackupPayload;
}

export class BackupValidator {
  public static readonly MAX_BACKUP_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

  /**
   * Validates raw JSON string or parsed object for backup restoration.
   */
  public static validate(rawInput: string | unknown): BackupValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    let parsed: unknown = rawInput;

    if (typeof rawInput === 'string') {
      if (rawInput.length > BackupValidator.MAX_BACKUP_SIZE_BYTES) {
        return {
          isValid: false,
          errors: [
            `Backup file exceeds maximum allowed size of 2 MB (${(rawInput.length / 1024 / 1024).toFixed(2)} MB)`,
          ],
          warnings: [],
        };
      }

      if (
        rawInput.includes('"__proto__"') ||
        rawInput.includes('"constructor"') ||
        rawInput.includes('"prototype"')
      ) {
        return {
          isValid: false,
          errors: [
            'Security check failed: backup contains forbidden prototype or constructor keys',
          ],
          warnings: [],
        };
      }

      try {
        parsed = JSON.parse(rawInput);
      } catch (e) {
        return {
          isValid: false,
          errors: [`Malformed JSON: ${(e as Error).message}`],
          warnings: [],
        };
      }
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        isValid: false,
        errors: ['Invalid root backup payload: expected a JSON object'],
        warnings: [],
      };
    }

    // Prototype pollution & malicious key check
    if (BackupValidator.detectPrototypePollution(parsed)) {
      return {
        isValid: false,
        errors: ['Security check failed: backup contains forbidden prototype or constructor keys'],
        warnings: [],
      };
    }

    const obj = parsed as Record<string, unknown>;

    // Check metadata
    if (!obj.metadata || typeof obj.metadata !== 'object') {
      errors.push('Missing required "metadata" object');
    } else {
      const meta = obj.metadata as Record<string, unknown>;
      if (typeof meta.schemaVersion !== 'number' || meta.schemaVersion < 1) {
        errors.push('Invalid metadata.schemaVersion: expected positive integer');
      }
    }

    // Check preferences
    if (obj.preferences && typeof obj.preferences !== 'object') {
      errors.push('Invalid "preferences": expected object');
    }

    // Check high scores
    if (obj.highScores && typeof obj.highScores !== 'object') {
      errors.push('Invalid "highScores": expected object');
    } else if (obj.highScores) {
      const scores = obj.highScores as Record<string, unknown>;
      for (const diff of ['easy', 'normal', 'hard']) {
        if (scores[diff] && typeof scores[diff] === 'object') {
          const s = scores[diff] as Record<string, unknown>;
          if (typeof s.highScore === 'number' && s.highScore < 0) {
            warnings.push(`Negative high score found in ${diff}, clamping to 0`);
            (scores[diff] as Record<string, unknown>).highScore = 0;
          }
        }
      }
    }

    // Check island progress
    if (obj.islandProgress && typeof obj.islandProgress !== 'object') {
      errors.push('Invalid "islandProgress": expected object');
    }

    // Check achievements
    if (obj.achievements && typeof obj.achievements !== 'object') {
      errors.push('Invalid "achievements": expected object');
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Sanitize through migration pipeline
    try {
      const migrated = SchemaMigrations.migrateBackupPayload(parsed);
      return {
        isValid: true,
        errors: [],
        warnings: [...warnings, ...migrated.notes],
        payload: migrated.data,
      };
    } catch (err) {
      return {
        isValid: false,
        errors: [(err as Error).message],
        warnings,
      };
    }
  }

  /**
   * Recursively detects prototype pollution attempts (__proto__, constructor, prototype)
   */
  private static detectPrototypePollution(data: unknown, depth = 0): boolean {
    if (depth > 20) return true; // Depth limit
    if (!data || typeof data !== 'object') return false;

    if (Array.isArray(data)) {
      for (const item of data) {
        if (BackupValidator.detectPrototypePollution(item, depth + 1)) return true;
      }
      return false;
    }

    const keys = Object.getOwnPropertyNames(data);
    for (const key of keys) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return true;
      }
      const val = (data as Record<string, unknown>)[key];
      if (val && typeof val === 'object') {
        if (BackupValidator.detectPrototypePollution(val, depth + 1)) return true;
      }
    }

    return false;
  }
}
