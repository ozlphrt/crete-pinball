import { LinearRing, GeoPolygon, GeoMultiPolygon, IslandFeature } from './contracts';
import { BoundingBox, Point2D } from '../types';

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
}

/**
 * Calculates whether a linear ring has counter-clockwise (CCW) winding.
 * Standard GeoJSON RFC 7946 requires exterior rings to be CCW (right-hand rule).
 */
export function isRingCCW(ring: LinearRing): boolean {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const p1 = ring[i]!;
    const p2 = ring[i + 1]!;
    sum += (p2.x - p1.x) * (p2.y + p1.y);
  }
  return sum < 0;
}

/**
 * Validates a single linear ring:
 * - Must have at least 4 points (including closed first and last)
 * - First and last points must be identical (closed ring)
 * - All coordinates must be finite numbers
 */
export function validateLinearRing(ring: LinearRing, ringName = 'ring'): string[] {
  const errors: string[] = [];

  if (!Array.isArray(ring) || ring.length < 4) {
    errors.push(`${ringName} must contain at least 4 points (3 vertices + closure)`);
    return errors;
  }

  for (let i = 0; i < ring.length; i++) {
    const pt = ring[i];
    if (
      !pt ||
      typeof pt.x !== 'number' ||
      !Number.isFinite(pt.x) ||
      typeof pt.y !== 'number' ||
      !Number.isFinite(pt.y)
    ) {
      errors.push(`${ringName} point at index ${i} has invalid or non-finite coordinates`);
    }
  }

  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (Math.abs(first.x - last.x) > 1e-6 || Math.abs(first.y - last.y) > 1e-6) {
    errors.push(`${ringName} is not closed (first point !== last point)`);
  }

  return errors;
}

/**
 * Validates a GeoPolygon: outer ring must be valid and holes must be valid.
 */
export function validateGeoPolygon(polygon: GeoPolygon, index = 0): string[] {
  const errors: string[] = [];
  const outerErrors = validateLinearRing(polygon.outerRing, `polygon[${index}].outerRing`);
  errors.push(...outerErrors);

  if (polygon.holes) {
    for (let h = 0; h < polygon.holes.length; h++) {
      const hole = polygon.holes[h]!;
      const holeErrors = validateLinearRing(hole, `polygon[${index}].holes[${h}]`);
      errors.push(...holeErrors);
    }
  }

  return errors;
}

/**
 * Validates a GeoMultiPolygon.
 */
export function validateGeoMultiPolygon(multiPolygon: GeoMultiPolygon): ValidationResult {
  const errors: string[] = [];

  if (
    !multiPolygon ||
    !Array.isArray(multiPolygon.polygons) ||
    multiPolygon.polygons.length === 0
  ) {
    return {
      isValid: false,
      errors: ['MultiPolygon must contain at least one polygon'],
    };
  }

  for (let i = 0; i < multiPolygon.polygons.length; i++) {
    const poly = multiPolygon.polygons[i]!;
    errors.push(...validateGeoPolygon(poly, i));
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Computes bounding box for a linear ring.
 */
export function computeRingBoundingBox(ring: LinearRing): BoundingBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const pt of ring) {
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Validates an IslandFeature entity.
 */
export function validateIslandFeature(feature: IslandFeature): ValidationResult {
  const errors: string[] = [];

  if (!feature.id || typeof feature.id !== 'string' || feature.id.trim().length === 0) {
    errors.push('IslandFeature.id must be a non-empty string');
  }

  if (!feature.names?.en || !feature.names?.tr || !feature.names?.el) {
    errors.push('IslandFeature.names must contain valid en, tr, and el translations');
  }

  const geomResult = validateGeoMultiPolygon(feature.geometry);
  if (!geomResult.isValid) {
    errors.push(...geomResult.errors);
  }

  if (
    typeof feature.centroid?.x !== 'number' ||
    !Number.isFinite(feature.centroid.x) ||
    typeof feature.centroid?.y !== 'number' ||
    !Number.isFinite(feature.centroid.y)
  ) {
    errors.push('IslandFeature.centroid must have finite coordinates');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculates distance between two 2D points.
 */
export function distance2D(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}
