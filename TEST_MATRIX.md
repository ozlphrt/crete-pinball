# Crete Pinball — Test Matrix and Acceptance Gates

Version: 1.0
Status: Specification; tests not yet executed
Owner: Antigravity implementation agent
Companion documents: `CLAUDE.md`, `GAME_DESIGN.md`, `DECISION_REGISTER.md`, `TECHNICAL_ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`

## 1. Test policy

This is a **test plan**, not a claim that the game has been built or tested. The agent must turn each relevant row into reproducible test evidence as the corresponding milestone is implemented. Never mark a test PASSED unless it actually ran. Use NOT RUN, BLOCKED, or DEVICE UNVERIFIED when appropriate.

**Non-negotiable release properties:** authentic non-stretched Aegean geography; Crete as a horizontal moving paddle with its full outline visible; reliable ball/coastline collisions; exactly defined loss at the southern boundary; deterministic simulation independent of rendering FPS; portrait mobile input; offline play after assets are cached; local-only user data; an accessible and usable interface.

The approved implementation proceeds through Phase 0–7 with an explicit human approval gate after each phase. Testing is not postponed to Phase 7.

### 1.1 Results record format

Every test result should include:

- ID; status: PASS / FAIL / BLOCKED / NOT RUN / DEVICE UNVERIFIED.
- Commit or build identifier; date; device/browser/OS, where relevant.
- Exact command or manual procedure; seed and scenario ID for simulations.
- Expected and actual observations; quantitative measurements where available.
- Screenshot, video, JSON trace, or log location when applicable.
- Linked issue and retest result if a failure occurred.

Use `docs/test-results/<phase>/<test-id>.md` or structured JSON with the same fields. A failing test does not become a pass merely because an anti-stuck rescue concealed the problem.

### 1.2 Suggested toolchain (confirm versions before installing)

- Unit and property tests: Vitest or equivalent for TypeScript modules.
- Browser and PWA flows: Playwright where supported.
- Geometry fixtures: deterministic GeoJSON polygons, including holes, narrow straits and acute corners.
- Simulation harness: seeded stepping with visual debugging, collision traces and repeatable input scripts.
- Performance: browser performance profiling on real target devices; do not use desktop FPS as a substitute.
- Accessibility: keyboard/control manual tests plus automated auditing where practical.

## 2. Core invariant matrix (cross-phase)

| ID | Property / test | Expected result | Earliest gate |
|---|---|---|---|
| INV-01 | Island and coastline positions derive from authoritative source geometry | No manually shifted, enlarged or stretched islands | Phase 1 |
| INV-02 | Visual and collision geometry share one coordinate frame | Measured deviation stays within documented rendering tolerance | Phase 1 |
| INV-03 | Rendering screen resize / device DPR change | Physics world coordinates and collision outcomes do not change | Phase 2 |
| INV-04 | Same initial state, seed and input events, different render FPS | Simulation result identical within declared floating-point tolerance | Phase 2 |
| INV-05 | Ball cannot pass through land at supported maximum speed | No undetected intersections / tunneling in test suite | Phase 2 |
| INV-06 | Crete's entire island remains solid | No through-land passage, including southern/eastern/western coasts | Phase 2 |
| INV-07 | Northern Crete rebound | Playable upward direction as specified, respecting angle/speed caps | Phase 2 |
| INV-08 | Other Crete coast rebounds | Ordinary solid-land physics, no artificial rescue impulse | Phase 2 |
| INV-09 | Life loss | Only once entire ball passes southern escape boundary | Phase 3 |
| INV-10 | Mainland contacts | Physical reflection, no point award or combo advancement | Phase 3 |
| INV-11 | Island contacts | Score correctly and unique-island combos capped at x5 | Phase 3 |
| INV-12 | Physics, scoring, visuals and sound are decoupled | Disabling FX/audio never changes game state or score | Phase 3 |
| INV-13 | Backgrounding or app visibility loss | Immediate simulation pause, no unintended life loss | Phase 6 |
| INV-14 | All main assets cached after initial online setup | Playable offline, including restart | Phase 7 |
| INV-15 | Developer tools disabled in production | No unintended tuning/debug controls accessible in normal play | Phase 7 |

## 3. Phase 0 — Foundation and contracts

| ID | Test | Acceptance |
|---|---|---|
| FND-01 | Clean install and development startup | Reproducible documented commands; app loads without console errors |
| FND-02 | Build and typecheck | Both succeed cleanly |
| FND-03 | Automated test runner | Test command succeeds and intentional sample failure is detected |
| FND-04 | Portrait world coordinate specification | A single documented mapping for world, viewport and device coordinates |
| FND-05 | File/module boundaries | Geography, input, physics, state, scoring, rendering, sound and persistence have defined interfaces |
| FND-06 | Config validation | Invalid config values are rejected with descriptive errors |
| FND-07 | Fixed-step loop prototype | Simulation tick independent of actual paint-frame rate |
| FND-08 | Seeded random contract | Same seed reproduces random events in an isolated test |

**Gate:** project starts, builds, tests, and has documented contracts before real geography is implemented.

## 4. Phase 1 — Geography and Crete movement

| ID | Test | Acceptance |
|---|---|---|
| GEO-01 | Geographic dataset source and license manifest | Origin, version, coverage and attribution documented |
| GEO-02 | Representative anchor points | Crete, Rhodes, Santorini, Lesbos, Chios, Kos and major mainland shorelines are correctly positioned |
| GEO-03 | Shape and relative scale | No aspect-ratio distortion across representative portrait devices |
| GEO-04 | Polygons, multipolygons and holes | Render correctly; holes and enclaves aren't filled accidentally |
| GEO-05 | Map projection consistency | Visual and physics conversion functions round-trip within documented precision |
| GEO-06 | Coastline simplification | Error sampled against authoritative source and reported; no invisible broad collision walls |
| GEO-07 | Stable island IDs | Datasets map to stable IDs; names/languages do not determine identity |
| GEO-08 | Tiny-islet threshold | Same world-size policy across device sizes; declared small-islet exclusions documented |
| GEO-09 | Full-width Crete movement | Crete's tips remain entirely inside arena at both extremes |
| GEO-10 | Touch-relative drag | Drag in lower control region moves Crete without requiring touch directly over paddle |
| GEO-11 | Speed limiting and immediate stop | Movement cap obeyed; releasing finger produces no inertia |
| GEO-12 | Desktop input | Mouse and arrow keys map to same movement limits |
| GEO-13 | World geometry audit | No accidental coast discontinuities or unclosed polygons |

**Gate:** visually inspect the Aegean at actual phone size; manually approve map framing, scale and Crete motion before Phase 2.

## 5. Phase 2 — Ball physics and collisions

| ID | Test | Acceptance |
|---|---|---|
| PHY-01 | Constant-step determinism | Equivalent runs at 30, 60, 90 and 120 display FPS produce same simulation outcome within tolerance |
| PHY-02 | Smooth integration | A launched ball experiences gentle southward force; no frame-dependent acceleration |
| PHY-03 | Circle vs line segment | Correct hit time, contact normal and rebound on isolated test fixtures |
| PHY-04 | Circle vs coastline vertex | Stable contact at acute and obtuse corners, without speed explosions |
| PHY-05 | Continuous/swept collisions | Ball cannot tunnel through thinnest supported collidable geography at configured speed ceiling |
| PHY-06 | Land interior penetration | Position-correction solver prevents persistent overlap and reports corrective events |
| PHY-07 | Narrow passages | Ball enters accessible channels and bounces from adjacent shores without phantom contacts |
| PHY-08 | Complex bays | No indefinite collision jitter or repeated score events at resting contacts |
| PHY-09 | Anti-stuck policy | Activates only on specified trap criteria; logged and bounded; no teleport through land |
| PHY-10 | Crete north rebound | Upward/away-from-Crete rebound satisfies bounded hybrid formula |
| PHY-11 | Crete other faces | Fully solid island with ordinary rebound on non-northern contacts |
| PHY-12 | Moving paddle impulse | Paddle velocity affects angle and bounded speed in expected direction |
| PHY-13 | Ball spin | Angular velocity comes from off-center impacts, modifies contact response, decays; no open-water Magnus force |
| PHY-14 | Elasticity / energy constraints | Speed and angular velocity remain within declared limits after thousands of contacts |
| PHY-15 | Border interactions | Open-water north/east/west arcade walls bounce; land collisions take precedence where appropriate |
| PHY-16 | Collision identity | Unique island/mainland/Crete identifiers correct at contacts |
| PHY-17 | Stationary / extreme Crete velocities | Stable and fair paddle interactions without skipped contacts |
| PHY-18 | Regression scenarios | Every previously observed failure replays from saved seed/state/input trace |

### 5.1 Mandatory high-risk scenarios

Run seeded trajectories through: Cyclades clusters; the Kos–Bodrum passage; Samos-adjacent narrow water; Rhodes/Karpathos/Kasos region; bays of Crete; acute capes on both mainlands; island tip grazes; a ball skimming a coast at maximum speed; repeated impacts against two close polygons. Exact reachable passages depend on ball collision diameter, not navigation rules for ships.

**Gate:** automated and interactive cases show no undetected tunneling; collision visuals agree with geometry; user's manual playtest approves control feel.

## 6. Phase 3 — Core gameplay

| ID | Test | Acceptance |
|---|---|---|
| GAM-01 | Start and tap launch | Ball attaches near northern Crete, moves with Crete, launches only on explicit tap |
| GAM-02 | Three lives | New run starts at three; escaping fully south consumes exactly one |
| GAM-03 | South boundary exactness | Ball touching or partly crossing border remains alive until entire circle exits |
| GAM-04 | Points | Valid island contact awards configured base points; mainland gives zero |
| GAM-05 | Repeated island contact | Cooldown prevents contact-farming; repeats don't grow combo |
| GAM-06 | Unique combo chain | Different islands advance multiplier, capped at x5 |
| GAM-07 | Combo reset | Crete bounce preserves multiplier; life lost resets it |
| GAM-08 | Difficulty profiles | Easy, Normal, Hard configure speeds, gravity and rebound assistance separately |
| GAM-09 | Difficulty ramps | Progression increases within documented maximum caps |
| GAM-10 | Extra lives | Awarded only at defined milestones, bounded and not duplicated by save/reload |
| GAM-11 | Compact HUD | Score, lives, combo and target legible without covering key play area |
| GAM-12 | End game | Exactly zero remaining lives transitions to Game Over; restart starts clean run |
| GAM-13 | Pause | Manual pause halts physics clock, scoring and weather timers |
| GAM-14 | HUD independence | HUD updates do not produce physics state mutations |

**Gate:** a complete playable run works reliably, including starting, saving Crete rebounds, losing lives and scoring.

## 7. Phase 4 — Arcade features and game feel

| ID | Test | Acceptance |
|---|---|---|
| ARC-01 | Special island activation | Island-specific effect activates once, then its own cooldown is respected |
| ARC-02 | Cooldown contacts | Base points continue while power is cooling down |
| ARC-03 | Charged Crete power | Combo energy charges; double-tap primes next hit; one charge consumed exactly once |
| ARC-04 | Normal drag and double-tap coexist | No accidental power trigger during ordinary one-finger sliding |
| ARC-05 | Multiball activation | Three simultaneous balls at trigger; physics and scoring remain valid |
| ARC-06 | Bonus ball loss | Bonus balls don't consume extra lives; only final active ball loss uses one life |
| ARC-07 | Shared combo | Multiball shares a single multiplier correctly |
| ARC-08 | Weather event | Wind/calm force changes are signaled, bounded, time-limited and reversible |
| ARC-09 | Slow motion | Slows simulation progression coherently, not just the ball's render animation |
| ARC-10 | Spin + wind + collisions | Combined forces never produce invalid or non-finite physics state |
| ARC-11 | Landing prediction | Estimated Crete impact accounts for forces; fades if trajectory becomes unreliable |
| ARC-12 | Live tuning | Developer sliders change tunable constants, save/reset/export presets, without editing source |
| ARC-13 | Automated balance | Record distributions for game duration, island coverage, rescues and anti-stuck events |

**Gate:** each special mechanic can be isolated and disabled; core gameplay remains functional.

## 8. Phase 5 — Visuals, audio, tutorial and accessibility

| ID | Test | Acceptance |
|---|---|---|
| VIS-01 | Dark Nautical default | Very dark sea, crisp island/mainland outlines and visible nautical ball |
| VIS-02 | Theme switching | Dark Nautical, Neon Arcade, Vintage Chart and Satellite switch without changing physics |
| VIS-03 | Satellite licensing and offline assets | Source rights documented; theme works offline or is explicitly gated and not declared complete |
| VIS-04 | Effects decoupled | Ripple, glow, floating scores, camera shake and trails do not affect collision coordinates |
| VIS-05 | Repeated impact throttling | Audio/FX are limited during contact storms, but simulation and scoring stay correct |
| VIS-06 | Labels | Major islands understated; hit names temporary; current target distinguishable |
| VIS-07 | Three languages | English, Turkish and Greek text renders correctly, including diacritics and island names |
| VIS-08 | First-run tutorial | Skippable, completes in short interaction, completion persisted locally |
| VIS-09 | Reduced motion | Suppresses ambient water motion and camera shake, reduces flashes |
| VIS-10 | Contrast/text options | Ball/coastlines visible in all themes and HUD text scales without clipping |
| VIS-11 | Sound/haptics | Independent volume settings and optional supported-device haptics work; safe fallback if unsupported |
| VIS-12 | Mobile input vs browser gestures | No inadvertent scrolling, zooming or pull-to-refresh during active play |
| VIS-13 | Adaptive graphics | Quality reduction improves render performance without altering physics timing |

**Gate:** real phone visual inspection for each theme and language; accessibility options tested manually.

## 9. Phase 6 — Progression, exploration and saved state

| ID | Test | Acceptance |
|---|---|---|
| DAT-01 | Local high scores | Separate per difficulty, survive page reload and app restart |
| DAT-02 | Exploration accumulation | Island visits/hits retained across sessions, keyed by stable island ID |
| DAT-03 | Exploration map | Independent pan/zoom/tap inspection; gameplay arena remains fixed |
| DAT-04 | Achievements | Approximately 15–20 unlock reliably, only once per milestone, without physics advantage |
| DAT-05 | Game-over map | Correct visited-island highlights and per-island collision/score details |
| DAT-06 | Result card | Export image includes correct score/statistics without personal identifiers by default |
| DAT-07 | Background auto-pause | Switching tabs/apps suspends ball and timers immediately |
| DAT-08 | Resume | Restores score, lives, ball(s), paddle, weather, timers and bonuses consistently |
| DAT-09 | Checkpoint crash recovery | Most recent valid checkpoint restores without duplicate points/awards |
| DAT-10 | Version migration | Compatible data migrates; incompatible active game resets safely while long-term data survives |
| DAT-11 | Export/import | Schema-validated JSON backup; merge/replace choices; rejects malformed/unsupported data safely |
| DAT-12 | Reset options | User can clear analytics/preferences/progress only with appropriate confirmation |
| DAT-13 | Analytics storage bound | Local heatmap and traces obey storage limits, can export/clear, no network telemetry |

**Gate:** close and reopen the browser/PWA at critical scenarios: in multiball, during power activation, during wind, between lives, and just before a high score.

## 10. Phase 7 — PWA, performance, devices and release

| ID | Test | Acceptance |
|---|---|---|
| REL-01 | Installability | Valid manifest, icons, service worker and expected standalone behavior |
| REL-02 | Cold first launch online | Downloads necessary game data and provides honest caching/readiness indicator |
| REL-03 | Airplane-mode relaunch | All essential gameplay, maps, sound, records and exploration work offline |
| REL-04 | Update behavior | New version activates between sessions; safe migration and rollback behavior documented |
| REL-05 | iOS Safari / installed PWA | Touch, audio unlock, portrait viewport, storage, background/resume verified on real iPhone |
| REL-06 | Android Chrome / installed PWA | Same core behaviors verified on real Android handset |
| REL-07 | Desktop Chrome/Firefox/Safari where available | Centered portrait arena, mouse/keyboard inputs and scale behave correctly |
| REL-08 | Representative screen sizes | Small and large phone viewports; no clipped Crete or important HUD controls |
| REL-09 | Frame-rate goal | Target 60 FPS on capable devices; record 1% lows and sustained performance |
| REL-10 | Physics determinism under load | CPU/GPU throttling does not alter authoritative fixed-step results |
| REL-11 | Low-memory recovery | Page/app restarts safely; caches and persisted data are handled without corruption |
| REL-12 | No mandatory external services | Gameplay doesn't depend on map tiles, CDN, auth or analytics network access |
| REL-13 | Security/content review | No remote code, unsafe import, unlicensed bundled media or exposed development controls |
| REL-14 | Final clean-room verification | Fresh install + all eight phase gate checks + documented known limitations |

**Gate:** release only after tests are executed and remaining exceptions are explicitly accepted by the user.

## 11. Quantitative measurements to collect (targets must be tuned, not invented)

- Collision miss rate, maximum overlap penetration and number of physics corrections.
- Maximum physics step time; number of swept-collision events and anti-stuck interventions.
- Simulation divergence across 30/60/120 FPS render schedules under identical seeded input.
- Mobile FPS distribution, frame pacing, memory pressure and startup/cache payload size.
- Ball survival duration, Crete catch/miss ratio, unique islands touched and combo distribution.
- Time spent in major geographical regions and island hit frequency heatmap.
- Tutorial completion time, control errors and accidental power-bounce triggers.

Initial acceptance thresholds beyond strict correctness invariants must be documented during Phase 0/2 calibration and approved at the respective milestone; do not fabricate benchmark results or declare a device-performance pass without hardware measurements.

## 12. Reproducibility and regression requirements

1. Capture simulation seed, fixed-step configuration, map/collider revision and all relevant input events.
2. A problematic run must replay with the same events and reproduce the same relevant collision and scoring outcomes under the same runtime conditions.
3. Create a minimal unit fixture before applying a bug fix where practical.
4. Add each validated fix as a regression test; store the fixture alongside code.
5. Keep debugging visuals, force overlays and developer tuning gated from normal play.
6. Maintain a documented device matrix with status and evidence, never assuming one browser represents all PWAs.

## 13. Mandatory milestone handoff template

```text
Phase: <0..7>
Build/commit:
Delivered features:
Tests executed (IDs + exact commands):
Passed / Failed / Not run / Device unverified:
Device/browser evidence:
Performance and collision metrics:
Known bugs and limitations:
Any proposed deviations from 75 decisions:
What the user must review:
Approval requested for next phase: YES / NO
```

## 14. Definition of done

A milestone is done only when its deliverables run, the applicable tests have evidence, remaining limitations are disclosed, and the user approves moving forward. The complete game is done only when every non-negotiable invariant is demonstrated, the offline PWA has been tested on real mobile devices, all approved features are accounted for, and no design decision was silently changed.

End of File
