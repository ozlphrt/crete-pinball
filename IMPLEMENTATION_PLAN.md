# Crete Pinball — Implementation Plan

Version: 1.0
Status: Approved design; implementation not started
Companion documents: `CLAUDE.md`, `GAME_DESIGN.md`, `TECHNICAL_ARCHITECTURE.md`

## Purpose and non-negotiables

Build the approved mobile-first, portrait-oriented, offline PWA in controlled milestones. The Aegean, Greek and Turkish shorelines, islands, and Crete must use geographically grounded shapes and positioning. Crete moves horizontally as the paddle. Do not move, stretch, or enlarge geography to solve gameplay issues. Tune physics and assists instead. Never silently change an approved design choice. All phases require reproducible tests and an explicit user sign-off before proceeding to the next phase.

## Process contract for Antigravity

1. Read `CLAUDE.md`, `GAME_DESIGN.md`, and `TECHNICAL_ARCHITECTURE.md` before coding. If a document is missing, stop and report the missing document rather than inventing requirements.
2. Work on only the currently approved phase. Within that phase, implement, test, and fix autonomously; do not seek approval for routine commands or every code change.
3. Keep a `PROGRESS.md` log: completed items, checks performed, unresolved bugs, screenshots/tests, changed files, and next actions. Include tool versions and exact test commands.
4. Treat each phase's acceptance checklist as a gate. Do not claim it passes without actually executing the applicable tests; label unavailable device tests as unverified.
5. Keep debug instrumentation separate from production UI. Developer controls must never silently influence regular gameplay.
6. Use configuration and typed contracts for tunable mechanics. Physics uses a fixed timestep independent of display FPS.
7. After each phase, produce a short handoff with a working demo path, test evidence, known limitations, and the next phase's scope. Wait for explicit approval to continue.

## Dependency sequence

Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7.

Cross-cutting tests, accessibility basics, and performance profiling start early. Phase 7 is final release validation, not the first time testing/offline concerns are considered.

## Phase 0 — Foundation and contracts

**Goal:** Establish a reproducible, testable project before adding game mechanics.

**Deliverables**
- Vite + TypeScript + Phaser project, Matter physics configured, strict TypeScript checks, lint/format, unit and browser-test runners.
- Portrait logical-world coordinate system with consistent scaling on phones and a centered arena on desktop; no aspect-ratio stretching.
- Module boundaries: geographic data/build scripts, world geometry, physics, paddle/ball, gameplay state, HUD, rendering/themes, audio, persistence, debugging, i18n.
- Defined data schemas for island IDs, polygons, named localizations, collision geometry, map versions, runtime settings, game saves and persistent progression.
- Documented technology versions, build scripts, deterministic random-seed interface, and device/browser test matrix.
- Placeholder game scene rendering at both phone and desktop viewport sizes. No made-up final coastline graphics.

**Acceptance gate**
- Dev/build/typecheck/test commands run successfully and are recorded.
- Screen scaling preserves world-coordinate proportions at representative narrow/tall mobile viewports and desktop.
- Reloading the test scene does not fail; no uncaught errors.
- A preliminary performance baseline is recorded (not a claim of final 60 FPS).

## Phase 1 — Authoritative Aegean geography and Crete movement

**Goal:** Display the actual playing arena and move real-shaped Crete horizontally.

**Deliverables**
- Source evaluation and attribution/license notes for geographical land polygons, including minor islands. Confirm adequate coverage; supplement legally if needed.
- Reproducible preprocessing script: original source → crop to declared region → projection and screen transform → visual boundaries and optimized physics boundaries.
- Stable, language-independent island IDs; distinguish visible, collidable, and trackable islands.
- Visual outlines for islands and Greek/Turkish coasts on a dark map, with Crete's silhouette preserved.
- Fixed playing arena and southern escape line; real geographic geometry kept separate from any game-only boundary walls.
- Horizontal Crete movement from lower touch zone with responsiveness, capped speed, instant stop, always-visible travel range; desktop mouse/arrow-key support.
- Debug overlay for geographic coordinates, bounding boxes, collision segments, and island identification.

**Acceptance gate**
- Reference island positions and shorelines align with trustworthy map reference points; compare at multiple latitudes and longitudes.
- No stretch or unintentional movement of island geometry. Land and collision boundaries share the same transform.
- Crete moves without jitter and never leaves the visible arena; normal map stays fixed.
- Tiny-island collision threshold is measurable, stable, and documented; excluded tiny islands remain visible.
- Source provenance, licenses, map boundary choices, and any coverage gaps are documented.

## Phase 2 — Ball physics and collision reliability

**Goal:** Produce a fun but trustworthy single-ball interaction with accurate geography.

**Deliverables**
- Fixed-step Matter.js simulation with bounded catch-up; independent render interpolation where needed.
- Nautical ball collision core plus distinct larger visual halo; configurable launch from Crete on tap.
- Gentle southward gravity, velocity/energy caps, reproducible configurable restitution and surface friction.
- Robust circle-versus-optimized-coastline collision behavior with appropriate high-speed continuous/swept collision safeguards so the ball does not tunnel through islands.
- Crete northern hybrid paddle rebound, controllable reflection and velocity transfer, spin and angular damping; remaining Crete coastline solid with ordinary physics.
- Open-water side/north walls that bounce; loss only when the entire ball crosses the southern exit.
- Anti-stuck detector and subtle outward correction; prevent false positives in legitimate tight-channel travel.
- Developer ball placement, launch vector editor, slow/step/pause, contact normals, trajectories, and deterministic scenario replay.

**Acceptance gate**
- Thousands of deterministic collision stress cases at minimum, nominal and maximum ball speed; report count and failure criteria.
- No observed geometry penetration/tunneling in the defined high-speed regression suite; record edge cases and safe handling.
- Test coves, sharp corners, dense island groups, west/east end of Crete, rear/southern Crete impacts, and escape boundary behavior.
- Paddle collisions launch northward when appropriate, within capped angle/speed; collision behind Crete does not grant special rescue.
- Physics outcomes stable across differing rendering frame rates within documented tolerances.
- User verifies the initial gameplay feel before Phase 3.

## Phase 3 — Core scoring, lives and progression

**Goal:** Deliver a complete single-ball endless-survival arcade loop.

**Deliverables**
- State machine for menu, tutorial-ready, ready-to-launch, playing, paused, life-lost, and game-over states.
- Three starting lives, lose on southern escape; extra life milestones subject to a configured cap.
- Island-only base scoring (100 default per valid collision, configurable); mainland and arena walls do not score.
- Unique consecutive island hit combo, capped at ×5, maintained through Crete rebounds and reset on lost ball; collision scoring cooldown to block rapid re-contact farming.
- Easy/Normal/Hard with separate stored high scores and capped speed/gravity progression; early/mid/late pacing targets.
- Compact HUD: score, lives, multiplier, current target and Crete energy-meter placeholder.
- Game-over results including survival duration, islands hit, top combo and replay action; full exploration map later.
- Pause-on-visibility-loss with safe countdown resume; keep local session persistence interface ready.

**Acceptance gate**
- Scoring and combo cases covered by deterministic tests: repeated same island, changing island, mainland collision, Crete collision, multi-contact, life loss.
- Cannot gain scores or extra lives by repetitive contact artifacts.
- Session never changes physical outcomes due to HUD animations or dropped render frames.
- Progression is playable in all three difficulty modes; record initial balancing values, not as final constants.
- A user can begin, play, lose three lives, view results and immediately restart.

## Phase 4 — Special mechanics and game feel

**Goal:** Add arcade variety while preserving readable physics.

**Deliverables**
- Config-driven special islands (initial roster and exact behaviors validated by user), per-island cooldowns, charge state and HUD indications.
- Charged Crete power bounce from combos and double-tap activation; input conflict testing with drag-to-move and single-tap launch.
- Three-ball temporary multiball and shared combo; bonus balls do not each consume a life, only the last active ball triggers ordinary loss.
- Periodic clearly signaled Meltemi/crosswind/calm effects and developer-adjustable forces.
- Occasional critical approach slow motion; simulation rate changes consistently and never shifts coordinate geometry.
- Impact-based spin as decided; no spin-derived open-water Magnus force.
- Developer live physics sliders, per-difficulty presets, safe persistence and export.

**Acceptance gate**
- Special cooldowns, power charge/consume, multiball exits and resume transitions pass tests.
- All balls collide reliably at maximum possible boosted speed, including during weather and slow motion.
- Double-tap never accidentally causes unexpected paddle jumps or repeat launches.
- Weather and slow-motion effects are visually signaled and can be disabled for targeted tests.
- User approves the gameplay feel and speed progression.

## Phase 5 — Presentation, accessibility and localization

**Goal:** Produce a polished accessible game with consistent visual identity.

**Deliverables**
- Four selectable visual themes: Dark Nautical (default), Neon Arcade, Vintage Chart and Satellite. Use exactly aligned coastlines across all themes; review imagery usage and offline licensing/storage for Satellite before bundling.
- Nautical ball with luminous core, speed-dependent trail, spin highlight and contextual power effects.
- Island full-outline flash + precise impact ripple + points label; localized mainland flash with no score; independent throttling of sound and effects.
- Faint animated water, restrained impactful camera shake, no in-play zoom, optional reduced motion.
- Maritime ambience + arcade SFX; independent sound/music volume; user-gesture audio initialization; optional haptics with feature detection.
- Interactive skippable 20–30-second tutorial; minimalist menu with Play/Resume, Exploration, Achievements, Settings.
- English, Turkish and Greek translations; language-neutral stable geographic IDs.
- High contrast and scalable UI text; adaptive rendering complexity based on measured performance.

**Acceptance gate**
- Coastline location and paddle/game physics never depend on theme choice.
- Readable HUD, visible ball and touch controls on narrow portrait devices.
- Reduced motion removes ambient motion and shake while keeping essential gameplay information.
- No important information is conveyed by color alone. No translations clip critical controls.
- Sound and haptics work only where supported; unsupported devices behave gracefully.

## Phase 6 — Exploration, achievements and persistence

**Goal:** Finish the offline player's progression and sharing features.

**Deliverables**
- Separate pinch-zoom/pan Aegean exploration screen; tap an island to display names and personal collision stats, discovered/undiscovered states.
- Interactive game-over island-visit map and local historical discovery tracking.
- Approximately 15–20 cosmetic achievement badges, deterministic unlock conditions.
- Versioned IndexedDB schema separating persistent scores/discoveries/settings from transient active-session state; migration and incompatible-session rules.
- Local telemetry/dashboard for survival times, save/miss rates, ball heatmaps, special uses and anti-stuck events. Local-only with limits, clear and export.
- Manual versioned JSON backup/restore; schema validation, merge/replace choices and safe error handling.
- Shareable result image generated locally with fallback when native sharing is unavailable.
- Save/resume around app backgrounding, reload, multiball and active weather with periodic checkpoints.

**Acceptance gate**
- Closing/reopening during normal play and multiball restores internally consistent state.
- High scores, island discovery and achievements survive compatible app upgrades.
- Corrupt/unsupported import fails safely without overwriting existing progress.
- Explore screen never changes the active game's fixed camera or collision map.
- Large local datasets remain bounded and can be erased by user action.

## Phase 7 — Offline PWA, cross-device validation and release

**Goal:** Ship a stable installable single-player game without a required backend.

**Deliverables**
- PWA manifest, icons, service worker strategy, reliable precaching of required assets and geography. Fail gracefully on first load without connectivity.
- Safe update activation between sessions, cache versioning, application-data migration and prior-version cleanup.
- Complete automated suites, reproducible stress benchmarks, desktop browser tests, on-device mobile checks where devices are available.
- Performance tuning for 60 FPS on capable phones (adaptive fallback rather than promising 60 FPS everywhere).
- Final credits, geographical data attribution and third-party asset licenses; publishing checklist and support/debug instructions.
- Release notes, final issue register, known browser caveats and reproducible deployment instructions.

**Acceptance gate**
- After successful first installation/cache, full gameplay, map inspection, saves, achievements, audio assets, themes and results work offline.
- Rotation cannot break portrait gameplay; desktop arena remains centered, mouse and keyboard controls functional.
- Focus interruptions and browser refresh do not unexpectedly cost lives.
- No severe unresolved collision, save corruption, or rendering failure in supported test environments.
- Update tests preserve persistent progress and safely handle incompatible live sessions.
- Explicit user acceptance prior to publishing.

## Cross-phase engineering rules

### Geometry and collisions
- Rendering and physics use aligned coordinates from one authoritative geographic source. Physics simplification must be validated quantitatively against the visible shoreline at the actual play scale.
- Preserve meaningful island morphology. Never silently enlarge tiny islands or add invisible oversized bumper hitboxes.
- Use broad-phase indexing and carefully bounded optimized collision segments; test segment endpoints and polygon seams.
- Crete is dynamic horizontally, but remains a solid geographical object on all sides. Northern contacts use the hybrid rebound rule; south/rear contacts use ordinary land physics.
- Even if physics and rendering are decoupled, impacts must be spatially consistent with visible coastlines.

### Controls and accessibility
- Mobile: gesture in lower region moves Crete; tap launches when ready; double-tap arms/uses charged bounce when available. Prevent gesture ambiguity and browser scroll/zoom interference within game input surface.
- Desktop: mouse and arrow keys move, click launches, double-click activates power, space pauses/resumes.
- Respect reduced-motion preference; maintain legibility and safe contrast in all themes.

### Difficulty and fairness
- Three difficulty presets; separate high scores; multiplier cap ×5; game continues until lives are exhausted.
- Multiple balls, weather and slow motion must not bypass collision reliability or change geographical geometry.
- Invisible assistance should resolve actual stuck states, not bias normal trajectories or manufacture points.

### Storage and versioning
- No accounts or online leaderboards. Never require network access after initial install completes.
- Stable island IDs across map revisions; version game saves, physics presets and geography together where required.
- Update UI must not interrupt active gameplay; preserve accumulated player progress even when an active session cannot be migrated.

## Evidence expected at each handoff

Provide:
1. Phase number and exact Git commit/revision if available.
2. List of delivered capabilities and changed components.
3. Build, type, unit and browser-test commands plus actual results.
4. Screenshots or demo notes for each acceptance criterion that is visually assessed.
5. Performance measurements on named tested devices; distinguish measured from estimated.
6. Current known issues, severity and reproducible steps.
7. Questions requiring actual design approval; otherwise do not invent new design requirements.
8. Clear statement: `Ready for user acceptance` or `Blocked`, with reason.

## Proposed file set and execution order

- `CLAUDE.md`: standing instructions.
- `GAME_DESIGN.md`: binding approved game specification.
- `TECHNICAL_ARCHITECTURE.md`: module contracts and techniques.
- `IMPLEMENTATION_PLAN.md`: this phase sequence and gates.
- `DECISION_REGISTER.md`: numbered decisions and change control.
- `TEST_MATRIX.md`: detailed acceptance and regression scenarios.
- `PHASES/PHASE_00.md` through `PHASES/PHASE_07.md`: actionable, scoped Antigravity tasks.
- `PROGRESS.md`: generated and maintained by Antigravity as work proceeds.

**Next action:** After verifying all reference documents are present, ask Antigravity to implement *Phase 0 only*. Do not build the entire game in one autonomous run.

End of File
