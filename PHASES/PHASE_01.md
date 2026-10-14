# Crete Pinball — Phase 01: Authoritative Aegean Geography and Crete Movement

Version: 1.0
Status: Ready for authorization AFTER successful approval of Phase 00
Scope: Geography, data pipeline, rendered arena, movable Crete, and geographic inspection tools only

## 1. Objective

Replace Phase 00 placeholder geometry with a geographically grounded, reproducibly generated Aegean playing field. Display authentic mainland Greece, mainland Turkey, the Aegean islands, and Crete, and let Crete translate horizontally as the future paddle. Deliver reliable map and geometry contracts for Phase 02 physics. **Do not implement live ball physics, scoring, combo logic, powers, or game progression in this phase.**

## 2. Read first, in order

1. `CLAUDE.md`
2. `DECISION_REGISTER.md`
3. `GAME_DESIGN.md`
4. `TECHNICAL_ARCHITECTURE.md`
5. `IMPLEMENTATION_PLAN.md`
6. `TEST_MATRIX.md`
7. `PHASES/PHASE_00.md` and its accepted handoff
8. `PROGRESS.md`, if it exists
9. This document

If Phase 00 has not been approved, stop. Report conflicting requirements explicitly; do not silently reinterpret the 75 user decisions.

## 3. Non-negotiable design constraints

- Geography must be based on verifiable real coastline and land-polygon data, not hand-drawn substitutes.
- Preserve authentic relative land positioning and proportions. Do not stretch, rescale individual islands, relocate land, expand small islands, or alter coastline shape to improve gameplay.
- The default playing field is a fixed **portrait** Aegean arena. The map remains visible during normal gameplay; the centered desktop viewport retains the same world aspect ratio.
- Crete retains its coastline silhouette and remains horizontally oriented. It may translate only in screen/world X; its Y position, scale and rotation remain fixed.
- Crete must remain wholly within the viewport at its horizontal travel extremes; apply limits using the shape's transformed bounding box, not a guessed center distance.
- Maintain separation between authoritative geographic data, visual geometry, simplified future collision geometry, and interactive map presentation.
- No runtime map API, cloud backend, geocoding dependency, accounts, analytics upload, or paid mapping service.
- A geographic feature below the agreed screen-space collision threshold can still be drawn and identified; do not quietly enlarge its physics footprint.
- A ball is lost only beyond the designated southern escape boundary in later phases. Phase 01 can draw that line in developer mode, but does not simulate loss.

## 4. Geographical dataset acquisition and licensing

Evaluate candidate sources before selecting a primary dataset. Natural Earth 1:10m land and minor-island vectors are a useful first candidate, but must **not** be assumed complete enough for every Aegean islet. Consider properly licensed higher-resolution coastline data if needed, with documented attribution, provenance, and data-processing terms. Verify terms before bundling or redistributing assets.

Create `docs/GEO_DATA_SOURCES.md` recording, for each candidate:

- Original publisher, product/dataset name, download URL and date accessed.
- Data version, supplied coordinate reference system, file formats and geographic coverage.
- License/attribution obligations and whether redistribution of derived data is permitted.
- Feature density, file size, number of islands/land components in the target extent.
- Representative visual and numerical quality checks on Crete, Rhodes, the Cyclades, Lesbos, Chios, and the Dodecanese.
- Reason for the final choice; gaps and any supplemental sources used.

Fail visibly when source data is missing, malformed, unlicensed or unverified. Do not silently substitute fabricated polygons.

## 5. Define and freeze the geographical extent

Pick the map boundary deliberately, with mainland Greece to the west, Turkey to the east, the northern Aegean at the top, and Crete in the southern defensive band. Resolve the exact geographic bounding box by inspecting candidate coastlines and the resulting viewport, not by unreviewed hard-coded guesses.

Produce `docs/ARENA_GEOGRAPHY.md` with:

- The accepted bounding polygon or rectangle, and coordinate units.
- The projection and transformation chain from source coordinates to world units to screen pixels, including inverse transformation.
- A visual proof that shapes remain geographically proportional at representative phone sizes.
- The fixed arena edge layout: western/eastern/northern open-sea arcade reflection boundaries where needed, versus mainland and island coastline surfaces.
- The southern escape edge *below* Crete; test that moving Crete does not cross or overlap this edge.
- The screen-space trade-off: if aspect-preserving letterboxing appears, document it rather than distorting land.

Note: simple longitude/latitude scaling is geographically distorted; evaluate an appropriate regional projected coordinate system or explicitly quantify any approximation's scale distortion. Store the chosen spatial reference and transform as testable code/data rather than scattered rendering constants.

## 6. Reproducible preprocessing pipeline

Implement a build-time tool (e.g. `tools/geography/`) that:

1. Reads original geographic vector files without modifying the originals.
2. Validates projection, polygon topology, ring closure, holes and multi-polygons.
3. Clips land geometry to the chosen arena extent, retaining provenance and stable feature IDs.
4. Distinguishes mainland components, islands, and Crete using documented classifications—not screen-size heuristics alone.
5. Projects geometry into world coordinates, then generates a detailed visual mesh/path representation.
6. Derives a separate future-physics coastline representation by bounded simplification of the **same** projected coordinates.
7. Tags coastline segments with stable feature IDs and land classification, including Crete's north versus other coasts when applicable.
8. Computes bounding boxes, centroids or safe label anchors, and optional spatial indices for efficient feature lookup.
9. Exports deterministic, versioned local geometry assets and a manifest containing checksums, data versions, projection metadata, and processing settings.
10. Emits diagnostic logs and explicit failure when input validation or geometry tolerances fail.

Do not duplicate authoritative coordinates by maintaining unrelated hard-coded points in multiple gameplay modules. Preserve source geometry files or documented download/reproducibility instructions in the project according to license requirements.

## 7. Visual-vs-physics geometry tolerance

Both representations must remain visually aligned. Define and report a **measured maximum boundary deviation** in world units and in pixels at default mobile gameplay scale. Choose an explicit acceptance threshold with written justification, then ensure automated tests enforce it. Do not claim zero error unless measured.

- Simplify more aggressively only where error bounds remain acceptable.
- Preserve capes, sharp bends, holes and channels when simplification might change passage topology or observable collision behavior.
- Reject self-crossing rings, degenerate edges, invalid winding, overlapping duplicate boundaries, and polygons outside the arena due to transform mistakes.
- Do not model physical collisions yet. Phase 01 prepares and validates geometry for later use.
- Provide per-feature comparison views and an error report so an engineer can inspect worst-case discrepancies.

## 8. Stable island identity, names, and discovery compatibility

Create a versioned `geography/features` catalog with stable feature identifiers independent of language and draw order. Suggested fields:

```ts
type GeographicFeature = {
  id: string;                     // stable across data and language revisions
  kind: 'mainland' | 'island' | 'crete';
  sourceReferences: string[];
  displayNames: Partial<Record<'en' | 'tr' | 'el', string>>;
  geometryAssetId: string;
  worldBounds: { minX: number; minY: number; maxX: number; maxY: number };
  visualAreaPxAtReferenceScale?: number;
  isCollidableAtReferenceScale?: boolean;
  trackable?: boolean;
};
```

Add a documented policy for islands with ambiguous or multiple names. Never derive IDs from translated labels. Mark tentative identifiers explicitly for review; do not invent purported official IDs. Prepare migration mapping when a future data upgrade changes source feature IDs.

## 9. Map rendering

Create a `GeographyLayer` or equivalent Phaser scene module that:

- Draws the selected vector-derived land shapes and crisp outlined coastlines.
- Defaults to the approved dark nautical palette: dark sea, restrained fills, fine contrasted outlines.
- Keeps water motion/other themes as extension points; do not implement the complete four-theme visual system in this phase.
- Uses viewport-safe, aspect-preserving scaling with high-DPI consideration.
- Shows a limited set of subtle major-island labels, with stable feature lookups and no dependence on ball-hit mechanics.
- Avoids repetitive mesh rebuilds or expensive per-frame reparsing of geospatial files.
- Clearly differentiates **geographical land boundaries** from future **invisible arcade edges** in debug mode.

The map should remain readable at small portrait widths. The developer can toggle filled polygons, outlines, labels, source/derived geometry, bounding boxes, and feature IDs independently.

## 10. Movable Crete model

Create `CretePaddle` as an independent module/entity, referencing the same authoritative Crete geometry but with a **dynamic horizontal transform** applied to that feature alone. Static map geometry must not include a second, overlapping, immobile Crete silhouette.

Required behavior:

- On mobile, dragging in the lower interaction zone moves Crete horizontally with a relative displacement mapping, without requiring a finger directly over Crete.
- Use the agreed responsive speed-limited movement; when the finger stops, Crete stops without inertial drift.
- Ignore vertical movement and prevent rotation.
- Clamp movement using the whole island's world-space bounds at each frame, so neither tip exits the playable area.
- Preserve touch continuity across normal drag events and handle `pointercancel`, focus loss and pause safely.
- Prevent native page scrolling/gesture interference over the game interaction surface without disabling accessibility outside the canvas.
- On desktop, provide equivalent mouse movement and left/right keyboard control while the same portrait arena remains centered.
- Record paddle X position and instantaneous horizontal velocity, even though ball momentum transfer is Phase 02 work.
- Keep the logical paddle transform separate from rendering interpolation and future physics-body update logic.

Do not fake the movement by scrolling or shifting the whole map. Crete is the only geographic feature that moves.

## 11. Interactive exploration proof of concept

Prepare a **separate** map-inspection mode or developer atlas that supports pan, pinch/wheel zoom and tap-to-identify land features. It must use the same catalog and shapes but need not yet implement achievements, lifetime discoveries, scores, or player progression (Phase 06).

Verify that zoom and pan of the atlas never leak into the fixed gameplay camera and do not alter any gameplay world coordinates.

## 12. Developer geography diagnostics

Provide a developer-only overlay and inspection controls for:

- Latitude/longitude under pointer via inverse projection where supported.
- World X/Y and current screen-space scale.
- Feature ID/name/classification under pointer.
- Real visual coastline versus simplified future collision boundary, with distinct line styles.
- Per-feature segment counts, geometry error, bounds, and topology warnings.
- The southern escape boundary, current Crete travel clamps, and allowed touch-control region.
- Data manifest version, counts of land components, collidable/visual-only islands, and dropped invalid features.

These controls must not appear in normal player mode and must not overwrite production geography state.

## 13. Required tests and acceptance evidence

Add automated tests, representative fixtures, and manual viewport demonstrations. Minimum expectations:

### Data and transforms

- Repeat preprocessing on unchanged input and confirm deterministic output/checksums.
- Round-trip several geographic reference points through geographic-to-world-to-screen transformations and inverse mappings within documented numeric tolerance.
- Verify topology and clipping, including holes, multi-polygons, coastlines cut by arena edges and antimeridian/longitude assumptions where relevant.
- Check that simplification does not exceed the specified boundary deviation or close important channels unexpectedly.
- Confirm stable feature IDs and correct island/mainland/Crete categorization using a documented sample list.

### Crete controls and layout

- Crete geometry stays the same shape, size and Y position throughout its motion.
- Crete's leftmost and rightmost tips never leave the gameplay viewport.
- Finger drag and mouse/keyboard controls are responsive and speed-capped, without jumps on pointer-down.
- Pausing, losing pointer capture and resizing do not teleport Crete.
- Different portrait phone sizes and desktop centered mode preserve geographic aspect ratio.
- Static Crete geometry is not accidentally rendered on top of moving Crete.

### Visual review

- Capture screenshots at representative compact and tall phones and at desktop viewport sizes.
- Inspect recognizable silhouettes and relative positions for Crete, Rhodes, Kos, Samos, Chios, Lesbos and a sample Cyclades cluster.
- Toggle visual and future collision geometry to inspect alignment, especially around capes and narrow channels.
- Confirm text labels do not overwhelm narrow layouts and are geographically attached to the correct island IDs.

If execution is unavailable, distinguish tests prepared from tests actually passed. Never claim success from code inspection alone.

## 14. Completion artifacts

Deliver or update:

- `docs/GEO_DATA_SOURCES.md` with provenance and license verification.
- `docs/ARENA_GEOGRAPHY.md` with extent, projection, scaling and selected numerical tolerances.
- Reproducible preprocessing tools, source manifest and generated geometry assets.
- Stable geographic feature catalog with internationalized name fields.
- Geography renderer and Crete paddle controller integrated into the Phase 00 scene.
- Basic exploration/developer atlas and geometry-debug overlays.
- Automated validation tests and screenshots or concise video evidence.
- `PROGRESS.md` updated with exact commands run, outcomes, measured error, known gaps and next-phase risks.

## 15. Phase gate — STOP after Phase 01

Present a working browser build where the user can inspect the map, move Crete smoothly across the southern arena and verify both tips remain visible. Present dataset sources, licenses, accepted arena bounds/projection, geometry deviations, generated size, known limitations and actual test results.

Do not begin Phase 02 ball physics, score logic, multiball, abilities, localization rollout, full themes or PWA release work without the user's explicit approval. If a geographic limitation requires changing a locked design decision, raise it rather than silently changing the decision.

End of File
