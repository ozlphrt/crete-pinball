# CRETE PINBALL — TECHNICAL ARCHITECTURE

Status: Implementation architecture for the 75 approved design decisions. This document describes how to build the game, not permission to revise its design. Read `CLAUDE.md` and `GAME_DESIGN.md` first.

## 1. Architectural priorities

1. Preserve real geographical shapes, scale, relative positions and stable island identities. Do not stretch, move, enlarge or invent landforms to improve play.
2. Make collision detection trustworthy, reproducible and independent of rendering frame rate.
3. Keep gameplay modules independent of rendering, storage, audio and localization.
4. Run completely offline after initial caching; no backend, accounts, telemetry service or CDN dependency at runtime.
5. Build incrementally. Every phase must have passing tests and a human approval gate.

## 2. Technology and project setup

- Language: TypeScript with strict compiler settings.
- Build/dev: Vite; PWA via a maintained Vite-compatible service-worker plugin.
- Runtime/rendering/scene/input: Phaser with its integrated Matter.js physics support.
- Data: preprocessed local vector geography in versioned assets; source metadata and licenses retained.
- Persistence: IndexedDB for durable structured records; small bootstrap preferences may use localStorage if appropriate.
- Tests: fast unit tests, geography validation scripts, deterministic integration simulations and Playwright-style browser/device smoke checks where supported.
- No frontend framework is required for the canvas HUD; DOM overlays for menus/accessibility/developer panels are acceptable if kept separate from simulation.
- Pin exact dependency versions in the lockfile. Check current library APIs/documentation before implementation; do not assume example snippets are current.

Recommended source layout (adapt only with documented reasons):

```text
src/
  app/                bootstrap, lifecycle, scenes, dependency composition
  geography/          projection, coordinates, land inventory, render meshes
  physics/            world, ball, coastline collision, Crete, swept tests
  gameplay/           rules, scoring, combos, targets, powers, weather, lives
  input/              touch/mouse/keyboard intent mapping
  rendering/          maps, themes, particles, camera, HUD presenters
  audio/              mixer, effects, audio-unlock, optional haptics
  localization/       EN/TR/EL messages, names, fallback
  persistence/        schemas, migrations, checkpoints, import/export
  pwa/                service-worker update and offline behavior
  devtools/           overlays, tuning, metrics, trajectory replay
  shared/             IDs, immutable contracts, typed events, utilities
assets/
  geography/          versioned generated assets + attribution
  audio/              bundled, licensed sound assets
  themes/             bundled visual assets, as licensed
scripts/              geography import, simplification, validation
 tests/              unit, physics scenarios, geography, E2E
```

No cross-module direct mutation of game-state objects. Input submits player intent; rules/physics update authoritative state; rendering reads snapshots or events. Do not put score calculations inside collision animation callbacks.

## 3. Coordinate systems and fixed portrait arena

Maintain three explicit spaces:

1. **Geographical coordinates:** WGS84 longitude/latitude and original GeoJSON topology as input.
2. **Projected game-world coordinates:** a declared metric or locally suitable projected Cartesian coordinate system, with fixed real-world aspect ratio. The projection, datum, origin, axis directions and bounds are versioned.
3. **Screen pixels:** a transform for letterboxing/scaling; the screen transform never modifies gameplay world coordinates.

Use one and the same projection and geographical bounds for visuals and collision assets. A naive equirectangular longitude/latitude display with equal pixel axes would distort shape; select and document a suitable projection and quantify distortion over the Aegean. North is up; southward gravity is +world-Y (or the equivalent declared convention). The entire specified Aegean field is visible in portrait mode with non-stretched letterboxing/margins. Crete remains at the southern defensive position and translates along the world X axis. Its translation does not alter the original relative shapes of any other islands.

A future desktop layout centers the identical portrait game rectangle; letterboxing does not change simulation or game balance. All input coordinates convert through the inverse display transform. The HUD must not obscure the ball or Crete.

**Unresolved calibration, not a license to guess silently:** precise arena north/east/west/south bounds, source projection, scaling, ball-to-map size, Crete translation extrema and bottom escape line. Document chosen numeric values and verify with annotated screenshots before phase approval.

## 4. Geography ingestion and validation

Keep a reproducible, *offline build-time* geography pipeline:

1. Evaluate available authoritative/open vector sources for coastline and small-island detail, with attribution and redistribution rules. Natural Earth at 1:10m is a starting candidate, not proof of sufficient small-island coverage. Where needed, compare suitable higher-resolution licensed data.
2. Record source URLs, retrieval date, edition, feature IDs, geographic coverage, licenses and transformation history in a manifest.
3. Clip to agreed map bounds without accidentally closing open sea passages with artificial land edges.
4. Normalize polygons/multipolygons, winding, self-intersections, holes, ring closure, dateline handling where applicable, duplicated vertices and tiny geometries.
5. Project all geometry once into world coordinates.
6. Generate **high-detail visual coastline meshes/paths** and **optimized physical coastline boundary segments** from the *same* underlying geometry. No independently hand-drawn physics shoreline.
7. Simplify collision boundaries with measurable maximum deviation; maintain topology, land/sea orientation, and important bays, peninsulas and navigable passages. Keep the accuracy tolerance under active test and visible at game zoom.
8. Inventory and classify features: `mainland`, `ordinary_island`, `special_island`, `crete`, `islet_visual_only`; keep stable IDs and localized names. A screen-space minimum-size rule controls whether a tiny islet is physically collidable, without enlarging its appearance.
9. Generate spatial indices (e.g. grid/R-tree) keyed by world bounds for efficient nearby segment queries.
10. Emit source manifest and reproducible asset checksum; run automated consistency tests before accepting new geography.

**Geography invariants:** stable island IDs; no fabricated land; no accidental invisible wall between adjacent real shores; the simplified physics land boundary is within an approved visual tolerance of the drawn coast; no open paths unexpectedly treated as land. mainland collisions do not score; islands do, including the special ones. Crete is one movable solid, not a rectangle disguised as an island.

Because Crete translates, store its coastline in local coordinates and update world transforms and broadphase bounds with its position. Ensure it cannot move partially offscreen and never collides with unrelated static land in a way that corrupts physics. The escape boundary is a separate game rule below Crete; northern and lateral open-water field boundaries reflect with a minimal ripple.

## 5. Physics engine and collision strategy

### 5.1 Fixed-step simulation

Use a fixed timestep (candidate 1/120 s; final choice requires measurement), accumulator and capped catch-up steps. Render/interpolate independently and target 60 FPS visually. Background tabs pause game simulation. Simulated timers (combo/cooldown/weather/power) advance on physics time, not wall-clock render time. During cinematic slow motion, scale simulated progression coherently instead of changing gravity or restitution ad hoc.

### 5.2 Matter integration

Use Matter to model dynamic circular balls and static or kinematically moved coast segments where appropriate. Explicitly configure collision filters, mass, restitution, friction, air drag and angular damping. Do not create one enormous concave Matter polygon for all land; concave decomposition can create unwanted interior seams or overload the broadphase.

Represent coastlines as a well-tested boundary-segment or compound-boundary strategy, with collision normals pointing toward water. Validate narrow bays, corners and small islands. Use a broadphase index and **swept-circle/segment checks or substepping** to protect against high-speed tunneling. A ball must not pass through land because it moved more than its diameter in one update. All fallback collision correction is logged in development builds.

Important: Matter's normal collision detection does not guarantee continuous collision detection at arbitrarily high speeds. Demonstrate high-speed correctness empirically in automated tests before claiming it.

### 5.3 Collision response

- A ball is solid and has a small collision core with larger nonphysical luminous halo.
- Fixed coastlines obey plausible reflection and restitution; repeated collisions are not counted twice within a jittering contact manifold.
- Ordinary island hits earn base points; mainland hits do not. Audio and visuals can be throttled independently of physics/scoring.
- Crete is a **solid island on every side**. Its *north-facing coast* has controlled arcade rebound bias, guaranteed practical upward return after a successful hit, based on contact point, local normal and horizontal paddle velocity. Other sides obey normal solid-land physics, with no automatic rescue bounce.
- Crete transfers bounded horizontal momentum to the ball; outgoing speed and angle are clamped to calibrated limits. Crete itself moves with responsive, speed-limited, no-inertia horizontal control.
- Off-center collisions may impart spin; angular velocity affects later collisions within capped limits and decays. No Magnus force in open water.
- Gentle southward gravity always acts except as explicitly modified by temporary weather. Temporary Meltemi/crosswind/calm events expose visible cues and bound forces.
- Anti-stuck support detects genuine confinement or excessive repeated loops, then applies a small justified impulse toward reachable open water. Do not rescue a normal slow-moving ball or teleport it through land.
- Arrival predictions near Crete may be approximate; disappear if upcoming collisions/weather make the prediction unreliable.

### 5.4 Boundary/life conditions

- Open-water top/side edges: invisible reflective boundaries with a restrained ripple.
- Bottom edge: ball is lost only after **its full collision core** passes beyond the defined south escape line.
- Ball passing beside Crete is still active until that exit; collisions behind Crete remain physically valid.
- During multiball, a ball leaving the bottom removes that ball. Loss of the last active real ball costs one life; bonus balls do not independently cost lives.
- On new launch, the ball attaches north of Crete; it follows paddle translation and launches on tap/click, not on movement alone.

## 6. Deterministic gameplay model

Implement typed state and a finite-state-machine approach, with explicit states similar to:

```text
BOOT -> MENU -> TUTORIAL? -> READY_TO_LAUNCH -> PLAYING
                                        PLAYING -> PAUSED -> COUNTDOWN -> PLAYING
                                        PLAYING -> BALL_LOST -> READY_TO_LAUNCH
                                        PLAYING -> GAME_OVER -> RESULTS -> MENU / NEW_GAME
```

Use deterministic seeded pseudo-random choices for temporary bonuses/weather (record seed for reproducibility). Note that cross-browser floating-point and engine variations may prevent bit-exact deterministic replay; store checkpoints when exact continuity is required. Duplicate collision callbacks must never award duplicate points.

Core gameplay service owns:

- three initial lives and a clearly bounded extra-life policy;
- valid island hit scoring (100 base points unless tuned under approved rules), distinct-island chain and multiplier capped at x5; same island consecutive hits earn base score but do not advance multiplier;
- persistent combo across Crete contacts; life loss resets combo; shared combo across multiball;
- rotating bonus target selection without altering island geography;
- selected permanent special-island types with independent cooldowns (provisional 10–15 s, subject to tuning);
- charged Crete power bounce triggered by double-tap only when ready, consumed on qualifying next collision;
- temporary three-ball multiball and return to single ball;
- progressively increasing but hard-capped speed/gravity/target challenge across Easy/Normal/Hard;
- timed weather events, bounded impact shake and rare approach-to-Crete slow motion;
- level-free endless survival; no fixed session time limit.

All points, achievement progress, discoveries, visual notifications and sounds should derive from structured `GameEvent` records. Renderers/sound can ignore duplicate effects, but cannot modify award logic.

## 7. Input and player experience

Mobile portrait is authoritative:

- On-screen lower-area horizontal swipes/direct gestures move Crete. Convert motion to world-space target X, limited by max speed; avoid a sudden jump on initial touch by defining relative drag vs absolute targeting explicitly during prototype testing.
- Tap while ready launches the ball. Double-tap during play arms/uses the charged bounce as specified; gesture recognition must not accidentally trigger a single-tap or hijack a drag.
- `touch-action: none` on the gameplay surface where needed; respect safe-area insets and avoid scroll/zoom interference. Exploration screen separately supports pinch zoom/pan.
- Desktop keeps the portrait rectangle. Mouse controls Crete, click launches, double-click triggers power, arrows are alternative movement and Space toggles pause.
- Lose focus/visibility -> immediate pause and checkpoint; resume through a 3-second countdown. Use periodic snapshots as close events aren't reliable.
- Compact HUD: score, lives, combo, target at top; power meter near Crete; contextual island labels. No physics numbers outside developer mode.

## 8. Rendering, themes and audio

All visual themes share world/collision transforms. The default is dark navy, thin illuminated coastlines, muted land and a bright nautical ball. Other themes: Neon Arcade, Vintage Chart, Satellite. Theme assets must be bundled and legally usable offline; do **not** hotlink third-party satellite tiles or ship unlicensed raster imagery.

Separate layers: sea background; mainland/island fills; coastline outlines; target/highlight accents; balls/trails; localized impact ripples; UI; developer overlay. The island coastline flashes briefly on scoring; mainland only shows a localized no-score flash. Throttle repetitive effect/audio emissions while leaving physics unchanged. Adaptive graphics can lower resolution and reduce particles/ambient water effects but must not change physics parameters.

Respect reduced-motion, high-contrast, text scale and independent music/SFX volume. Optional vibration is feature-detected. Start Web Audio on user gesture, with a mute fallback. Never require audio or haptics for gameplay comprehension.

## 9. Localization and island identity

Maintain stable neutral island IDs and separate localized labels for English, Turkish and Greek. UI translation uses keyed catalogs and fallback to English for missing strings; verify Greek/Turkish glyph coverage. Use localized labels for results and exploration screens without changing physics or stored IDs. Avoid hardcoding names into collision models or scoring rules.

## 10. Local persistence, export and versioning

Use versioned IndexedDB stores (illustrative):

```text
profile:         device-local settings, theme, language, accessibility
highScores:      best scores keyed by difficulty and ruleset version
islandProgress:  stable island ID -> first hit, hit count, total points
achievements:    ID -> unlock status and date
sessions:        single resumable game checkpoint + timestamp/schema version
analytics:       bounded aggregated metrics + compact optional heatmaps
metadata:        schema, geography version, physics/ruleset versions
```

Maintain **durable progress** separately from **ephemeral running-game state**. Serialize ball positions and velocities, paddle position, random seed, weather, active powers, combos, lives, cooldowns and all multi-ball objects. On load, validate schema and land geometry versions; migrate if safe; otherwise preserve durable progress and safely invalidate the incompatible session with a clear explanation. Do not silently discard player progress.

Provide validated JSON export and import. Reject malformed or oversized payloads; support clearly explained merge/replace. Exports should contain no secrets or unnecessary identifying data. Store high scores and discoveries offline, with no server telemetry. Cap and prune developer analytics. Local browser storage can be cleared: backups are explicitly user-managed.

## 11. PWA and update behavior

- Installable manifest, icons, portrait preference, responsive loading screen and suitable standalone display.
- Precaching covers app code and essential geography/physics/sound/localization/theme assets required for offline play. Verify first-run cache completeness rather than assuming install implies offline readiness.
- No required remote fonts, map tiles, analytics scripts, or CDN imports during gameplay.
- Stage updated service-worker versions; activate at a safe point between sessions. Ensure old HTML/assets aren't combined with incompatible new data.
- Handle offline install/reopen, interrupted download, quota failure and updates with understandable fallback messages.
- Preserve high scores and progress across updates; use migrations and stable island IDs.

## 12. Developer debug/tuning system

Developer-only mode (excluded or securely gated in production) should include:

1. Ball spawn/placement anywhere in open water, launch angle/velocity, controlled weather and target selection.
2. Overlay of visual and physical coastlines, normals, contact points, ball swept paths and world boundaries.
3. Physics sliders: gravity, max speed, spin damping, restitution, paddle max speed, paddle contact bias, wind strength and anti-stuck parameters.
4. Easy/Normal/Hard preset save/reset/export, with machine-readable effective values.
5. Reproducible scenario seeds, input/event log, last-N collision log and checkpoint replay.
6. Local dashboard for survival duration, island hit frequencies, Crete save/miss ratios, map heatmaps, speed at loss, anti-stuck activations and multiball outcomes.

Debug overlays and telemetry must never influence physics output or normal gameplay performance when off.

## 13. Automated tests and milestone gates

At minimum, automate:

- Geography validity: polygon winding, stable IDs, land/sea classification, no invalid rings; visual-vs-physics boundary deviation and no closed open-water crossings.
- Physics: face-on bounce, glancing angle, corners, repeated near-contact, high-speed sweeps, small channels, coastline normals, Crete north/south distinction, speed caps, spin damping and anti-stuck non-interference.
- Gameplay: repeated island hit scoring, distinct-island combo cap/reset, mainland no-score, cooldowns, power activation, multiball last-ball life rules, southern exit at full-ball crossing, extra lives and difficulty caps.
- Lifecycle: tab switch, pause/resume countdown, saved active state including weather/multiball, migration and invalid saved-session fallback.
- PWA: first online visit and subsequent network-off relaunch, cached theme/language/audio/geodata assets, safe updates and offline import/export.
- UI: mobile portrait, touch gesture discrimination, safe areas, desktop mapping, high contrast/reduced motion, Greek/Turkish text, adaptive rendering without gameplay changes.

For major physics changes, run thousands of controlled trajectories with seed logging and failure reproducibility. Keep a curated set of problem locations (tight channels, sharp corners, near Crete tips, west/east boundary and southern escape). Each milestone delivers a functional build, test log, known-issues register and explicit approval request. See `TEST_MATRIX.md` and `IMPLEMENTATION_PLAN.md` for execution sequencing; if those documents conflict with this architecture or the 75 approvals, stop and flag the conflict.

## 14. External dependencies and attribution

Before accepting any geography or satellite texture source, document version, coverage, license, offline redistribution permission and attribution requirements. Do not assume that public web availability grants redistribution rights. Build scripts may download during development, but the completed offline PWA must not require those services.

## 15. Acceptance / unresolved calibrations

Approval-required technical calibrations include: exact geographical world bounds/projection, pixel-scale island threshold, collision simplification tolerance, paddle travel limits, physics timestep, speed/force presets, weather event frequency, southern escape margin, source imagery/licenses, sound licenses and target device browser matrix. Record chosen values with measurements, screenshots and tests. Never alter agreed gameplay decisions silently.

End of File
