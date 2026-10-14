# CRETE PINBALL — APPROVED DECISION REGISTER

**Status:** Locked user-approved design baseline  •  **Coverage:** Questions 1–75  •  **Purpose:** Traceable source of truth for Antigravity.

Every letter below reflects the user’s actual answer. Q13 is a custom direct answer rather than an A/B/C/D selection. Examples, default values and implementation ideas remain tunable unless explicitly fixed by the decision.

## Complete decision ledger

| Question | User choice | Binding decision |
|---:|:---:|---|
| 01 | C | Progressive arcade pinball |
| 02 | A | Geographically accurate map |
| 03 | B | Touch anywhere in lower area moves Crete |
| 04 | C | Hybrid Crete bounce physics |
| 05 | C | Gentle southward gravity |
| 06 | B | Invisible anti-stuck assistance |
| 07 | B | Fixed map with adaptive scaling |
| 08 | B | Invisible arcade walls, southern exit |
| 09 | C | Collision points, combos and targets |
| 10 | B | Selected islands with permanent special properties |
| 11 | B | Charged Crete power bounce |
| 12 | B | Three lives with progressive difficulty |
| 13 | Custom | Dark sea, outlined islands/coastlines |
| 14 | B | Nautical ball |
| 15 | B | Compact arcade HUD |
| 16 | C | Maritime + arcade audio/haptics |
| 17 | B | Attached ball; tap to launch |
| 18 | B | Temporary three-ball multiball |
| 19 | A | Local personal high scores only |
| 20 | B | Fully offline after installation |
| 21 | A | Portrait-only phone |
| 22 | C | Hybrid contextual geographic labels |
| 23 | A | One permanent Aegean arena |
| 24 | B | Occasional weather events |
| 25 | B | Interactive short tutorial |
| 26 | B | Auto-pause and saved game |
| 27 | B | Speed-limited Crete, no inertia |
| 28 | B | Smaller collision core and larger ball glow |
| 29 | B | Island scores; mainland reflects |
| 30 | C | Base scoring + unique island combos |
| 31 | D | Life-long capped combo chain |
| 32 | B | Special island cooldowns |
| 33 | C | Results and interactive hit map |
| 34 | B | Persistent discovered-island progress |
| 35 | B | Minimum collidable island size |
| 36 | B | Zoomable separate exploration map |
| 37 | B | Trail and limited landing prediction |
| 38 | B | Easy, Normal, Hard |
| 39 | C | Four full visual themes |
| 40 | C | Adaptive render quality |
| 41 | C | Detailed visual + optimized collision geometry |
| 42 | B | Phaser + Matter.js |
| 43 | B | Milestone development |
| 44 | C | Automated tests + interactive debug mode |
| 45 | B | Portrait desktop with mouse/keyboard |
| 46 | B | Practical accessibility settings |
| 47 | B | English, Turkish, Greek |
| 48 | B | 15–20 achievement badges |
| 49 | B | Shareable results cards |
| 50 | B | Core first, feature milestones later |
| 51 | C | Master specification + phase prompts |
| 52 | C | Autonomy within milestones |
| 53 | C | Developer physics tuning panel |
| 54 | C | Local analytical dashboard |
| 55 | C | Versioned saved data with migrations |
| 56 | B | Manual JSON backup/import |
| 57 | B | Rare cinematic slow motion |
| 58 | A | Crete moves without tilt |
| 59 | B | Full width but always completely on screen |
| 60 | B | Lose ball after fully crossing southern exit |
| 61 | B | Accurate Crete silhouette + robust collision |
| 62 | A | Full solid Crete all sides |
| 63 | C | Controlled paddle momentum transfer |
| 64 | B | Collision-based spin, no in-flight Magnus |
| 65 | A | Endless survival |
| 66 | C | Layered ball state effects |
| 67 | B | Numerical physics data dev-only |
| 68 | B | Subtle occasional camera shake |
| 69 | B | Subtle water animation |
| 70 | C | Island outline flash + ripple + points |
| 71 | B | Mainland localized flash |
| 72 | B | Effect throttling |
| 73 | B | Balanced progressive arcade pacing |
| 74 | B | Minimal main menu |
| 75 | D | Geography, fun and reliability all non-negotiable |

## Binding clarifications and dependencies

- **Q02:** Strict geography: do not change real land shapes, locations or relative proportions for fun.
- **Q04:** Coastline determines contact, but a successful northern Crete catch must rebound north; control is hybrid, not pure simulation.
- **Q06:** Detect real trapping before applying a subtle escape impulse; do not modify coastline polygons.
- **Q07:** Maintain geographical aspect ratio; portrait layout may contain unused margins.
- **Q08:** Non-land north/east/west borders reflect; southern exit drains.
- **Q11:** Combos charge power bounce; double-tap triggers the next charged rebound.
- **Q12:** Start with three lives; progressive speed/gravity/targets, extra-life milestones and safe caps.
- **Q13:** User custom specification, not the earlier recommended generic nautical theme: near-black navy sea, island/mainland coastline outlines, minimal visual clutter.
- **Q17:** Position the attached ball using Crete, then tap to release northward.
- **Q18:** Three balls temporarily; bonus-ball losses are not separately deducted as lives; last active ball determines loss.
- **Q19:** No global ranking, login, multiplayer, server-side scoring or account requirement.
- **Q20:** After required assets load and cache, all essential features run without network.
- **Q21:** Portrait phone arena; desktop later uses the same centered portrait field (Q45).
- **Q23:** Do not create secondary regional arenas; the separate exploration map is not a second playing field.
- **Q26:** Auto-pause on interruption; locally checkpoint; on resume use a three-second countdown.
- **Q28:** Physical radius matches visible solid core, not the larger soft halo.
- **Q29:** Mainland Greece and Turkey reflect without points; islands score.
- **Q30:** 100 example base points per valid island hit; repetition does not advance unique-island combo; cooldown guards repeated contact farming.
- **Q31:** Consecutive distinct island hits extend chain, capped at x5; same island does not extend; Crete preserves combo, lost life resets; shared multiball combo.
- **Q32:** Per-island cooldown approximately 10–15 seconds to be tuned; base scoring persists.
- **Q35:** Threshold applies consistently in world/screen-scale policy; tiny islets still render faithfully.
- **Q37:** Predicted Crete landing should disappear when weather/collisions create too much uncertainty.
- **Q39:** Four themes: Dark Nautical (default), Neon Arcade, Vintage Chart, Satellite; satellite asset licenses and offline size must be checked.
- **Q40:** Rendering quality adapts; physics must remain fixed-timestep and independent of FPS.
- **Q41:** Detailed visual geometry and optimized physical geometry from one geo source; verify mismatch tolerance.
- **Q42:** Phaser with Matter.js; additional swept collision protection may be needed at speed.
- **Q43:** Milestones have explicit tests and review gates.
- **Q44:** Automated tests plus debug inspection, replay, vectors and arbitrarily positioned ball.
- **Q45:** Mouse/keyboard controls while keeping same portrait-shaped gameplay arena.
- **Q47:** Translate UI and island labels; island IDs remain locale independent.
- **Q50:** Develop in phases, but keep all agreed features in final scope.
- **Q51:** CLAUDE.md, GAME_DESIGN.md, IMPLEMENTATION_PLAN.md and focused PHASE files form instruction hierarchy.
- **Q52:** Autonomy inside approved phases; pause at gate or substantive blocker/design deviation.
- **Q53:** Dev-only live sliders, exportable presets for three difficulty modes.
- **Q54:** Local-only metrics incl. heatmaps, missed saves, island hit frequencies and anti-stuck events; cap storage.
- **Q55:** Versioned data and migrations, preserve long-term progress, reset incompatible active runs when needed.
- **Q56:** Portable validated JSON backups; allow import/merge or replacement.
- **Q57:** Rare near-Crete slow-motion events around high-speed approach, simulation slowdown must remain coherent.
- **Q58:** No tilt or island rotation during play.
- **Q59:** Crete travels horizontally as far as entire island stays visible.
- **Q60:** A ball is lost only after its entire collision core leaves through the southern boundary.
- **Q61:** Crete silhouette is actual island; no filled bays or invisible rectangular catch plane.
- **Q62:** All Crete coastline is solid; only north-facing catches obtain paddle-specific upward correction.
- **Q63:** Paddle velocity influences both rebound speed and heading, safely capped.
- **Q64:** Collision-induced angular spin and friction affect future land impacts, no free-flight Magnus curvature.
- **Q65:** No timer limit, ends only when lives are depleted.
- **Q68:** Restrained shake for special collisions, disabled with Reduced Motion.
- **Q69:** Animated water is decorative; only explicit weather forces alter physics.
- **Q70:** Island outline flash, contact ripple, floating score; special impact differences.
- **Q71:** Local section flash for mainland contacts, subtle ripple and sound; no score.
- **Q72:** Do not throttle physics or legitimate scoring, only repeated visual/audio effects.
- **Q73:** Starts calm enough to read, then accelerates to bounded intensity.
- **Q74:** Dark Aegean background, prominent Play/Resume, Explore, Achievements, Settings.
- **Q75:** Never distort geography; tune gameplay forces without breaking reliable deterministic physics.

## Conflicts resolved in the approved design

- **Real geography vs playability:** Q2/Q41 prohibit moving or enlarging landmasses. Q4/Q6/Q61 allow controlled contact response and anti-stuck assistance, not fictional coastlines.
- **Accurate coastlines vs tiny islets:** Q35 preserves drawing of available islets but uses a minimum collidable-size policy; document which islands qualify.
- **Crete paddle vs full island physics:** Q61/Q62 make all of Crete solid, while Q4/Q63 apply special paddle assistance to northern catches only.
- **Dark aesthetic vs alternate themes:** Q13 fixes dark outlined geography as the default; Q39 also requires three other complete optional visual themes.
- **Portrait only vs desktop access:** Q21 fixes the field orientation; Q45 adds input modalities, not a landscape game world.
- **Offline and no backend vs sharing:** Q19/Q20 require local-only progress; Q49 creates shareable result images locally, never global accounts or leaderboards.
- **Development scope vs phasing:** Q50 includes the complete design in the eventual release; Q43/Q51/Q52 implement one tested, approved milestone at a time.
- **Interactive exploration vs fixed camera:** Q7/Q23 forbid zooming the active field; Q36 enables zoom and pan only in separate exploration mode.
- **Physics validity vs visual polish:** Q40/Q44/Q72 keep simulation independent from graphics frame rate and cosmetic throttling.

## Unlocked parameters (tune, test and document — do not quietly invent final values)

Ball radius, world bounds and map projection, render/collider tolerance, minimum-island threshold, speed/gravity/spin values, Crete speed, exact rescue and weather thresholds, special-island selection and precise rewards, score/life milestones, tutorial timing, asset licensing, and storage limits. All require a documented default, dev tuning where appropriate, and acceptance testing.

## Phase 03 Corrections Decisions (Approved)

- **ADR-007 (Northern Aegean Ball Drop Mechanism):** Replaced legacy ball-attached-to-Crete launch mechanism with a deterministic Northern Aegean open-water spawner. At start of match and after every life loss, the ball spawns at a verified open-water position ($Y \in [225, 265]$) with guaranteed clearance $\ge 28\text{ u}$ (2.0x ball radius) from all island and mainland boundaries. A 3-second animated countdown announces incoming ball arrival before releasing it with deterministic southward velocity ($V_y \approx 450$–$550\text{ u/s}$) and slight horizontal deflection toward the arena center. Crete paddle stays at the southern baseline to defend. Space/tap immediately triggers the drop if ready.
- **ADR-008 (High-Legibility Mobile Typography & Viewport Scaling):** Fixed micro-typography across all game screens. On mobile devices (~390px viewport), Phaser canvas scaling downscales the $900 \times 1600$ logical coordinate space by $\approx 0.433$. All world-coordinate font sizes were scaled upward (Labels: 24px–26px with 5px dark outline for $\ge 16\text{px}$ rendered size; HUD: 32px–42px bold for $\ge 18$–$20\text{px}$ rendered size; Results: 62px–76px; Countdown: 140px; Menu: 22px–68px) to guarantee crisp contrast and effortless mobile legibility without overlapping geographic features.

## Phase 04 Decisions (Approved Architecture)

- **ADR-009 (Decoupled Arcade Event Bus & Ability Registry):** Domain abilities are implemented as pure headless TypeScript classes (`SpecialIslandRegistry`, `SpecialIslandSystem`, `CreteEnergySystem`, `MultiballSystem`, `WeatherDirector`, `TimeDilationController`) communicating through a strongly typed `GameEventBus`. Simulation mechanics strictly run at fixed 120 Hz tick boundaries and never mutate Matter.js bodies directly from render or UI callbacks.
- **ADR-010 (Power Bounce Arming & Northern Coastline Gating):** Charged power bounce is accumulated strictly from distinct island combo progressions (+0.25 charge per combo increment; full at 4 hits). Double-tap gesture arms the paddle without disrupting continuous horizontal tracking. Power bounce applies an enhanced hybrid rebound ($1.35\times$ base speed multiplier, clamped to `maxBallSpeed`) strictly upon northern coastline impact ($N_y < -0.2$), disarming after single-use consumption.
- **ADR-011 (Multiball Life Semantics & Drain Resolution):** Temporary multiball spawns up to 3 concurrent balls with independent velocities, spins, and continuous collision detection while sharing the global combo multiplier (capped at ×5). Bonus ball drain exits through the southern baseline do not deduct lives. Exactly 1 life is deducted only when the final active ball drains. Timed multiball expiration deterministically retains the lowest-index active ball and cleans up bonus balls without life loss.
- **ADR-012 (Weather Force Composition & Time-Scale Dilation):** Environmental weather forces (Meltemi, Crosswind, Calm Seas) are additive to base gravity and strictly bounded, ensuring zero residual force upon expiration. Cinematic slow-motion operates by scaling the fixed-step physics accumulator to 60% passage rate on critical high-speed approaches to Crete, guaranteeing invariant 120 Hz collision precision and respecting the `prefers-reduced-motion` accessibility standard.

## Change control

Changes to any binding choice require the user’s explicit approval. Record the prior choice, proposed change, reason, affected files, and migration/testing implications. Antigravity may choose technical implementation details within these guardrails but must not silently revise decisions.

End of File
