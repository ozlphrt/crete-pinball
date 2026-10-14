# CRETE PINBALL — GAME DESIGN SPECIFICATION

Version: 1.0
Status: Approved design baseline (75 decisions)
Platform: Mobile-first, portrait-oriented, offline-first PWA; desktop controls supported
Purpose: Canonical product and gameplay requirements for Antigravity implementation.

## 1. Game vision

Crete Pinball is a single-player, progressive arcade pinball game set across the real Aegean Sea. Greek islands and Greek and Turkish mainland shores form geographical obstacles. Crete is the only player-controlled paddle and slides east-west along the southern portion of the arena. A luminous nautical ball ricochets between landforms and gradually falls south under gentle gravity. The player intercepts it with Crete, earns points for striking islands, builds combos, triggers temporary powers, and tries to survive as long as possible.

Design pillars:
1. Authentic geography: preserve the true locations, shapes, proportions and coastline identity of the Aegean. Never relocate, stretch, enlarge, or arbitrarily distort islands for gameplay.
2. Enjoyable arcade control: make catches, rebounds, scoring and progression responsive, legible and learnable through tunable physical rules rather than inaccurate geography.
3. Reliable simulation: no tunneling, phantom collisions, inconsistent device behavior, or state-corrupting updates.
4. A restrained, legible mobile presentation; nautical character without excessive effects.
5. Offline operation, local personal progression, and no required server or account.

## 2. Core loop

1. Player chooses Easy, Normal or Hard and starts or resumes a game.
2. Crete appears near the southern baseline of the fixed portrait arena, ready to defend. At game start and after each life loss, a 3-second animated countdown precedes a ball drop from verified open water near the northern Aegean boundary, descending southward with deterministic initial velocity and slight horizontal deflection.
3. Player slides a finger left or right in the lower screen region (or uses desktop controls) to reposition Crete.
4. Ball travels through the Aegean, striking island outlines and mainland coastlines, with gentle southward gravity, surface rebounds, spin and occasional weather forces.
5. Island hits score points; consecutive distinct islands build a capped multiplier. Certain islands trigger distinct bonuses after their cooldowns.
6. Crete intercepts the ball and returns it north. Successful combos charge an activatable power bounce. Special island combinations can trigger temporary three-ball multiball.
7. A life is lost only once the full ball exits the southern arena boundary. Play continues until no lives remain.
8. Game-over results present score, personal best and an interactive map of islands hit; persistent exploration and achievements update locally.

## 3. World, geography and viewport

- Single permanent arena: the Aegean Sea with recognizably accurate geography, Greece and Turkey shores, islands and Crete.
- Portrait-only gameplay on phones; desktop shows a centered portrait arena rather than a wider, altered world.
- Complete selected Aegean playing region stays visible during active gameplay. Maintain geographical proportions; do not stretch the map to fill screen dimensions.
- Map remains fixed during play; separate exploration mode supports pinch zoom, pan and tapping islands.
- Detailed coastline vectors and optimized collision geometry derive from the same authoritative data and coordinate transform. Visual-to-collision deviations must be carefully bounded and verified.
- Small islets beneath a consistent rendered-size collision threshold remain accurately displayed but noncollidable. Maintain distinct sets for visible, collidable and trackable islands.
- Real islands and coasts reflect; non-land open-sea boundaries are invisible arcade walls with subtle water ripple feedback. Exception: open southern escape edge is a drain.
- Crete moves horizontally only, keeping its full outline on-screen and natural east-west orientation at all times. Its longitudinal position is player controlled; translation does not re-shape or rotate the island.
- Crete remains solid from all sides. Northern-coast catches receive paddle-specific hybrid rebounding; southern, western and eastern contacts obey ordinary land physics. No invisible rectangular paddle and no one-way land.
- Balls can pass around Crete's tips and travel behind it; they are lost only after their entire collision core passes through the south boundary.
- No invisible, unfair walls inside waterways. True narrowing can restrict a finite-size ball, as it should.
- During gameplay, permanent geographical labels are restricted to a small set of major islands; other labels briefly appear on impact and current target is highlighted.

## 4. Ball, motion and collision physics

- Normal play has one luminous nautical ball. The ball has a small, visible solid collision core plus a soft larger halo; the halo is not collidable.
- Gentle southward gravity is always active, with difficulty-dependent strength, bounded progression and occasional announced weather adjustments.
- Ball physics combines momentum, rebounds, controlled spin and capped speed. Spin comes from off-center impacts and paddle motion, influences friction and future land impacts, then decays. Spin does not curve free-flight trajectories.
- True island and shore geometry determines contact position and normal. On successful hits against Crete's northern shoreline, hybrid bounce logic steers motion toward a playable northward rebound while respecting contact and player influence.
- Crete has responsive, finger-following horizontal movement with a maximum speed and immediate stop (no inertial glide). Its velocity affects rebound angle and speed within safe limits; max ball speed remains capped.
- Anti-stuck assistance detects actual entrapment or repeated low-progress ricochets and applies a small, plausible escape impulse toward available open water. It must not routinely interfere in normal narrow passages.
- Use a fixed simulation timestep independent of rendering refresh rate; use swept or continuous collision checks for high-speed balls where Matter.js alone could tunnel. Movement, collisions and scoring must be deterministic within defined tolerances at different frame rates.
- Wall and land collisions must never be skipped or double-counted due to frame timing, overlap or visual-effect throttling.
- A short luminous motion trail improves tracking; when ball approaches Crete, a limited dashed indicator may estimate its landing position based on current gravity/weather. Hide the indicator if the prediction is uncertain.
- Brief occasional cinematic slow motion may activate near a difficult high-speed Crete interception (~50–70% simulation speed, to be tuned). It must modify simulated time coherently rather than corrupt velocity or geometry.
- One game difficulty progresses from a readable early phase toward an intense but bounded late phase; exact speed/gravity constants are tuning parameters, not fixed in this document.

## 5. Player control and launch

Mobile:
- Horizontal gestures anywhere in the lower portion of the playing screen move Crete left/right.
- Finger does not need to touch Crete itself; preserve consistent drag offset semantics and avoid accidental jumps.
- New ball begins attached just north of Crete and follows its horizontal motion; tap to launch toward open Aegean water.
- Charged power bounce is triggered by double tap and applies to the next successful northern catch. Gesture recognition must distinguish tap, drag and double tap without stealing control during emergencies.

Desktop:
- Same portrait arena, mouse horizontal movement, click to launch and double-click to arm charged power bounce.
- Left/right arrow keys move Crete; spacebar toggles pause/resume. Keyboard interaction should not scroll the page during play.

## 6. Points, combos, targets and special islands

- Valid ordinary island hit earns 100 base points; mainland coast contacts earn no points.
- Different consecutive islands increase one shared combo multiplier, capped at x5. Repeat hits on the same island earn base points but do not advance the combo. Crete contacts preserve it; losing the last active ball/life resets it.
- Apply hit de-duplication / short contact cooldown so persistent overlap or micro-bounces cannot farm scoring.
- Combo multiplier applies to qualifying island hits; bonus target points are defined in a separate data configuration and tuned in playtests.
- Occasional bonus target islands appear with highlighted labels; reaching them grants a bonus.
- A few recognizable islands have permanent distinct powers. Illustrative intended mapping: Santorini = explosive bumper, Rhodes = speed boost, Mykonos = scoring multiplier; other named islands may be chosen during content tuning. Treat examples as configurable, not as permission to change geographical geometry.
- Special island power activates on a valid hit, then goes on an individual island cooldown initially targeted at roughly 10–15 seconds. During cooldown ordinary hits still yield base points.
- Combo performance charges Crete's energy gauge. A double tap, once charged, arms a stronger next north-side bounce. The glow and audio indicate armed state; an unused charge is handled consistently across life transitions (final rule to be set during balancing).
- Completing defined island combinations can activate temporary three-ball multiball; extra balls do not cost additional lives when drained. When the bonus ends, keep one surviving ball and return to normal play. If all balls drain, deduct one life, not one per ball. Multiball shares a single combo multiplier.
- No permanent upgrades that change collision physics from achievement badges.

## 7. Lives, progression and difficulty

- Each new game starts with three lives. The game is endless until they are all lost, with no fixed time limit.
- Earn limited extra lives at major scoring milestones. Milestones and life caps are balancing constants and must avoid unlimited life farming.
- Choose Easy, Normal or Hard at the start; each mode has its own starting velocity, gravity, rebound forgiveness and rate of progression, and maintains its own personal high score.
- Difficulty may increase speed, modestly strengthen southward gravity and introduce more demanding targets; hard speed and force ceilings are required to preserve fair reactions.
- When a life is lost, show the appropriate transition and reposition attached next ball without prematurely starting movement.
- Player gets a first-run, skippable ~20–30 second interactive tutorial: move Crete, tap launch, double tap power. Introduce bonuses/weather during actual play. Tutorial completion stored locally.

## 8. Weather and event systems

- Occasional short, clearly announced environmental events, not constant unpredictable drift:
  - Meltemi: extra southward force.
  - Crosswind: horizontal force.
  - Calm: temporarily reduced southward pull.
- Wind/current effects must be communicated by restrained visuals and/or HUD iconography, remain tunable and avoid visually masking land or ball.
- Decorative sea animation alone has no physical impact. Only explicit weather events change forces.
- Avoid simultaneous combinations that render trajectories arbitrarily uncontrollable.

## 9. Visual design and themes

Default identity: premium dark nautical map, very dark navy sea, accurately drawn and subtly illuminated coastlines, muted land, concise labels and a luminous nautical pearl/buoy-like ball.

Four selectable complete themes:
1. Dark Nautical (default): crisp outlined geography and understated marine palette.
2. Neon Arcade: higher-energy luminous outlining and effects without land distortion.
3. Vintage Chart: old nautical-chart visual materials while retaining readable collisions and labels.
4. Satellite: raster/satellite-inspired land/ocean styling only when imagery rights, attribution, offline packaging and performance are resolved; maintain exact coordinate alignment to the vector physics map. Provide fallback rather than silently shipping unlicensed assets.

All themes retain the exact same geometrical arena, land data, paddle, difficulty and physics. Theme changes must not affect hitboxes.

Effects:
- Ball: small nautical core, glow, subtle fading trail; stronger trail at high speed, rotating highlight for spin, brief gold power-bounce glow and colored special-island particles.
- Islands: short (~150–250 ms initial tuning target) outline flash, small ripple at collision point, floating score text; stronger but contained special/combination effects.
- Mainland: local coastline segment flash and ripple, quiet sound; no score popup.
- Aggressively throttle duplicate sounds, ripples and flashes for rapid repeated contacts without throttling actual physics or valid scored events.
- Almost imperceptible slow water movement; coastlines remain stationary, sharp and legible. Weather can influence visible water texture motion.
- Camera normally static; only exceptional power bounce, Santorini impact, multiball start or life loss can apply small, short screen shake. Reduced Motion disables shake, ambient movement and excess particles.
- Adaptive graphic quality responds to measured performance by reducing resolution, glow, particles and secondary water effects, never changing fixed-step physics.

## 10. Sound and haptics

- Maritime ambience plus crisp arcade collision sounds and melodic combo feedback.
- Distinct sounds for island contact, mainland contact, special island activation, Crete power bounce, multiball and life loss.
- Optional light haptics when browser/device supports them; no assumption that iOS Safari vibration works.
- Initialize or resume Web Audio only after an appropriate user gesture. Persist independent music/SFX volume and haptic preferences.

## 11. User interface and screens

Main menu:
- Actual dark outlined Aegean as backdrop, concise title and prominent Play; Resume if compatible active game exists, plus New Game.
- Secondary navigation: Explore Aegean, Achievements, Settings.

Gameplay HUD:
- Compact top bar: score, lives, combo and current bonus target.
- Charged bounce meter near Crete at bottom.
- Weather and special-event announcements are brief, not permanent clutter.
- No routine display of numeric velocity or collision forces in player mode.

Pause/resume:
- Explicit Pause plus automatic pause when page/app loses visibility or focus.
- Save score, lives, active balls, paddle, current powers, timers, weather and necessary physics state.
- On resume show a three-second countdown; do not simulate elapsed background wall-clock time.
- Store periodic crash-safe checkpoints rather than relying only on unload events.

Game over:
- Score, per-difficulty personal best, survival time, island visits, longest combo and noteworthy events.
- Interactive Aegean map highlights islands hit during the session; tapping shows hit counts and points.
- Large Play Again affordance; optional shareable results-card image containing map/highlights and key statistics.

Explore Aegean:
- Offline pan/zoom geography, island name lookup by tap, discovered/undiscovered state, total hits and points.
- Persistent exploration collection across games; stable island IDs and per-island statistics.

Achievements:
- Around 15–20 purely informational/cosmetic badges for unique islands, regional discovery, combo milestones, survival, weather and multiball. No mechanical advantage.

Settings:
- Difficulty at start of new game; theme selection; manual EN/TR/EL language choice with device-language default.
- Independent sound/music volumes, haptics, high contrast, reduced motion, adjustable HUD/label text size.
- Progress export/import/merge/replace and local data management.

## 12. Localization

- Supported at initial full release: English, Turkish and Greek.
- Detect device language with a user override; full UI, tutorial, instructions, achievement texts and contextual labels localized.
- Store stable geographical identity independent of translated labels. Island names may vary by locale without altering hitboxes, stats or save compatibility.
- Use Unicode-aware fonts with Turkish and Greek glyph coverage; package offline-safe permitted fonts as necessary, without shipping unauthorized assets.

## 13. Local persistence, PWA and updates

- No accounts, global scores or backend services. Fully playable offline once required assets are installed/cached.
- Local persistence contains per-difficulty personal scores, achievements, exploration history, settings and currently paused game state.
- Gameplay analytics and debug instrumentation stay on device. Analytics include survival time, ball paths/heatmaps, land-hit distributions, save/miss rates, launch speeds, power use and anti-stuck events. Cap storage and provide clear/export controls.
- Use a versioned save schema separate from long-term progress. Compatible saves migrate safely. Major incompatible map/physics updates may discard only in-progress runs while preserving long-term data.
- Do not activate an incompatible service-worker update mid-session. Use a safe update prompt/between-session activation plan.
- Manual versioned JSON export/import of progress and preferences; validate contents, prevent data corruption, and permit merge or replace with user confirmation.
- PWA manifest, icons, touch-friendly fullscreen/standalone behavior, offline fallback and robust service-worker testing.

## 14. Developer-only tools and instrumentation

A developer mode, inaccessible from normal player UI, provides:
- Ball placement, custom initial velocity, direction and spin.
- Visual collision segments, normals, contact points, velocity/force arrows, Crete collision region, geographic dataset diagnostic overlays.
- Replayable deterministic test trajectories, named regression cases, high-speed tunneling tests and constrained-channel tests.
- Live physics tuning controls for gravity, min/max speed, restitution, paddle speed, momentum transfer, spin/friction, wind, slow-motion and anti-stuck thresholds.
- Save/reset/export tuned Easy/Normal/Hard presets; normal game reads approved preset values only.
- Performance measurements and local gameplay analytics/heatmaps; export for offline inspection.
- Hard separation between simulation behavior, scoring decisions, visible effects and debug views.

## 15. Development process and acceptance policy

Implement through testable milestones, never a speculative full-stack one-shot build:
Phase 0: project setup and architecture.
Phase 1: geographical arena and moving Crete.
Phase 2: correct ball/coastline/Crete physics and debug mode.
Phase 3: complete core scoring and survival loop.
Phase 4: special islands, power bounce, multiball, weather and slow motion.
Phase 5: four themes, audio, tutorial, accessibility and localization.
Phase 6: exploration, achievements, sharing, persistence and backup.
Phase 7: offline PWA release readiness, profiling, regression and device validation.

Milestone gates:
- Agent acts autonomously within an approved milestone and may fix routine bugs.
- Stop for approval at each milestone, for proposed design deviation, or significant blocker.
- Do not proceed from geometry to gameplay until map registration and high-speed collisions pass tests.
- Include automated simulations plus human playtesting; tests passing is necessary but does not imply satisfying game feel.
- Keep source-of-truth design and decision documentation current. Do not silently modify approved requirements.

## 16. Design decision register (all 75 approvals)

| # | Confirmed option | Decision |
|---|---|---|
| 1 | C | Progressive arcade pinball |
| 2 | A | Geographically accurate Aegean |
| 3 | B | Touch anywhere in lower screen to move Crete |
| 4 | C | Hybrid north-coast paddle rebounds |
| 5 | C | Gentle southward gravity |
| 6 | B | Invisible anti-stuck assistance |
| 7 | B | Fixed map with adaptive visual scaling |
| 8 | B | Invisible arcade boundary walls, southern drain |
| 9 | C | Collision points, combos and bonus targets |
| 10 | B | Selected special islands |
| 11 | B | Charged Crete power bounce |
| 12 | B | Three lives and progressive difficulty |
| 13 | Custom | Dark theme with island/coastline outlines |
| 14 | B | Nautical ball |
| 15 | B | Compact arcade HUD |
| 16 | C | Maritime + arcade audio, optional haptics |
| 17 | B | Ball attached to Crete; tap to launch |
| 18 | B | Temporary multiball |
| 19 | A | Personal high scores only |
| 20 | B | Fully offline after caching |
| 21 | A | Portrait-only phone play |
| 22 | C | Hybrid contextual island labels |
| 23 | A | One permanent Aegean arena |
| 24 | B | Occasional weather events |
| 25 | B | Short interactive tutorial |
| 26 | B | Automatic pause and saved game |
| 27 | B | Responsive Crete with speed limit |
| 28 | B | Small collision core, larger glow |
| 29 | B | Islands score; mainland only reflects |
| 30 | C | Base hit points + distinct-island combos |
| 31 | D | Persistent combo chain capped at x5 |
| 32 | B | Special-island activation cooldowns |
| 33 | C | Results + interactive map |
| 34 | B | Persistent island exploration |
| 35 | B | Minimum-size collision threshold for islets |
| 36 | B | Separate interactive exploration mode |
| 37 | B | Trail plus short landing projection |
| 38 | B | Easy / Normal / Hard |
| 39 | C | Four complete visual themes |
| 40 | C | Automatic adaptive graphics quality |
| 41 | C | Detailed geography, optimized physical geometry |
| 42 | B | Phaser + Matter.js |
| 43 | B | Testable milestones |
| 44 | C | Automated physics tests and interactive debug mode |
| 45 | B | Desktop portrait arena and desktop controls |
| 46 | B | Practical accessibility settings |
| 47 | B | English, Turkish and Greek |
| 48 | B | Lightweight achievement badges |
| 49 | B | Shareable results cards |
| 50 | B | Core first, feature milestones thereafter |
| 51 | C | Master spec plus milestone prompts |
| 52 | C | Antigravity autonomous within milestones |
| 53 | C | Live physics tuning developer panel |
| 54 | C | Detailed local analytics and dashboard |
| 55 | C | Versioned saves and safe migrations |
| 56 | B | Manual export and import |
| 57 | B | Brief occasional cinematic slow motion |
| 58 | A | Crete horizontal movement only |
| 59 | B | Full width travel, island fully visible |
| 60 | B | Drain when entire ball crosses southern edge |
| 61 | B | Accurate Crete silhouette and robust defensive collision |
| 62 | A | Crete solid from all directions |
| 63 | C | Controlled momentum transfer |
| 64 | B | Collision-based spin, no flight curvature |
| 65 | A | Endless survival |
| 66 | C | Layered ball state visual effects |
| 67 | B | Numeric physics data developer-only |
| 68 | B | Subtle impact camera shake |
| 69 | B | Subtle animated sea |
| 70 | C | Island coastline flash and ripple |
| 71 | B | Local mainland coastline flash |
| 72 | B | Intelligent audiovisual effect throttling |
| 73 | B | Balanced progressively intensifying pacing |
| 74 | B | Minimalist main menu |
| 75 | D | Authentic geography + enjoyable gameplay + reliable physics as non-negotiables |

## 17. Open tuning choices (NOT permission to deviate from approved design)

Precise world bounds and geodata coverage; source attribution/licensing; map projection; ball radius and small-island collision threshold; viewport margins; collision simplification tolerances; gravity, speed and spin constants; combo bonus awards; extra-life thresholds; names of all special islands; event frequency and duration; audio assets; tutorial pacing; score-card layout; local storage retention limits; iOS/Android browser compatibility. Determine through technical validation, legal checks where appropriate, and milestone playtests, not guesswork.

End of File
