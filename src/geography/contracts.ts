import { BoundingBox, IslandId, Point2D, SupportedLocale } from '../types';

export type LandClassification =
  | 'mainland_greece'
  | 'mainland_turkey'
  | 'crete'
  | 'ordinary_island'
  | 'special_island'
  | 'islet_visual_only';

export type IslandGroup =
  | 'cyclades'
  | 'dodecanese'
  | 'north_aegean'
  | 'saronic'
  | 'sporades'
  | 'crete_region'
  | 'turkish_coast';

export interface LocalizedNames {
  readonly en: string;
  readonly tr: string;
  readonly el: string;
}

export type LinearRing = readonly Point2D[];

export interface GeoPolygon {
  readonly outerRing: LinearRing;
  readonly holes: readonly LinearRing[];
}

export interface GeoMultiPolygon {
  readonly polygons: readonly GeoPolygon[];
}

export interface CollisionSegment {
  readonly id: string;
  readonly p1: Point2D;
  readonly p2: Point2D;
  readonly normal: Point2D; // Outward-pointing normal (towards water)
  readonly length: number;
}

export interface IslandFeature {
  readonly id: IslandId;
  readonly names: LocalizedNames;
  readonly classification: LandClassification;
  readonly group: IslandGroup;
  readonly boundingBox: BoundingBox;
  readonly centroid: Point2D;
  readonly areaWorldUnits: number;
  readonly geometry: GeoMultiPolygon;
  readonly collisionSegments: readonly CollisionSegment[];

  // Participation flags:
  readonly isVisible: boolean;
  readonly isCollidable: boolean;
  readonly isTrackable: boolean;
}

export interface CreteRigidTransform {
  readonly baseCentroid: Point2D;
  readonly currentTranslationX: number;
  readonly minTranslationX: number;
  readonly maxTranslationX: number;
  readonly currentBounds: BoundingBox;
}

export interface GeographySourceManifest {
  readonly datasetId: string;
  readonly sourceUrl: string;
  readonly retrievalDate: string;
  readonly license: string;
  readonly attribution: string;
  readonly geographicBounds: {
    readonly minLon: number;
    readonly minLat: number;
    readonly maxLon: number;
    readonly maxLat: number;
  };
  readonly projectionDescription: string;
  readonly dataVersion: number;
  readonly checksum: string;
  readonly collidableMinPixelThreshold: number;
  readonly maxDeviationToleranceWorldUnits: number;
}

export interface DeviationBudgetReport {
  readonly islandId: IslandId;
  readonly visualSegmentCount: number;
  readonly collisionSegmentCount: number;
  readonly maxObservedDeviationWorldUnits: number;
  readonly allowedBudgetWorldUnits: number;
  readonly passesTolerance: boolean;
}

/**
 * Resolves localized name for an island with fallback to English.
 */
export function getLocalizedIslandName(names: LocalizedNames, locale: SupportedLocale): string {
  return names[locale] || names.en;
}
