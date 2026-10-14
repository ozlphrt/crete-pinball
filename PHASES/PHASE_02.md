# Crete Pinball — Phase 02: Ball Physics and Collision Reliability

Version: 1.0  
Status: Ready for authorization ONLY after Phase 01 sign-off  
Scope: Deterministic ball movement, geographical collision response, Crete paddle physics, defensive boundaries, rescue logic, and diagnostics. No scoring or arcade bonus features.

## 1. Objective

Transform the approved Phase 01 geography and movable Crete into a genuinely playable **physics sandbox**. One nautical ball must launch from Crete, travel under gentle southward gravity, collide credibly with the real Aegean geography, and either rebound off Crete or leave through the south escape boundary. The physics must remain reliable at maximum supported speed, including near narrow channels, island tips, sharp coastline corners, and a moving Crete.

**Do not implement** score, combo multipliers, lives counters beyond a placeholder loss/relaunch cycle, weather events, charged power bounce, multiball, special islands, achievements, themes, or analytics dashboards. Later phases own those systems.

## 2. Mandatory reading and authorization

Read, in order:
1. `CLAUDE.md`
2. `DECISION_REGISTER.md`
3. `GAME_DESIGN.md`
4. `TECHNICAL_ARCHITECTURE.md`
5. `IMPLEMENTATION_PLAN.md`
6. `TEST_MATRIX.md`
7. `PHASES/PHASE_00.md` and `PHASES/PHASE_01.md`
8. Phase 01 handoff, source/projection/geometry metadata, and `PROGRESS.md`, if present
9. This file

Before changing code, confirm that Phase 01 was accepted and that its geographic transforms, stable land IDs, visual outlines, simplified collision geometry, and Crete bounds are available. If not, stop and report the precise prerequisite. Never silently fabricate replacement geography or deviate from an approved decision.

## 3. Fixed design constraints

- Rendering and physics share the Phase 01 world-coordinate system; screen scaling must not alter physics.
- Authentic island and coastline positions/shapes may **not** be moved, stretched, inflated, or reshaped to improve bounces.
- The visible ball has a small solid collision core plus a larger non-colliding luminous halo.
- Ball movement combines inertia and **gentle southward gravity**. Difficulty settings are configured but progression is deferred to Phase 03.
- All land, including Crete, is solid from every side. The north-facing part of Crete receives a special controllable hybrid paddle rebound; other faces receive ordinary collision response.
- Crete moves only horizontally, stays completely visible, stops promptly with the input, and obeys a speed limit. Its actual velocity affects the ball's outgoing direction and speed within caps.
- Crete can be missed around either tip. A ball is lost only when its **entire physical core** clears the southern escape boundary.
- Other open-sea arena edges reflect the ball without scoring. A ball hitting a nearby southern island can recover naturally.
- Off-center contacts can impart limited spin that influences **later contacts**, gradually decaying. Spin must not cause open-water curvature.
- Anti-stuck assistance acts only when entrapment is detected; it cannot modify geography or teleport the ball.
- Physics fixed timestep must not depend on FPS; rendering may interpolate states.
- The game must support both touch and desktop controls with identical physics rules.

## 4. Module boundaries and contracts

Implement behind typed interfaces; adapt exact paths to the repository's established conventions:

- `physics/PhysicsWorld`: owns Matter engine, fixed-step accumulator, pause/resume and deterministic stepping.
- `physics/BallBody`: owns ball core, radius, mass, restitution, friction, angular velocity and lifecycle.
- `physics/GeographyCollider`: registers and queries compiled polygon/segment collision bodies indexed by stable feature ID.
- `physics/ContinuousCollision`: performs swept circle vs candidate coastline geometry, high-speed detection, and fallback resolution.
- `physics/CretePaddle`: binds approved Crete geometry to its X-only transform and controlled movement.
- `physics/PaddleRebound`: classifies northern contacts and computes safe, clamped outgoing velocity.
- `physics/AntiStuck`: monitors recent trajectories and proposes minimal corrective impulses with diagnostic reasons.
- `physics/ArenaBoundary`: reflective north/east/west open-water edges and southern loss detection.
- `game/BallLifecycle`: held, launching, in-play, lost; emits events without implementing scoring/lives yet.
- `debug/PhysicsOverlay`: toggled developer display for vector normals, contact points, trajectories, shape outlines, and numeric state.
- `config/physicsPresets`: typed Easy/Normal/Hard initial constants, clearly labeled provisional values.

Keep collision callbacks free of audio, HUD, scoring and particle logic. Emit events with canonical IDs and world positions for use by later phases.

Suggested events: `ballLaunched`, `collisionStarted`, `collisionResolved`, `cretePaddleHit`, `ballStuckAssisted`, `ballExitedSouth`. Include ball ID, feature ID/type, world contact point, normal, pre/post velocity and simulation tick where applicable.

## 5. Engine setup and deterministic stepping

1. Use the installed compatible versions of Phaser and Matter as defined by Phase 00. Verify their actual APIs locally rather than inventing methods.
2. Centralize all simulation updates in one fixed-timestep loop. Start with 60 Hz or a justified higher internal rate; cap catch-up steps after tab suspension and prevent giant delta spikes.
3. Apply gravity in world units per second squared, with south corresponding to positive world Y (or document the established sign convention).
4. Run the same simulation state under 30, 60, 90 and 120 FPS render schedules. The output must agree within a documented tolerance.
5. Record any determinism limitations of the chosen Matter version; fixed steps alone do not guarantee bit-identical results on different engines or devices.
6. Restrict random sampling to a seeded interface; do not add uncontrolled randomness to ball physics.
7. Separate gameplay time from real-wall-clock time so pause, visibility changes, and future slow-motion do not break simulation.

## 6. Authoritative collision data integration

- Consume the Phase 01 collision dataset, coordinate transform, source hashes and feature manifest; never parse third-party maps at runtime.
- Validate ring topology, closed outlines, islands with holes, concave coastlines, seam endpoints and physical obstacles at startup/build time.
- Use a broad-phase spatial index (grid, bounding volume hierarchy or engine query) to test only nearby candidates.
- For a detailed static coast, use tractable segment or decomposed concave-body representations as appropriate; do not pass one giant self-intersecting body into Matter.
- Associate each collider with its originating stable island/mainland ID, segment IDs and proximity metadata. Reuse those IDs in debug output.
- The Phase 01 screen-space tiny-island collision threshold determines which tiny islets are non-collidable. Tiny islands are still rendered.
- Measure and document max/mean shoreline collision deviation from detailed visual coastline at gameplay zoom; expose deviations in debug overlay.
- Ensure the ball cannot collide with invisible replacement rectangles or colliders over open-water channels.

## 7. High-speed and continuous collision protection

Matter's discrete collision integration alone is **not** sufficient proof that a fast, small ball cannot tunnel across a thin coastline.

Implement a narrowly scoped swept-circle test each fixed step:
1. Compute the ball's intended core-center path from pre-step to prospective post-step positions.
2. Query candidates across the swept bounding box, expanded by core radius.
3. Find earliest valid time of impact against coastline segments and segment endpoints, accounting for the moving Crete transform when relevant.
4. Advance to contact with conservative epsilon separation, compute outward normal, resolve the collision, and integrate the remaining fraction of the step.
5. Allow a bounded number of impacts per step; if that cap is reached, log a diagnosed failure and resolve safely, not by silently passing through land.
6. Prevent double impulses when Matter reports the same contact handled by the swept solver. Document ownership and ordering of contact resolution.
7. Handle near-tangent and zero-distance contacts without NaN or exploding velocity.

Test exact corner impacts, acute bays, narrow channels, overlapping candidate bounds, grazing coastlines, and the moving paddle tips. Never label a tunnel as fixed just because it is rare in manual play.

## 8. Ball characteristics

Define a named `BallPhysicsConfig` with documented units and bounds for:
- Core collision radius (in world units), mass and restitution.
- Minimum practical speed and maximum permitted speed; clamp speed after collision and impulse operations, without changing direction unintentionally.
- Linear and angular damping.
- Collision friction and effective spin transfer coefficient.
- Stationary and launch initial velocities.
- Anti-jitter separation epsilon and maximum collision iterations.

The collision core must be clearly visible as a solid center. The larger halo and motion trail are rendering-only and must not alter the collision footprint. Preserve the ball's authentic location even when the halo overlaps land.

## 9. Ball held on Crete and tap-to-launch

- Before launch, position the ball immediately north of a valid part of Crete's northern coastline, using a computed non-overlapping surface offset.
- While held, the ball follows Crete's horizontal translation and stays in a non-colliding/kinematic state.
- A discrete tap/click launches it with an upward/northward impulse. Define input precedence so drags do not accidentally launch.
- Launch direction can reflect Crete's starting horizontal location; keep it tunable, understandable, and within safe angle/speed bounds.
- Prevent launching into Crete's own polygon or another landmass; reject or find a valid position using a geometrically documented rule.
- After southern loss, return to a held-ready ball for test purposes; do not deduct actual lives in this phase.
- On desktop support the approved mouse/keyboard navigation without changing paddle physics.

## 10. Crete as a dynamic geographical paddle

- Translate Crete's approved real geometry on X only. Never rotate or change Y, shape or scale.
- Implement the approved finger-relative control semantics: horizontal drag displacement within the lower input region; do not jump Crete to the first touch coordinate.
- Apply capped horizontal speed without residual coast/inertia; measure actual applied displacement / fixed-step duration as paddle velocity.
- Maintain full island visibility at travel extremes using the full shape bounds, not a fixed width approximation.
- Use swept relative motion for Crete contacts: ball displacement relative to the moving collider is important for interception.
- Ordinary collision handling applies to south/east/west/nonnorthern coastline contacts, without an artificial upward rescue.
- A missed ball may circulate behind Crete; the whole landmass remains solid.

## 11. Northern contact classification and hybrid paddle bounce

A contact is eligible for enhanced bounce only if it genuinely hits a north-facing portion of the visible Crete coastline from the Aegean side. Do not use 'ball Y less than Crete center Y' as the only test; Crete has complex peninsulas, bays and tips.

Implement and test a robust classifier using source-segment orientation, outward contact normal, ball approach velocity, and the relative paddle/ball transform. Define explicit tolerances at corner seams.

For eligible contacts:
1. Resolve geometric nonpenetration using the actual local coastline contact point.
2. Compute a northward-biased outgoing direction from impact location along the usable paddle extent, local contact normal and measured paddle X velocity.
3. Apply bounded momentum transfer to both angle and speed; apply any off-center angular impulse with clamped spin.
4. Enforce an allowed northward component and angle envelope so the ball returns into the Aegean without being forced into another land segment.
5. Apply a configurable speed cap and cooldown against duplicate paddle impacts.
6. Log all terms in developer mode so a user can understand the bounce.

If an incoming ball hits a noneligible Crete face, use normal solid-land physics. Never invoke the enhanced bounce merely because the ball is nearby.

## 12. Spin and coast rebounds

- Enable constrained angular velocity produced by tangential contact forces and paddle movement.
- Spin changes tangential outcomes at subsequent solid-land contacts, within configured friction limits.
- Apply calibrated decay so spin does not persist forever.
- No Magnus-style curve in open water. Only existing gravity acts between contacts in this phase.
- Display angular velocity, direction and recent contact impulses in developer mode; visible rotating highlight can be a placeholder.
- Test zero spin, opposite high spins, glancing contacts, and maximum paddle movement. No runaway acceleration.

## 13. Boundaries and loss

- On open water at north/east/west fixed arena edges, use invisible solid reflection boundaries and subtle diagnostics, with no scoring hooks yet.
- Actual mainland and island coastlines remain the collision surface wherever land reaches the arena edge.
- The south edge is a one-way escape detection line, **not** a reflective wall.
- Register loss only after the full core is beyond the southern edge (for a downward-exiting ball, center Y minus radius exceeds southern Y, with sign adapted to the world convention).
- No immediate-loss test based only on the latitude of Crete or passing behind it.
- A ball that remains just above the boundary or rebounds off another southern island is still in play.
- Ensure moving Crete does not obstruct the boundary by geometry overlap or enter outside the arena.

## 14. Anti-stuck assistance

The ball may legitimately visit bays and narrow channels. Do not trigger assistance solely because it is close to land.

Detect true entrapment from a rolling history of position, displacement, speed, collision IDs, repeated oscillations and time. Use *simulation time*, not real time. Differentiate long but productive trajectories from loops trapped in a small region.

On verified entrapment:
- Compute a minimal bounded impulse toward nearby open water using validated collision-free candidate directions.
- Do not teleport, pass through land, modify shore geometry, award points, or trigger repeated rescue loops.
- Rate-limit intervention and record every event, including detector evidence and resulting speed.
- Provide a debug toggle and controlled test fixtures for stuck corners and channels.
- Document false-positive and false-negative tests; player access must not expose this debug toggle.

## 15. Pause, resume, visibility and simulation safety

- Pause instantly when the tab loses visibility, on page backgrounding, and upon explicit pause input.
- Do not integrate accumulated background time after resumption. Resume from the last valid physics state.
- Provide a provisional three-second countdown and then continue at a clean timestep boundary.
- Create a serializable physics snapshot schema: ball core position/velocity/spin, Crete X/velocity, hold state, sim tick, RNG seed, anti-stuck history needed for consistent continuation, and config/data versions.
- Reconstruct snapshots deterministically enough for development tests; full production IndexedDB persistence belongs to Phase 06.
- Validate imported snapshot values and reject invalid, nonfinite, incompatible or geometry-penetrating states with a clear error.

## 16. Developer diagnostics for Phase 02

Provide a gated developer-only toolset with:
- Toggle visual and physics coastline overlays, bounding boxes, segment endpoints and difference heatmap.
- Click/tap to place ball in valid water; optionally set velocity X/Y, spin and Crete X.
- View gravity vector, ball velocity, paddle velocity, last impact normal, contact ID, time-of-impact fraction and manifold.
- Step one simulation tick; pause, reset, and replay a seeded fixture.
- Show active collision candidates and count of narrow-phase tests per step.
- Trigger known difficult coastlines and Crete northern/tip/southern approaches.
- Tune named provisional physics values, reset defaults, and export JSON presets if existing dev UI accommodates it; complete sliders/presets are scheduled for Phase 04.
- Record swept-collision interventions and anti-stuck assists with repro state.

No developer overlay may be visible to ordinary players or materially change physics when enabled.

## 17. Automated tests and stress fixtures

Create a self-contained suite with fixtures identified by geographic feature ID and world coordinates (not guessed screen pixels):

**Geometry/contact**
- Static circle against straight, sloped and concave shore segments.
- Segment endpoint and acute corner impact; ball starts barely touching a segment.
- Two neighboring shorelines with narrow clearance; crossing an allowed gap versus hitting blocked land.
- Coastline polygon with hole; tiny rendered but non-collidable islet.
- No phantom contact outside visible shore tolerance.

**High-speed**
- Fast crossings of a thin island and sharp peninsula at maximum configured speed and angled approach.
- Several contacts within one timestep; verify bounded iteration and no tunneling.
- Swept moving Crete hit from north, contact near eastern/western tip, and near-miss beside paddle.

**Motion and spin**
- Predictable southward acceleration without contact.
- Same input replayed under multiple render-frame rates.
- Controlled paddle movement transfers bounded horizontal impulse.
- Spin changes glancing rebound then decays; open-water travel remains independent of spin.

**Lifecycle and edge behavior**
- Held ball follows Crete and does not penetrate land; drag does not auto-launch.
- North/west/east reflection; no bounce at south edge.
- Ball behind Crete remains in play until full core crosses the south edge.
- Southern island redirects ball safely before exit.
- Pause/resume/snapshot restore with no large delta jump.
- Trapped bay intervention once; open-water slow trajectory does not trigger rescue.

## 18. Performance and reliability targets

- Run **at least several thousand** seeded high-speed and edge-case physics steps/trajectories spanning each collision category above. Keep the exact seed and failure log.
- For every simulation, assert finite positions, velocities, angular velocity and body transforms; no body overlap deeper than the configured tolerance after resolution.
- Target 60 FPS rendering on representative mobile hardware without making physics dependent on render speed.
- Track physics-step duration, broad-phase candidate count, narrow-phase tests, and sweep intervention frequency; set explicit performance budgets after a device baseline is measured.
- Report zero confirmed tunneling events in the agreed automated stress suite and zero unhandled numerical failures. If failures persist, do **not** advance to Phase 03.
- Do not claim deterministic cross-browser bit-for-bit outcomes unless demonstrated; specify measured numeric tolerance.

## 19. Manual acceptance walkthrough

Provide a playable debug build where the user can:
1. Move Crete smoothly by dragging on the lower screen, including to both legal extremes.
2. Tap to launch a single visible nautical ball into the Aegean.
3. Observe it accelerate gradually southward and bounce from several real islands and both mainland coasts.
4. Intercept it using Crete: central and off-center northern hits differ perceptibly and remain controllable.
5. Miss Crete and see the ball remain physically active until the southern boundary is fully crossed.
6. Pause and resume without the ball jumping.
7. Place the ball near a selected tiny island, an island tip, a narrow channel, and Crete's backside; verify geometry and contact diagnostics.
8. Compare the same scenario at normal and maximum ball speed without pass-through.

The user approves **physical feel** separately from the automated test suite. If gameplay feels wrong, change tuneable physics parameters before redesigning geography.

## 20. Required handoff and stop condition

Deliver at phase completion:
- Working source changes and instructions to run the sandbox.
- Versioned physics config with initial values, units and acceptable bounds.
- Documented collider construction and swept solver decision/ordering, including limitations.
- Automated test files, actual commands executed, pass/fail counts, reproducible fixture seeds and measured tolerances.
- Screenshot/video or interactive debug walkthrough of representative collision scenarios, if the environment permits.
- Updated `PROGRESS.md` with completed tasks, known failures, risks, geometry version and physics config version.
- An explicit Phase 02 acceptance checklist mapped to `TEST_MATRIX.md`.

**Stop after Phase 02.** Do not begin Phase 03, scoring, combos or arcade bonuses until the user explicitly approves the Phase 02 milestone. If any gate fails, state the failure and remain in Phase 02.

End of File
