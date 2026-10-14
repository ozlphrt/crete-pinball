# CRETE PINBALL — CLAUDE.md

> Version: 1.0 | Status: Approved agent operating rules | Project: Crete Pinball
>
> This is the authoritative instruction file for Antigravity coding agents. It is **not** permission to build all phases. The user authorizes one milestone at a time.

## 1. Mission

Build a polished, portrait-oriented, mobile-first, installable, fully offline PWA called **Crete Pinball**. The Aegean Sea is the playing field. Actual islands and the coastlines of Greece and Turkey reflect a luminous nautical ball. The real silhouette of Crete is the player-controlled horizontal paddle at the southern edge. The game combines real geography with deliberately tuned, enjoyable arcade physics.

Keep the 75 user-approved design decisions intact. `GAME_DESIGN.md` and `DECISION_REGISTER.md` (when present) define the detailed product requirements. Never replace a confirmed choice with a more convenient implementation without explicit approval.

## 2. Mandatory reading and hierarchy

Before writing or modifying code:

1. Read this file completely.
2. Read `DECISION_REGISTER.md` and `GAME_DESIGN.md`.
3. Read `TECHNICAL_ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, and `TEST_MATRIX.md`.
4. Read the explicitly authorized `PHASES/PHASE_XX.md`.
5. Check `PROGRESS.md`, `KNOWN_ISSUES.md`, and the current repository state.

If a referenced document is absent, **report that it is absent**; do not invent its contents or infer that you may start implementing a phase. Source-of-truth precedence: explicit new user instruction > approved decision register/game design > architecture and phase plan > this file's general engineering defaults. When documents conflict, flag the conflict before implementing the affected feature.

## 3. Autonomy and approval gates

- Work independently **within the current authorized milestone**. Write code, run tests, fix ordinary bugs, and document results without repeatedly requesting permission.
- STOP after that milestone's acceptance criteria are met or when a significant blocker/design conflict requires a decision.
- Do not automatically proceed to the next milestone, deploy, connect paid services, or change scope.
- Do not silently modify geographic accuracy, mechanics, agreed scoring rules, or user-facing behaviors to avoid technical work.
- Do not claim a feature, test, device verification, or deployment succeeded without real evidence.
- If required testing is impossible in this environment, state exactly what was not tested and provide reproducible manual steps.
- Do not automatically launch a browser except when executing a specifically approved browser test. Do not burden the user with routine terminal approvals when tooling allows autonomous execution.

## 4. Non-negotiable design invariants

### Geography and arena

1. Use authentic geospatial coastline/island data; preserve geographic shape, placement, scale and relative proportions. Do not widen channels, shift islands, exaggerate tiny islands, or reshape Crete for convenience.
2. A single documented **projected world-coordinate system** is shared across visual rendering, ball physics, island IDs and pointer mapping. All map themes use the same geographic geometry.
3. Portrait gameplay shows the entire chosen Aegean arena within fixed, unstretched bounds. The arena must preserve aspect ratio; blank/padded areas are preferable to geographic distortion.
4. Crete is the deliberate exception to fixed geography: it translates horizontally as a rigid, unrotated island silhouette. Its full shape stays visible throughout movement.
5. Visible map data and optimized collision data must come from the same authoritative source and must be validated against one another. Keep geometry simplification tolerances explicit and inspectable.
6. Tiny islets below a consistent, declared collision threshold may be visible but non-collidable. Avoid device-dependent surprise changes to collidability; define threshold against a canonical gameplay viewport and record the excluded IDs.

### Physics and controls

7. Use a **fixed timestep**, independent of display refresh; collisions and gameplay must behave consistently on 30/60/120 Hz devices. Visual quality scaling must never affect collision fidelity.
8. Use Phaser with its Matter.js integration for the initial implementation, adding specialized swept-circle/shoreline collision tests or controlled substepping as needed to prevent high-speed tunneling. Benchmark before finalizing the collision strategy.
9. Physical land is solid on every side. Mainland Greece and Turkey are reflecting walls; islands are scoring targets. Crete is solid on every side, while **only eligible north-facing contacts** receive special hybrid paddle bounce assistance.
10. Crete moves horizontally from touch gestures in the lower portion of the screen, with a maximum movement speed and no residual drift. Support equivalent desktop mouse and keyboard control.
11. The ball has a real collision core plus a larger **non-colliding** glow. A collision occurs at the core, not the halo.
12. The ball experiences gentle southward gravity; weather provides occasional clearly indicated forces. Crete's movement can impart *bounded* changes to outgoing speed and angle. Collision-based spin may affect subsequent surface rebounds, but does not cause open-water Magnus curvature.
13. Stuck-ball assistance is subtle and only activates after measurable entrapment. Log each intervention in developer analytics.
14. A life ends only when the **entire ball** crosses the southern escape boundary. Open-water northern/eastern/western arena boundaries reflect the ball.
15. Launch input and charged double-tap power-bounce input must be distinct state transitions. A double tap must never accidentally launch, pause, or consume multiple charges.
16. The game must pause when backgrounded; a three-second countdown precedes normal resumption.

### Gameplay and UI

17. Endless survival with three starting lives, occasional earnable extra lives, progressive but capped difficulty, and Easy/Normal/Hard presets.
18. Qualified island collisions award base points. Hits on *different* islands grow a shared combo up to ×5; same-island repeats do not grow it. Mainland collisions award no points. Preserve separate high scores per difficulty.
19. Selected islands have special abilities with independent cooldowns; multiball is temporary. Effects must not compromise deterministic game rules.
20. Default visual appearance is a dark, minimally outlined Aegean map. Provide four selectable themes once their phase is authorized; never use image distortion as a substitute for geographic data.
21. Normal game HUD stays compact: score, lives, combo, target, Crete charge. Physics numbers, overlays, and tuning controls stay in developer mode.
22. Rendering/audio effects can be throttled on rapid contacts, **not** actual collisions, scoring, or physics events.
23. Support English, Turkish, and Greek with stable nonlocalized island identifiers.
24. Exploration history, achievements, completed games, and personal bests are local only. No mandatory account, backend, global leaderboard, or network analytics.

## 5. Engineering architecture

Use TypeScript, Vite, Phaser and Matter.js. Prefer built-in framework systems over new dependencies. Pin and record **verified current dependency versions** at project setup. Use Vitest for unit/integration tests and Playwright for browser tests where available; test actual touch devices manually when browser automation cannot replicate their behavior.

Keep clear module boundaries:

- `geo/`: source licensing/attribution, preprocessing, projection, islands, coastlines, polygon validity, IDs, and simplification.
- `physics/`: timestep, moving Crete geometry, ball, continuous collision detection, impulses, gravity, spin, weather, and anti-stuck logic.
- `game/`: finite-state machine, lives, scoring, combos, powers, targets, multiball, difficulty, achievements.
- `render/`: camera, themes, geographic outlines, animation, adaptive graphics, cosmetic effects.
- `input/`: touch/mouse/keyboard handling and gesture state machine.
- `ui/`: menu, HUD, tutorial, pause, game-over, settings, exploration.
- `storage/`: IndexedDB schemas, game checkpoints, versioned migrations, manual JSON backup/import.
- `i18n/`: strings and localized island display names.
- `devtools/`: collision overlay, ball placement, trajectory replay, physics sliders, analytics dashboard.
- `tests/`: physics assertions, geographic fixtures, deterministic regression cases, PWA and user-flow checks.

Directories can be adapted for practical reasons, but these responsibilities must remain separate.

## 6. Geography data safeguards

- Choose a lawful, sufficiently detailed geographical source; inspect coverage of the Aegean and small islands before locking it in. Record data version, license, attribution, download source, and preprocessing parameters in `SOURCES.md`.
- Preprocess large GIS files at build time; do not repeatedly parse/simplify them in the animation loop.
- Validate coordinate reference system, longitude/latitude handling, projection distortion, closed polygons, ring winding, holes, multipolygons, mainland-vs-island classification, and map boundaries.
- Use a broad-phase index (spatial grid, R-tree, or equivalent) before narrow-phase contact tests.
- Verify visual/physics outlines at the actual mobile viewport scale; any meaningful visible misalignment is a defect.
- Stable island IDs must survive translations, theme switches, rendering changes and reasonable data revisions.

## 7. Physics quality requirements

- Build development-only tools early: editable initial position/velocity, collision outlines, contact normal, velocity vector, force vector, pause/single-step, deterministic seeded simulation where applicable, scenario replay and log export.
- Test high-speed circle-versus-segment collisions, glancing contacts, sharp tips, narrow channels, Crete tip misses, moving-platform contacts and multiball corner cases.
- Do not let the ball penetrate land or teleport due to geometry changes, low FPS, save/load, camera shake, or slow motion.
- The debug physics tuning panel must modify named settings at runtime, store/export separate Easy/Normal/Hard parameter sets, and reset to approved defaults.
- Never “fix” tunneling by invisibly enlarging all islands or enlarging the real ball's collision radius.

## 8. Performance, PWA, persistence and accessibility

- Target smooth 60 FPS on capable phones, measure frame time and memory, and automatically scale **cosmetic** quality only.
- Make all runtime-critical assets available offline after installation, including all required geographic geometry, audio, translations, fonts and chosen core themes. No runtime CDN dependency.
- Use appropriate PWA manifest, service-worker caching/update lifecycle, and graceful handling of offline first-run or partially cached assets.
- Separate active-run snapshots from persistent progression. Version data schemas and migrate forward safely. If an old in-progress run is incompatible, notify the player and preserve permanent progress.
- Save checkpoints periodically as well as on page visibility changes. Provide validated JSON export/import with merge-or-replace choice.
- Honor reduced-motion preferences, configurable audio/haptics, high contrast, and text sizing. Audio starts after a user gesture. Never assume vibration works on every device.
- Implement local developer analytics and heatmaps without transmitting personal data.
- Satellite imagery, if used for the optional theme, must meet attribution/licensing and offline-size requirements; do not hotlink third-party map tiles.

## 9. Testing and milestone acceptance

Each milestone needs explicit tests and a human approval gate. At a minimum report:

1. Files changed and why.
2. Commands run, with actual output summaries and pass/fail counts.
3. Visual evidence (screenshot or recording) when capture is available; otherwise precise manual review instructions.
4. Manual phone-specific tests not automated, clearly marked **NOT TESTED** until performed.
5. Known defects, severity and reproducible steps.
6. Completion status against the current phase's acceptance criteria.
7. Explicit request for permission **only to start the next phase**.

If checks fail, fix the issue in the current phase or document a blocker; do not move on pretending the gate passed.

## 10. Progress and change tracking

Maintain these lightweight files as development proceeds:

- `PROGRESS.md`: current authorized phase, tasks done/in progress, commands/results, evidence, blocked items, next approval gate.
- `KNOWN_ISSUES.md`: reproducible bugs, severity, affected versions and status.
- `CHANGELOG.md`: concise user-facing changes by milestone.
- `SOURCES.md`: geographic and media datasets, licenses, provenance, attribution.

Any new tuning constant must be defined centrally, named, documented and attributed to a difficulty profile rather than buried in scene code.

## 11. Prohibited shortcuts

Do not use fake or hand-drawn island geometry as the *final* map. Do not substitute screenshot hitboxes for verified world-space coastlines. Do not stretch the map, make an invisible rectangular Crete paddle, invent physics results, inflate scores through repeat contacts, send user gameplay analytics to a server, or remove approved features without agreement. Do not silently “finish” a milestone that lacks manual validation.

## 12. First action when this file is supplied to Antigravity

Read the other specification files, summarize missing inputs/conflicts, and present the precise **Phase 0** work and acceptance criteria. If the user has authorized Phase 0, implement Phase 0 only. Otherwise, do not start coding.

End of File
