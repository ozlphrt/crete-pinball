# Crete Pinball — Phase 06: Player Progress, Exploration and Persistence

Version: 1.0  
Status: Ready only after explicit Phase 05 approval  
Scope: Interactive exploration atlas, persistent island discoveries, achievements, game-over results, local analytics, versioned saved data, manual import/export and shareable result cards.

## 1. Mission

Deliver the complete offline, single-player progression experience on top of the approved Phase 05 game. Preserve geographic fidelity, gameplay physics, score computation, difficulty tuning, visual themes, input mechanics and localization. This phase builds durable player-facing records and developer-facing analytics, not a server, online account or leaderboard.

## 2. Mandatory prerequisites and approval gate

Before touching code, read `CLAUDE.md`, `GAME_DESIGN.md`, `DECISION_REGISTER.md`, `TECHNICAL_ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, `TEST_MATRIX.md`, Phase 00–05 completion notes, current `PROGRESS.md`, and relevant source files. Verify that Phase 05 has explicit user approval. If approval is missing, stop and explain what is missing. Inspect existing local storage, score events, stable island IDs, map projection, pause/resume, localization and PWA asset handling; extend those systems rather than duplicating them.

Do not start Phase 07 or prematurely replace existing service-worker behavior in this phase. Phase 07 owns final installability, exhaustive offline cache auditing, update activation and device certification. Phase 06 may implement storage and offline features needed by its own functionality.

## 3. Design decisions carried into Phase 06

- **Q19:** Personal high scores only. No global leaderboard, accounts or backend.
- **Q20:** Core game works offline after required assets have been cached.
- **Q22:** Hybrid contextual island labels, localized by name.
- **Q33:** Game-over results plus an interactive Aegean map of visited islands.
- **Q34:** Permanent cumulative record of discovered islands and collision statistics.
- **Q36:** Separate pinch-zoom/pan exploration mode; gameplay camera remains fixed.
- **Q38:** Separate high score for Easy, Normal and Hard.
- **Q46:** Accessibility settings persist.
- **Q47:** English, Turkish and Greek, with localized island names and consistent IDs.
- **Q48:** Approximately 15–20 cosmetic achievement badges; no mechanical advantages.
- **Q49:** Shareable results image generated locally, with save/download fallback.
- **Q55:** Versioned data and safe migrations; incompatible active games may reset without deleting lasting progress.
- **Q56:** Manual JSON export/import with validation and merge/replace.
- **Q26:** Background auto-pause, session checkpoint, three-second resume countdown.
- **Q54:** Detailed local-only gameplay analytics and a developer dashboard.

## 4. Non-negotiable invariants

1. No island positions, shapes, coastline collision bodies, geospatial projection, ball dynamics or scoring formulas may change.
2. Atlas zoom/pan is independent of the active gameplay camera and cannot affect collisions, touch coordinates or Crete movement.
3. Persist records using stable island identifiers; never key stored data by localized names, render indices or polygon order.
4. All gameplay effects, rewards and analytics consume authoritative committed gameplay events; none may award additional score through UI callbacks.
5. Offline means no required runtime network requests for map tiles, translations, sharing-image generation, atlas data or achievements.
6. Player records do not require an account, server, cookies or analytics service.
7. No silent deletion of earned progress during migration or import. Preserve a recoverable backup where possible.
8. Saved state must be captured at safe game boundaries and restored atomically; never resume half a multiball or inconsistent weather event.
9. Data collection must be local, bounded, user-clearable and exportable.
10. All player-facing strings, achievements, error messages and map details have English, Turkish and Greek localizations.
11. Share imagery and results must not reveal device IDs or other private identifiers.
12. Existing accessibility preferences and reduced-motion settings continue to work in atlas, results and share flows.

## 5. Suggested module layout

Use the existing architecture where possible; these are illustrative contracts:

```text
src/
  progress/
    PlayerProfileRepository.ts
    IslandProgressService.ts
    AchievementRegistry.ts
    AchievementEvaluator.ts
    HighScoreService.ts
  atlas/
    ExplorationScene.ts
    AtlasCameraController.ts
    IslandHitTest.ts
    AtlasSelectionPanel.ts
  results/
    GameResultsScene.ts
    ResultsMapOverlay.ts
    ResultsCardRenderer.ts
    ShareService.ts
  persistence/
    GameDatabase.ts
    SchemaMigrations.ts
    SessionCheckpointService.ts
    BackupValidator.ts
    ImportExportService.ts
  analytics/
    AnalyticsCollector.ts
    HeatmapAggregator.ts
    DeveloperAnalyticsPanel.ts
  i18n/
    achievementTranslations.*
```

Keep database/storage adapters testable without rendering. Provide typed read/write interfaces and transaction-safe methods. `GameDatabase` must have explicit schema version, database migration path, and validation for decoded records.

## 6. Data model and ownership

Define separate, versioned data domains:

- `playerSettings`: language, difficulty default, theme, sound levels, reduced-motion/accessibility, graphics overrides if supported.
- `highScores`: `difficultyId`, best score, best session summary, achieved timestamp, deterministic tie rules.
- `islandProgress`: stable island ID, discovered boolean, first/last hit timestamps, cumulative hits and points; optionally per-island maximum combo contribution.
- `achievementProgress`: achievement ID, unlock timestamp, stable metadata version, current tracked values where needed.
- `sessionSummaries`: bounded history of completed sessions, score, duration, islands, combos, weather, multiball and losses.
- `activeSession`: separate, replaceable snapshot of authoritative simulation state with engine/config/geometry compatibility metadata.
- `analyticsAggregates`: bounded aggregate statistics and heatmap buckets, not unbounded raw trajectory logs.
- `meta`: application data schema version, geography dataset version, simulation version, storage timestamps.

Prefer IndexedDB for records, with small bootstrap values in localStorage only where justified. Never treat localStorage as a safe location for large arrays of heatmap coordinates. Document key types and constraints, including maximum sizes and integrity checks.

## 7. Event-driven progress accumulation

Subscribe to verified domain events such as `island:scored`, `combo:advanced`, `ability:triggered`, `ball:lost`, `game:ended`, `weather:started`, and `antistuck:activated`. Ensure exactly-once progress updates for each unique event ID or simulation tick/collision key: re-rendering, app resume and importing cannot double-count hits or achievements. Differentiate one gameplay session's totals from lifetime totals. Prevent duplicate collision physics callbacks from falsely incrementing discoveries or achievement counters.

The very first scored hit of a qualifying island marks it discovered. Non-collidable micro-islets shown as decorative geography are not falsely counted as discovered. The tracked-island denominator is explicitly defined from the shipped data, rather than hardcoded to an invented quantity.

## 8. Interactive Aegean exploration atlas

Implement a separate screen using the same authoritative map projection, stable island IDs and supported visual themes. Allow pinch-to-zoom, wheel-zoom on desktop, drag/pan, accessible zoom controls, reset-to-full-Aegean and island selection. Include clear visual states for discovered versus undiscovered trackable islands; avoid implying undiscovered islands are geographically absent. Provide localized island names, collision counts, lifetime points, first/most recent visit and discovery status. For non-collidable tiny islands, distinguish decorative islets rather than presenting unachievable targets.

Map selection must use geometrically correct hit-testing with sensible touch tolerance and disambiguation where islands are clustered. Touch tolerance affects selection only, **not** physical collision dimensions. Use label density management and collision-free callouts in narrow clusters. When switching between gameplay and atlas, preserve the paused game state.

## 9. Game-over results and visited-island map

At game over show score, difficulty, personal record indicator, survival duration, total island hits, unique islands reached, max combo, relevant special events, and one prominent Play Again action. Display the existing accurate Aegean map with islands hit in *that session* highlighted; support tap/inspect for session hit counts and session-earned points. Explicitly distinguish per-session map results from lifetime exploration mode. Provide a clear route to lifetime atlas and back to main menu. Avoid blocking Play Again with optional animation or modal achievements.

## 10. Lightweight achievements

Implement approximately 15–20 immutable achievement IDs and fully specified deterministic rules. Include geographically meaningful achievements (region collections and unique island discoveries) plus skill achievements (first island, max combo, survival duration, multiball and weather survival). Choose exact numerical thresholds based on real available collidable island inventory and measured gameplay pace; document them in a registry and tests. Do not invent inaccessible achievements that rely on visually present but non-collidable islets. All badges are cosmetic; no extra lives or physics modifications. Evaluate against authoritative events and stored statistics; ensure idempotent unlocking and no duplicate toast notifications after restore.

Provide an achievement gallery showing locked/unlocked states, localized descriptions, earned date, and progress where meaningful. Do not disclose hidden achievements inadvertently if hidden status is intentionally used.

## 11. High scores and historical records

Store independent best scores for Easy, Normal and Hard. Define deterministic ties, validation of score fields, and a `newBest` flag only on an actual improvement. Results must compare the completed session against the previous persisted best *before* updating it. Saved in-progress scores should not overwrite completed records. Keep a bounded list of recent session summaries for use in statistics and achievements.

## 12. Save, pause and reliable resume

Use pause/resume semantics already approved in Phase 03 and strengthen persistence: on app backgrounding and appropriate periodic checkpoints, capture simulation state at a safe boundary. Include ball positions/velocities/spin (including all active multiballs), Crete position/velocity, difficulty, score/combo, lives, powers/cooldowns, weather, RNG state if controlled, timers in simulation time, and relevant geometry/physics versions. Store/restore atomically; avoid rewinding time incorrectly while the app is closed. Do not resume physics until a visible three-second countdown finishes and input is ready. On incompatible snapshot, clearly explain that the unfinished session cannot be restored, but retain durable progress and scores.

Account for browser pagehide/visibility changes, battery-saving suspension, forced termination and abrupt reload: periodic snapshots reduce loss but cannot guarantee exact last-frame recovery. Never claim perfect crash persistence.

## 13. Versioned migrations

Define a sequence of migrations for every schema revision. Run each migration transactionally where supported, with validation and recoverable failure handling. Keep geography dataset version, physics config version and saved-session compatibility policy separate from the general database schema version. On changed island datasets, map stable IDs forward through explicit alias/mapping tables where possible; never silently reassign an old island's visits to a different island. Document how deprecated IDs are preserved or archived. On active-session incompatibility, discard **only** the transient snapshot after explaining the change; never wipe cumulative discovery data or unlocked achievements.

## 14. Manual JSON backup: export, validation and import

Provide export to a user-selected local JSON file including a version, export timestamp, game identifier, data domains and checksums/integrity fields as appropriate. Explicitly exclude unnecessary raw telemetry or debugging traces unless the player opts into a separate analytics export. Exclude browser-specific state, authentication tokens (none expected), private paths and device identifiers.

Validate imports against an explicit schema and supported version range, size bounds, numeric ranges, known achievement IDs, stable island ID mappings and malicious/prototype-polluting keys. Never execute data or treat import strings as code. Preview the import contents and offer **Merge** versus **Replace**, requiring clear confirmation. Use a transaction or rollback-safe workflow so a malformed file cannot partially overwrite player progress. In Merge mode, choose highest high score per difficulty, union discovered island IDs, preserve earliest first-hit and latest last-hit, and use a documented conflict strategy for cumulative counters. Do **not** naïvely add cumulative counters from two backups, because overlapping histories would double-count; either use session/event IDs for deduplication or favor one clearly documented snapshot record. Ensure repeat-import idempotence.

Provide a success report of categories imported, warnings and records ignored. Include test fixtures for empty backup, old backup, corrupted JSON, unsupported versions, huge numeric values, duplicated island IDs and repeated import.

## 15. Locally generated shareable result image

Render an attractive portrait-oriented PNG or equivalent locally using application artwork and accurate Aegean geography. Include score, difficulty, max combo, unique islands hit and a map highlighting the session's visited islands. Allow the mobile Web Share API when supported and permitted, with download/save fallback. Handle user cancellation, unsupported file sharing, browser gesture restrictions and temporary-file cleanup gracefully. Never require a remote image service, cloud API or internet. Use localized captions, high-contrast typography and safe truncation for long translated text. Sharing does not upload the image automatically or create an online record.

## 16. Local gameplay analytics and developer dashboard

Collect aggregated data for survival durations by difficulty, ball heatmaps, per-island collision frequency, Crete successful saves and missed balls, loss speed distribution, max combo distribution, special island activations, multiball duration/losses, weather exposure and anti-stuck intervention frequency. Define each metric's event source and denominator (e.g. save rate = successful eligible Crete interception opportunities / all such opportunities, not all ball hits). Keep data on-device with explicit bounded history/retention, downsampled heatmap bins and storage quotas. Provide opt-out or disable control for nonessential analytics and a clear/export action. The dashboard is developer-only and must not occupy the normal HUD or transmit to any endpoint. Do not record names, precise personal location or unnecessary personal data.

## 17. Performance and storage limits

Avoid per-frame IndexedDB writes and unbounded raw path logging. Batch and debounce noncritical analytics persistence. Use bounded event buffers and periodic aggregate checkpoints. Keep map atlases responsive at normal portrait resolutions and during pinch zoom on mid-range devices. Lazy-load developer dashboard and optional statistics displays. Implement quota-exceeded fallback that preserves core game responsiveness and prioritizes authoritative profile/score persistence over analytics. Never let slow disk writes block the physics timestep.

## 18. Localization and accessibility

All atlas, achievement, results, backup, error and confirmation text must ship in English, Turkish and Greek, including correctly localized island names where data is available. Stable IDs remain language-neutral. Ensure full Greek/Turkish character glyph coverage with fonts cached offline. Provide accessible controls for zoom and selecting islands without relying solely on small map targets. Ensure high-contrast discovered/undiscovered states use icon/pattern/labels as well as color. Respect reduced-motion preferences and maintain readable results on small screens.

## 19. Tests — automation requirements

Write unit/integration tests for:

1. New discovery from valid first island score event, repeated hits, and simultaneous multiball collisions.
2. Exactly-once event application across pauses, UI remounts and resumed sessions.
3. Correct high score separation across Easy/Normal/Hard and tie policy.
4. Achievement thresholds, persistence, duplicate unlock prevention and localization IDs.
5. Atlas hit-testing, zoom/pan isolation from gameplay projection and input transforms.
6. Session highlights versus lifetime atlas progress; session reset does not clear lifetime records.
7. Full saved-state roundtrip under active multiball, weather, spin and power cooldown.
8. Compatible migration and incompatible-active-session fallback without history loss.
9. Backup schema validation, malicious/oversized input rejection and rollback on failure.
10. Deterministic idempotent merge, including repeated import and overlapping snapshots.
11. PNG generation in offline mode and graceful share API fallback.
12. Analytics retention cap, quota handling, clear/export and disabled mode.
13. Language switching for atlas, badge descriptions and results without changing stored identity.
14. Visual themes, reduced motion, screen reader labels and touch/keyboard accessibility.
15. App reload/background resume countdown; gameplay is not simulated while hidden.

Attach recorded test commands, results and relevant screenshots; do not claim device or offline tests that were not executed.

## 20. Manual acceptance walkthrough

After Phase 05 approval, a reviewer must be able to:

1. Start Easy, hit several islands, end the game and inspect session-specific highlighted island results.
2. Open Exploration, zoom into the Cyclades, tap an island and inspect localized lifetime statistics.
3. Switch languages and themes without altering discovered-island IDs or gameplay geometry.
4. Unlock an achievement, reload and verify it remains unlocked exactly once.
5. Repeat in Normal and Hard, confirming independent record tables.
6. Start multiball, background the app, close/reopen and resume consistently after the countdown.
7. Export progress, modify it by further play, import the backup with Merge and Replace, and verify documented behavior.
8. Share a result card or download it if sharing is unsupported, including in offline mode after initial caching.
9. Open developer analytics, inspect a trajectory heatmap, export/clear records, and verify no remote data requests.
10. Verify the original physics and all Phase 05 presentation features remain unaffected.

## 21. Completion and approval gate

Phase 06 passes only if all of the following are true:

- The separate interactive atlas and results map operate correctly with accurate geography and stable IDs.
- Player high scores, lifetime discoveries, achievements and preferences survive reloads and compatible migrations.
- Active-game snapshots restore safely or fail with clear transient-only recovery.
- JSON import/export validates and is safely transactional; repeated merges do not inflate counters.
- Share card generation works locally without a backend, with an explicit fallback.
- Local analytics are useful, bounded, clearable and never alter gameplay.
- Core physics, fixed portrait gameplay, controls and performance remain consistent with the Phase 05 approved baseline.
- Automated tests and a real human walkthrough are recorded; defects and limitations are documented.

Record exact commands, passing/failing test outputs, screenshots, build version, data-schema version and known issues in `PROGRESS.md`. Report what was implemented, what was **actually tested**, what remains uncertain, and request explicit approval before Phase 07. Do not proceed on your own.

End of File
