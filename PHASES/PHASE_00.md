# Crete Pinball — Phase 00: Project Foundation and Engineering Contracts

Version: 1.0
Status: Ready for authorization; **not** authorization to start subsequent phases
Owner: Antigravity coding agent, supervised by user at phase gates

## 1. Objective

Establish a reproducible, strict-TypeScript, portrait-first browser game skeleton suitable for adding real Aegean geospatial data and Phaser/Matter physics in later phases. The outcome of Phase 00 is a working **placeholder** game scene and tested technical contracts—not a fabricated finished map or gameplay. Do not begin Phase 01 without explicit user approval.

## 2. Read before implementation

Read in full, in this order:

1. `CLAUDE.md` — agent operating rules and design invariants.
2. `DECISION_REGISTER.md` — 75 confirmed decisions.
3. `GAME_DESIGN.md` — gameplay requirements.
4. `TECHNICAL_ARCHITECTURE.md` — system/module architecture.
5. `IMPLEMENTATION_PLAN.md` — milestone boundaries.
6. `TEST_MATRIX.md` — evidence requirements.
7. This file (`PHASES/PHASE_00.md`).

If any file is missing or contradictory, stop and report the problem. Do not silently rewrite product decisions. Do not use the older unverified ZIP bundle as a source of truth when the separately verified files exist.

## 3. Operating constraints

- Work autonomously within Phase 00 only; do not ask for routine approvals or launch an uncontrolled browser.
- Do not implement final geographic geometry, ball simulation, island collisions, score loops, upgrades, themes, achievements, or online services yet.
- No backend, account system, online leaderboard or runtime map API is needed.
- Avoid paid dependencies and unauthorized deployment. Record licenses for added dependencies.
- Prioritize maintainability and accurate numerical coordinate handling over impressive placeholder graphics.
- Never assert that automated tests passed if they were not actually run.

## 4. Stack and initialization

Set up:

- Vite + TypeScript in strict mode.
- Phaser with its built-in Matter integration available (physics may remain inactive in the Phase 00 placeholder scene).
- Package-manager lockfile and a documented supported Node.js version. Check actual installed and selected versions, rather than guessing.
- ESLint and a formatter; type checking independent of bundling.
- Vitest for contract/math unit tests.
- Playwright for basic browser smoke and viewport tests if the execution environment supports it. If it does not, prepare tests and mark execution as unverified.

Prefer a small dependency set. Pin exact versions via lockfile; document version and reason in `PROGRESS.md`.

Required npm scripts, or clearly documented equivalents:

```text
dev
build
preview
typecheck
lint
format:check
test
test:browser
```

No script should silently run a production deployment or contact a paid external service.

## 5. Proposed module layout

Adapt filenames to the chosen Phaser version, but preserve module boundaries:

```text
src/
  app/                 startup, device lifecycle, app-shell glue
  config/              versioned design constants and runtime config
  game/
    scenes/             Boot, MenuPlaceholder, GamePlaceholder
    systems/            interfaces for future gameplay systems
    input/              pointer and keyboard adaptation contracts
    world/              viewport, world/screen transforms
    physics/            fixed-step driver interface (no final gameplay)
    rendering/          theme and draw interfaces
  geography/            source manifest and geospatial data contracts
  persistence/          storage API and schema versions
  i18n/                 typed language keys and locales scaffold
  ui/                   accessible shell and placeholder HUD
  debug/                development flags and logging interfaces
  types/                shared DTOs, IDs and branded types
scripts/                asset validation / future geo preprocessing
public/                 icons/manifests; placeholder asset only
 tests/
  unit/
  browser/
```

Avoid inventing geographic outlines from hand-drawn coordinates; display a prominently labelled geometric test grid or empty field in Phase 00.

## 6. Game viewport/world-coordinate contract

Define an immutable logical portrait arena coordinate system (example: `WORLD_WIDTH = 900`, `WORLD_HEIGHT = 1600`; values are provisional engineering configuration, not geographic latitude/longitude). Requirements:

1. A single uniform scale factor (`min(availableWidth/worldWidth, availableHeight/worldHeight)`) maps world to display. **Never scale X and Y separately.**
2. Letterbox/pillarbox safely where aspect ratios differ. Game field remains centered on desktop.
3. Screen-to-world and world-to-screen functions are mathematical inverses to within floating point tolerance.
4. Device pixel ratio affects rendering resolution, not world coordinates or physics results.
5. Respect mobile visual viewport and safe-area insets; app should not cause accidental browser page scroll during intended game gestures.
6. Portrait-only UX on phone; if orientation cannot be programmatically locked, display a graceful rotate-device prompt without breaking state. Do not assume browser orientation-lock support.
7. Desktop canvas remains portrait; mouse and keyboard mapping must use the same logical coordinates.
8. Clarify and document the future transformation pipeline: geographic lon/lat → chosen projection → fixed map/world coordinates → display pixels. Do not invent a projection or geographic bounds without validation in Phase 01.

Test at minimum: narrow phone, tall phone, standard phone, tablet portrait, desktop wide viewport, and high-DPI viewport. Test bounds and pointer mapping, not just screenshots.

## 7. Physics and deterministic-execution contracts

Create typed interfaces only (unless small tests require a stub):

- `FixedStepClock`: fixed delta, accumulator, frame catch-up cap, pause/resume.
- `PhysicsConfig`: gravity vector, speed cap, step frequency, friction, restitution, spin decay, anti-stuck settings.
- `BallState`: position, velocity, radius, angular state, flags and stable ID.
- `PaddleState`: horizontal translation, speed cap, current target X and input source.
- `ContactEvent`: colliding entity IDs, point, contact normal, relative speed, timestamp/tick.
- `WorldBoundary`: north/east/west rebound, southern escape classification.
- Seeded pseudo-random source abstraction for future deterministic tests.

State a nominal step rate in config (for example 120 Hz) but verify its eventual appropriateness through Phase 02 performance tests. No game physics may depend on browser render FPS, particles, or wall-clock animation timing. Do not pretend Matter alone guarantees continuous collision detection: reserve a high-speed collision mitigation extension for Phase 02.

## 8. Geography contracts (without final asset ingestion)

Define provisional schema and validation for:

- Stable `islandId`, name localization keys, country/administrative metadata if appropriate, island group, bounding box and centroid.
- Source dataset identifier, license/attribution, revision and build provenance.
- MultiPolygon support, polygon rings/holes, winding and coordinate-space declaration.
- Separately versioned visual polygon and optimized collision segments derived from a common geographic source.
- Three participation flags: visible, collidable, trackable; apply the tiny-island threshold at a **canonical logical viewport**, not unpredictably per device.
- An explicit collision-versus-visual deviation budget (numerical value to be measured/set in Phase 01, not invented as a promise in Phase 00).
- Crete rigid-translation transform separate from its immutable source geography.

No fake coastline should be bundled or described as accurate. Put future source evaluations and licensing in `SOURCES.md` once verified in Phase 01.

## 9. Game/application state contracts

Create an explicit future state machine type with permitted states:

```text
boot -> menu -> tutorial/ready -> playing
playing -> paused -> resumeCountdown -> playing
playing -> lifeLost -> ready/gameOver
menu <-> exploration/settings/achievements (future)
```

Implement only transitions needed to navigate Phase 00 placeholders. Reserve interfaces for score/lives/combo, weather, power charge, bonus events and multiball without prematurely implementing their rules. Ensure game update methods do not run when paused.

## 10. Persistence and offline contracts

Plan an IndexedDB-backed, versioned persistence interface with distinct records for:

- Preferences (language, theme, accessibility, difficulty).
- High scores by difficulty.
- Island discovery and achievement progress.
- Active game snapshots (separate physics/map/schema version fields).
- Optional bounded local analytics.

Use an adapter and migration hooks; a Phase 00 in-memory or test implementation is acceptable if persistence integration is deferred by the implementation plan. Never claim full offline-PWA certification in this phase. Document the later service worker cache strategy, update boundaries, compatibility and export/import checks. No network telemetry.

## 11. Minimal Phase 00 visible app

The runnable application must:

- Start into a simple boot/menu placeholder identifying itself as Crete Pinball.
- Show a centered, fixed-aspect portrait placeholder arena with a grid/coordinate markers clearly identified as **not geographic data**.
- Include a way to enter a placeholder game scene and return to menu.
- Demonstrate correctly mapped pointer/touch coordinates and optional desktop pointer or arrow-key indicators, without implying that Crete or the ball has been implemented.
- Maintain clean browser console and remain responsive after reload.
- Provide a development-only diagnostic readout of world dimensions, screen dimensions, scale factor and input world coordinate.

Keep styling restrained and compatible with the planned dark nautical UI; production themes belong to Phase 05.

## 12. Required tests

### Unit tests

- Screen/world coordinate roundtrip at center, corners and letterboxed boundaries.
- Uniform aspect ratio scaling; no distorted world coordinates.
- Deterministic seeded random stream reproducibility.
- Fixed-step accumulator handles different frame delta sequences and pause (for its intended contract).
- Config/schema validation rejects NaN, unsupported versions, invalid radii and malformed entity IDs.
- Island stable identifiers remain independent of localized labels in sample fixtures.

### Browser/smoke tests

- App loads without uncaught errors.
- Portrait arena fits target viewports; no unintended scroll during gameplay-area pointer gestures.
- Resize/orientation changes recompute visuals, not logical world size.
- Mouse/touch position maps into appropriate logical coordinates including letterboxed areas.
- App does not crash on background/foreground lifecycle transitions.

Record screenshots where useful, but screenshots alone are not acceptance evidence for behavior. Test touch on a real phone when possible; otherwise label hardware tests **not performed**.

## 13. Acceptance gate — Phase 00 is complete only if

- [ ] Repository starts with documented install and run commands.
- [ ] Locked dependency versions, Node version and licenses are recorded.
- [ ] `build`, `typecheck`, `lint`, `format:check`, `test` succeed with output recorded.
- [ ] Browser tests execute or are explicitly marked blocked/unverified.
- [ ] A real placeholder scene is visible on mobile and desktop-sized viewports.
- [ ] World/display coordinate transforms pass roundtrip/aspect tests.
- [ ] Typed module contracts exist for geography, physics, input, state and storage.
- [ ] Debug-only diagnostic features are not exposed as player features.
- [ ] No fabricated coastline data or unapproved Phase 01 code has been introduced.
- [ ] `PROGRESS.md` includes changed files, exact executed commands, results, known issues, and short demo instructions.
- [ ] User has received the Phase 00 handoff and explicitly approved proceeding to Phase 01.

## 14. Required final handoff to user

Summarize concisely:

1. What was implemented, linking the working local app entry point.
2. What was **not** implemented (accurate map, ball and collisions are Phase 01/02).
3. Versions, run command, and local test command summary.
4. Test results with evidence, unverified checks and limitations.
5. Any architecture decisions requiring approval or clarification.
6. Clear request for **Phase 01 authorization**. Do not self-authorize it.

## 15. Exact starting instruction for Antigravity

> Read all mandatory project documentation and execute **Phase 00 only**. Produce a strict-TypeScript Vite + Phaser project skeleton, a fixed-aspect portrait placeholder arena, tested coordinate conversion and interface contracts for geography/physics/storage. Do not ingest geographic data or implement the ball/paddle/score yet. Run all feasible checks, record evidence in `PROGRESS.md`, and stop at the Phase 00 approval gate.

End of File
