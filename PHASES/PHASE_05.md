# Crete Pinball — Phase 05: Visual Experience, Audio, Tutorial and Localization

Version: 1.0  
Status: Ready only after explicit Phase 04 approval  
Scope: Four visual themes, coherent visual feedback, adaptive rendering, maritime-arcade audio, optional haptics, first-run interactive tutorial, English/Turkish/Greek localization, accessibility and UI polish.

## 1. Mission

Turn the approved, playable Phase 04 simulation into a polished, readable mobile-first game **without changing its geography, scoring, collision logic, or gameplay tuning**. The defining appearance is a dark Aegean sea with finely outlined islands and Greek/Turkish coastlines, with subtle ambient water animation and a luminous nautical ball. Preserve predictable controls and visibility over decoration.

## 2. Read first; check the gate

Read `CLAUDE.md`, `GAME_DESIGN.md`, `DECISION_REGISTER.md`, `TECHNICAL_ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, `TEST_MATRIX.md`, completed Phase 00–04 deliverables, `PROGRESS.md`, and the actual source/tests. Check that Phase 04 was approved. If not approved, report the missing gate and **stop**. Inspect the existing event contracts, scene lifecycle, asset pipeline, HUD and save settings before making changes.

## 3. Phase boundaries

**Build in this phase:** four coherent render themes; polished nautical ball and effects; island/mainland/Crete contact feedback; restrained water animation; special ability effects; impact shake; sound mixer; haptics; interactive first-run tutorial; localized UI and island labels; accessibility controls; graphics performance adaptation; a polished minimalist menu and compact gameplay HUD.

**Leave for Phase 06:** full zoomable exploration UX, persistence-rich achievements, final results card sharing, import/export flows, advanced analytics dashboard. **Leave for Phase 07:** final offline install audit, release packaging and full cross-device certification. Existing game logic and interim local saves must continue to work.

## 4. Non-negotiable invariants

1. Authoritative geography, island IDs, projected coordinates, collision and visible shapes remain unchanged.
2. Visual themes may change texture, color, shaders, typography and decoration—never geography or collision geometry.
3. Fixed portrait world, camera and hit-test transforms are preserved; shake must never displace physics or touch input.
4. Crete remains a fully visible, horizontal east–west island; lower-region gestures, tap-to-launch and double-tap charged bounce must work reliably.
5. Every ball uses its small collision core plus larger decorative glow; visual effects never add collision area.
6. Dynamic rendering quality must not alter physics timestep, ball speed, score or game state.
7. Sound/haptics/animations consume committed gameplay events; they do not decide whether a collision occurred or scored.
8. Active play must remain readable with three balls, weather overlays, island labels and combo effects simultaneously.
9. All supported text is localizable in English, Turkish and Greek, including tutorial, menus, notifications, accessibility and relevant island names.
10. User-selected theme and accessibility preferences persist locally and remain offline functional.
11. Never fetch required assets, translations, fonts, music, or map tiles from remote services during gameplay.
12. Reduced Motion and muted audio are respected; hidden/background apps should not continue playing sound.

## 5. Proposed modules and interfaces

Adapt to the actual codebase, document deviations, and prefer existing structures:

- `presentation/themes/ThemeRegistry`: theme manifest, tokens, asset references, safe fallback.
- `presentation/render/MapRenderer`: one shared projection, vector geometry, outlines and thematic land/sea layers.
- `presentation/render/BallRenderer`: glow, wake, spin highlight, power state and multiball differentiation.
- `presentation/effects/EffectDirector`: typed effect requests, temporal lifecycle, pooling, throttling.
- `presentation/effects/SeaRenderer`: sea background animation and visual-only local ripples.
- `presentation/ui/MainMenu`, `GameplayHud`, `SettingsPanel`, `PauseOverlay`.
- `audio/AudioManager`: Web Audio unlock, buses, voice limits and visibility handling.
- `feedback/HapticsAdapter`: support detection, opt-in/out and bounded vibration.
- `i18n/LocaleRegistry`, `i18n/GeographicNames`: stable IDs + localized names and fallback.
- `tutorial/TutorialDirector`: resumable, skippable interactive onboarding.
- `render/AdaptiveQualityController`: presentation-only performance tuning.

Use typed events from the gameplay layer, e.g. `land:impact`, `island:scored`, `combo:advanced`, `ability:triggered`, `ball:lost`, `weather:started`, `multiball:started`. Ensure visual effects are optional subscribers, not physics dependencies.

## 6. Default Dark Nautical theme — required visual baseline

- Sea: deep dark navy or near-black blue, not a bright gradient covering coastline detail.
- Land: almost-black/muted restrained fill; **precise thin crisp coastline outlines** with good contrast.
- Small islands remain discernible where their scale permits; don't enlarge or shift their geometry.
- Nautical ball: luminous pearl or navigation-buoy motif, readable solid core, restrained halo, short fading trail.
- Map labels: select major islands only; avoid overlap; use small clear text. Contextual labels appear briefly on island hits and target highlights.
- Crete paddle outline: unmistakably visible, while remaining part of the same map/cartography language.
- HUD: compact top row for score, remaining lives, combo and current target; power indicator near Crete with touch controls unobstructed.
- No giant floating advertisements, buttons on top of trajectory paths, or full-screen visual noise.

Provide a real in-game screenshot from a portrait viewport and request a design review against these criteria.

## 7. Four themes: scope and rules

Implement complete switchable render palettes with shared game geometry:

1. **Dark Nautical (default):** navy sea, crisp cyan/soft neutral coastlines, subdued land, luminous pearl.
2. **Neon Arcade:** dark base, luminous accent lines and punchier impact effects; maintain readability.
3. **Vintage Chart:** chart-like muted parchment/ink treatment and nautical ornaments; keep coastline and ball contrast strong.
4. **Satellite:** geographically aligned raster or generated offline land/water texture behind the **same** vector outline and physics geometry. Use only assets with verified offline redistributable permissions. If an appropriate licensed offline source is not available, deliver an explicit placeholder/technical blocker instead of downloading third-party tiles or pretending real imagery exists.

Theme switching must be immediate, persist, work offline, and preserve an active game exactly (positions, velocities, timers, scores). Theme-specific assets must meet memory/storage budgets established in Phase 00; expose actual measurements.

## 8. Layering and ordering

Recommended back-to-front presentation stack:

1. Sea background/optional theme texture.
2. Subtle sea motion and weather indicators.
3. Land fills and accurate coast outlines.
4. Temporary coast highlights, impact ripples, target halo.
5. Ball trajectories/trails, balls and foreground glows.
6. Score popups and localized contextual island labels.
7. HUD, power meter, pause/menu/dialogs and tutorial affordances.

Test color contrast in daylight and on compact phone dimensions. Projection, drawing and pointer coordinates must originate from a single mapping function; cosmetic camera shake is a post-process only.

## 9. Impact effects, strict differentiation

- **Ordinary island hit:** coastline flash centered on the correct island, precise impact-point ripple, short floating points value, then fade.
- **Mainland Greece/Turkey hit:** highlight only a short local shoreline section and create a subtle ripple; no points or full-landmass flash.
- **Crete impact:** legible bounce cue; power bounce adds distinctive restrained golden accent, stronger one-shot sound and possibly shake.
- **Special island activation:** brief distinguishable cue for its specific ability; during cooldown preserve normal island visuals/scoring with optionally dimmed activation accent.
- **Combo and bonus targets:** clearer but not prolonged effect; source event includes the awarded points and target identifier.
- **Loss:** southern exit visual and short audio, not misleading collision effects.

Treat all duration values as tuning defaults, not as reasons to change gameplay. E.g. normal coastline flashes ~150–250 ms, with no aggressive strobe. Test effects with stacked multiball contacts.

## 10. Intelligent effect throttling

A real contact is **never** skipped in physics or scoring because presentation is throttled. Separately cap visual particles, ripples, sounds and floating labels. Merge/suppress repeated effects tied to the same pair/area over a short visual window; allow significant new impacts, special triggers and life-loss events through. Pool transient objects and clean them on scene transition, resume and game restart. Track dropped/merged effects in dev diagnostics.

## 11. Ball state feedback

- Speed: use brighter/longer trail rather than changing core identity.
- Spin: small rotating sheen on core; keep movement direction visually unambiguous.
- Charged-power bounce: a short golden burst after impact only.
- Special boost: limited themed particles.
- Multiball: up to three distinct, clearly outlined balls; no fake extra visual balls.
- Approach trajectory predictor: subtle dashed forecast near Crete only; hide when uncertain, as determined by Phase 04 logic.

Glow, trail and all particles must reduce with quality settings without reducing ball-core visibility.

## 12. Sea, weather and camera

Ambient sea motion is subtle and purely cosmetic. Weather events display a localized readable direction cue and a concise localized announcement, while actual forces remain Phase 04 owned. Light breeze/calm visualizations must reflect simulation state, not invent forces. Brief low-amplitude screen shake is allowed only for major impacts, special activation, multiball and lost life. Never zoom the fixed Aegean during gameplay. With Reduced Motion, suppress shake/ambient texture motion/nonessential particles; keep important state messages visible by text or static contrast.

## 13. Audio design and implementation

Design an original or appropriately licensed sound set with a restrained maritime atmosphere and short, crisp arcade feedback. Required categories: sea ambience, ordinary land contact, island scored, combo milestone, Crete bounce, charged bounce, special island activation, multiball, weather event, lost life, UI confirm/error.

- Use separate master, music/ambience and effects volume controls; default to moderate levels.
- Unlock Web Audio **only after a user gesture**; provide visible mute control and fallback if unlock is denied.
- Limit overlapping voices, particularly rapid contact audio. A spammed shore must not create an audio wall.
- Stop or suspend playback when the page/app is hidden or paused; correctly resume after user interaction if required.
- Avoid streaming tracks and unapproved commercial audio; bundle compressed audio offline.
- Do not generate retro 1970s arcade sound as the default signature; use modern restrained tactile effects.

## 14. Haptics

Haptics are optional, capability-detected and disabled where unsupported. Use only on meaningful contact, power bounce, milestone and life-loss events, with debouncing and modest intensity. Never make vibration mandatory for understanding status. Provide an independent toggle and a visible non-haptic fallback; do not claim uniform iOS Safari vibration support.

## 15. Localization: English, Turkish and Greek

Implement dictionary-based UI strings with English fallback and TypeScript-checked keys. Select locale from supported device preference on first run; users can override in settings and their choice persists. Include UTF-8, correct Turkish letters and Greek script in bundling and fonts. Never use machine translation at runtime or remote APIs.

Island naming must rely on **stable geographical feature IDs**. Names are presentation labels only, never used as score keys or save identifiers. Support transliterations where data warrants them, and preserve a single canonical reference for ambiguous island names. Review menu, gameplay, tutorial, settings and weather event strings for truncation in all three languages; avoid flag icons as language-only identifiers.

## 16. First-run interactive tutorial

Implement a **skippable** roughly 20–30-second onboarding, guided by actual successful user actions rather than fixed timers:

1. Prompt and detect finger slide in the lower control area; Crete moves to follow.
2. Attach ball just north of Crete, prompt tap, then demonstrate launch.
3. Explain island point collisions and rising combos contextually during initial play.
4. Explain charged bounce when available; demonstrate double-tap interaction without confusing it with launch or pan.

Keep first-launch onboarding brief. Never force repeated tutorial on every restart; store completion status locally, provide Replay Tutorial in Settings, and offer Skip. Tutorial pause must freeze physics as needed. It must not spend a normal life or corrupt personal best records merely because a demonstration step fails. If the tutorial is interrupted, resuming should be deterministic and not strand the session.

## 17. Main menu, HUD and settings

Main menu: dark outlined Aegean as a backdrop; **Play** or **Resume** prominent; Explore Aegean, Achievements and Settings available through clear secondary actions. Unimplemented Phase 06 destinations should be visibly disabled or labeled as pending in developer builds, never linked to dead screens. Difficulty selection before New Game. Confirm discarding a saved in-progress game.

HUD: score, lives, combo multiplier, target in a compact top bar; charged-bounce meter near bottom without interfering with swipe control. No always-visible technical telemetry outside dev mode. Pause state is immediately legible, with resume countdown managed by prior phase.

Settings must expose themes, locale, audio levels, haptics, reduced motion, high-contrast outlines, text sizing, and a way to rerun tutorial. Respect OS-level reduced-motion preference as the default unless user explicitly overrides it.

## 18. Accessibility and legibility

- Every interactive control has readable touch target size and meaningful text or accessible name.
- Critical state is never indicated by color alone; pair it with icons, text, or temporal structure.
- Text labels remain readable on small screens with Turkish/Greek translations and larger text.
- Avoid rapid flashing/strobing; never create a visual effect that obscures Crete's leading coastline or the approaching ball.
- Theme contrasts must be checked, including Vintage and Satellite variants.
- On desktop, mouse and keyboard functionality from Phase 03 remain usable with the portrait arena.
- Mobile touch scrolling and browser gestures must not steal control while the game area is active.

## 19. Automatic adaptive visual quality

Target smooth 60 FPS on capable phones; degrade **presentation only** when sustained performance drops. Example quality levels may cap particle count, glow passes, ripple resolution, sea animation refresh and internal render resolution, while preserving HUD legibility and coast/ball visibility. Use hysteresis to prevent rapid quality oscillation. Detect prolonged frame-time issues rather than a single hiccup. Quality adaptation must not change collision threshold, physics step, simulation-time events or map projection. Provide diagnostics with observed FPS, quality tier and memory/asset size where available. Never infer 60 FPS success from desktop testing alone.

## 20. Offline asset and licensing policy

Bundle every runtime-critical visual, audio, font and translation resource with the installed PWA. Record source, copyright/attribution, redistribution terms and local file size in asset metadata. Do not hotlink satellite tiles, commercial songs or external web fonts. Phase 05 can prepare cache manifests but final service-worker and offline-install validation belongs to Phase 07. Verify that an existing cached build still runs even with the network disabled.

## 21. Tests and acceptance criteria

Automated and manual checks must cover at least:

1. Each of the four themes uses exactly the same coordinates and contact geometry; theme toggles preserve live score/velocity/spin/game state.
2. Mainland impact yields no points popup; island impact correctly displays actual event points, not independently calculated UI values.
3. Excessively rapid island/mainland collisions preserve physical events and scoring while presentation remains capped.
4. High-speed and three-ball scenarios remain visually trackable at minimum supported portrait viewport.
5. All audio waits for an initial gesture and can be disabled; app backgrounding silences audio.
6. Haptic-disabled and unsupported browsers produce no errors.
7. Reduced Motion removes shake and cosmetic sea motion while preserving state cues.
8. Locale switching updates every live display and contextual island label without changing IDs or saves.
9. Missing translation keys fallback gracefully; long Greek/Turkish strings do not overlap critical HUD elements.
10. Tutorial Skip, Replay and interrupted/resumed flows work without lost lives or stuck gestures.
11. Main menu Play/Resume/New Game flows preserve the Phase 03–04 save and pause semantics.
12. Adaptive graphics transitions do not change physics results under a deterministic seeded scenario.
13. Asset audit shows no required runtime network dependency and documents all licenses.
14. Existing Phase 00–04 regression suites pass unchanged.

Capture at least one portrait screenshot per theme, one with three balls and an active weather event, and one at large-text/reduced-motion settings. Supply measured performance results on a real mobile device or mark device validation incomplete—never invent results.

## 22. Deliverables

- Implemented visuals, theme registry, effects director, audio/haptic systems, tutorial and localization.
- Theme previews, UI screenshots and an asset/license manifest.
- Structured translations for EN/TR/EL with a missing-key report.
- Automated tests, manual test checklist, commands and actual results.
- Performance measurements and documented adaptive-quality thresholds.
- Updated `PROGRESS.md`, known issues, exact modified files and approval summary.

## 23. Completion gate

Phase 05 is complete only when the game is playable with all four themes available or any unlicensable Satellite asset limitation is explicitly disclosed for approval; island/coastline accuracy and physics are unchanged; localization/tutorial and accessibility are functional; audio is stable across focus changes; and all applicable tests pass. Do **not** silently mark incomplete visual themes or untested mobile performance as done.

Present the running game for human visual and feel review. **Stop and request explicit user approval before Phase 06.** Do not implement full exploration/progression/sharing or final release hardening during Phase 05.

End of File
