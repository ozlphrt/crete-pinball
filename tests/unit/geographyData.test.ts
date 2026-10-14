import { describe, it, expect } from 'vitest';
import {
  getAegeanDataset,
  getStaticFeatures,
  getCreteData,
  projectLonLat,
  worldToLonLat,
} from '../../src/geography/aegeanData';
import { ARENA_CONFIG } from '../../src/config';

describe('Aegean Geography Dataset (Phase 01)', () => {
  it('loads valid authoritative dataset with Natural Earth provenance', () => {
    const dataset = getAegeanDataset();
    expect(dataset).toBeDefined();
    expect(dataset.manifest.dataVersion).toBe(1);
    expect(dataset.manifest.attribution).toContain('Natural Earth');
    expect(dataset.manifest.arenaBounds.worldWidth).toBe(ARENA_CONFIG.worldWidth);
    expect(dataset.manifest.arenaBounds.worldHeight).toBe(ARENA_CONFIG.worldHeight);
  });

  it('contains Greek and Turkish mainland boundary features', () => {
    const features = getStaticFeatures();
    const greeceMainland = features.find((f) => f.id === 'mainland-greece');
    const turkeyMainland = features.find((f) => f.id === 'mainland-turkey');

    expect(greeceMainland).toBeDefined();
    expect(greeceMainland!.classification).toBe('mainland_greece');
    expect(greeceMainland!.isCollidable).toBe(true);

    expect(turkeyMainland).toBeDefined();
    expect(turkeyMainland!.classification).toBe('mainland_turkey');
    expect(turkeyMainland!.isCollidable).toBe(true);
  });

  it('contains authentic Crete paddle data with expected dimensions', () => {
    const crete = getCreteData();
    expect(crete.id).toBe('island-crete');
    expect(crete.classification).toBe('crete');
    expect(crete.names.en).toBe('Crete');
    expect(crete.names.tr).toBe('Girit');
    expect(crete.names.el).toBe('Κρήτη');

    // Crete local geometry outer ring vertices are centered around x = 0
    expect(crete.localGeometry.outerRing.length).toBeGreaterThan(50);
    const avgX =
      crete.localGeometry.outerRing.reduce((sum, pt) => sum + pt.x, 0) /
      crete.localGeometry.outerRing.length;
    expect(Math.abs(avgX)).toBeLessThan(10);

    expect(crete.baselineY).toBe(ARENA_CONFIG.creteBaselineY);

    // Half-width must be ~206-216 world units
    expect(crete.halfWidth).toBeGreaterThan(200);
    expect(crete.halfWidth).toBeLessThan(230);

    // Travel limits must be within arena boundaries
    expect(crete.minPaddleX).toBeGreaterThanOrEqual(200);
    expect(crete.maxPaddleX).toBeLessThanOrEqual(ARENA_CONFIG.worldWidth - 200);
  });

  it('preserves conformal Mercator projection with accurate inverse roundtrips', () => {
    const testPoints = [
      { lon: 25.13, lat: 35.34 }, // Heraklion, Crete
      { lon: 23.73, lat: 37.98 }, // Athens, Greece
      { lon: 27.14, lat: 38.42 }, // Izmir, Turkey
      { lon: 28.1, lat: 36.43 }, // Rhodes
      { lon: 25.43, lat: 36.39 }, // Santorini
    ];

    for (const pt of testPoints) {
      const world = projectLonLat(pt.lon, pt.lat);
      const inverted = worldToLonLat(world.x, world.y);

      expect(inverted.lon).toBeCloseTo(pt.lon, 2);
      expect(inverted.lat).toBeCloseTo(pt.lat, 2);
    }
  });

  it('has unique, stable IDs and localized names for all features', () => {
    const features = getStaticFeatures();
    const idSet = new Set<string>();

    for (const f of features) {
      expect(f.id).toBeTruthy();
      expect(idSet.has(f.id)).toBe(false);
      idSet.add(f.id);

      expect(f.names.en).toBeTruthy();
      expect(f.names.tr).toBeTruthy();
      expect(f.names.el).toBeTruthy();

      // Centroid must lie within arena coordinate bounds
      expect(f.centroid.x).toBeGreaterThan(0);
      expect(f.centroid.x).toBeLessThan(ARENA_CONFIG.worldWidth);
      expect(f.centroid.y).toBeGreaterThan(0);
      expect(f.centroid.y).toBeLessThan(ARENA_CONFIG.worldHeight);
    }
  });

  it('strictly adheres to the <= 2.0 world units simplification deviation budget', () => {
    const dataset = getAegeanDataset();
    expect(dataset.manifest.deviationToleranceWorldUnits).toBeLessThanOrEqual(2.0);
  });

  it('includes key major Aegean islands as collidable features', () => {
    const features = getStaticFeatures();
    const requiredIslands = [
      'island-rhodes',
      'island-lesbos',
      'island-chios',
      'island-samos',
      'island-naxos',
      'island-milos',
    ];

    for (const islandId of requiredIslands) {
      const found = features.find((f) => f.id === islandId);
      expect(found, `Expected island ${islandId} to exist`).toBeDefined();
      expect(found!.isCollidable).toBe(true);
      expect(found!.collisionSegments.length).toBeGreaterThan(0);
    }
  });
});
