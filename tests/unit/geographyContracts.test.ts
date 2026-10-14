import { describe, it, expect } from 'vitest';
import { getLocalizedIslandName, IslandFeature } from '../../src/geography/contracts';
import {
  isRingCCW,
  validateGeoMultiPolygon,
  validateLinearRing,
  validateIslandFeature,
} from '../../src/geography/validation';
import { makeIslandId } from '../../src/types';

describe('Geography Contracts & Validation', () => {
  it('preserves stable island IDs independently of localized labels', () => {
    const mockFeature: IslandFeature = {
      id: makeIslandId('island-crete-001'),
      names: {
        en: 'Crete',
        tr: 'Girit',
        el: 'Κρήτη',
      },
      classification: 'crete',
      group: 'crete_region',
      boundingBox: { minX: 100, minY: 1400, maxX: 800, maxY: 1520 },
      centroid: { x: 450, y: 1460 },
      areaWorldUnits: 36000,
      geometry: {
        polygons: [
          {
            outerRing: [
              { x: 100, y: 1460 },
              { x: 800, y: 1460 },
              { x: 800, y: 1500 },
              { x: 100, y: 1500 },
              { x: 100, y: 1460 },
            ],
            holes: [],
          },
        ],
      },
      collisionSegments: [],
      isVisible: true,
      isCollidable: true,
      isTrackable: true,
    };

    // ID remains constant
    expect(mockFeature.id).toBe('island-crete-001');

    // Name translations resolve correctly without changing ID
    expect(getLocalizedIslandName(mockFeature.names, 'en')).toBe('Crete');
    expect(getLocalizedIslandName(mockFeature.names, 'tr')).toBe('Girit');
    expect(getLocalizedIslandName(mockFeature.names, 'el')).toBe('Κρήτη');

    // Validation passes
    const validation = validateIslandFeature(mockFeature);
    expect(validation.isValid).toBe(true);
    expect(validation.errors.length).toBe(0);
  });

  it('detects unclosed linear rings', () => {
    const unclosedRing = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 50 }, // Not closed to (0,0)
    ];

    const errors = validateLinearRing(unclosedRing);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('not closed');
  });

  it('detects non-finite coordinate points', () => {
    const invalidRing = [
      { x: 0, y: 0 },
      { x: NaN, y: 100 },
      { x: 100, y: 100 },
      { x: 0, y: 0 },
    ];

    const errors = validateLinearRing(invalidRing);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('non-finite');
  });

  it('validates CCW winding for standard outer rings', () => {
    // CCW ring in standard coordinates: (0,0) -> (100,0) -> (100,100) -> (0,100) -> (0,0)
    const ccwRing = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
      { x: 0, y: 0 },
    ];
    expect(isRingCCW(ccwRing)).toBe(true);
  });

  it('rejects empty MultiPolygon', () => {
    const emptyGeom = { polygons: [] };
    const res = validateGeoMultiPolygon(emptyGeom);
    expect(res.isValid).toBe(false);
    expect(res.errors[0]).toContain('at least one polygon');
  });
});
