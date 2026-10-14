# Crete Pinball — Phase 03: Core Arcade Gameplay

Version: 1.0  
Status: Ready for implementation **only after Phase 02 approval**  
Scope: Single-ball gameplay loop, scoring, combos, targets, lives, difficulty, compact HUD, pause/resume and baseline persistent records.

## 1. Objective

Transform the Phase 02 physics sandbox into an enjoyable, complete, single-ball arcade loop. A player must be able to select difficulty, position Crete, tap to launch, score by striking islands, build unique-island combos, lose lives only at the southern boundary, reach game over, see a basic results screen, and immediately play again. Do not compromise the approved geometry or physics while building gameplay systems.

The canonical specification is `GAME_DESIGN.md` and the decision register. This document provides execution instructions for this milestone; it does not authorize changing approved rules.

## 2. Required reading and gate

Read in this order before coding:
1. `CLAUDE.md`
2. `DECISION_REGISTER.md`
3. `GAME_DESIGN.md`
4. `TECHNICAL_ARCHITECTURE.md`
5. `IMPLEMENTATION_PLAN.md`
6. `TEST_MATRIX.md`
7. `PHASES/PHASE_00.md`, `PHASES/PHASE_01.md`, `PHASES/PHASE_02.md`
8. Phase 02 sign-off, `PROGRESS.md`, existing source, tests and physics parameter exports
9. This file

Verify that Phase 02 is approved and passes its acceptance suite: authoritative geographical colliders, moving Crete, ball launch, fixed-timestep stepping, high-speed collision protection, anti-stuck assistance, correct southern loss event and developer physics overlay. If any essential prerequisite is absent, report exactly what is missing and stop; do not silently replace real geography with placeholder landmasses.

## 3. Non-negotiable boundaries

- Preserve the single fixed portrait Aegean arena, authoritative world-space geometry and geometry-to-render mapping.
- Preserve the solid full outline of Crete, with special northern rebounds; retain its X-only travel and fixed speed cap.
- Island collisions produce score; Greek/Turkish mainland, Crete and artificial sea walls produce **zero** base points.
- A ball is lost **only** when the complete physical collision core exits through the southern boundary, not when crossing Crete's latitude or passing a paddle tip.
- Start with three lives. An earned extra life may extend the run, subject to a configured cap.
- Default valid island hit is 100 base points. Consecutive distinct islands grow a multiplier up to ×5; hitting the same island again gives base points but does not advance the multiplier.
- Crete rebounds preserve the combo. Losing the ball resets the combo.
- The chosen difficulty affects physics only via approved, typed and bounded profiles. Geometry never changes by difficulty.
- All visible score and HUD animation must be downstream of collision/scoring logic and never influence physical outcomes.
- No global backend, login, online leaderboards or network requirement.

## 4. Out of scope for this phase

Defer to subsequent phases: charged power bounce and energy charging rules, special island activation, three-ball multiball, weather events, critical slow motion, four polished themes, production audio/haptics, first-time interactive tutorial, localization completion, exploration mode, long-term achievements, finished share-card generation, detailed analytics dashboard and full backup import/export.

**Placeholders are allowed** where needed for layout and stable contracts (e.g., Crete energy meter, special ability target styling), but a placeholder must not falsely imply a working feature. Clearly label placeholder controls in development builds. Normal gameplay must not activate features from later phases.

## 5. Architecture and ownership

Use typed, independently testable modules, adapting paths to the established repository structure:

- `game/RunState`: explicit finite state machine and legal transitions.
- `game/RunController`: creates runs, handles life/ball cycle and coordinates game services.
- `game/CollisionEventAdapter`: turns canonical Phase 02 contact events into **qualified** gameplay impacts.
- `game/ScoringSystem`: computes island base, combo and bonus-target points.
- `game/ComboSystem`: tracks distinct consecutive island chain, multiplier and resets.
- `game/BonusTargetSystem`: selects eligible collidable islands by stable geographic ID.
- `game/LivesSystem`: decrements on valid southern exits, grants bounded extra lives.
- `game/DifficultySystem`: maps Easy/Normal/Hard into bounded progression functions.
- `game/SessionClock`: measures active simulation time, not background wall-clock time.
- `ui/GameplayHUD`: score, lives, combo, current target and inactive energy indicator.
- `ui/ResultsScreen`: score, personal best, duration, collisions, best combo and restart.
- `persistence/SessionRepository`: versioned and validated pause/resume snapshots.
- `persistence/RecordRepository`: local personal bests per difficulty.

The actual code organization can differ with a documented rationale, but maintain a strict separation of simulation, rule state, presentation and persistence. Scoring logic must be headless-testable without Phaser rendering.

## 6. Run state machine

Define explicit states similar to:

`MENU → READY_TO_LAUNCH → PLAYING → LIFE_LOST → READY_TO_LAUNCH`, and finally `GAME_OVER`.

`PLAYING → PAUSED → RESUME_COUNTDOWN → PLAYING` must also be supported. Resume countdown must be cancellable by another app visibility loss. Game start from menu and new game from results reset all per-run counters but must **not** erase stored records.

Provide a transition table and assertions or typed guards. Illegal transitions (e.g., scoring after game over, duplicate life deduction, launching a second normal ball while playing, resuming before loading a valid save) must be ignored safely with diagnostics in developer mode.

## 7. Event qualification and deduplication

Consume the stable geographical ID and collision tick/contact data from Phase 02. A physics contact callback can repeat across many frames or produce multiple contact points, so it is not automatically a new scoring hit.

Rules:
1. One real bounce should create one qualified gameplay hit. A persistent contact should not generate repeated points.
2. Re-contact after true separation may qualify if the collision is physically distinct; introduce a **configurable short per-ball/per-feature scoring cooldown** to prevent jitter farming.
3. Suppress duplicate event delivery using tick/contact identifier or equivalent stable key.
4. Collision eligibility is determined by Phase 01 feature categories and the collidable-island manifest, not by matching display names.
5. All cooldown timers use simulation time and freeze while paused.
6. Contact filtering must never disable physical collision response.
7. Emit diagnostics identifying whether a hit was scored, rejected as mainland, or suppressed as duplicate/cooldown.

Build unit tests for rapid bounces, prolonged contact, two coastline segments belonging to the same island, island-to-island rebounds, and collision events received out of order.

## 8. Island scoring and combo semantics

Use a transparent, typed scoring rule. Initially:

- Every **qualified** island collision awards a configurable `baseIslandPoints = 100`.
- Successful consecutive hits on **different** island IDs advance the combo level, capped at ×5.
- The multiplier applies to qualifying scoring hits. The precise first-hit convention must be chosen once, documented and covered by examples; recommended: first distinct hit ×1, second ×2, ..., fifth and beyond ×5.
- Repeated hits on the **same last-scored island** earn 100 base points but do **not** advance or reset the existing combo multiplier; to avoid exploitation, repeats do not receive increased combo points unless an explicit later balancing decision approves that behavior.
- An island hit after a repeat is compared with the last distinct chain island, avoiding false chain advancement through repeated jitter.
- Crete, mainland and arena-edge hits preserve the current chain but never advance it.
- Ball loss resets the chain for the next life; game over terminates it.
- Score arithmetic must be nonnegative integer, bounded/safely handled, and idempotent under replayed collision events.

Recommended test illustration (assuming all are valid separated hits): Naxos 100 (×1), Paros 200 (×2), Paros 100 (repeat; no combo advance), Santorini 300 (×3); collision with mainland adds zero; Crete preserves ×3. Confirm user-approved principle takes priority over any example if a conflict emerges.

## 9. Bonus target system

Occasional eligible islands become highlighted targets and grant extra points when genuinely hit. Use **stable island IDs**, not a translated name. Targets must be present in the current collidable-island dataset and rendered meaningfully on a portrait screen.

- Select a target with a seeded, injectable random source to make tests reproducible.
- Exclude Crete, mainland features, decorative tiny islands and currently invalid IDs.
- Do not pick a target with an impossible or unreasonable playfield location without logging why it is eligible.
- Show the current target in the HUD and add a subtle coastline/label indicator; full polish belongs to Phase 05.
- Award configurable bonus points **once per activation**; then select the next target after an explicit cooldown or milestone.
- No timer should force a reset solely because normal Aegean travel is slow; target rotation should be generous and testable.
- Never activate future special-island abilities as part of the target mechanic.

Initial bonus values and selection cadence are **tuning parameters**, not facts decided in brainstorming. Keep defaults modest and document them for user playtest approval.

## 10. Lives and ball lifecycle

- Every new run starts with exactly **three lives**.
- A life is charged exactly once for the last normal ball leaving the arena south, via Phase 02's validated exit event.
- When a life remains, freeze the old body, clear transient launch state, safely reposition the replacement ball directly north of Crete, and enter `READY_TO_LAUNCH`.
- In ready state, the ball follows Crete without contacting nearby land or accidentally triggering scores. A tap launches once, using the Phase 02 launch contract.
- `GAME_OVER` is entered only when lives reach zero; capture final results atomically.
- Extra life milestone thresholds must be config-driven, individually consumable and capped. An existing high score cannot grant an extra life in a new run.
- Do not deduct lives multiple times from an exit event, repeated callbacks or reloaded state.
- After pause, resume or restart, player and ball states must never overlap the mainland or get silently teleported into an invalid physics position.

## 11. Difficulty selection and progressive challenge

Support Easy, Normal and Hard as chosen before starting a new game. Changing difficulty mid-run should not silently alter a current game's physics; offer a new-run flow instead.

Each difficulty profile must expose:
- Initial ball speed range and cap.
- Initial southward gravity and absolute cap.
- Rate of speed/gravity progression using elapsed **active gameplay time**, score milestones or a justified blend.
- Crete rebound forgiveness and permitted outgoing angle range, within Phase 02 hard safety limits.
- Optional target difficulty parameters.

Progressive changes must be continuous or carefully eased: never instantly flip velocity or increase speed during an unresolved collision. Keep a documented upper limit for physics speed and gravitational pull. The slowest early phase should be readable and late phase demanding but not mathematically impossible. Save the difficulty/preset version in each run snapshot.

Performance target remains steady rendering near 60 FPS on capable devices, with fixed-step physics independent of render rate. Different display refresh rates should not change time-to-difficulty progression or point totals for an identical event stream.

## 12. Compact HUD

The in-game top bar displays:
- Current score (easy to scan and compact on narrow phones).
- Remaining lives.
- Combo multiplier (×1–×5).
- Current target name, localized-ready ID lookup, and optional target status.

Near Crete, reserve a clearly nonfunctional/disabled power meter placeholder for Phase 04, if shown at all. Do not cover the ball, obscure Crete or shrink the geography to fit more chrome. Observe safe-area insets and ensure touch movement does not accidentally activate HUD buttons.

Simple collision feedback may show briefly floating points, but rendering work must remain lightweight and should not change game physics. Later visual themes own fully polished effects.

## 13. Pause, backgrounding and safe resume

- Manual pause button plus keyboard spacebar on desktop; handle visibility/focus changes to automatically pause.
- Save snapshots on pause, important game transitions, and periodic bounded intervals during active play. Never rely only on unload/page-close events.
- Resume with a **three-second countdown** that does not advance simulated time, bonuses or difficulty.
- Save enough state for faithful continuation: state machine, run ID, difficulty, score, lives, combo chain, target ID/status, clocks, extra-life milestone grants, ball/Crete positions and velocities, spin, seeded random state and physics configuration/map version.
- Store local, versioned and validated snapshots. If incompatible or corrupt, safely refuse the active save while preserving separately stored long-term player records.
- Handle mobile app suspension, rapid background/foreground switching, multiple pending resume requests and tab duplication conservatively. If simultaneous tabs can corrupt a run, enforce a clear single-active-run policy.
- Full migration logic and import/export belong to Phase 06/07, but this phase must establish stable storage contracts.

## 14. Baseline personal records and results

Persist personal best score **separately** for Easy, Normal and Hard. On `GAME_OVER`, display at minimum:

- Final score and whether it is a new personal best.
- Difficulty.
- Active survival duration.
- Total qualified island hits and distinct islands hit during the run.
- Highest combo multiplier reached.
- Replay/New Game and Main Menu actions.

Display a clean placeholder map or summary if needed; the fully interactive hit-map and persistent exploration/achievement integration are deferred to Phase 06. Avoid fabricating achievements or geo-stats from rendering entities; count canonical stable island IDs.

## 15. Metrics and tuning hooks

Prepare event types for later analytics without implementing the full Phase 06 dashboard: `runStarted`, `launch`, `qualifiedIslandHit`, `bonusTargetHit`, `comboAdvanced`, `lifeLost`, `extraLifeGranted`, `difficultyProgressed`, `runPaused`, `runResumed`, `runEnded`.

Log under development settings only, with timestamps in simulation ticks and anonymized identifiers. Use a central config rather than scattering magic numbers. Distinguish temporary debug counters from durable player progress. Do not send telemetry to external servers.

## 16. Testing: automated

At minimum write and run deterministic tests for:

1. Valid transition graph; invalid and duplicated transitions rejected.
2. Initial lives = 3; southern exit decrements once; three losses end the run.
3. North/east/west walls, mainland and Crete never grant island base points.
4. A qualified island hit awards expected points once; duplicate contact callbacks do not.
5. Same-island repeats do not advance the combo; changing islands advances to ×5 cap.
6. Crete rebound preserves combo; lost ball resets it.
7. Target bonus applies only when the currently selected island is hit and cannot pay repeatedly for one activation.
8. Extra-life thresholds award only once and respect maximum lives/award limits.
9. Easy/Normal/Hard presets load independently and remain inside hard physical safety caps.
10. Physics simulation and progression agree under different render FPS schedules and paused periods.
11. Save/restore preserves gameplay state and prevents duplicate life/bonus/score events.
12. Corrupt/incompatible save is rejected without deleting personal best records.
13. High scores are tracked independently by difficulty; restarting a run does not reset historical bests.
14. No score or progression accrues while paused, waiting to launch or showing results.
15. HUD values match authoritative rule-engine state after every transition.

Reference and expand applicable cases in `TEST_MATRIX.md`; record executable command(s), totals and exact failures in `PROGRESS.md`.

## 17. Testing: hands-on mobile and desktop

Provide a playable local build for the user to assess:

- Launch and Crete movement by touching the lower screen on a portrait phone.
- Mouse, arrow keys, click-to-launch and space-to-pause on desktop.
- Three complete lives, restart, score persistence and game-over flow.
- Coastline collisions still behave as accepted in Phase 02.
- Readable top HUD and target highlighting without hiding the ball.
- Pause on app switch and deterministic three-second resume countdown.
- Good early/middle/late pacing in all three modes; note approximate active-play milestones used to evaluate ramp.
- No double scoring in tight island channels and no life deductions before full southern exit.

Do not claim success based only on unit tests. Preserve human approval of the game's actual feel.

## 18. Acceptance gate for Phase 03

Phase 03 is complete only when ALL conditions hold:

- A user can start from the menu, choose difficulty, launch, play, score, lose and restart without developer intervention.
- Approved geographical geometry and Phase 02 collision tests continue passing.
- Island scoring, distinct-island combo ×5, mainland non-scoring and ball-loss conditions satisfy deterministic tests.
- Separate personal bests and baseline saved sessions work locally with safe resume and countdown.
- No gameplay state changes from purely visual frame rate changes, HUD effects or tab backgrounding.
- No Phase 04+ features have been silently implemented or substituted for missing work.
- All remaining provisional scoring/difficulty values are documented for user tuning; no claim is made that balancing is final.
- User has played the build and explicitly approved Phase 03 before Phase 04 starts.

## 19. Deliverable handoff and report

At completion, provide:
1. List of created/modified modules and their responsibilities.
2. Config/preset values, source of each, and any temporary assumptions.
3. Exact commands and results of build, lint, typecheck and automated tests.
4. Manual reproduction steps for a complete three-life game.
5. Screenshots or demo build of the compact HUD and game-over results, if available.
6. List of known issues, boundary conditions and proposed fixes.
7. Updated `PROGRESS.md`, including Phase 03 sign-off status, and next-phase prerequisites.

Then **STOP**. Request authorization for `PHASES/PHASE_04.md`. Do not autonomously start adding special island powers, power bounces, multiball, weather or slow motion.

End of File
