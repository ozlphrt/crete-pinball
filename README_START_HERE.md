# CRETE PINBALL — START HERE

## 1. Purpose

Crete Pinball is a mobile-first, portrait-oriented, fully offline single-player progressive arcade PWA. The Aegean Sea is the playfield. The geographical shapes and positions of Greek and Turkish coastlines and islands are preserved; Crete moves horizontally along the south as the player-controlled paddle. A luminous nautical ball rebounds against land, collecting island scores and bonuses. Gameplay, not geographic deformation, is the adjustable variable.

This folder is the authoritative design-and-delivery package approved through 75 multiple-choice decisions. **No code is included yet.** Antigravity must implement the game through gated milestones, not in one uncontrolled pass.

## 2. Folder structure

Place these files at the project root, preserving the `PHASES/` folder exactly:

```text
Crete_Pinball/
├── README_START_HERE.md
├── ANTIGRAVITY_KICKOFF_PROMPT.md
├── CLAUDE.md
├── DECISION_REGISTER.md
├── GAME_DESIGN.md
├── TECHNICAL_ARCHITECTURE.md
├── IMPLEMENTATION_PLAN.md
├── TEST_MATRIX.md
├── SOURCES.md
└── PHASES/
    ├── PHASE_00.md
    ├── PHASE_01.md
    ├── PHASE_02.md
    ├── PHASE_03.md
    ├── PHASE_04.md
    ├── PHASE_05.md
    ├── PHASE_06.md
    └── PHASE_07.md
```

**Important:** `SOURCES.md` provides research/source notes, not a substitute for checking live licenses, source availability, or current software documentation.

## 3. Reading order and document responsibilities

1. **`CLAUDE.md`** — mandatory development conduct, non-negotiable design rules, testing and approval policy.
2. **`DECISION_REGISTER.md`** — numbered record of all 75 choices; use it to resolve whether a behavior is approved.
3. **`GAME_DESIGN.md`** — playable rules, UX, scoring, mechanics, accessibility, and intended experience.
4. **`TECHNICAL_ARCHITECTURE.md`** — modules, coordinate contracts, geography pipeline, simulation, rendering and persistence.
5. **`IMPLEMENTATION_PLAN.md`** — ordering, dependencies, deliverables, milestone acceptance criteria.
6. **`TEST_MATRIX.md`** — checks and expected evidence for critical behaviors and releases.
7. **`PHASES/PHASE_00.md`** — the **only phase authorized by the kickoff prompt**.

The kickoff prompt explicitly specifies this reading order. Where documents appear contradictory, stop and identify the exact contradiction rather than silently changing an approved rule. If an engineering choice is not settled by the documents, choose the simplest robust implementation and document the decision.

## 4. Getting started with Antigravity

1. Create a new empty folder/repository for Crete Pinball.
2. Copy all documentation files into its root, preserving names and paths.
3. Confirm every documentation file is complete: **its last non-empty line must be exactly `End of File`.** This is a document-integrity marker and must never be copied into application code.
4. Open the folder as the Antigravity workspace.
5. Open `ANTIGRAVITY_KICKOFF_PROMPT.md` and provide its **full contents** to Antigravity as the starting instructions.
6. Authorize **Phase 00 only**. Antigravity must not independently start Phase 01 or any later phase.
7. Review the Phase 00 report, actual test results, and running project shell before explicitly approving Phase 01.
8. Repeat: execute a phase, inspect code and playable results, review verified acceptance evidence, then approve the next phase.

Do not use an earlier ZIP version of these documents in place of individually verified files.

## 5. Eight development phases

| Phase | Focus | Gate before proceeding |
|---|---|---|
| 00 | Initialize Vite, strict TypeScript, Phaser, architecture contracts and tests | Project builds; tests run; coordinate and module contracts documented |
| 01 | Verified Aegean geography, viewport, coastline visualization, Crete movement | Source provenance and geographic alignment proven; touch movement works |
| 02 | Ball, fixed-step simulation, land collisions, Crete bounce, spin and anti-stuck support | Collision stress tests and manual physics check pass |
| 03 | Lives, score, combo chains, difficulty, HUD, pause and resume | End-to-end single-ball play works and saves safely |
| 04 | Special islands, power bounce, multiball, weather and slow motion | Special mechanics do not break physics or scoring |
| 05 | Four visual themes, VFX, sound, tutorial, three languages and accessibility | Mobile readability, effects, controls and localization reviewed |
| 06 | Exploration, achievements, analytics, end screen, sharing and local backups | Progress survives reload/import; feature flows tested |
| 07 | Offline installation, update safety, device compatibility, profiling and release testing | Airplane-mode test, performance and final user acceptance |

Phase documents are implementation work packages, not blanket permissions. Each phase ends at an explicit user approval gate.

## 6. Fixed rules that must not drift

- **Geography:** Do not move, resize, stretch, simplify beyond accepted tolerance, or invent geographic locations to improve gameplay. Derive visual and physics representations from a traceable, validated geographical dataset.
- **Paddle:** Crete retains its recognizable real outline, translates horizontally only, and must remain entirely visible. Northern contact receives hybrid paddle rebound treatment; the island is solid from all sides.
- **Ball:** Small collision core plus visible halo; controlled southward gravity; bounded speed and spin; reliable collisions at high speed.
- **Scoring:** Islands score; mainland coastlines only reflect. Unique-island combos are capped at ×5. Power islands have per-island cooldowns.
- **Lives:** Three starting lives; losing the final ball past the southern escape boundary costs one; endless survival with progressive difficulty.
- **Presentation:** Portrait arena, dark outlined nautical map as the default, optional alternative themes, readable HUD, optional accessibility adjustments.
- **Storage/network:** Fully playable offline after initial asset caching. No backend, required account, global leaderboard or runtime third-party map API.
- **Quality:** Physics advances independently of render FPS; automated geography/collision tests and manual device checks are mandatory. Unrun checks must be labeled **NOT VERIFIED**, not PASS.

The full rules and any tuning details belong to `DECISION_REGISTER.md`, `GAME_DESIGN.md`, and `TECHNICAL_ARCHITECTURE.md`.

## 7. Development autonomy and progress reporting

Antigravity may work independently **within the approved phase**, perform tests, and fix ordinary defects without unnecessary approval requests. It must stop before the next phase, before making a material design change, or when blocked by a major unresolved decision.

After each phase, Antigravity must maintain a project-root `PROGRESS.md` that includes:

- Exact scope completed, source files added or changed, and major engineering decisions.
- Commands actually executed, test results, evidence and known defects.
- Acceptance criteria marked **PASS / FAIL / NOT VERIFIED** with justification.
- User review items and explicit next-phase approval status.

Avoid claiming device or browser tests ran when they did not. Avoid automatically opening browsers except when an explicitly approved test requires it.

## 8. Completion and handoff

A phase is not complete just because the code compiles. The relevant tests must pass, the feature must behave correctly in playable use, and the user must approve the phase. Final release additionally requires real offline operation after installation, a successful fresh install/update path, correct local data handling, accessible core controls, and acceptable performance on representative phones.

**First action:** Copy this documentation into the Antigravity project, then provide `ANTIGRAVITY_KICKOFF_PROMPT.md` and authorize **Phase 00 only**.

End of File
