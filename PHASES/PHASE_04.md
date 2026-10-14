# Crete Pinball — Phase 04: Special Arcade Mechanics

Version: 1.0  
Status: Ready only after explicit Phase 03 approval  
Scope: Special islands, charged Crete bounce, multiball, weather, critical slow motion, trajectory prediction, developer tuning and deterministic tests.

## 1. Mission

Upgrade the stable single-ball game from Phase 03 without compromising geographical authenticity, reliable collisions, offline functionality, consistent scoring, or fixed portrait controls. This phase must be independently playable and testable. Preserve existing physics and gameplay before enabling any new mechanic.

## 2. Read first and verify authorization

Read `CLAUDE.md`, `DECISION_REGISTER.md`, `GAME_DESIGN.md`, `TECHNICAL_ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, `TEST_MATRIX.md`, the approved Phase 00–03 instructions, the current `PROGRESS.md`, and relevant actual source/tests. Confirm the Phase 03 gate passed and the user authorized Phase 04. If not, stop and identify the missing gate. Never change approved game design without explicitly reporting the conflict and asking for approval at the proper gate.

## 3. Phase boundaries

**Build now:** individual special-island abilities and cooldowns; Crete energy/power bounce; temporary three-ball multiball; bounded weather events; limited critical-moment slow motion; approach predictor; spin tuning; physics parameter controls; regression tests. Add clear temporary visual cues sufficient to test these mechanics.

**Leave for Phase 05:** finished four-theme art, final particle system/audio/haptics, localization polish and tutorial. **Leave for Phase 06:** polished discoveries, achievements, sharing, advanced saved-game migration and comprehensive analytics. **Leave for Phase 07:** final full-device/PWA release hardening.

Existing Phase 03 game-over, lives, points, combos, targets, pause and records must continue working.

## 4. Non-negotiable invariant checklist

1. Land geometry, feature IDs, projection and geographic coordinates are unchanged by abilities.
2. All islands use authoritative Phase 01 collision geometry. No invented islands or invisible score targets.
3. Crete moves only horizontally; remains fully visible and retains all-sided solid geometry.
4. Northern Crete collisions alone use hybrid powered paddle logic; other faces remain ordinary physical collisions.
5. Real physical ball collision cores—not their halos—determine every contact.
6. Southern loss occurs only when the **entire** ball core has crossed the southern boundary.
7. Mainland, invisible sea walls and Crete do not yield island base points.
8. Combo multiplier is capped at ×5, with one shared combo during multiball; repeatedly striking the same island never advances it.
9. Special-island cooldowns must not disable ordinary collisions or base scoring.
10. Speed, acceleration and spin remain bounded, including during buffs and stacked weather forces.
11. Pausing freezes simulation-based timers and prevents effects from expiring in background wall time.
12. Any visual effect must be decoupled from physics and scoring events.
13. Difficulty preserves geographical layout; Easy/Normal/Hard profiles may vary only bounded game parameters.
14. No network, accounts, login, telemetry uploads, or remote dependence.
15. Production inputs remain usable one-handed, with no new always-visible buttons required for routine play.

## 5. Architecture: prefer headless domain systems

Implement typed, injectable systems with narrow contracts. Adapt paths to the actual project structure, documenting deviations:

- `abilities/SpecialIslandRegistry`: maps stable geographic IDs to permanent abilities, cooldown and availability state.
- `abilities/SpecialIslandSystem`: consumes qualified collision events and emits typed ability commands once per valid activation.
- `abilities/CreteEnergySystem`: accumulates combo-derived energy and arms/consumes power bounce.
- `abilities/MultiballSystem`: manages one primary ball, temporary extra balls, exits, and return to single-ball play.
- `environment/WeatherDirector`: deterministic scheduled wind/calm effects and clear announcements.
- `environment/TimeDilationController`: critical-zone detection and time-scale state machine.
- `assist/LandingPredictor`: bounded forecast of ball landing near Crete.
- `debug/PhysicsTuningPanel`: developer-only sliders and presets with schema validation and export.
- `events/GameEventBus`: typed physical impacts, qualified island hits, ability activations, state transitions and visuals.

Simulation/domain logic must run in headless tests without any DOM/canvas dependence. Components must not mutate raw Matter bodies from UI callbacks; route operations through validated simulation commands at tick boundaries.

## 6. One canonical contact and event pipeline

Follow the Phase 02/03 deduplication policy:

`Matter contact → qualified collision event → base score/combo update → eligibility check → ability activation → simulation command → presentation notification`.

Use IDs for ball, island, contact, simulation tick and event sequence. Only one qualifying activation per distinct impact. Repeated resting contacts or contacts on adjacent segments of one island must not repeatedly trigger abilities. Cooldown is tracked per island independently.

Specify ordering when target bonus, combo gain, energy gain and special power all occur in one contact. Make it deterministic, document examples and test them. Never accidentally create an infinite loop in which power-generated contacts recursively trigger more powers within the same tick.

## 7. Initial special islands

Use the agreed examples as the **provisional** roster and validate each against authoritative geographic IDs and actual gameplay reachability:

| Island | Ability | Proposed observable behavior | Primary guardrail |
|---|---|---|---|
| Santorini (Thira) | Explosive bumper | Physically plausible outgoing impulse from genuine collision; bright temporary cue | Capped velocity and no teleportation |
| Rhodes | Speed boost | Temporary, bounded boost to post-impact ball speed | Hard cap and expiry |
| Mykonos | Score multiplier | A short bonus-score modifier on qualified island scoring | Does not raise the underlying ×5 combo cap |
| Lesbos | Bonus points | One bounded immediate point award on activation | Per-island cooldown / no farming |

Start with four; implementation may support 4–6 via data configuration but **do not silently select additional islands or invent final numerical values**. Declare all values provisional, editable through typed configuration and developer tools. Do not use the displayed localized island name as the key.

For each ability define: triggering contacts, duration (if any), activation timestamp in simulation time, cooldown (initial tuning range roughly 10–15 seconds), stack policy, effect on secondary balls, pause/resume serialization, visual cue and cleanup. If the chosen island is below the Phase 01 collidability threshold, flag it as a design/data blocker rather than changing its outline or collision eligibility unnoticed.

## 8. State model for island abilities

Each special island has states such as `READY`, `ACTIVE` (if timed), and `COOLDOWN`. State transitions must be explicit and time-driven by simulation ticks. During cooldown it is an ordinary island: solid, still scoreable, no special power. The indicator is dimmed. Return to charged appearance when the cooldown completes.

Where abilities affect a particular ball, associate status by stable `ballId`; avoid globally applying a ball-local boost. Explicitly define and test collision-triggered reactivation, activation in multiball, timed effects crossing life loss, and suspension/resume behavior.

## 9. Crete's charged power bounce

Energy is generated by successful island-combo progression according to a bounded, configuration-driven rule, not arbitrary continuous collision callbacks. The HUD power meter reflects canonical energy state.

Controls: on touch, the lower-screen drag must remain continuous and responsive. Use an explicit gesture recognizer that distinguishes a double-tap from a drag and from the tap used to launch a ball in `READY_TO_LAUNCH`. On desktop, double-click activates the charge; provide an accessible alternative if required by current UI standards without modifying the original core control model.

When the energy meter is full:
1. A valid double-tap **arms** the next northern Crete contact.
2. The charged bounce consumes the charge exactly once at that valid impact.
3. Apply a stronger, capped, northward hybrid bounce influenced by impact position and Crete horizontal velocity.
4. Make the glow/sound event identifiable, then return the meter to normal charging state.

If the player double-taps too early or has no full charge, do not consume it. Document the decision for armed-charge expiration (recommended: stays armed until used or the life ends, with no real-time countdown). Never trigger power bounce from the southern coastline of Crete.

## 10. Three-ball temporary multiball

Normal play has one ball. A configuration-defined eligible island combination activates temporary three-ball play. Pick a documented, reproducible trigger suitable for playtesting; do not pretend the trigger was specified by the user. Expose it as a tuning parameter pending sign-off.

**Spawn rules:** one existing ball plus two bonus balls, all initialized outside any land collision core, with individually distinct and safe velocity vectors. Maintain stable `ballId` and temporary-vs-primary metadata. Confirm all three have continuous high-speed collision protection. Preserve one **shared** combo scoring system.

**Life semantics:** a bonus-ball exit does not individually deduct lives; during the active multiball round, no life is deducted for an exit until the **last active ball** exits the south boundary. If at least one remains, the round continues. When the timed multiball bonus ends with multiple balls present, choose a deterministic surviving ball and retire other bonus balls without life loss. If only one remains, continue standard single-ball gameplay without respawning it. If none remains, process precisely one ordinary life loss and the existing next-life state transition.

No more than three simultaneous gameplay balls in the initial implementation. Prevent stacking/recursive multiball and confirm whether each trigger can happen once per ball life or after a cooldown. Track multiball duration with simulation time; pause freezes it. Shared score includes qualified hits from all active balls; each ball has its own contact dedupe and cooldown bookkeeping.

## 11. Weather director

Implement bounded, occasional, **announced** weather events, and keep the ambient water animation entirely visual:

- **Meltemi:** brief additional southward force; additive to existing gravity, never replaces base gravity.
- **Crosswind:** temporary horizontal force in a clearly indicated direction.
- **Calm:** temporary reduction of existing southward pull while respecting a safe lower bound.

Use predetermined seeded sequences in automated tests and a tunable weighted scheduler for regular play. Show a small wind-direction/strength indicator and brief notification. Keep event frequency and duration within user-playtested limits rather than hardcoding unreviewed values as final. Avoid simultaneous contradictory weather modes in the first implementation; apply one active event at a time. Different balls experience the same global weather force, scaled consistently by their physics mass as appropriate.

Pause, resume and new-ball transitions must not create weather spikes. A weather effect can end naturally on simulation time; leaving game cancels it safely. Its restoration must not leave residual force after expiration.

## 12. Critical approach slow motion

When a fast ball approaches Crete from the north and enters a narrowly specified danger region, trigger occasional short cinematic slow motion (initial visual target around 50–70% simulated passage rate). This is a change in simulation-time progression, **not** a change in world-coordinate scale, collision geometry, gravity coefficient, or ad-hoc body velocity.

Use a bounded controller with `READY → ACTIVE → COOLDOWN → READY`, hysteresis and a minimum separation between activations. During multiball, ensure one ball cannot retrigger slow motion continuously. Do not start while paused, awaiting launch or already in a resume countdown. On each render frame process fixed-size simulation steps while accumulating time scaled by the time dilation factor; cap catch-up work. Ensure high-speed swept collision still runs at the same stable per-step physics precision.

Provide a reduced-motion setting that minimizes cinematic visuals, **without unexpectedly modifying game difficulty or gameplay time** unless such a gameplay change is explicitly approved and handled consistently across records.

## 13. Limited landing prediction

Implement an approximate Crete-intercept cue for a descending ball, with a short dashed projection near the southern arena. Predict using current velocity, base gravity and active wind; optionally integrate the local trajectory over short fixed steps. Do not draw a misleading landing location if the ball is likely to hit an intervening island, invisible wall or other ball; in uncertainty, shorten or hide it.

During multiball, show only a limited number of high-risk ball predictions and do not occlude coastlines or HUD. All predictions are advisory, not guaranteed. The predictor must never influence physics or player scoring.

## 14. Spin, velocity bounds and stacking policy

Retain Phase 02 collision-based angular velocity and decay. Special impulses, weather and moving-paddle momentum must all respect explicit maximum linear and angular speeds. No in-flight Magnus force is permitted. Angular spin influences subsequent frictional rebounds only. Specify additive/multiplicative stacking policies explicitly; for overlapping timed effects, use bounded deterministic composition and expiration.

Log all applied impulses (ball, source, tick, magnitude before/after cap) in developer mode. Distinguish instantaneous impulses from continuous forces and from time-scale changes.

## 15. Developer physics tuning controls

Extend the Phase 02 debugging interface with live, validated controls for:

- Per-difficulty base gravity and maximum southward gravity;
- Ball starting speed and linear/angular speed caps;
- Crete move speed, rebound steering and controlled momentum transfer;
- Special-island impulse/bonus and cooldown values;
- Power bounce charge thresholds and impulse;
- Multiball trigger, duration, spawn configuration;
- Weather frequency, event duration and force strength;
- Slow-motion speed ratio, critical zone and cooldown;
- Landing predictor horizon; anti-stuck sensitivity.

Render tunable values in human-readable units; retain a canonical internal unit system. Offer `Reset to defaults`, `Save local preset`, `Load preset`, and `Export JSON` (and validated import if already supported), segregated by difficulty where relevant. Use numeric ranges and finite-value validation. Invalid data must never enter the running physics state. Developer features cannot appear in normal release navigation.

## 16. Determinism, persistence and lifecycle

Use a seeded pseudo-random generator for island target selection, weather and multiball directions in automated tests. Record seed, config version, authoritative geometry version, current tick, active ability states, multiball membership, timed effects, weather, time dilation state and charge state in a snapshot schema. Reuse existing pause/resume and periodic checkpoint mechanisms from Phase 03; do not build a parallel incompatible save format.

Restoring a saved multiball during weather and slow motion must not duplicate balls, activate powers twice, lose a life, or apply expired effects. Incompatible snapshots follow the established safe-migration/fallback policy; permanent player progress must be preserved.

## 17. Visual and audio contracts for the next phase

Emit typed presentation events such as `SPECIAL_ISLAND_ACTIVATED`, `ISLAND_COOLDOWN_STARTED`, `POWER_BOUNCE_ARMED`, `POWER_BOUNCE_FIRED`, `MULTIBALL_STARTED`, `MULTIBALL_ENDED`, `WEATHER_STARTED`, `WEATHER_ENDED`, `SLOW_MOTION_STARTED`. Provide provisional HUD cues that are clear and testable now. Finished glowing outlines, shockwaves, haptics and adaptive audio are handled in Phase 05.

Visual and audio effects must not emit synthetic physics contacts. Effect throttling may suppress repetitive flashes or sounds, but **cannot suppress actual physics, scoring or game-state updates**. Respect reduced motion and pause behavior.

## 18. Mandatory automated unit tests

Write headless tests for:

1. Stable island ID lookup; no ability on mainland/Crete/visual-only islets.
2. Per-island 10–15-second provisional cooldown, separately tracked and frozen under pause.
3. Contact dedupe, one-time activation and ordinary island scoring during cooldown.
4. Correct ordering of base points, combo advancement, target bonus and power activation.
5. Charged energy earned only from qualified events and consumed exactly once at a northern Crete hit.
6. Double-tap ignored while dragging, in launch-ready state, or when energy is insufficient.
7. Momentum/boost output speed never breaches the hard cap; spin never produces open-water curve.
8. Three-ball spawn without land overlap, stable IDs and no more than three active balls.
9. Bonus exits do not consume lives while other balls remain; final active south exit deducts exactly one life.
10. Multiball expiration retains a deterministic surviving ball and does not decrement lives.
11. Shared ×5 combo cap across all multiball balls; same-island repeats do not advance chain.
12. Seeded weather intervals, direction signs, force limits, calm bounds, and guaranteed cleanup.
13. Slow-motion state transitions, cooldown, pause freezing and unchanged fixed-step collision rules.
14. Predictor suppression when intervening collisions make estimated landing uncertain.
15. Save/restore of active multiball, ability cooldowns, charge, weather, and slow motion.
16. Normal gameplay continues unchanged when every Phase 04 feature flag is disabled.

## 19. Mandatory automated collision and stress tests

Build upon Phase 02 swept-collision tests. Perform many seeded trajectories against actual Aegean coastlines with each difficulty and special physics combination. Include:

- Maximum boosted speed toward tiny collidable islands and narrow passages.
- Fast approach to Crete while Crete moves in the opposite direction.
- A charged rebound into nearby land.
- Three concurrent balls crossing close to several separate coastline segments.
- Wind reversal near an island cluster.
- Slow-motion entry/exit while a ball is near a corner.
- Multiball exit exactly at the southern boundary.
- Resume from pause when a ball is touching land.

Assert no tunneling, NaN/Infinity, persistent invalid penetration, phantom score, duplicate life loss, endless same-tick contact recursion or loss of deterministic test repeatability. Record test seed and minimal reproduction for every failure.

## 20. Manual acceptance walkthrough

Provide a playable build demonstrating the following in sequence:

1. Start Normal; show correct map, controls and unchanged ordinary collisions/scoring.
2. Hit each configured special island, show activation, then immediate subsequent cooldown behavior.
3. Build charge through distinct island combos; arm with double-tap and execute one enhanced northern Crete bounce.
4. Trigger three-ball multiball, visibly lose one bonus ball and keep playing, then return to one survivor.
5. Trigger each weather type from the developer panel and watch clear physics response.
6. Trigger critical slow motion once; show smooth return to normal and proper cooldown.
7. Show the short landing guide without hiding important geography.
8. Pause/reload during multiball and a weather event and resume without broken state.
9. Switch Easy/Normal/Hard and demonstrate bounded, different tuning presets.
10. Run with all new mechanics disabled to verify no regression in the Phase 03 core loop.

Do not claim success merely because the code builds. Verify on an actual phone-sized viewport and desktop portrait arena. If a real-device test could not be run, report that explicitly.

## 21. Exit criteria and approval gate

Phase 04 is complete only when:

- All implementation items are functional and configuration-driven.
- All Phase 00–03 regression tests still pass.
- Automated tests in Sections 18–19 pass, with no ignored failures.
- Full event lifecycle works across pause, visibility changes, save and resume.
- Geography is unchanged; collisions remain reliable at the highest reachable velocities.
- Lives, scores, combos, cooldowns and abilities behave consistently in three-ball multiball.
- Developer controls export valid, bounded presets and cannot corrupt simulation state.
- A short human walkthrough and reproducible test commands are supplied.

Update `PROGRESS.md` with files changed, exact commands, test output, unresolved issues, provisional tuning numbers, known tradeoffs and any proposed design deviation. Present the running build for review. **Stop and request explicit user approval before Phase 05.** Do not silently proceed to visual polish, localization, discovery or PWA-release features.

End of File
