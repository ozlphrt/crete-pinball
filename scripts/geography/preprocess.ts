import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface Point2D {
  x: number;
  y: number;
}

interface LocalizedNames {
  en: string;
  tr: string;
  el: string;
}

interface CollisionSegment {
  id: string;
  p1: Point2D;
  p2: Point2D;
  normal: Point2D; // Outward pointing (towards water)
  length: number;
}

interface LinearRing extends Array<Point2D> {}

interface GeoPolygon {
  outerRing: LinearRing;
  holes: LinearRing[];
}

interface GeoMultiPolygon {
  polygons: GeoPolygon[];
}

interface IslandFeature {
  id: string;
  names: LocalizedNames;
  classification:
    | 'mainland_greece'
    | 'mainland_turkey'
    | 'crete'
    | 'ordinary_island'
    | 'special_island'
    | 'islet_visual_only';
  group: string;
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number };
  centroid: Point2D;
  areaWorldUnits: number;
  geometry: GeoMultiPolygon;
  collisionSegments: CollisionSegment[];
  isVisible: boolean;
  isCollidable: boolean;
  isTrackable: boolean;
}

// Bounding box of the Aegean arena in geographic coordinates
const GEO_BOUNDS = {
  minLon: 22.4,
  maxLon: 28.2,
  minLat: 34.5,
  maxLat: 41.3,
};

// Target world arena parameters (900 x 1600 portrait)
const ARENA = {
  worldWidth: 900,
  worldHeight: 1600,
  contentOffsetY: 120, // Leave top margin for HUD
  contentHeight: 1330,
};

// Conformal Mercator projection functions
function mercatorY(latDeg: number): number {
  const latRad = (latDeg * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
}

const minMercY = mercatorY(GEO_BOUNDS.minLat);
const maxMercY = mercatorY(GEO_BOUNDS.maxLat);
const deltaMercY = maxMercY - minMercY;
const deltaLonRad = ((GEO_BOUNDS.maxLon - GEO_BOUNDS.minLon) * Math.PI) / 180;

// Uniform metric scale (pixels per radian)
const METRIC_SCALE = ARENA.contentHeight / deltaMercY;
const contentWidth = deltaLonRad * METRIC_SCALE;
const contentOffsetX = (ARENA.worldWidth - contentWidth) / 2;

function projectLonLat(lon: number, lat: number): Point2D {
  const lonRad = ((lon - GEO_BOUNDS.minLon) * Math.PI) / 180;
  const mercY = mercatorY(lat);

  const x = contentOffsetX + lonRad * METRIC_SCALE;
  // Invert Y so North is up (-Y in screen/world)
  const y = ARENA.contentOffsetY + (maxMercY - mercY) * METRIC_SCALE;

  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
  };
}

// Ramer-Douglas-Peucker polygon simplification algorithm
function perpendicularDistance(pt: Point2D, lineStart: Point2D, lineEnd: Point2D): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const mag = Math.hypot(dx, dy);
  if (mag < 1e-6) {
    return Math.hypot(pt.x - lineStart.x, pt.y - lineStart.y);
  }
  return Math.abs(dy * pt.x - dx * pt.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / mag;
}

function rdpSimplify(points: Point2D[], epsilon: number): Point2D[] {
  if (points.length <= 3) return points;

  let maxDist = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const dist = perpendicularDistance(points[i]!, points[0]!, points[end]!);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const rec1 = rdpSimplify(points.slice(0, index + 1), epsilon);
    const rec2 = rdpSimplify(points.slice(index), epsilon);
    return rec1.slice(0, rec1.length - 1).concat(rec2);
  } else {
    return [points[0]!, points[end]!];
  }
}

// Compute outward normal pointing towards water for CCW polygon
function computeSegmentNormal(p1: Point2D, p2: Point2D): Point2D {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: 0, y: -1 };

  // For a polygon in screen coordinates (+Y down) with CCW vertices,
  // the right-hand perpendicular (dy / len, -dx / len) points outward towards exterior (water).
  return {
    x: Math.round((dy / len) * 1000) / 1000,
    y: Math.round((-dx / len) * 1000) / 1000,
  };
}

// Polygon area via shoelace formula
function computePolygonArea(ring: LinearRing): number {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const p1 = ring[i]!;
    const p2 = ring[i + 1]!;
    area += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(area) / 2;
}

// Polygon centroid
function computeCentroid(ring: LinearRing): Point2D {
  let cx = 0;
  let cy = 0;
  let areaFactor = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const p1 = ring[i]!;
    const p2 = ring[i + 1]!;
    const factor = p1.x * p2.y - p2.x * p1.y;
    cx += (p1.x + p2.x) * factor;
    cy += (p1.y + p2.y) * factor;
    areaFactor += factor;
  }
  if (Math.abs(areaFactor) < 1e-6) {
    return ring[0] ?? { x: 0, y: 0 };
  }
  const a3 = areaFactor * 3;
  return {
    x: Math.round((cx / a3) * 10) / 10,
    y: Math.round((cy / a3) * 10) / 10,
  };
}

// Catalog of known islands and their localized names and groups
interface IslandMetadata {
  id: string;
  names: LocalizedNames;
  group: string;
  isSpecial?: boolean;
}

const KNOWN_ISLANDS: Record<string, IslandMetadata> = {
  crete: {
    id: 'island-crete',
    names: { en: 'Crete', tr: 'Girit', el: 'Κρήτη' },
    group: 'crete_region',
  },
  euboea: {
    id: 'island-euboea',
    names: { en: 'Evia', tr: 'Eğriboz', el: 'Εύβοια' },
    group: 'sporades',
  },
  rhodes: {
    id: 'island-rhodes',
    names: { en: 'Rhodes', tr: 'Rodos', el: 'Ρόδος' },
    group: 'dodecanese',
    isSpecial: true,
  },
  lesbos: {
    id: 'island-lesbos',
    names: { en: 'Lesbos', tr: 'Midilli', el: 'Λέσβος' },
    group: 'north_aegean',
  },
  chios: {
    id: 'island-chios',
    names: { en: 'Chios', tr: 'Sakız', el: 'Χίος' },
    group: 'north_aegean',
  },
  samos: {
    id: 'island-samos',
    names: { en: 'Samos', tr: 'Sisam', el: 'Σάμος' },
    group: 'north_aegean',
  },
  lemnos: {
    id: 'island-lemnos',
    names: { en: 'Lemnos', tr: 'Limni', el: 'Λήμνος' },
    group: 'north_aegean',
  },
  kos: {
    id: 'island-kos',
    names: { en: 'Kos', tr: 'İstanköy', el: 'Κως' },
    group: 'dodecanese',
  },
  karpathos: {
    id: 'island-karpathos',
    names: { en: 'Karpathos', tr: 'Kerpe', el: 'Κάρπαθος' },
    group: 'dodecanese',
  },
  naxos: {
    id: 'island-naxos',
    names: { en: 'Naxos', tr: 'Nakşa', el: 'Νάξος' },
    group: 'cyclades',
  },
  andros: {
    id: 'island-andros',
    names: { en: 'Andros', tr: 'Andros', el: 'Άνδρος' },
    group: 'cyclades',
  },
  tinos: {
    id: 'island-tinos',
    names: { en: 'Tinos', tr: 'Tinos', el: 'Τήνος' },
    group: 'cyclades',
  },
  paros: {
    id: 'island-paros',
    names: { en: 'Paros', tr: 'Paros', el: 'Πάρος' },
    group: 'cyclades',
  },
  milos: {
    id: 'island-milos',
    names: { en: 'Milos', tr: 'Değirmenlik', el: 'Μήλος' },
    group: 'cyclades',
  },
  mykonos: {
    id: 'island-mykonos',
    names: { en: 'Mykonos', tr: 'Mikonos', el: 'Μύκονος' },
    group: 'cyclades',
    isSpecial: true,
  },
  syros: {
    id: 'island-syros',
    names: { en: 'Syros', tr: 'Siros', el: 'Σύρος' },
    group: 'cyclades',
  },
  santorini: {
    id: 'island-santorini',
    names: { en: 'Santorini', tr: 'Santorini', el: 'Σαντορίνη' },
    group: 'cyclades',
    isSpecial: true,
  },
  ios: {
    id: 'island-ios',
    names: { en: 'Ios', tr: 'İos', el: 'Ίος' },
    group: 'cyclades',
  },
  amorgos: {
    id: 'island-amorgos',
    names: { en: 'Amorgos', tr: 'Yamurgi', el: 'Αμοργός' },
    group: 'cyclades',
  },
  kalymnos: {
    id: 'island-kalymnos',
    names: { en: 'Kalymnos', tr: 'Kelemez', el: 'Κάλυμνος' },
    group: 'dodecanese',
  },
  patmos: {
    id: 'island-patmos',
    names: { en: 'Patmos', tr: 'Batnaz', el: 'Πάτμος' },
    group: 'dodecanese',
  },
  ikaria: {
    id: 'island-ikaria',
    names: { en: 'Ikaria', tr: 'Ahikerya', el: 'Ικαρία' },
    group: 'north_aegean',
  },
  thasos: {
    id: 'island-thasos',
    names: { en: 'Thasos', tr: 'Taşoz', el: 'Θάσος' },
    group: 'north_aegean',
  },
  samothrace: {
    id: 'island-samothrace',
    names: { en: 'Samothrace', tr: 'Semadirek', el: 'Σαμοθράκη' },
    group: 'north_aegean',
  },
  skyros: {
    id: 'island-skyros',
    names: { en: 'Skyros', tr: 'İskiri', el: 'Σκύρος' },
    group: 'sporades',
  },
  skopelos: {
    id: 'island-skopelos',
    names: { en: 'Skopelos', tr: 'İskopelos', el: 'Σκόπελος' },
    group: 'sporades',
  },
  skiathos: {
    id: 'island-skiathos',
    names: { en: 'Skiathos', tr: 'İskiato', el: 'Σκιάθος' },
    group: 'sporades',
  },
  astypalaia: {
    id: 'island-astypalaia',
    names: { en: 'Astypalaia', tr: 'İstanbulya', el: 'Αστυπάλαια' },
    group: 'dodecanese',
  },
  kasos: {
    id: 'island-kasos',
    names: { en: 'Kasos', tr: 'Kaşot', el: 'Κάσος' },
    group: 'dodecanese',
  },
  kythira: {
    id: 'island-kythira',
    names: { en: 'Kythira', tr: 'Çuha', el: 'Κύθηρα' },
    group: 'crete_region',
  },
  aegina: {
    id: 'island-aegina',
    names: { en: 'Aegina', tr: 'Egine', el: 'Αίγινα' },
    group: 'saronic',
  },
  salamis: {
    id: 'island-salamis',
    names: { en: 'Salamis', tr: 'Salamis', el: 'Σαλαμίνα' },
    group: 'saronic',
  },
};

// Match island to known catalog based on lon/lat bounding box
function identifyIsland(minLon: number, maxLon: number, minLat: number, maxLat: number): string | null {
  const width = maxLon - minLon;
  const height = maxLat - minLat;

  // Crete is the large southern island (width ~2.8 degrees)
  if (minLon > 23.4 && maxLon < 26.4 && minLat > 34.85 && maxLat < 35.75 && width > 2.0) return 'crete';
  if (minLon > 22.8 && maxLon < 24.6 && minLat > 37.9 && maxLat < 39.1 && width > 1.0) return 'euboea';
  if (minLon > 27.6 && maxLon < 28.3 && minLat > 35.8 && maxLat < 36.6 && width > 0.3) return 'rhodes';
  if (minLon > 25.8 && maxLon < 26.65 && minLat > 38.9 && maxLat < 39.4 && width > 0.5) return 'lesbos';
  if (minLon > 25.8 && maxLon < 26.3 && minLat > 38.15 && maxLat < 38.65 && width > 0.25) return 'chios';
  if (minLon > 26.55 && maxLon < 27.1 && minLat > 37.6 && maxLat < 37.85 && width > 0.3) return 'samos';
  if (minLon > 25.0 && maxLon < 25.5 && minLat > 39.75 && maxLat < 40.1 && width > 0.3) return 'lemnos';
  if (minLon > 26.85 && maxLon < 27.4 && minLat > 36.65 && maxLat < 36.95 && width > 0.2) return 'kos';
  if (minLon > 27.05 && maxLon < 27.3 && minLat > 35.38 && maxLat < 35.9 && height > 0.3) return 'karpathos';
  if (minLon > 25.3 && maxLon < 25.65 && minLat > 36.9 && maxLat < 37.25 && width > 0.15) return 'naxos';
  if (minLon > 24.65 && maxLon < 25.0 && minLat > 37.65 && maxLat < 38.05 && width > 0.2) return 'andros';
  if (minLon > 25.0 && maxLon < 25.3 && minLat > 37.5 && maxLat < 37.7 && width > 0.15) return 'tinos';
  if (minLon > 25.05 && maxLon < 25.32 && minLat > 36.95 && maxLat < 37.18 && width > 0.15) return 'paros';
  if (minLon > 24.3 && maxLon < 24.6 && minLat > 36.65 && maxLat < 36.8 && width > 0.15) return 'milos';
  if (minLon > 25.3 && maxLon < 25.5 && minLat > 37.4 && maxLat < 37.53 && width > 0.1) return 'mykonos';
  if (minLon > 24.85 && maxLon < 25.0 && minLat > 37.38 && maxLat < 37.52 && width > 0.1) return 'syros';
  if (minLon > 25.32 && maxLon < 25.5 && minLat > 36.33 && maxLat < 36.5 && width > 0.08) return 'santorini';
  if (minLon > 25.25 && maxLon < 25.42 && minLat > 36.68 && maxLat < 36.8 && width > 0.1) return 'ios';
  if (minLon > 25.75 && maxLon < 26.1 && minLat > 36.75 && maxLat < 37.0 && width > 0.15) return 'amorgos';
  if (minLon > 26.9 && maxLon < 27.1 && minLat > 36.9 && maxLat < 37.1 && width > 0.1) return 'kalymnos';
  if (minLon > 26.5 && maxLon < 26.62 && minLat > 37.28 && maxLat < 37.4 && width > 0.08) return 'patmos';
  if (minLon > 25.95 && maxLon < 26.4 && minLat > 37.5 && maxLat < 37.72 && width > 0.2) return 'ikaria';
  if (minLon > 24.5 && maxLon < 24.82 && minLat > 40.55 && maxLat < 40.82 && width > 0.2) return 'thasos';
  if (minLon > 25.45 && maxLon < 25.72 && minLat > 40.4 && maxLat < 40.55 && width > 0.2) return 'samothrace';
  if (minLon > 24.42 && maxLon < 24.72 && minLat > 38.75 && maxLat < 39.0 && width > 0.15) return 'skyros';
  if (minLon > 23.58 && maxLon < 23.85 && minLat > 39.08 && maxLat < 39.22 && width > 0.15) return 'skopelos';
  if (minLon > 23.42 && maxLon < 23.55 && minLat > 39.12 && maxLat < 39.2 && width > 0.1) return 'skiathos';
  if (minLon > 26.25 && maxLon < 26.5 && minLat > 36.48 && maxLat < 36.68 && width > 0.1) return 'astypalaia';
  if (minLon > 26.85 && maxLon < 27.02 && minLat > 35.35 && maxLat < 35.46 && width > 0.08) return 'kasos';
  if (minLon > 22.88 && maxLon < 23.12 && minLat > 36.12 && maxLat < 36.4 && width > 0.15) return 'kythira';
  if (minLon > 23.4 && maxLon < 23.6 && minLat > 37.68 && maxLat < 37.8 && width > 0.1) return 'aegina';
  if (minLon > 23.42 && maxLon < 23.58 && minLat > 37.9 && maxLat < 38.0 && width > 0.1) return 'salamis';
  return null;
}

interface RawFeature {
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
  properties?: Record<string, unknown>;
}

function processFeatures(): void {
  const landPath = path.resolve(process.cwd(), 'data/source/ne_10m_land.geojson');
  const rawLand = JSON.parse(fs.readFileSync(landPath, 'utf8'));

  const features: IslandFeature[] = [];
  let creteFeature: IslandFeature | null = null;
  let isletCounter = 1;

  // Process all polygons in Natural Earth land
  for (const f of rawLand.features as RawFeature[]) {
    const geom = f.geometry;
    const polyCoords = (geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates) as number[][][][];

    for (const poly of polyCoords) {
      const outerLonLat = poly[0]!;
      let minLon = 999, maxLon = -999, minLat = 999, maxLat = -999;
      let countIn = 0;

      for (const [lon, lat] of outerLonLat) {
        if (lon! < minLon) minLon = lon!;
        if (lon! > maxLon) maxLon = lon!;
        if (lat! < minLat) minLat = lat!;
        if (lat! > maxLat) maxLat = lat!;
        if (lon! >= GEO_BOUNDS.minLon && lon! <= GEO_BOUNDS.maxLon && lat! >= GEO_BOUNDS.minLat && lat! <= GEO_BOUNDS.maxLat) {
          countIn++;
        }
      }

      // Skip polygons entirely outside the Aegean bounding box
      if (countIn === 0 && (maxLon < GEO_BOUNDS.minLon || minLon > GEO_BOUNDS.maxLon || maxLat < GEO_BOUNDS.minLat || minLat > GEO_BOUNDS.maxLat)) {
        continue;
      }

      // Check if this is the massive Eurasian/African mainland
      const isContinentalMainland = outerLonLat.length > 5000 || (maxLon - minLon > 15 && maxLat - minLat > 15);

      if (isContinentalMainland) {
        // Clip mainland to Aegean arena
        // Separate into Mainland Greece (west) and Mainland Turkey (east)
        processMainlandPolygons(outerLonLat, features);
        continue;
      }

      // Project outer ring
      const projectedOuter: LinearRing = outerLonLat.map(([lon, lat]) => projectLonLat(lon!, lat!));
      const area = computePolygonArea(projectedOuter);

      // Skip microscopic noise
      if (area < 8) continue;

      // Project holes if any
      const projectedHoles: LinearRing[] = (poly.slice(1) || []).map((hole) =>
        hole.map(([lon, lat]) => projectLonLat(lon!, lat!)),
      );

      // RDP simplification for collision geometry
      const simplifiedOuter = rdpSimplify(projectedOuter, 1.5);
      const collisionSegments: CollisionSegment[] = [];
      for (let s = 0; s < simplifiedOuter.length - 1; s++) {
        const p1 = simplifiedOuter[s]!;
        const p2 = simplifiedOuter[s + 1]!;
        collisionSegments.push({
          id: `seg-${s}`,
          p1,
          p2,
          normal: computeSegmentNormal(p1, p2),
          length: Math.round(Math.hypot(p2.x - p1.x, p2.y - p1.y) * 100) / 100,
        });
      }

      // Compute bounding box in world units
      let minX = 9999, maxX = -9999, minY = 9999, maxY = -9999;
      for (const pt of projectedOuter) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }

      const centroid = computeCentroid(projectedOuter);
      const matchedKey = identifyIsland(minLon, maxLon, minLat, maxLat);

      let islandId: string;
      let names: LocalizedNames;
      let group: string;
      let classification: IslandFeature['classification'];
      let isCollidable = area >= 30; // Screen-space collision threshold

      if (matchedKey && KNOWN_ISLANDS[matchedKey]) {
        const meta = KNOWN_ISLANDS[matchedKey]!;
        islandId = meta.id;
        names = meta.names;
        group = meta.group;
        classification = matchedKey === 'crete' ? 'crete' : (meta.isSpecial ? 'special_island' : 'ordinary_island');
      } else {
        islandId = `islet-${isletCounter++}`;
        names = {
          en: `Aegean Islet ${isletCounter}`,
          tr: `Ege Adacığı ${isletCounter}`,
          el: `Νησίδα Αιγαίου ${isletCounter}`,
        };
        group = centroid.x < 450 ? 'cyclades' : 'dodecanese';
        classification = isCollidable ? 'ordinary_island' : 'islet_visual_only';
      }

      const feature: IslandFeature = {
        id: islandId,
        names,
        classification,
        group,
        boundingBox: { minX, minY, maxX, maxY },
        centroid,
        areaWorldUnits: Math.round(area),
        geometry: {
          polygons: [
            {
              outerRing: projectedOuter,
              holes: projectedHoles,
            },
          ],
        },
        collisionSegments,
        isVisible: true,
        isCollidable,
        isTrackable: isCollidable && classification !== 'islet_visual_only',
      };

      if (classification === 'crete') {
        const halfWidth = Math.max(Math.abs(minX - centroid.x), Math.abs(maxX - centroid.x));
        const halfHeight = Math.max(Math.abs(minY - centroid.y), Math.abs(maxY - centroid.y));
        const minPaddleX = Math.ceil(centroid.x - minX);
        const maxPaddleX = Math.floor(ARENA.worldWidth - (maxX - centroid.x));

        // Crete local coordinates centered around its centroid (0,0)
        const localOuterRing = projectedOuter.map((pt) => ({
          x: Math.round((pt.x - centroid.x) * 100) / 100,
          y: Math.round((pt.y - centroid.y) * 100) / 100,
        }));

        const localCollisionSegments = collisionSegments.map((seg) => ({
          id: seg.id,
          p1: {
            x: Math.round((seg.p1.x - centroid.x) * 100) / 100,
            y: Math.round((seg.p1.y - centroid.y) * 100) / 100,
          },
          p2: {
            x: Math.round((seg.p2.x - centroid.x) * 100) / 100,
            y: Math.round((seg.p2.y - centroid.y) * 100) / 100,
          },
          normal: seg.normal,
          length: seg.length,
        }));

        creteFeature = {
          ...feature,
          localGeometry: {
            outerRing: localOuterRing,
            holes: [],
          },
          localCollisionSegments,
          baselineY: 1460,
          halfWidth: Math.round(halfWidth * 100) / 100,
          halfHeight: Math.round(halfHeight * 100) / 100,
          minPaddleX,
          maxPaddleX,
        } as unknown as IslandFeature;
      } else {
        features.push(feature);
      }
    }
  }

  // Ensure Crete was found
  if (!creteFeature) {
    throw new Error('Fatal: Crete silhouette could not be identified from geographic dataset');
  }

  console.log(`Identified Crete: bbox [${creteFeature.boundingBox.minX}, ${creteFeature.boundingBox.minY}, ${creteFeature.boundingBox.maxX}, ${creteFeature.boundingBox.maxY}], area: ${creteFeature.areaWorldUnits}`);
  console.log(`Total features identified: ${features.length + 1} (1 Crete, ${features.filter(f => f.classification.includes('mainland')).length} Mainland sections, ${features.filter(f => f.classification.includes('island')).length} Islands, ${features.filter(f => f.classification === 'islet_visual_only').length} Visual-only islets)`);

  // Build manifest
  const manifest = {
    datasetId: 'natural-earth-10m-aegean',
    sourceUrl: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson',
    retrievalDate: new Date().toISOString(),
    license: 'Public Domain (Creative Commons Zero / CC0)',
    attribution: 'Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com.',
    geographicBounds: GEO_BOUNDS,
    projection: 'Conformal Mercator (WGS84 EPSG:4326 -> Metric Mercator -> Fixed Portrait Arena 900x1600)',
    arenaBounds: {
      worldWidth: ARENA.worldWidth,
      worldHeight: ARENA.worldHeight,
      escapeBoundaryY: 1580,
      creteBaselineY: 1460,
    },
    dataVersion: 1,
    deviationToleranceWorldUnits: 2.0,
    minCollidableAreaThreshold: 30,
    checksum: '',
  };

  const outputData = {
    manifest,
    crete: creteFeature,
    features,
  };

  // Compute checksum
  const jsonContent = JSON.stringify(outputData, null, 2);
  const checksum = crypto.createHash('sha256').update(jsonContent).digest('hex');
  outputData.manifest.checksum = checksum;

  const finalJson = JSON.stringify(outputData, null, 2);
  const outputPath = path.resolve(process.cwd(), 'src/assets/geography/aegean.json');
  fs.writeFileSync(outputPath, finalJson, 'utf8');

  console.log(`Successfully generated ${outputPath} (${(finalJson.length / 1024).toFixed(1)} KB, SHA-256: ${checksum.slice(0, 16)}...)`);
}

function processMainlandPolygons(outerLonLat: number[][], features: IslandFeature[]): void {
  // Extract continuous segments of mainland coastlines within or near the Aegean basin
  const slices: number[][][] = [];
  let currentSlice: number[][] = [];
  for (let i = 0; i < outerLonLat.length; i++) {
    const pt = outerLonLat[i]!;
    const lon = pt[0]!;
    const lat = pt[1]!;
    const inBasin = lon >= 21.5 && lon <= 29.0 && lat >= 34.0 && lat <= 42.0;
    if (inBasin) {
      currentSlice.push(pt);
    } else {
      if (currentSlice.length > 50) {
        slices.push(currentSlice);
      }
      currentSlice = [];
    }
  }
  if (currentSlice.length > 50) {
    slices.push(currentSlice);
  }

  const greeceSlice = slices.find((s) => s.some((pt) => pt[0]! < 23.5 && pt[1]! < 38.5));
  const turkeySlice = slices.find((s) => s.every((pt) => pt[0]! > 25.5));

  // Build Mainland Greece & North Aegean coastline
  if (greeceSlice && greeceSlice.length > 20) {
    const ptsGreece = greeceSlice.map(([lon, lat]) => projectLonLat(lon!, lat!));
    let firstInGr = 0;
    for (let i = 0; i < ptsGreece.length; i++) {
      if (ptsGreece[i]!.x <= ARENA.worldWidth) {
        firstInGr = i;
        break;
      }
    }
    let lastInGr = ptsGreece.length - 1;
    for (let i = firstInGr; i < ptsGreece.length; i++) {
      if (ptsGreece[i]!.x < 0) {
        lastInGr = i;
        break;
      }
    }

    const greeceCoast = ptsGreece.slice(firstInGr, lastInGr + 1);
    const simplified = rdpSimplify(greeceCoast, 2.0);

    // Close polygon around arena boundaries inland (North and West margins)
    const pStart = simplified[0]!;
    const pEnd = simplified[simplified.length - 1]!;
    const closedPoly: LinearRing = [
      ...simplified,
      { x: 0, y: pEnd.y },
      { x: 0, y: 0 },
      { x: ARENA.worldWidth, y: 0 },
      { x: ARENA.worldWidth, y: pStart.y },
      { x: pStart.x, y: pStart.y },
    ];

    const collisionSegments: CollisionSegment[] = [];
    for (let s = 0; s < simplified.length - 1; s++) {
      const p1 = simplified[s]!;
      const p2 = simplified[s + 1]!;
      collisionSegments.push({
        id: `mainland-gr-seg-${s}`,
        p1,
        p2,
        normal: computeSegmentNormal(p1, p2),
        length: Math.round(Math.hypot(p2.x - p1.x, p2.y - p1.y) * 100) / 100,
      });
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const pt of closedPoly) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }

    features.push({
      id: 'mainland-greece',
      names: { en: 'Mainland Greece', tr: 'Yunanistan Ana Karası', el: 'Ηπειρωτική Ελλάδα' },
      classification: 'mainland_greece',
      group: 'mainland',
      boundingBox: {
        minX: Math.round(minX * 100) / 100,
        minY: Math.round(minY * 100) / 100,
        maxX: Math.round(maxX * 100) / 100,
        maxY: Math.round(maxY * 100) / 100,
      },
      centroid: { x: 120, y: 500 },
      areaWorldUnits: Math.round(computePolygonArea(closedPoly)),
      geometry: { polygons: [{ outerRing: closedPoly, holes: [] }] },
      collisionSegments,
      isVisible: true,
      isCollidable: true,
      isTrackable: false,
    });
  }

  // Build Mainland Turkey coastline
  if (turkeySlice && turkeySlice.length > 20) {
    const ptsTurk = turkeySlice.map(([lon, lat]) => projectLonLat(lon!, lat!));
    let firstInTk = 0;
    for (let i = 0; i < ptsTurk.length; i++) {
      if (ptsTurk[i]!.x <= ARENA.worldWidth) {
        firstInTk = i;
        break;
      }
    }
    let lastInTk = ptsTurk.length - 1;
    for (let i = ptsTurk.length - 1; i >= 0; i--) {
      if (ptsTurk[i]!.x <= ARENA.worldWidth) {
        lastInTk = i;
        break;
      }
    }

    const turkCoast = ptsTurk.slice(firstInTk, lastInTk + 1);
    const simplified = rdpSimplify(turkCoast, 2.0);

    // Close polygon around eastern arena boundary inland
    const pStart = simplified[0]!;
    const pEnd = simplified[simplified.length - 1]!;
    const closedPoly: LinearRing = [
      ...simplified,
      { x: ARENA.worldWidth, y: pEnd.y },
      { x: ARENA.worldWidth, y: pStart.y },
      { x: pStart.x, y: pStart.y },
    ];

    const collisionSegments: CollisionSegment[] = [];
    for (let s = 0; s < simplified.length - 1; s++) {
      const p1 = simplified[s]!;
      const p2 = simplified[s + 1]!;
      collisionSegments.push({
        id: `mainland-tr-seg-${s}`,
        p1,
        p2,
        normal: computeSegmentNormal(p1, p2),
        length: Math.round(Math.hypot(p2.x - p1.x, p2.y - p1.y) * 100) / 100,
      });
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const pt of closedPoly) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }

    features.push({
      id: 'mainland-turkey',
      names: { en: 'Mainland Turkey', tr: 'Türkiye Ana Karası', el: 'Μικρά Ασία' },
      classification: 'mainland_turkey',
      group: 'mainland',
      boundingBox: {
        minX: Math.round(minX * 100) / 100,
        minY: Math.round(minY * 100) / 100,
        maxX: Math.round(maxX * 100) / 100,
        maxY: Math.round(maxY * 100) / 100,
      },
      centroid: { x: 820, y: 700 },
      areaWorldUnits: Math.round(computePolygonArea(closedPoly)),
      geometry: { polygons: [{ outerRing: closedPoly, holes: [] }] },
      collisionSegments,
      isVisible: true,
      isCollidable: true,
      isTrackable: false,
    });
  }
}

try {
  processFeatures();
} catch (err) {
  console.error(err);
  process.exit(1);
}
