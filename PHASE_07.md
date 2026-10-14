# Crete Pinball — Phase 07: Offline PWA Hardening and Release Readiness

Version: 1.0  
Status: Ready only after explicit Phase 06 approval  
Scope: Installation, complete offline operation, update safety, cross-device certification, performance, accessibility, security, asset licensing, release packaging and final acceptance.

## 1. Mission

Turn the user-approved Phase 06 build into a reliable, installable, offline-first mobile PWA. Phase 07 is primarily a **verification and hardening phase**, not an opportunity to invent gameplay features or redesign the experience. Protect all 75 approved design decisions, especially accurate Aegean geography, fixed portrait arena, Crete as the horizontal paddle, real coastline collisions, and local-only player data.

## 2. Prerequisites and authorization

Before changing any code:

1. Read `CLAUDE.md`, `GAME_DESIGN.md`, `DECISION_REGISTER.md`, `TECHNICAL_ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, `TEST_MATRIX.md`, Phase 00–06 completion reports, and `PROGRESS.md`.
2. Confirm Phase 06 is explicitly approved by the user. If not, stop and report the missing approval.
3. Inventory the existing app, assets, build outputs, service worker, data schema, external dependencies and regression tests.
4. Identify current browser/device test coverage and distinguish measured results from assumptions.
5. Establish a baseline: commit/reference, dependency versions, bundle sizes, game FPS, load behavior and known bugs.

Do not rewrite functional subsystems solely for architectural preference. Do not silently alter geography, scoring, speed curves, effects, or touch response. Escalate any proposed departure from a confirmed requirement before implementing it.

## 3. Release contract

A release candidate must:

- Start and be playable in portrait on supported phones, and run in a centered portrait arena on desktop.
- Work fully offline **after a successful initial load/installation and full essential asset caching**.
- Never require remote API calls for physics, maps, sounds, localization, themes, scoring, progression, analytics, result-card generation or saves.
- Install where platform support allows; otherwise function normally as a browser-based PWA.
- Pause immediately when backgrounded or interrupted and resume safely with the approved countdown.
- Preserve high scores, achievements, island discovery, settings and compatible saved games across ordinary application updates.
- Never sacrifice collision determinism to maintain FPS; degrade visual quality before compromising simulation rules.
- Have no known P0 or P1 defects at release. Document all remaining lesser defects accurately.

## 4. Manifest and installation

Verify the web app manifest includes a clear name and short name, stable start URL, `display: standalone` where supported, `scope`, orientation preference, theme/background colors, and correctly sized icons (including maskable icons if used).

- Test home-screen installation on Android/Chrome and iOS/Safari using **real devices** if available.
- Test launch from the home-screen icon, return from background, device lock/unlock, and orientation changes.
- On browsers unable to enforce portrait, show a useful rotate-device instruction while preserving game state; do not distort the arena.
- Handle safe areas, notches, bottom home indicators, and viewport height changes.
- Never assert native install behavior or full-screen support on platforms where not actually verified.

## 5. Offline asset audit and cache lifecycle

Create an explicit asset inventory with sizes, origins, cache strategy and necessity classification:

- Boot-critical JS/CSS/HTML, manifest and icons.
- Preprocessed geography, collision geometry, stable island IDs, metadata and localized names.
- Sound effects, music/ambience and fonts (confirm local hosting and licenses).
- Four themes: Dark Nautical, Neon Arcade, Vintage Chart, Satellite.
- Exploration map resources, badges, help/tutorial, sharing-card templates and optional animations.

Required behavior:

1. First successful online load downloads all essential assets or clearly indicates when offline readiness is incomplete.
2. Subsequent visits can cold-launch offline; browser-native offline testing must disable network rather than merely toggle an app flag.
3. Switching languages and themes offline succeeds for all bundled/fully cached choices. Optional satellite data must not secretly trigger network access.
4. Cache naming and cleanup are versioned. Do not delete the only working cache while new assets are only partially downloaded.
5. Asset fetch failures produce a clear offline/fallback state rather than a blank screen.
6. Avoid caching unbounded analytics or user-generated data inside the service-worker asset cache.
7. Measure installation/cache footprint on an actual phone. Document a policy for constrained storage and partial downloads.

If legal or practical constraints prevent bundling satellite imagery, do not falsely claim that theme is fully offline. Present the user with a concrete licensed, local alternative or request approval for a scope adjustment. Do not replace satellite imagery silently with unlabeled invented geography.

## 6. Update activation, version compatibility and rollback

- Separate application build version, geographic-data version, physics/config version and persistence schema version.
- Download an update in the background but activate disruptive versions only at a safe game boundary or after explicit player approval.
- Never replace a running game's collision world mid-session.
- Perform any required database migration atomically; validate resulting records before declaring success.
- If the active session cannot be migrated, reset **only** that session with an explanation; preserve lifetime progress and personal records.
- Retain stable island IDs even when map source geometry changes; provide a documented remapping procedure for genuine identity corrections.
- Test upgrades from at least one prior app version using fixture data containing scores, achievements, discoveries and a resumable game.
- Offer a user-controlled JSON backup/export before destructive operations, where feasible.
- Document recovery steps for service-worker installation failures and cache inconsistency; avoid user-hostile automatic data deletion.

## 7. Performance targets and measurement

The **target** is smooth 60 FPS on capable hardware, not an unverified guarantee. Set and document a realistic supported-device baseline and test it empirically.

Measure with repeatable scenarios:

- Idle map and menu rendering.
- Single-ball normal play with frequent island and mainland collisions.
- High-speed ball near dense archipelagos and narrow passages.
- Three-ball multiball with weather, ripples, score notifications and a highlighted special island.
- Exploration-map pan/zoom with many geographic features.
- Long-running play, paused/resumed play and background/foreground transitions.

Capture median and low-percentile rendered FPS, frame time, physics-step duration, long tasks, memory growth, startup time, cold offline startup, transfer size and cached footprint. Record device, browser, OS, screen dimensions and test conditions.

Adaptive graphics may reduce particles, sea animation, shadow/glow quality, render resolution and trail detail. **It must not** modify authoritative coastline geometry, collidable island selection, event ordering, simulation timestep, physics forces or scoring.

## 8. Physics stress and determinism certification

Run the collision scenarios already defined by Phases 01–04 and `TEST_MATRIX.md`. In addition:

- Run a reproducible suite of **at least 10,000 seeded trajectories** spanning open water, island clusters, coastline corners, Crete's tips, southern coast, narrow bays and all three difficulties.
- Cover minimum/typical/maximum permitted ball speeds, high spin, power bounce, different Crete velocities, wind, slow motion and multiball.
- Verify that no ball teleports, tunnels through solid land, gets permanently embedded in geometry, gains unbounded energy or skips the southern loss test.
- Verify legitimate tiny-island exclusions and prevent unintended invisible collisions or scoring from non-collidable features.
- Test the same fixed simulation seed with different rendering FPS caps and background/foreground transitions. Report acceptable numeric divergence explicitly.
- Validate that anti-stuck corrections activate only for detected deadlocks and are traceable in developer logs.
- Reproduce failures from stored seeds, coordinates, event logs and versioned config; fix and add regression coverage.

**Do not report “zero tunneling” as a general truth unless the executed regression suite supports that claim.** Report exact coverage, failures and limitations.

## 9. Controls, interruptions and lifecycle testing

On real touch devices test:

- One-finger dragging anywhere within the lower control zone, no page scrolling or accidental text selection.
- Responsive Crete tracking, velocity limit and immediate stop when the finger stops.
- Tap to launch, double-tap to arm the charged bounce, and avoidance of accidental triggers during dragging.
- Temporary loss of focus, incoming call, notification, tab switch, app backgrounding, screen lock and OS app termination.
- Pause and resume countdown with consistent state restoration.
- Simultaneous touch input and sound permissions after the initial user gesture.
- iOS audio unlock rules, browser haptics support and graceful unsupported-device fallbacks.

On desktop test mouse, double-click, arrows, spacebar pause, resize, browser zoom and high-DPI rendering without changes to the world simulation.

## 10. Accessibility and localization certification

- Verify English, Turkish and Greek menus, tutorials, achievements, scores, labels, settings, result cards and offline fallback messages.
- Confirm stable island IDs and locale-independent saved records; test language switching during pause and subsequent reload.
- Check Turkish dotted/dotless I and Greek glyph coverage; bundle permitted fonts as local assets when required.
- Validate high-contrast coastline mode, legible HUD sizes and adjustable text that does not overlap controls.
- Verify Reduced Motion suppresses shake, flashes and ambient animation without suppressing vital gameplay information.
- Test independent music/effects levels and disabled haptics.
- Ensure status is never conveyed only by color, especially for combos, charged Crete and current targets.
- Test screen-reader discoverability of non-canvas UI (menus, controls and accessible descriptions); document any gameplay-specific limitations truthfully.

## 11. Player data and privacy

- Keep achievements, local scores, exploration data, saved sessions and gameplay analytics strictly on-device unless the user deliberately exports or shares them.
- Confirm there are no unintended analytics SDKs, third-party trackers, remote fonts or map-tile requests.
- Validate JSON import against versioned schema, limits and allowed values. Reject malformed or malicious files without partial mutation.
- Test merge vs replace semantics, migrations, duplicate imports, corrupt storage and exhausted storage quota.
- Make clear that clearing browser site data or deleting an installed PWA may erase records without a manual backup.
- Confirm no account is required and no global leaderboard has been introduced.

## 12. Security, dependency and content audit

- Pin compatible dependency versions; run available vulnerability and license checks. Investigate significant results rather than blindly suppressing them.
- Ensure imported backup JSON and localizable text are treated as data, never executed or inserted unsafely as HTML.
- Use a restrictive Content Security Policy compatible with the actual deployment and asset strategy; assess the need for external domains.
- Check game asset provenance, including coastline datasets, satellite imagery, music, sound effects, fonts and icons.
- Produce `ASSET_LICENSES.md` listing source, author/provider, license, attribution, local file, and redistribution permissions. Unverified assets are release blockers.
- Avoid including debug-only datasets, development credentials or private tokens in the production bundle.
- Verify the release build excludes player-accessible developer controls and unsafe debug actions. A separate opt-in developer build is acceptable.

## 13. Visual and feature regression

Verify all four approved themes against identical physical geography:

- Dark Nautical remains default with dark sea and sharp, geographically grounded coastline outlines.
- Neon Arcade, Vintage Chart and Satellite use the same world coordinates and collision geometries.
- Theme switching never moves the camera, resizes hitboxes, changes ball physics or modifies scores.
- Ball core/halo, layered speed/spin/power effects, ripples, coast flashes and throttling match prior decisions.
- Special islands, cooldowns, combo cap, multiball exit rules, and weather notifications work as approved.
- Main menu, interactive results map, separate exploration mode, persistent island discovery, achievements, shareable result cards and help are present and usable offline.

## 14. Cross-device test matrix

At minimum, prepare a results table for:

| Platform | Minimum verification |
|---|---|
| Android Chrome | Install, portrait, touch, offline cold launch, audio, save/resume, update |
| iOS Safari / home-screen app | Portrait, safe areas, audio gesture, interrupted sessions, offline launch, storage |
| Desktop Chromium | Centered portrait arena, mouse/keyboard, offline/reload, update |
| Desktop Safari or Firefox | Rendering/input compatibility, offline behavior, persistence |
| Small/narrow mobile viewport | HUD readability, ball visibility, control-zone usability |
| High-DPI/larger phone | Resolution adaptation and consistent hit-testing |
| Reduced-motion device setting | No shake/ambient motion; essential cues retained |

If any platform/device is unavailable, mark **NOT TESTED**. Do not fabricate a passing result or substitute a desktop simulator for a real-device claim.

## 15. Release packaging and deployment

Prepare release artifacts and documentation without publishing unless separately authorized:

- Production build and verified file list.
- `README` covering local development, testing, building and deployment configuration.
- `RELEASE_CHECKLIST.md`, `CHANGELOG.md`, `ASSET_LICENSES.md` and updated `PROGRESS.md`.
- A concise device-support and known-limitations document.
- Deployment instructions for static HTTPS hosting, correct history fallback, MIME types, caching headers and service-worker scope.
- Document build version, geography version, save-schema version and migration/rollback procedures.
- Demonstrate a clean install, cached offline start, in-progress session resume, full game over, export/import and update path.

Do not create online accounts, databases, analytics services, advertisements or a live deployment without explicit user authorization.

## 16. Critical acceptance criteria

A phase passes only when all of the following have defensible evidence:

1. Phase 06 approval is recorded and all prerequisite files were inspected.
2. The production build, tests, linting and typechecks pass; exact commands/results are recorded.
3. The 10,000-trajectory seeded physics suite completes with **no confirmed land tunneling**, embedded balls or other release-blocking failures; seed logs are retained.
4. Essential assets are available offline after first online caching; a genuine network-disabled cold launch works on tested devices.
5. Installation, background pause/resume, three-second countdown and local persistence work in verified environments.
6. All three difficulties and four themes function without altering geographic coordinates or physics logic.
7. Accessible high-contrast/reduced-motion operation and English/Turkish/Greek content are checked.
8. Manual backup/import and update migration preserve valid lasting records and handle incompatible active sessions safely.
9. License provenance is complete for **every distributed asset**, particularly satellite imagery.
10. Zero known P0/P1 defects remain; lower-severity issues are logged.
11. Performance is measured on named devices and any missed 60 FPS target is reported transparently.
12. The user can inspect a playable release-candidate build and its release checklist before approval.

## 17. Required test evidence format

In `PROGRESS.md` and the final handoff record:

- Build/commit ID and dependency versions.
- Command executed, timestamp, environment, pass/fail and relevant output summary.
- Trajectory-suite seed count, scenario coverage, any failure seeds, and regression fixes.
- Device/browser matrix with **PASS / FAIL / NOT TESTED** and notes.
- Network-disabled offline validation steps and results.
- Startup/bundle/cache sizes and measured frame-time/FPS ranges.
- Accessibility and localization audit findings.
- Unresolved bugs ranked P0/P1/P2/P3, plus proposed next action.
- Asset licensing status and any blockers.

Never replace missing evidence with a generic statement such as “tested thoroughly.”

## 18. Milestone completion and user approval

When Phase 07 is complete:

1. Run the applicable full test matrix and production-build checks.
2. Present the release-candidate build/location for hands-on review (do not publish without permission).
3. Summarize exact test evidence, device coverage, known limitations and release risks.
4. Update `PROGRESS.md`, `CHANGELOG.md` and `RELEASE_CHECKLIST.md`.
5. Stop and ask the user to approve the release candidate. Do not infer release approval from automated test success.

## 19. Explicit exclusions

This phase does **not** authorize multiplayer, cloud sync, global scores, in-app payments, native-app rewrites, new maps, altered coastline geometry, new gameplay systems or automatic public deployment. Such features require a separate design decision and new implementation scope.

End of File
