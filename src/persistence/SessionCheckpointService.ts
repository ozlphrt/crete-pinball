import { GEO_DATA_VERSION, PHYSICS_RULESET_VERSION, SCHEMA_VERSION } from '../config';
import { FullSimulationSnapshot, SavedGameSession } from './contracts';
import { GameDatabase } from './GameDatabase';

export class SessionCheckpointService {
  private readonly db: GameDatabase;

  constructor(db?: GameDatabase) {
    this.db = db ?? GameDatabase.getInstance();
  }

  /**
   * Saves atomic snapshot of entire running simulation state.
   */
  public async saveCheckpoint(snapshot: FullSimulationSnapshot): Promise<void> {
    const session: SavedGameSession = {
      schemaVersion: SCHEMA_VERSION,
      geoDataVersion: GEO_DATA_VERSION,
      physicsRulesetVersion: PHYSICS_RULESET_VERSION,
      savedAtTimestamp: Date.now(),
      snapshot: {
        state: snapshot.gameState,
        difficulty: snapshot.difficulty,
        score: snapshot.score,
        lives: snapshot.lives,
        weather: snapshot.weather,
        powerBounce: snapshot.powerBounce,
        multiball: snapshot.multiball,
        simulatedTimeMs: snapshot.survivalDurationSeconds * 1000,
      },
      fullSnapshot: snapshot,
    };

    await this.db.saveActiveSession(session);
  }

  /**
   * Loads saved checkpoint, verifying version compatibility.
   * If snapshot is incompatible, clears the transient checkpoint and returns null.
   */
  public async loadCheckpoint(): Promise<FullSimulationSnapshot | null> {
    const session = await this.db.getActiveSession();
    if (!session) return null;

    if (!this.isCompatible(session)) {
      console.warn(
        '[SessionCheckpointService] Incompatible session checkpoint detected. Discarding transient run while preserving lifetime progress.',
      );
      await this.clearCheckpoint();
      return null;
    }

    if (session.fullSnapshot) {
      return session.fullSnapshot;
    }

    // Convert legacy or partial snapshot
    const snap = session.snapshot;
    return {
      schemaVersion: session.schemaVersion,
      geoDataVersion: session.geoDataVersion,
      physicsRulesetVersion: session.physicsRulesetVersion,
      savedAtTimestamp: session.savedAtTimestamp,
      difficulty: snap.difficulty,
      gameState: snap.state,
      score: snap.score,
      lives: snap.lives,
      weather: snap.weather,
      powerBounce: snap.powerBounce,
      multiball: snap.multiball,
      balls: [],
      paddle: {
        x: 450,
        vx: 0,
        powerBounceCharge: snap.powerBounce.chargeLevel,
        powerBounceArmed: snap.powerBounce.isArmed,
      },
      sessionHitCounts: {},
      currentDropCount: 1,
      survivalDurationSeconds: snap.simulatedTimeMs / 1000,
    };
  }

  /**
   * Determines if a saved session is compatible with the current build.
   */
  public isCompatible(session: SavedGameSession): boolean {
    return (
      session.schemaVersion === SCHEMA_VERSION &&
      session.geoDataVersion === GEO_DATA_VERSION &&
      session.physicsRulesetVersion === PHYSICS_RULESET_VERSION
    );
  }

  /**
   * Clears saved checkpoint atomically (e.g. on game over or manual restart).
   */
  public async clearCheckpoint(): Promise<void> {
    await this.db.saveActiveSession(null);
  }
}
