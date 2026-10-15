# Crete Pinball — Changelog

All notable changes to the Crete Pinball project will be documented in this file.

## [1.0.0] — 2026-10-14

### Added
- **User-Driven Achievement Modal & Continue Action**:
  - Replaced the automatic 3-second countdown timer and progress bar on achievement unlock modals with a user-driven "CONTINUE ▶" button.
  - The modal stays comfortably open while the game remains paused, allowing players to read unlocked achievements and awards without being rushed.
  - Supports pressing the prominent golden `CONTINUE ▶` button, clicking the backdrop, or pressing `Space` / `Enter` / `Escape` on desktop keyboards to resume play.
  - Added localized `game.continue` string across English (`Continue`), Turkish (`Devam Et`), and Greek (`Συνέχεια`).
- **On-Map HUD Information & Bottom Panel Removal**:
  - Removed the bottom footer HUD panel (`.hud-footer`) entirely, expanding the Aegean and Libyan sea map seamlessly to the edge of the viewport.
  - **Positive Achievement Star Sign for Bonus Islands & Clutter-Free Map**:
    - Replaced the military/combat crosshair reticle, sonar ping, and tactical brackets with a warm celebratory golden achievement design.
    - Features a radiant golden aurora, expanding celebration waves, an 8-pointed golden compass star with a sparkling diamond core, cardinal diamonds, and orbiting constellation sparkles.
    - Eliminated redundant target info banners and badge pillboxes: since the target island's authentic name is already turned on and highlighted directly on the map in radiant gold typography (`#fcd34d`), the map remains completely clean, elegant, and unobstructed.
  - **Crete Paddle Energy Meter**: Moved directly into the map attached to the Crete paddle in the Libyan Sea (`creteBaselineY + 36`), tracking horizontal paddle movement with a dynamic neon cyan/amber energy bar and a high-contrast state badge (`⚡ READY`, `⚡ ARMED`, or charge percentage).
  - **Floating Tactical Status Pill**: Temporary active events (e.g. `⚡ 3-BALL MULTIBALL · 5s`, `🌬️ MELTEMI · 12s`, `⚡ POWER BOUNCE ARMED`) float cleanly below the top stats header with zero screen obstruction during normal play.
- **Introductory Crete Paddle Oscillation Affordance**:
  - Crete gently sways horizontally ($\pm 50\,\text{px}$, $\sim 2.4\,\text{s}$ period) on startup and round reset to intuitively communicate that Crete is the movable paddle.
  - Pulsing luminescence on flanking chevrons (`«` and `»`) to highlight horizontal control affordance.
  - Seamless, zero-latency transition to direct player control upon first touch/mouse drag or keyboard arrow input.
- **Dynamic Terrain Elevation Lighting & Shadow Shader**:
  - WebGL shader incorporating Digital Elevation Model (DEM) terrain heightmaps with realistic light falloff and elevation shadow casting.
  - Refined ball collision glow with tight distance attenuation.
  - Dynamic ambient day/night lighting cycles.
- **Resilient Multiball & Drain Recovery Watchdog**:
  - Promotes surviving bonus balls to primary ball on multiball conclusion.
  - Background watchdog automatically spawns a northern replacement ball if zero active balls remain in active play with surviving lives.
- **Mobile-Responsive HUD Layout Polish**:
  - Repositioned HUD settings and pause controls to eliminate overlap with lives indicator pips across all mobile screen ratios.
  - Subtly dimmed coastline outline brightness for realistic Mediterranean sea aesthetic.
- **GitHub Actions Automated Pages Deployment**:
  - Automated CI/CD workflow building and deploying to GitHub Pages on push to `main`.

## [Phase 06] — 2026-10-14

### Added
- **Authoritative Island Discovery & Progress Service (`src/progress/IslandProgressService.ts`)**:
  - Authoritative trackable island denominator calculation: exactly 75 trackable, collidable Aegean islands (excluding mainland Greece, mainland Turkey, and 15 visual-only decorative islets).
  - Deduplicated, rate-limited collision tracking (25ms throttle) preventing duplicate same-island hit registrations on multi-subtick collisions.
  - Distinct session-level vs. lifetime discovery and point contribution tracking.
  - Real-time discovery percentage tracking and persistence via `GameDatabase`.
- **Per-Difficulty High Score Service (`src/progress/HighScoreService.ts`)**:
  - Independent personal best tracking for `easy`, `normal`, and `hard` difficulties.
  - Deterministic evaluation comparing against previous best before updating.
  - Deterministic tie-breaking rules: higher score wins; equal scores resolved by longer survival time, then timestamp.
  - Bounded recent session summary history (last 50 sessions) recording duration, score, distinct islands, hits, and combo.
- **20 Immutable Cosmetic Achievements (`src/progress/AchievementRegistry.ts`, `src/progress/AchievementEvaluator.ts`)**:
  - Registered 20 authentic cosmetic achievements across exploration, skill, special abilities, and survival categories.
  - Event-driven deterministic unlock evaluation listening to `GameEventBus` (`islandHit`, `comboIncreased`, `specialIslandActivated`, `weatherChanged`, `multiballStarted`, etc.).
  - Strictly idempotent unlocks: already-unlocked achievements are cached and never fire duplicate events.
  - Non-intrusive in-game floating unlock toast notification (`src/game/ui/achievementToast.ts`).
  - Interactive 20-badge gallery modal overlay (`src/game/ui/achievementsModal.ts`) displaying unlock status, icons, descriptions, and progress percentage.
- **Interactive Aegean Exploration Atlas Scene (`src/game/scenes/exploreScene.ts`)**:
  - Full-screen pan and zoom exploration of the authentic Aegean geography.
  - Smooth multi-touch pinch-to-zoom with touch distance clamping, pan dragging, and on-screen zoom control buttons (`+`, `−`, `⊙` reset view).
  - Clear visual discovery styling: golden coastlines with ambient halos for discovered islands, muted dark silhouettes for undiscovered islands, and subtle dashed contours for decorative islets.
  - Interactive tap/click inspection showing an elegant nautical info panel with Greek/Turkish/English names, coordinates, visit counts, points, and ability details.
- **Enhanced Game-Over Results Screen (`src/game/ui/resultsScreen.ts`)**:
  - Interactive Aegean session mini-map visually highlighting islands hit during the completed run with golden silhouettes.
  - Tap-to-inspect island hit counts and details directly on the mini-map.
  - Action buttons: "Play Again", "Explore Atlas", "View Badges", and "Share Result".
- **Local Score Card Generation & Offline Sharing (`src/results/ResultsCardRenderer.ts`, `src/results/ShareService.ts`)**:
  - Client-side 540×960 portrait score card canvas renderer displaying authentic Aegean mini-map with session-hit island highlights, final score, new record badges, survival duration, and combo stats.
  - Zero external network or server dependencies: Web Share API file sharing with instant PNG file download fallback.
- **Versioned Persistence & Schema Migrations (`src/persistence/GameDatabase.ts`, `src/persistence/SchemaMigrations.ts`)**:
  - IndexedDB storage engine (`CretePinballDB`) with dedicated `keyValueStore` and `sessionSummaries` object stores.
  - Seamless in-memory / `localStorage` caching and fallback for offline browsers and non-IDB test environments.
  - Schema migration runner (`SchemaMigrations`) ensuring backward compatibility and default sanitation.
- **Secure Backup Import & Export (`src/persistence/BackupValidator.ts`, `src/persistence/ImportExportService.ts`)**:
  - Full JSON backup export with browser download trigger.
  - Multi-layer backup validation: 2 MB size limits, JSON parsing reviver security checks, prototype pollution defense (`__proto__`, `constructor`, `prototype`), and schema validation.
  - Two validated restore modes: `Merge` (unions discovered islands and achievements, preserves higher scores) and `Replace` (clean state overwrite).
- **Atomic Simulation Checkpoints (`src/persistence/SessionCheckpointService.ts`)**:
  - Full simulation snapshots saved on window backgrounding / tab blur (`visibilitychange`, `pagehide`).
  - Compatibility verification: discards transient checkpoints if `schemaVersion`, `geoDataVersion`, or `physicsRulesetVersion` mismatch, preserving permanent player progress.
- **Bounded Local Developer Analytics (`src/analytics/AnalyticsCollector.ts`, `src/analytics/DeveloperAnalyticsPanel.ts`)**:
  - Discrete 20×35 spatial collision heatmap (700 cells total, bounded to < 5 KB storage).
  - Crete save rate calculation, loss speed buckets (`<400`, `400-600`, `600-800`, `800-1000`, `>1000`), combo distribution, and ability usage counters.
  - Modal dashboard with 2D Aegean heatmap canvas visualizer, KPI metric cards, top 5 island collisions, JSON export, and reset controls.
  - User telemetry opt-out toggle in Settings modal (`analyticsEnabled`).
- **Complete Localization Parity across EN, TR, and EL (`src/i18n/index.ts`)**:
  - 100% translation key parity across English, Turkish, and Greek for all Phase 06 features: Atlas labels, Achievement titles and descriptions, Results Screen buttons, Backup notices, and Developer Analytics metrics.
- **Testing & Verification**:
  - 6 new dedicated unit test suites (`islandProgressService.test.ts`, `highScoreService.test.ts`, `achievementEvaluator.test.ts`, `backupImportExport.test.ts`, `sessionCheckpoint.test.ts`, `analyticsCollector.test.ts`), bringing Vitest unit tests to 185 passing across 33 test files (100% pass rate).
  - Playwright browser test suite `tests/browser/phase06_progression.spec.ts` (9 tests passing across mobile and desktop viewports), bringing full Playwright regression suite to 57 passing tests.

### Added
- **Restrained Procedural Audio Engine (`src/audio/audioManager.ts`)**:
  - Procedural sound synthesis using Web Audio API (zero external licensing issues or network dependencies).
  - Dedicated master, SFX, Ambience, and Music gain buses.
  - Browser autoplay compliance with gesture unlock on `pointerdown`, `touchstart`, `touchend`, `click`, and `keydown`.
  - Robust context recovery: persistent gesture listeners until `state === 'running'`, async resume resolution before starting ambience, and `resumeContext()` calls on user pointer down and restart actions.
  - Disabled redundant Phaser sound manager (`audio: { noAudio: true }`) to eliminate duplicate browser autoplay warnings.
  - Warm, low-pitched, subtle collision tones (lowered to D3–D4 pentatonic scale with lowpass filtering and restrained dynamics) eliminating high-pitched beeps.
  - Gentle shoreline thud, warm acoustic wooden paddle rebound, and soft harmonic abilities.
  - Continuous gentle maritime sea-wash ambience with wind-modulated biquad filters.
  - Intelligent 40ms collision sound throttling preventing clipping during multi-ball gameplay.
  - Independent volume controls (0–100%) and mute toggles with persistence in `localStorage`.
- **Collision Visual Effects & Glowing Coastline Outlines (`src/game/rendering/geographyRenderer.ts`, `src/game/rendering/effectDirector.ts`)**:
  - Dedicated vector coastline outline layer at depth 3 featuring 1.2px marine cyan core (`0x38bdf8`) with an atmospheric under-glow, ensuring island and mainland boundaries are clearly visible and beautifully glowing against the real DEM terrain.
  - Expanding nautical ripples at collision points with duration scaling and color coding (cyan for standard, teal for special, gold for target).
  - Localized coastline illumination flashes on impact.
  - Floating score popups with smooth upward drift and opacity fade.
  - Contact spark particles throttled and scaled by graphics quality tier.
  - Atmospheric sea drift motes subtly influenced by active Aegean weather wind vectors.
  - 100% preservation of approved real DEM-derived terrain artwork (`aegean_terrain.png`) and true coastline geometries.
- **Interactive 7-Step First-Play Tutorial (`src/game/tutorial/tutorialDirector.ts`, `src/game/ui/tutorialOverlay.ts`)**:
  - Interactive modal card covering northern entrance, horizontal drag, northward rebound, combos, bonus targets, power bounce, and southern drain boundary.
  - First-time player auto-trigger; skippable at any time; persistent completion in storage.
  - Replayable on demand from Settings.
  - Automated test isolation: auto-suppressed under `navigator.webdriver` unless explicit `?tutorial=1` query parameter is supplied.
- **Complete Localization across EN, TR, and EL (`src/i18n/index.ts`)**:
  - 100% translation key parity across English, Turkish, and Greek dictionaries (zero missing keys).
  - Translates HUD labels, Settings modal, Tutorial steps, Weather announcements, Special Island abilities, Results screen, and Accessibility options.
  - Preserves stable internal IDs (`island-crete`, etc.).
  - Proper UTF-8 rendering for Turkish characters (ç, ğ, ı, ö, ş, ü, İ) and Greek script (α, β, γ, δ, ε, etc.).
  - Dynamic real-time language switching without page reload.
- **Accessibility & Adaptive Graphics Quality (`src/game/rendering/adaptiveQuality.ts`, `src/game/ui/settingsModal.ts`)**:
  - Reduced Motion mode: disables spark particles and atmospheric drift while preserving core gameplay indicators.
  - High Contrast mode: toggles high-contrast outlines and typography overlays.
  - Large touch targets (minimum 44×44px).
  - Adaptive Graphics Quality Controller: evaluates frame deltas and FPS with hysteresis to automatically shift between `High`, `Medium`, and `Low`, or supports fixed quality selection.
  - Glassmorphism Settings modal (accessible via HUD ⚙️ icon) providing real-time controls for audio, language, accessibility, graphics quality, tutorial replay, and restart.
- **Testing & Verification**:
  - Added unit test suites `tests/unit/audioManager.test.ts`, `tests/unit/localization.test.ts`, `tests/unit/tutorialDirector.test.ts`, `tests/unit/phase05_experience.test.ts` (148 unit tests passing).
  - Added browser test suite `tests/browser/phase05_experience.spec.ts` (45 browser tests passing across iPhone 13, Pixel 5, Desktop).
  - Captured actual visual verification screenshots across all required viewports in `phase05_screenshots/`.

## [Phase 04] — 2026-10-14

### Added
- **Special Island Abilities & Independent Cooldowns**:
  - Implemented `SpecialIslandRegistry` (`src/game/abilities/specialIslandRegistry.ts`) and `SpecialIslandSystem` (`src/game/abilities/specialIslandSystem.ts`) mapping stable geographic IDs to typed abilities:
    - Santorini (`island-santorini`): Explosive bumper with outward velocity impulse.
    - Rhodes (`island-rhodes`): Speed boost (+25% linear velocity boost).
    - Mykonos (`island-mykonos`): Score multiplier modifier (+1x bonus multiplier for 10s).
    - Lesbos (`island-lesbos`): Bonus points (+750 flat points).
  - 12-second independent cooldowns tracked in simulation time (frozen during pause).
  - Subtle visual illumination pulses upon ready and activation states without permanently altering island theme colors.
  - Ordinary island scoring (100 base points) and standard continuous collisions continue during cooldowns.
- **Crete Charged Power Bounce**:
  - Implemented `CreteEnergySystem` (`src/game/abilities/creteEnergySystem.ts`) charging meter upon consecutive distinct island combo increments (+0.25 per hit; full at 4 hits).
  - Arms on double-tap (touch) or double-click / `KeyE` (desktop) without interrupting smooth paddle dragging.
  - Applies enhanced northern coastline rebound ($1.35\times$ speed factor, enhanced steering envelope, clamped to `maxBallSpeed`).
  - Single-use consumption at next northern hit; resets on ball loss.
- **Temporary Three-Ball Multiball**:
  - Implemented `MultiballSystem` (`src/game/abilities/multiballSystem.ts`) and multi-ball physics integration in `PhysicsWorld` (`src/game/physics/physicsWorld.ts`).
  - Spawns 2 bonus balls alongside primary ball at collision-safe northern coordinates with diverging velocity vectors.
  - Shared combo multiplier across all active balls up to the x5 cap.
  - Bonus ball drain exits do not deduct lives; exactly 1 life is deducted only when the final active ball drains.
  - 25s simulation duration; deterministically retains one surviving ball upon timer expiration without life loss.
- **Aegean Weather Director**:
  - Implemented `WeatherDirector` (`src/game/environment/weatherDirector.ts`) applying bounded temporary environmental forces:
    - Meltemi: +100 u/s² southward gravity boost.
    - Crosswind: ±80 u/s² horizontal wind.
    - Calm Seas: -70 u/s² reduced gravity (minimum 100 u/s² floor).
  - Subtle HUD wind indicator and announcement banner; zero residual force upon expiration.
- **Cinematic Slow Motion**:
  - Implemented `TimeDilationController` (`src/game/environment/timeDilationController.ts`) triggering 60% time dilation on high-speed critical approaches toward Crete ($Y \in [1300, 1420]$, $V_y > 400$ u/s).
  - Hysteresis and 6s cooldown prevent rapid re-triggering; respects Reduced Motion accessibility setting.
- **Trajectory Landing Predictor**:
  - Implemented `LandingPredictor` (`src/game/assist/landingPredictor.ts`) estimating descending ball impact on Crete baseline ($Y = 1460$) accounting for gravity and wind forces.
  - Suppresses prediction when intervening land polygons obstruct the path.
- **Developer Physics Tuning Panel**:
  - Implemented `PhysicsTuningPanel` (`src/debug/physicsTuningPanel.ts`) with live sliders, presets (Normal, Easy, Hard, Chaos), and JSON export.
- **Decoupled Architecture & Testing**:
  - Implemented `GameEventBus` (`src/game/events/gameEventBus.ts`) for decoupled domain-to-presentation communication.
  - Added 36 new unit tests across 7 test suites (total: 131 unit tests passing).
  - Added automated Playwright browser test suite `tests/browser/phase04_arcade.spec.ts` (total: 36 browser tests passing across iPhone 13, Pixel 5, and Desktop).

---

## [Phase 03 Corrections] — 2026-10-13

### Changed
- **Mobile-First Responsive Typography**:
  - Overhauled typography across all screens to account for Phaser canvas scale factors ($S \approx 0.433$ on ~390px mobile viewports).
  - Scaled island map labels from 11px/12px to `24px`/`26px` bold with 5px dark outline for guaranteed $\ge 16\text{px}$ effective rendered size.
  - Scaled gameplay HUD elements: Score `42px` bold, Combo badge `32px` bold in a 96×52 container, Lives pips `38px`, Pause button `22px` in a 134×52 container, Target banner `30px` bold, Difficulty badge `26px` bold.
  - Scaled Floating Score Popups to `30px`/`38px` bold with 4px dark outline.
  - Scaled MenuScene: Title `68px`, Subtitle `30px`, Difficulty buttons `22px`, High Score card `22px`, Play button `32px`, Explore button `28px`, Language `20px`.
  - Scaled ResultsScreen: Title `62px`, Final Score `76px`, Stats `24px`/`26px`, Buttons `28px`/`24px`.
  - Scaled ResumeCountdown: Countdown number `140px`, Subtitle `28px`.
  - Expanded Arena boundary `minY` from 120 to 165 to match enlarged HUD header.
- **Northern Aegean Ball Drop System**:
  - Replaced legacy ball-attached-to-Crete launch mechanism with deterministic `NorthernBallSpawner` (`src/game/physics/northernBallSpawner.ts`).
  - Added 98 verified northern Aegean open-water spawn coordinates ($Y \in [225, 265]$) with guaranteed 0 polygon intersection and clearance $\ge 28\text{ u}$ (2.0x ball radius) from all island and mainland boundaries.
  - Implemented 3-second animated countdown overlay ("INCOMING BALL FROM THE NORTH...") before dropping the ball at game start, after each life loss, and upon restart.
  - Spawns ball with deterministic southward velocity ($V_y \approx 450$–$550\text{ u/s}$) and slight horizontal deflection directed toward arena center.
  - Crete stays at the southern baseline ($Y = 1460$) to intercept the incoming ball.
  - Space/tap triggers an immediate drop if the player is ready.
  - Added `ball.spawnAt()` and `ball.drop()` to `BallBody`; removed obsolete launch instructions.
  - Added comprehensive unit test suite (`northernBallSpawner.test.ts`) testing coordinate clearance, deterministic reproducibility, and 500-seed collision verification.
  - Quality gates: 95 unit tests passing (15 suites), 33 Playwright browser tests passing across iPhone 13, Pixel 5, and Desktop.

---

## [Phase 03] — 2026-10-13

### Added
- **Core Scoring & Event Qualification Engine**: Built `ScoringSystem` (`src/game/systems/scoringSystem.ts`) awarding 100 base points on valid island collisions with 15-tick (~125ms at 120 Hz) cooldown deduplication preventing persistent contact jitter farming. Mainland coastlines, Crete rebounds, and boundaries strictly award 0 points.
- **Combo Multiplier Tracking**: Implemented `ComboSystem` (`src/game/systems/comboSystem.ts`) scaling multiplier from ×1 up to ×5 on consecutive distinct island hits. Consecutive hits on the same island earn 100 base points without advancing or resetting the combo. Crete rebounds and boundaries preserve combos; ball loss resets multiplier to ×1.
- **Lives & Southern Drain Loss Engine**: Built `LivesSystem` (`src/game/systems/livesSystem.ts`) managing 3 starting lives, single decrement upon physical exit through southern boundary ($Y - r \ge 1580$), extra life milestones (10k, 25k, 50k, 100k, 200k), and maximum 5 lives cap.
- **Bonus Target System & Playfield Reticle**: Implemented `BonusTargetSystem` (`src/game/systems/bonusTargetSystem.ts`) selecting Aegean islands using seeded RNG, awarding +500 bonus points upon target contact, and rotating to next target. Added animated pulsing target reticle with crosshairs (`GamePlaceholderScene`).
- **Progressive Difficulty Scaling**: Implemented `DifficultySystem` (`src/game/systems/difficultySystem.ts`) with distinct Easy, Normal, and Hard presets, progressive continuous velocity and gravity ramp based on elapsed active minutes, and hard safety ceilings.
- **Compact Mobile Gameplay HUD**: Created `GameplayHUD` (`src/game/ui/gameplayHUD.ts`) showing current score, glowing combo multiplier badge, life pips (⚪/⚫), active target banner, difficulty badge, and pause button with animated floating score popups.
- **3-Second Resume Countdown**: Implemented `ResumeCountdown` (`src/game/ui/resumeCountdown.ts`) providing an animated 3.. 2.. 1.. countdown overlay upon resume to prepare player before simulation resumes.
- **Game Over Results Screen**: Created `ResultsScreen` (`src/game/ui/resultsScreen.ts`) displaying final score, personal best indicator, survival time, total/distinct island hits, max combo, and "Play Again" / "Main Menu" actions.
- **Session Clock & Run Controller**: Built `SessionClock` (`src/game/systems/sessionClock.ts`) and `RunController` (`src/game/systems/runController.ts`) coordinating simulation time, state machine transitions, periodic 10s auto-saves, and life loss.
- **Local Persistence & Restoration**: Expanded `LocalStorageAdapter` (`src/persistence/storageAdapter.ts`) with separate high score records per difficulty mode and active session snapshot save/restore with corruption rejection.
- **Auto-Pause on Focus Loss**: Implemented automatic pause on window `blur` and document `visibilitychange`/`app_backgrounded` events in `GamePlaceholderScene`.
- **North Aegean Coastline Geometry Fix**: Corrected Natural Earth extraction in `preprocess.ts` to include continuous 1,612 coordinate points across Eastern Thrace, Chalkidiki, and Kavala, eliminating horizontal line cuts.
- **Ball Launch Placement Fix**: Repositioned staged ball in `ballBody.ts` from inside Crete landmass ($Y = 1428$) to open water north of Crete ($Y = 1360$), resolving the upward trajectory suppression.
- **Phase 03 Test Coverage**: Added 21 comprehensive unit tests in `phase03_gameplay.test.ts` (total unit tests now 89, 100% passing) and browser tests in `phase03_gameplay.spec.ts` (33 total browser tests, 100% passing).

---

## [Phase 02] — 2026-10-13

### Added
- **Continuous Swept-Circle Collision Engine**: Implemented `ContinuousCollision` (`src/game/physics/continuousCollision.ts`) with analytical segment and vertex-sweep solvers, guaranteeing zero tunneling through thin islands and acute promontories at up to $1250$ u/s ball speed.
- **Uniform Spatial Hash Broadphase**: Created `SpatialHashGrid` (`src/game/physics/spatialHashGrid.ts`) with $75 \times 75$ unit buckets, accelerating swept collision candidate lookup from 917 segments down to 4–12 segments per step.
- **Ball Physics Model**: Created `BallBody` (`src/game/physics/ballBody.ts`) modeling physical radius ($r = 14$), speed clamping, gentle southward gravity acceleration ($+240$ u/s²), angular spin decay, and held/in-play/lost state transitions.
- **Hybrid Northern Paddle Rebound**: Implemented `PaddleRebound` (`src/game/physics/paddleRebound.ts`) with northern face classifier ($N_y < -0.2$, $v_y > 0$), angular steering envelope ($\pm 52^\circ$), horizontal momentum injection ($k_v \cdot v_{\text{paddle}, x}$), off-center spin impulse, and standard obstacle bounce for southern/side faces.
- **Open-Water Reflective Boundaries & Southern Loss**: Implemented `ArenaBoundary` (`src/game/physics/arenaBoundary.ts`) with reflective North ($Y = 120$), West ($X = 0$), and East ($X = 900$) walls, and southern drain detection ($Y \ge 1580$) triggering automatic respawn on Crete.
- **Anti-Stuck Entrapment Resolver**: Created `AntiStuckResolver` (`src/game/physics/antiStuck.ts`) tracking 120-tick rolling window history to safely detect true entrapment ($R < 16$ units) and apply gentle outward recovery impulses without unnatural teleportation.
- **120 Hz Deterministic Physics Coordinator**: Built `PhysicsWorld` (`src/game/physics/physicsWorld.ts`) coordinating continuous collision simulation at 120 Hz fixed timestep, multi-substep reflections, dynamic Crete moving colliders, and contact event logging.
- **Multi-Layer Nautical Ball Renderer**: Created `BallRenderer` (`src/game/rendering/ballRenderer.ts`) rendering brass physical core, luminous outer glow halo, motion trail, rotating spin dots, and pulsing launch beacon.
- **Physics Diagnostics & Vector Overlay**: Created `PhysicsOverlay` (`src/debug/physicsOverlay.ts`) rendering real-time ball velocity vectors, southward gravity compass indicator, contact points with outward normal ticks, and anti-stuck assist markers.
- **Comprehensive Phase 02 Test Suites**: Added unit test suites for swept collisions (`continuousCollision.test.ts`), paddle rebounds (`paddleRebound.test.ts`), and determinism/frame-rate independence (`physicsWorld.test.ts`), plus full Playwright browser tests (`phase02_physics.spec.ts`). Unit tests expanded from 43 to 59 tests (12 suites); browser tests expanded from 18 to 27 tests (all passing).

### Changed
- **GamePlaceholderScene**: Integrated full 120 Hz physics world, ball renderer, physics vector overlay, tap-to-launch and spacebar launch controls, dynamic feedback bar, and live collision telemetry.
- **ARENA_GEOGRAPHY.md**: Mathematically updated Section 2.4 detailing Mercator scale factor variation ($k(\phi) = \sec \phi$, $+9.7\%$ south-to-north linear scale variation) and its game design implications.

---

## [Phase 01] — 2026-10-13

### Added
- **Authentic GIS Data Ingestion Pipeline**: Ingested Natural Earth 1:10m physical land and island vectors under CC0 license; created automated preprocessing pipeline (`scripts/geography/preprocess.ts`) with SHA-256 data integrity verification.
- **Geographic Data Provenance Documentation**: Published `docs/GEO_DATA_SOURCES.md` (licensing, quality audit, OpenStreetMap evaluation) and `docs/ARENA_GEOGRAPHY.md` (conformal Mercator projection math, coordinate bounding, and arena margins).
- **Conformal Map Projection**: Implemented exact mathematical Mercator forward (`projectLonLat`) and inverse (`worldToLonLat`) transformations with sub-milliradian roundtrip precision.
- **Authentic Crete Paddle Entity**: Created `CretePaddle` (`src/game/entities/cretePaddle.ts`), preserving authentic Natural Earth Crete silhouette and orientation ($\theta \equiv 0^\circ$), strictly confined to horizontal translation along baseline $Y = 1460$, with $1100\text{ u/s}$ speed limit, instant stop (no drift), and travel bounds clamping ($X \in [206, 673]$) ensuring 100% on-screen visibility.
- **Dark Nautical Geography Vector Renderer**: Built `GeographyRenderer` (`src/game/rendering/geographyRenderer.ts`) with cached static background layer, illuminated cyan Crete layer, localized major island labels (English, Turkish, Greek), and toggleable debug overlays for collision segments (with outward normals) and bounding boxes.
- **Standalone Aegean Exploration Atlas**: Built `ExploreScene` (`src/game/scenes/exploreScene.ts`) with pan/zoom camera ($0.7\times$ to $3.5\times$) and tap-to-inspect island cards displaying coordinates, area, classification, and localized names.
- **Enhanced Telemetry Overlay**: Expanded `DiagnosticOverlay` with real-time Lon/Lat under cursor, hovered feature inspection, Crete telemetry, and keyboard hotkeys (`C`, `B`, `L`, `D`).
- **Automated Test Suites**: Added `tests/unit/cretePaddle.test.ts` (7 tests), `tests/unit/geographyData.test.ts` (7 tests), and `tests/browser/phase01_geography.spec.ts` (browser tests across mobile and desktop viewports). Total unit tests increased from 29 to 43; total browser tests increased from 9 to 18.

### Changed
- **MenuScene**: Added "Explore Aegean" navigation button and updated branding to Phase 01.
- **GamePlaceholderScene**: Replaced preliminary test grid with authentic Aegean geography rendered via `GeographyRenderer` and interactive `CretePaddle` control.
- **OrientationHandler**: Fixed rotation prompt condition to ensure desktop pillarboxed viewports are never falsely blocked.

---

## [Phase 00] — 2026-10-13

### Added
- **Project Infrastructure**: Initialized Vite + strict TypeScript project with Phaser 3 (3.88.2 with Matter.js), Vitest, Playwright, ESLint 9, and Prettier.
- **Coordinate System Contract**: Implemented `CoordinateTransformer` enforcing uniform 9:16 aspect ratio scaling (`WORLD_WIDTH = 900`, `WORLD_HEIGHT = 1600`), centered letterboxing/pillarboxing, and mathematical screen-to-world roundtrip conversion.
- **Physics Contracts**: Defined `FixedStepClock` with accumulator and catch-up step clamping (120 Hz nominal rate), deterministic `SeededRandom` (Mulberry32), and physics preset configurations for Easy, Normal, and Hard modes with strict validation.
- **Geography Data Contracts**: Defined `IslandFeature`, `LinearRing`, `GeoPolygon`, `GeoMultiPolygon`, `CollisionSegment`, and validation routines ensuring closed rings, finite coordinates, and CCW polygon winding.
- **Game State Machine**: Implemented `GameStateManager` with strictly validated state transitions across the application lifecycle (`boot`, `menu`, `ready`, `playing`, `paused`, `resumeCountdown`, `lifeLost`, `gameOver`, etc.).
- **Persistence Contracts**: Defined versioned schema interfaces and created `LocalStorageAdapter` with in-memory fallback, full backup export/import (merge and replace modes), and schema validation.
- **Internationalization (i18n)**: Implemented `I18nManager` with English, Turkish, and Greek dictionaries and locale-independent island identifier lookup.
- **Input System**: Created `InputAdapter` mapping mouse, touch, and arrow-key inputs to logical world coordinates, lower control zone detection, and launch/power-bounce intent tracking.
- **Scenes & UI**: Created `BootScene`, `MenuScene` (with localized titles and language switcher), and `GamePlaceholderScene` featuring a clearly labeled test grid ("TEST GRID — NOT GEOGRAPHIC DATA"), southern drain line, Crete defense zone indicator, pause banner, and developer diagnostic overlay.
- **Orientation Handling**: Created `OrientationHandler` displaying a responsive rotate-to-portrait prompt on mobile landscape viewports.
- **Testing Infrastructure**: Added 7 unit test suites (29 tests, 100% passing) and 3 browser smoke/viewport test suites across mobile WebKit (iPhone 13), mobile Chromium (Pixel 5), and desktop viewports (100% passing).
