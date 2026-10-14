# CRETE PINBALL — ANTIGRAVITY KICKOFF PROMPT

**Purpose:** Start the agreed milestone-based development process. This prompt authorizes **Phase 00 only**. Do not treat it as permission to build the entire game.

## Instructions to Antigravity

You are the lead engineer for **Crete Pinball**, a portrait-first, fully offline, single-player PWA. The Aegean Sea is the arena: real island and mainland coastlines determine physical collisions, and the accurately outlined island of Crete is the movable horizontal paddle along the south. The experience is a progressive arcade game, not a conventional rectangular pinball table.

### 1. Read and verify the governing documents

Before editing source code, locate and read these documents **in full** from the repository root, in this order:

1. `CLAUDE.md` — standing instructions and hard constraints.
2. `DECISION_REGISTER.md` — all 75 approved decisions.
3. `GAME_DESIGN.md` — complete design specifications.
4. `TECHNICAL_ARCHITECTURE.md` — component boundaries, geographic data, physics, state and storage contracts.
5. `IMPLEMENTATION_PLAN.md` — phase scope and approval gates.
6. `TEST_MATRIX.md` — testing requirements and evidence.
7. `PHASES/PHASE_00.md` — **the only phase authorized now**.

Confirm each file exists, is readable, and ends with a standalone line containing exactly `End of File`. That line is a document completeness marker, **not** an instruction for the program and must not be copied into generated source files. If a required document is absent, truncated, or materially contradictory, identify the exact problem and stop for clarification. Use these verified individual files as authority; do not substitute any older ZIP snapshot.

### 2. Scope of this kickoff: Phase 00 only

Implement all of the tasks and acceptance criteria in `PHASES/PHASE_00.md`, including:

- Initialize Vite, strict TypeScript, and Phaser with Matter integration available for later phases.
- Establish a clean, documented, maintainable project layout and module boundaries.
- Define world-coordinate, projection, viewport, orientation and scaling contracts before implementing geographic rendering.
- Create the minimum portrait scene shell and responsive desktop presentation; any sample geometry must be explicitly labeled as a placeholder.
- Configure type checking, linting/formatting, unit tests, build, and browser smoke tests where supported.
- Document dependencies, licenses, development commands and exact tool versions.
- Create/update `PROGRESS.md` to record progress, test evidence, known defects, and the next approval gate.

**Do not implement** real coastline imports, completed map geometry, ball simulation, final collision shapes, scoring, bonuses, weather, achievements, themes, or future phase requirements during Phase 00. Do not create a fake Aegean map and present it as real geographical data.

### 3. Binding requirements and working rules

- Keep the 75 confirmed design choices intact. Do not silently weaken geographic accuracy, collision reliability, offline support, or portrait-first controls for convenience.
- The chosen stack is Vite + TypeScript + Phaser with integrated Matter physics. Prefer pinned, verified dependency versions; do not invent version numbers.
- The game has no backend, cloud account, online leaderboard, or runtime map-service dependency.
- Work autonomously **inside the authorized phase**. Avoid unnecessary approval requests. Pause for user approval at the milestone gate.
- Never claim a test, device check, or screenshot was completed unless there is actual evidence. Report unavailable tests as *not run*.
- Do not automatically launch browsers except as necessary for explicitly configured test execution, and avoid disruptive tooling actions.
- If the environment already contains application source, inspect it before changing anything. Preserve unrelated work and avoid destructive resets.
- If technical choices remain open within the approved design, make documented engineering decisions; if an actual approved design decision must change, stop and request approval.

### 4. Required completion report

When Phase 00 implementation is complete, report:

1. **What was implemented:** main components, contracts and test scaffolding.
2. **Files added/modified:** concise file tree or named list.
3. **Commands executed:** exact commands and their outcomes (typecheck, lint, tests, build, smoke tests).
4. **Acceptance criteria:** each Phase 00 criterion with PASS, FAIL, or NOT VERIFIED and supporting evidence.
5. **Manual review steps:** how I can launch and inspect the portrait shell on phone and desktop.
6. **Outstanding problems:** defects, assumptions, limitations and any deviations requiring explicit approval.
7. **Progress log:** confirmation that `PROGRESS.md` was updated.

**STOP when Phase 00 reaches its approval gate. Do not begin Phase 01 until I explicitly authorize it.**

## Suggested first message to the coding agent

> Read and validate the seven documents above, including their `End of File` markers. Then execute **Phase 00 only**, follow its acceptance criteria, run the available tests, and provide the prescribed completion report. Stop for my approval before Phase 01.

---

End of File
