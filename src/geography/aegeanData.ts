import { IslandFeature, LinearRing, CollisionSegment } from './contracts';
import rawData from '../assets/geography/aegean.json';

export interface CretePaddleData extends IslandFeature {
  readonly localGeometry: {
    readonly outerRing: LinearRing;
    readonly holes: readonly LinearRing[];
  };
  readonly localCollisionSegments: readonly CollisionSegment[];
  readonly baselineY: number;
  readonly halfWidth: number;
  readonly halfHeight: number;
  readonly minPaddleX: number;
  readonly maxPaddleX: number;
}

export interface AegeanGeographyData {
  readonly manifest: {
    readonly datasetId: string;
    readonly sourceUrl: string;
    readonly retrievalDate: string;
    readonly license: string;
    readonly attribution: string;
    readonly geographicBounds: {
      readonly minLon: number;
      readonly maxLon: number;
      readonly minLat: number;
      readonly maxLat: number;
    };
    readonly projection: string;
    readonly arenaBounds: {
      readonly worldWidth: number;
      readonly worldHeight: number;
      readonly escapeBoundaryY: number;
      readonly creteBaselineY: number;
    };
    readonly dataVersion: number;
    readonly deviationToleranceWorldUnits: number;
    readonly minCollidableAreaThreshold: number;
    readonly checksum: string;
  };
  readonly crete: CretePaddleData;
  readonly features: readonly IslandFeature[];
}

export const AEGEAN_DATA: AegeanGeographyData = rawData as unknown as AegeanGeographyData;

/**
 * Returns the full Aegean geography dataset including manifest, Crete, and features.
 */
export function getAegeanDataset(): AegeanGeographyData {
  return AEGEAN_DATA;
}

/**
 * Returns all static land features (mainlands and islands, excluding movable Crete).
 */
export function getStaticFeatures(): readonly IslandFeature[] {
  return AEGEAN_DATA.features;
}

/**
 * Returns Crete paddle dataset.
 */
export function getCreteData(): CretePaddleData {
  return AEGEAN_DATA.crete;
}

/**
 * Finds a feature by stable island ID.
 */
export function findFeatureById(id: string): IslandFeature | CretePaddleData | undefined {
  if (AEGEAN_DATA.crete.id === id) {
    return AEGEAN_DATA.crete;
  }
  return AEGEAN_DATA.features.find((f) => f.id === id);
}

/**
 * Forward Mercator projection: converts WGS84 Lon/Lat to arena world coordinates.
 */
export function projectLonLat(lon: number, lat: number): { x: number; y: number } {
  const { geographicBounds, arenaBounds } = AEGEAN_DATA.manifest;
  const minMercY = Math.log(Math.tan(Math.PI / 4 + (geographicBounds.minLat * Math.PI) / 360));
  const maxMercY = Math.log(Math.tan(Math.PI / 4 + (geographicBounds.maxLat * Math.PI) / 360));
  const deltaMercY = maxMercY - minMercY;
  const contentHeight = 1330;
  const contentOffsetY = 120;
  const deltaLonRad = ((geographicBounds.maxLon - geographicBounds.minLon) * Math.PI) / 180;
  const metricScale = contentHeight / deltaMercY;
  const contentWidth = deltaLonRad * metricScale;
  const contentOffsetX = (arenaBounds.worldWidth - contentWidth) / 2;

  const lonRad = ((lon - geographicBounds.minLon) * Math.PI) / 180;
  const x = contentOffsetX + lonRad * metricScale;

  const latRad = (lat * Math.PI) / 180;
  const mercY = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = contentOffsetY + (maxMercY - mercY) * metricScale;

  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
  };
}

/**
 * Inverse Mercator projection: converts world coordinates back to WGS84 Lon/Lat.
 */
export function worldToLonLat(worldX: number, worldY: number): { lon: number; lat: number } {
  const { geographicBounds, arenaBounds } = AEGEAN_DATA.manifest;

  // Mercator projection parameters matching preprocess.ts
  const minMercY = Math.log(Math.tan(Math.PI / 4 + (geographicBounds.minLat * Math.PI) / 360));
  const maxMercY = Math.log(Math.tan(Math.PI / 4 + (geographicBounds.maxLat * Math.PI) / 360));
  const deltaMercY = maxMercY - minMercY;
  const contentHeight = 1330;
  const contentOffsetY = 120;
  const deltaLonRad = ((geographicBounds.maxLon - geographicBounds.minLon) * Math.PI) / 180;
  const metricScale = contentHeight / deltaMercY;
  const contentWidth = deltaLonRad * metricScale;
  const contentOffsetX = (arenaBounds.worldWidth - contentWidth) / 2;

  // Invert X -> Lon
  const lonRad = (worldX - contentOffsetX) / metricScale;
  const lon = geographicBounds.minLon + (lonRad * 180) / Math.PI;

  // Invert Y -> Lat
  const mercY = maxMercY - (worldY - contentOffsetY) / metricScale;
  const latRad = 2 * Math.atan(Math.exp(mercY)) - Math.PI / 2;
  const lat = (latRad * 180) / Math.PI;

  return {
    lon: Math.round(lon * 10000) / 10000,
    lat: Math.round(lat * 10000) / 10000,
  };
}
