# Crete Pinball — Sources, Licenses, and Verification

Status: Reference register for Antigravity implementation. Verified links were checked on 2026-10-13. External sources are not a substitute for testing the actual game geography or confirming asset licensing at download time.

## 1. Official core technology references

### Phaser
- Phaser official documentation: https://docs.phaser.io/
- Matter physics concepts: https://docs.phaser.io/phaser/concepts/physics/matter
- Phaser physics overview: https://docs.phaser.io/phaser/concepts/physics

**Implementation rule:** Use Phaser's bundled Matter integration as agreed. Choose exactly one authoritative physics pipeline for the ball. Phaser's Matter integration is not a guarantee against fast-moving objects tunneling through thin shapes; verify with swept collision checks, appropriate substeps, and reproducible stress tests.

### TypeScript and Vite
- TypeScript handbook: https://www.typescriptlang.org/docs/handbook/intro.html
- Vite documentation: https://vite.dev/guide/
- Vite PWA documentation: https://vite-pwa-org.netlify.app/
- Vite PWA reference repository: https://github.com/vite-pwa/docs
- PWA offline asset precaching notes: https://github.com/vite-pwa/vite-plugin-pwa/blob/main/docs/workbox/generate-sw.md

**Implementation rule:** Confirm installation, offline operation, fresh install, cold offline startup, and controlled service-worker updates on real devices. Host critical assets locally; a first online visit must successfully cache the necessary resources before offline readiness can be claimed.

### Web platform standards
- MDN service-worker API: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- MDN IndexedDB API: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- MDN Page Visibility API: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
- MDN Web Share API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API
- MDN prefers-reduced-motion: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- Web App Manifest: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest

**Implementation rule:** Feature-detect device APIs. Web Share, vibration/haptics, storage durability, installation, and screen-orientation controls are not equally supported across browsers. Provide graceful fallbacks.

## 2. Authoritative geographical data candidates

### Natural Earth — first candidate for Phase 01
- 1:10m Physical Vectors landing page: https://www.naturalearthdata.com/downloads/10m-physical-vectors/
- 10m coastline information: https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-coastline/
- 10m physical building blocks and label points: https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-physical-building-blocks/
- Project homepage: https://www.naturalearthdata.com/
- Usage terms: https://www.naturalearthdata.com/about/terms-of-use/

Relevant Natural Earth layers include coastline, land polygons, minor islands, minor-island coastline, and label points. The standard coastline layer covers major islands, while minor-island data must be considered separately. The map is generalized at 1:10m; do not treat it as exact shoreline survey data.

**Phase 01 verification tasks:**
1. Compare coverage for Crete, Rhodes, Kos, Lesbos, Chios, Naxos, Paros, Santorini, Mykonos, the Dodecanese, and the northern/eastern Aegean.
2. Verify that islands intended as named targets actually exist in the chosen layers and have stable IDs.
3. Check missing tiny islands, polygon validity, self-intersections, coastal coves, multipart landmasses, and narrow channels.
4. Define a stable, documented map projection and consistent world coordinates for rendering and physics; prevent longitude/latitude stretching.
5. Produce a side-by-side coastline audit against a second authoritative source before locking the dataset.
6. Record source versions, acquisition dates, hashes, and processing scripts. Never silently fabricate coastlines.

### OpenStreetMap — optional higher-detail comparison or fallback
- OpenStreetMap copyright and license: https://www.openstreetmap.org/copyright
- OpenStreetMap Wiki: https://wiki.openstreetmap.org/wiki/Main_Page
- Overpass API documentation: https://wiki.openstreetmap.org/wiki/Overpass_API

OpenStreetMap geographic data is subject to ODbL conditions including attribution and possible share-alike obligations for derived databases. Do not assume that using an OSM-derived coastline is equivalent to public-domain data. Confirm compliance before distributing offline or processed datasets.

**Decision gate:** Natural Earth is a starting candidate, not pre-approved as sufficiently accurate or complete. If a more detailed source is needed, document its provenance, license, file size, coverage, processing, and attribution obligations; ask for approval if the source changes project constraints.

## 3. Geographical processing tools

- GDAL / OGR documentation: https://gdal.org/
- PROJ coordinate transformation library: https://proj.org/
- GeoJSON format, RFC 7946: https://www.rfc-editor.org/rfc/rfc7946
- Turf geospatial library: https://turfjs.org/

**Processing rules:**
- Keep a reproducible offline build pipeline from upstream source to cropped Aegean world-space geometry.
- Track and quantify simplification error in projected world-space units, not unprojected latitude/longitude degrees.
- Derive both visual coastlines and collision geometry from the same authoritative source.
- Maintain stable island identifiers separately from localized names and screen positioning.
- Validate ring orientation, holes, multipolygons, open boundary edges, and dynamic Crete bodies.
- The approved visual geometry is not to be warped to hide physics defects.

## 4. Rendering and asset licenses

### Visual themes
- Dark Nautical, Neon Arcade, and Vintage Chart can be authored using locally generated graphical assets and geographic vectors. Verify licenses of any third-party fonts, textures, symbols, and audio.
- The Satellite theme needs particular care: do **not** scrape or package commercial map imagery without a license that explicitly allows offline use, redistribution, and derivative display. A supplier's online tile access does not automatically grant offline redistribution rights.
- Satellite imagery source, coverage, attribution text, redistribution terms, and package size must be documented before that theme is shipped.

### Fonts, sounds, icons
- Use locally bundled assets so the core PWA is fully usable offline.
- Record asset URL, author, license, attribution obligations, and version in an asset manifest.
- Do not rely on third-party CDNs for critical game assets.
- Avoid shipping unlicensed sounds or images, even if they are publicly accessible.

## 5. Accessibility and performance references

- WCAG 2.2 recommendation: https://www.w3.org/TR/WCAG22/
- MDN Web Performance: https://developer.mozilla.org/en-US/docs/Web/Performance
- MDN requestAnimationFrame: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame

**Implementation rule:** Target 60 FPS on capable devices but keep physics timesteps independent of frame rendering. Respect reduced motion, provide distinguishable effects without relying on color alone, and test pointer/touch ergonomics on real phones.

## 6. Project-owned authoritative documents

Within this project, follow the documents in this order when implementing:
1. `DECISION_REGISTER.md` — user-confirmed decisions.
2. `GAME_DESIGN.md` — game behaviors and requirements.
3. `TECHNICAL_ARCHITECTURE.md` — module boundaries and technical approach.
4. `IMPLEMENTATION_PLAN.md` — phase ordering and approval gates.
5. `TEST_MATRIX.md` — acceptance and regression criteria.
6. `CLAUDE.md` — coding and agent-operating instructions; resolve any contradictory claims against explicitly approved decisions and ask before changing the design.
7. `PHASES/PHASE_00.md` through `PHASES/PHASE_07.md` — phase-level implementation detail.
8. `ANTIGRAVITY_KICKOFF_PROMPT.md` — kick-off execution instruction.

If documents conflict, do not silently reconcile incompatible requirements. Show the conflict and request a targeted ruling. Preserve the user's approval gates and do not advance phases autonomously.

## 7. Pre-release source audit checklist

- [ ] Every geography layer has a recorded source URL, version, checksum, and license.
- [ ] All island target IDs map to valid land geometry or are explicitly excluded.
- [ ] Crete and mainland coastlines pass visual alignment and collision tests.
- [ ] Every distributed asset is licensed for bundling and offline use.
- [ ] All mandatory attribution notices are visible or accessible.
- [ ] Offline installation does not require live CDN requests after caching.
- [ ] Dependencies are pinned and reviewed for license compatibility.
- [ ] Test results and date of verification are archived with the release.

End of File
