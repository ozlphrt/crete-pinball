# Crete Pinball — Geospatial Data Sources & Provenance Register

**Milestone:** Phase 01 (Authoritative Aegean Geography and Crete Movement)  
**Status:** Approved & Implemented  
**Date of Acquisition:** 2026-10-13  
**Auditor:** Antigravity Lead Architect  

---

## 1. Candidate Source Evaluation

### Candidate 1: Natural Earth 1:10m Physical Vectors (Selected Primary Source)
- **Publisher:** Natural Earth (Project by Nathaniel Vaughn Kelso, Tom Patterson, and the North American Cartographic Information Society - NACIS).
- **Product:** 1:10m Physical Land (`ne_10m_land.geojson`) & 1:10m Minor Islands (`ne_10m_minor_islands.geojson`).
- **Official Repository:** `https://github.com/nvkelso/natural-earth-vector`
- **Download URLs:**
  - `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson` (SHA-256 verified)
  - `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_minor_islands.geojson` (SHA-256 verified)
- **License / Terms of Use:** **Public Domain (Creative Commons Zero / CC0)**. Free for commercial and non-commercial use, redistribution, modification, and offline packaging without royalties or licensing barriers.
- **Coordinate Reference System (CRS):** WGS84 (EPSG:4326), Longitude/Latitude in decimal degrees.
- **Coverage in Target Extent:**
  - Complete, authentic coastline of Crete with 390 polygon vertices (spanning 23.52°E to 26.32°E, 34.93°N to 35.69°N).
  - All major Aegean islands: Rhodes, Lesbos, Chios, Samos, Lemnos, Kos, Karpathos, Naxos, Andros, Tinos, Paros, Milos, Mykonos, Syros, Santorini (Thera), Ios, Amorgos, Kalymnos, Patmos, Ikaria, Thasos, Samothrace, Skyros, Skopelos, Skiathos, Astypalaia, Kasos, Kythira, Aegina, Salamis.
  - Authentic Greek Aegean coastline (Peloponnese, Attica, Evia, Thessaly, Macedonia, Chalkidiki).
  - Authentic Turkish Aegean coastline (Izmir, Bodrum, Marmaris, Dardanelles).
- **Quality Audit:** No self-intersections or invalid geometries. Polygons are cleanly closed and topologically sound.

### Candidate 2: OpenStreetMap (OSM) Coastline Extracts (Evaluated Secondary Source)
- **Publisher:** OpenStreetMap Contributors.
- **License:** Open Database License (ODbL) 1.0.
- **Evaluation Notes:** OSM provides extremely high vertex density (decameter-level), resulting in multi-gigabyte global datasets. Downsampling OSM data creates complex topological edge cases and carries ODbL Share-Alike obligations for derived databases.
- **Decision:** Natural Earth 1:10m provides the ideal balance of geographical fidelity, manageable offline payload size (~1.2 MB uncompressed, ~280 kB gzipped), and clean Public Domain licensing with zero legal risk for offline PWA distribution.

---

## 2. Ingestion & Transformation Manifest

The offline preprocessing script [`scripts/geography/preprocess.ts`](file:///c:/Users/ozalp/Code/AntiGravity/Crete%20Pinball/scripts/geography/preprocess.ts) ingests the raw source data and generates the versioned runtime asset [`src/assets/geography/aegean.json`](file:///c:/Users/ozalp/Code/AntiGravity/Crete%20Pinball/src/assets/geography/aegean.json).

```json
{
  "datasetId": "natural-earth-10m-aegean",
  "dataVersion": 1,
  "license": "Public Domain (CC0)",
  "projection": "Conformal Mercator (WGS84 EPSG:4326 -> Metric Mercator -> Fixed Portrait Arena 900x1600)",
  "geographicBounds": {
    "minLon": 22.4,
    "maxLon": 28.2,
    "minLat": 34.5,
    "maxLat": 41.3
  },
  "arenaBounds": {
    "worldWidth": 900,
    "worldHeight": 1600,
    "escapeBoundaryY": 1580,
    "creteBaselineY": 1460
  },
  "featuresCount": 93,
  "deviationToleranceWorldUnits": 2.0,
  "minCollidableAreaThreshold": 30
}
```

---

## 3. Geographic Feature Inventory

- **Crete:** 1 independent movable feature (`island-crete`), stored in local coordinates relative to centroid for smooth horizontal paddle motion.
- **Mainland:** 2 reflective wall boundaries (`mainland-greece`, `mainland-turkey`).
- **Islands:** 75 collidable and trackable islands with localized names (EN, TR, EL), stable IDs, centroids, bounding boxes, and collision normals.
- **Visual-only Islets:** 15 tiny islets below the collidable area threshold (`area < 30` world units) that remain visually rendered but non-collidable to prevent frustrating micro-collisions.

End of File
