import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

interface Point2D {
  x: number;
  y: number;
}

interface LinearRing extends Array<Point2D> {}

interface IslandFeature {
  id: string;
  classification: string;
  isCollidable?: boolean;
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number };
  centroid: Point2D;
  geometry: {
    polygons: Array<{
      outerRing: LinearRing;
      holes: LinearRing[];
    }>;
  };
  collisionSegments?: Array<{
    id: string;
    p1: Point2D;
    p2: Point2D;
    normal: Point2D;
    length: number;
  }>;
}

interface AegeanGeographyData {
  manifest: {
    arenaBounds: {
      worldWidth: number;
      worldHeight: number;
      escapeBoundaryY: number;
      creteBaselineY: number;
    };
  };
  crete: IslandFeature & {
    localGeometry: {
      outerRing: LinearRing;
      holes: LinearRing[];
    };
    localCollisionSegments?: Array<{
      id: string;
      p1: Point2D;
      p2: Point2D;
      normal: Point2D;
      length: number;
    }>;
    baselineY: number;
    halfWidth: number;
    halfHeight: number;
  };
  features: IslandFeature[];
}

function pointInPoly(x: number, y: number, ring: LinearRing): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]!.x,
      yi = ring[i]!.y;
    const xj = ring[j]!.x,
      yj = ring[j]!.y;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distToPolySq(x: number, y: number, ring: LinearRing): number {
  let minD2 = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const p1 = ring[i]!,
      p2 = ring[j]!;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((x - p1.x) * dx + (y - p1.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const px = p1.x + t * dx;
    const py = p1.y + t * dy;
    const d2 = (x - px) * (x - px) + (y - py) * (y - py);
    if (d2 < minD2) minD2 = d2;
  }
  return minD2;
}

function distToSegmentsSq(
  x: number,
  y: number,
  segs: Array<{ p1: Point2D; p2: Point2D }>,
): number {
  let minD2 = Infinity;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]!;
    const dx = s.p2.x - s.p1.x;
    const dy = s.p2.y - s.p1.y;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((x - s.p1.x) * dx + (y - s.p1.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const px = s.p1.x + t * dx;
    const py = s.p1.y + t * dy;
    const d2 = (x - px) * (x - px) + (y - py) * (y - py);
    if (d2 < minD2) minD2 = d2;
  }
  return minD2;
}

// Real Earth Satellite Digital Elevation Model (SRTM / Mapzen DEM)
const cacheDir = path.resolve('src/assets/geography/dem_cache');
const demGrid = new Float32Array(1024 * 1024);

function loadDemGrid(): void {
  for (let tx = 0; tx < 4; tx++) {
    const x = 71 + tx;
    for (let ty = 0; ty < 4; ty++) {
      const y = 47 + ty;
      const file = path.join(cacheDir, `7_${x}_${y}.png`);
      if (!fs.existsSync(file)) {
        throw new Error(`Missing DEM tile: ${file}. Please run DEM tile downloader.`);
      }
      const png = PNG.sync.read(fs.readFileSync(file));
      for (let py = 0; py < 256; py++) {
        const gy = ty * 256 + py;
        for (let px = 0; px < 256; px++) {
          const gx = tx * 256 + px;
          const idx = (256 * py + px) << 2;
          const r = png.data[idx]!;
          const g = png.data[idx + 1]!;
          const b = png.data[idx + 2]!;
          const ele = r * 256 + g + b / 256 - 32768;
          demGrid[1024 * gy + gx] = ele;
        }
      }
    }
  }
}

const GEO_BOUNDS = { minLon: 22.4, maxLon: 28.2, minLat: 34.5, maxLat: 41.3 };
const ARENA = { worldWidth: 900, worldHeight: 1600, contentOffsetY: 120, contentHeight: 1330 };
function mercatorY(latDeg: number): number {
  const latRad = (latDeg * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
}
const minMercY = mercatorY(GEO_BOUNDS.minLat);
const maxMercY = mercatorY(GEO_BOUNDS.maxLat);
const deltaMercY = maxMercY - minMercY;
const deltaLonRad = ((GEO_BOUNDS.maxLon - GEO_BOUNDS.minLon) * Math.PI) / 180;
const METRIC_SCALE = ARENA.contentHeight / deltaMercY;
const contentWidth = deltaLonRad * METRIC_SCALE;
const contentOffsetX = (ARENA.worldWidth - contentWidth) / 2;

function unprojectWorld(x: number, y: number): { lon: number; lat: number } {
  const lonRad = (x - contentOffsetX) / METRIC_SCALE;
  const lon = GEO_BOUNDS.minLon + (lonRad * 180) / Math.PI;
  const mercY = maxMercY - (y - ARENA.contentOffsetY) / METRIC_SCALE;
  const latRad = 2 * Math.atan(Math.exp(mercY)) - Math.PI / 2;
  const lat = (latRad * 180) / Math.PI;
  return { lon, lat };
}

function getElevation(lon: number, lat: number): number {
  const tileX = ((lon + 180) / 360) * 128;
  const gx = (tileX - 71) * 256;
  const latRad = (lat * Math.PI) / 180;
  const tileY = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * 128;
  const gy = (tileY - 47) * 256;

  const ix = Math.max(0, Math.min(1022, Math.floor(gx)));
  const iy = Math.max(0, Math.min(1022, Math.floor(gy)));
  const fx = gx - ix;
  const fy = gy - iy;

  const e00 = demGrid[1024 * iy + ix]!;
  const e10 = demGrid[1024 * iy + ix + 1]!;
  const e01 = demGrid[1024 * (iy + 1) + ix]!;
  const e11 = demGrid[1024 * (iy + 1) + ix + 1]!;

  return (e00 * (1 - fx) + e10 * fx) * (1 - fy) + (e01 * (1 - fx) + e11 * fx) * fy;
}

function getElevationAtWorld(wx: number, wy: number): number {
  const { lon, lat } = unprojectWorld(wx, wy);
  return Math.max(0, getElevation(lon, lat));
}

interface ColorStop {
  v: number;
  r: number;
  g: number;
  b: number;
}

// Continuous hypsometric elevation color ramp
// High-contrast Mediterranean mountain relief mapping continuous shade v in [0, 1]
const TERRAIN_COLOR_RAMP: ColorStop[] = [
  { v: 0.0, r: 6, g: 13, b: 24 }, // Deepest shadowed canyon
  { v: 0.15, r: 12, g: 26, b: 48 }, // Coastal lowlands / valley floors
  { v: 0.35, r: 24, g: 54, b: 94 }, // Rolling hills & moderate plateaus
  { v: 0.55, r: 46, g: 96, b: 152 }, // Mountain slopes
  { v: 0.75, r: 76, g: 148, b: 215 }, // High alpine ridges
  { v: 1.0, r: 130, g: 205, b: 255 }, // Sunlit summits & mountain peaks
];

// Mediterranean Daylight Hypsometric Color Ramp (Sun-drenched Aegean Summer)
const DAYLIGHT_TERRAIN_COLOR_RAMP: ColorStop[] = [
  { v: 0.0, r: 48, g: 54, b: 36 }, // Deep Mediterranean gorge & ravine shadows (olive-umber)
  { v: 0.15, r: 92, g: 122, b: 64 }, // Coastal plains, olive groves & fertile macchia (Mediterranean green)
  { v: 0.35, r: 172, g: 138, b: 76 }, // Rolling plateaus & sun-baked terracotta earth
  { v: 0.55, r: 210, g: 192, b: 162 }, // Limestone cliffs & mountain slopes (warm beige)
  { v: 0.75, r: 236, g: 228, b: 216 }, // High barren limestone ridges
  { v: 1.0, r: 254, g: 252, b: 248 }, // Brilliant sunlit alpine summits (White Mountains, Olympus)
];

function sampleTerrainRamp(val: number): [number, number, number] {
  const v = Math.max(0, Math.min(1, val));
  for (let i = 0; i < TERRAIN_COLOR_RAMP.length - 1; i++) {
    const c0 = TERRAIN_COLOR_RAMP[i]!;
    const c1 = TERRAIN_COLOR_RAMP[i + 1]!;
    if (v >= c0.v && v <= c1.v) {
      const t = (v - c0.v) / (c1.v - c0.v);
      const st = t * t * (3 - 2 * t);
      return [
        Math.round(c0.r + (c1.r - c0.r) * st),
        Math.round(c0.g + (c1.g - c0.g) * st),
        Math.round(c0.b + (c1.b - c0.b) * st),
      ];
    }
  }
  const last = TERRAIN_COLOR_RAMP[TERRAIN_COLOR_RAMP.length - 1]!;
  return [last.r, last.g, last.b];
}

function sampleDaylightTerrainRamp(val: number): [number, number, number] {
  const v = Math.max(0, Math.min(1, val));
  for (let i = 0; i < DAYLIGHT_TERRAIN_COLOR_RAMP.length - 1; i++) {
    const c0 = DAYLIGHT_TERRAIN_COLOR_RAMP[i]!;
    const c1 = DAYLIGHT_TERRAIN_COLOR_RAMP[i + 1]!;
    if (v >= c0.v && v <= c1.v) {
      const t = (v - c0.v) / (c1.v - c0.v);
      const st = t * t * (3 - 2 * t);
      return [
        Math.round(c0.r + (c1.r - c0.r) * st),
        Math.round(c0.g + (c1.g - c0.g) * st),
        Math.round(c0.b + (c1.b - c0.b) * st),
      ];
    }
  }
  const last = DAYLIGHT_TERRAIN_COLOR_RAMP[DAYLIGHT_TERRAIN_COLOR_RAMP.length - 1]!;
  return [last.r, last.g, last.b];
}

function computeTerrainShade(h0: number, slopeX: number, slopeY: number): number {
  // Continuous normalized elevation with perceptual power curve
  // Captures foothills (200-600m), mountain massifs (1000-1800m), and peaks (>2000m)
  const hNorm = Math.max(0, Math.min(1, Math.pow(Math.max(0, h0) / 2200, 0.72)));

  // Multi-directional Lambertian hillshading with tactile Swiss-style relief exaggeration
  const zFactor = 6.8;
  const nx = -slopeX * zFactor;
  const ny = -slopeY * zFactor;
  const nz = 1.0;
  const len = Math.sqrt(nx * nx + ny * ny + 1.0);
  const normX = nx / len;
  const normY = ny / len;
  const normZ = nz / len;

  // Primary NW illumination (azimuth 315 deg, altitude 45 deg)
  const diff1 = Math.max(0, normX * -0.5 + normY * -0.5 + normZ * 0.7071);

  // Secondary SE fill light (azimuth 135 deg, altitude 55 deg) to soften deep shadows
  const diff2 = Math.max(0, normX * 0.4 + normY * 0.4 + normZ * 0.819);

  // Combined hillshade factor (flat terrain = ~0.735)
  const hillshade = 0.75 * diff1 + 0.25 * diff2;

  // Relief modulation relative to flat terrain with strong contrast amplification
  const reliefMod = (hillshade - 0.735) * 1.85;

  // Base elevation hypsometry: lowlands start around 0.12, high peaks reach 0.65
  const baseElev = 0.12 + hNorm * 0.53;

  // Continuous shade spanning the full dynamic range [0.0, 1.0]
  const continuousVal = Math.max(0, Math.min(1, baseElev + reliefMod));

  return continuousVal;
}

async function run() {
  console.log('Loading real Aegean Digital Elevation Model (DEM)...');
  loadDemGrid();

  console.log('Generating Aegean visual assets from Natural Earth geography...');
  const geoPath = path.resolve('src/assets/geography/aegean.json');
  const aegean: AegeanGeographyData = JSON.parse(fs.readFileSync(geoPath, 'utf8'));

  const W = 900;
  const H = 1600;

  // 1. Generate Aegean Background (Deep Midnight Sea, Clean & Free of Distracting Lines)
  console.log('1. Generating clean deep Aegean sea background...');
  const bgPng = new PNG({ width: W, height: H });

  const compassX = 160;
  const compassY = 1115;

  for (let y = 0; y < H; y++) {
    const t = y / H;
    // Base sea color: dark oceanic navy gradient
    const r = Math.round(2 + t * 4);
    const g = Math.round(8 + t * 11);
    const b = Math.round(20 + t * 20);

    for (let x = 0; x < W; x++) {
      const idx = (W * y + x) << 2;

      let pxR = r;
      let pxG = g;
      let pxB = b;

      // Subtle atmospheric cloud mist around bottom left (Crete / Peloponnese sea)
      const cloudDist = Math.sqrt((x - 80) * (x - 80) + (y - 1480) * (y - 1480));
      if (cloudDist < 300) {
        const mist = (1 - cloudDist / 300) * 0.12;
        pxR = Math.round(pxR + 35 * mist);
        pxG = Math.round(pxG + 55 * mist);
        pxB = Math.round(pxB + 85 * mist);
      }

      // Subtle atmospheric cloud mist around top left
      const tlCloud = Math.sqrt(x * x + (y - 100) * (y - 100));
      if (tlCloud < 250) {
        const mist = (1 - tlCloud / 250) * 0.1;
        pxR = Math.round(pxR + 30 * mist);
        pxG = Math.round(pxG + 48 * mist);
        pxB = Math.round(pxB + 75 * mist);
      }

      bgPng.data[idx] = Math.min(255, pxR);
      bgPng.data[idx + 1] = Math.min(255, pxG);
      bgPng.data[idx + 2] = Math.min(255, pxB);
      bgPng.data[idx + 3] = 255;
    }
  }

  // 2. Generate Realistic Geographical Terrain Layer using Real Satellite DEM
  console.log('2. Generating real DEM geographical terrain layer (nocturnal, daylight, and normal/elevation)...');
  const terrainPng = new PNG({ width: W, height: H });
  terrainPng.data.fill(0);

  const terrainDaylightPng = new PNG({ width: W, height: H });
  terrainDaylightPng.data.fill(0);

  const terrainNormalPng = new PNG({ width: W, height: H });
  for (let i = 0; i < W * H; i++) {
    const idx = i << 2;
    terrainNormalPng.data[idx] = 128;     // Nx = 0
    terrainNormalPng.data[idx + 1] = 128; // Ny = 0
    terrainNormalPng.data[idx + 2] = 255; // Nz = 1.0 (flat vertical normal)
    terrainNormalPng.data[idx + 3] = 0;   // Elevation = 0 (sea level)
  }

  for (const feat of aegean.features) {
    const isVisualOnly = feat.isCollidable === false || feat.classification === 'islet_visual_only';
    const isMainland = feat.classification.includes('mainland');
    const isSpecial = feat.classification === 'special_island';

    // For collidable islands, use the exact polygon formed by collision segments
    // so visual boundary strictly equals the physical collision boundary.
    let ring: LinearRing;
    let segs: Array<{ p1: Point2D; p2: Point2D }> = [];

    if (isVisualOnly) {
      ring = feat.geometry.polygons[0]?.outerRing ?? [];
    } else if (isMainland) {
      ring = feat.geometry.polygons[0]?.outerRing ?? [];
      segs = feat.collisionSegments ?? [];
    } else {
      if (feat.collisionSegments && feat.collisionSegments.length >= 3) {
        ring = feat.collisionSegments.map((s) => s.p1);
        segs = feat.collisionSegments;
      } else {
        ring = feat.geometry.polygons[0]?.outerRing ?? [];
        segs = [];
      }
    }

    if (!ring || ring.length < 3) continue;

    const box = feat.boundingBox;
    // Bounding box with padding for soft subtle coastline rim
    const glowRadius = 4.0;
    const minPxX = Math.max(0, Math.floor(box.minX - glowRadius - 1));
    const maxPxX = Math.min(W - 1, Math.ceil(box.maxX + glowRadius + 1));
    const minPxY = Math.max(0, Math.floor(box.minY - glowRadius - 1));
    const maxPxY = Math.min(H - 1, Math.ceil(box.maxY + glowRadius + 1));

    for (let py = minPxY; py <= maxPxY; py++) {
      for (let px = minPxX; px <= maxPxX; px++) {
        const inside = pointInPoly(px, py, ring);
        const outIdx = (W * py + px) << 2;

        if (isVisualOnly) {
          // Visual-only islets: subtle, dark submerged reefs/shoals in night; sunlit turquoise in daylight.
          if (inside) {
            const d2 = distToPolySq(px, py, ring);
            const dist = Math.sqrt(d2);
            const coastRise = Math.min(1, Math.sqrt(dist) / 3.0);
            let trR = 7;
            let trG = 14;
            let trB = 26;
            if (dist < 1.2) {
              trR = 12;
              trG = 22;
              trB = 38;
            }
            terrainPng.data[outIdx] = trR;
            terrainPng.data[outIdx + 1] = trG;
            terrainPng.data[outIdx + 2] = trB;
            terrainPng.data[outIdx + 3] = Math.round(180 + coastRise * 60);

            // Daylight: sunlit turquoise shallow sandbank
            terrainDaylightPng.data[outIdx] = 20;
            terrainDaylightPng.data[outIdx + 1] = 162;
            terrainDaylightPng.data[outIdx + 2] = 176;
            terrainDaylightPng.data[outIdx + 3] = Math.round(180 + coastRise * 65);
          }
          continue;
        }

        // Collidable features (mainlands and islands)
        const d2 = segs.length > 0 ? distToSegmentsSq(px, py, segs) : distToPolySq(px, py, ring);
        const dist = Math.sqrt(d2);

        if (inside) {
          // Sample real satellite Digital Elevation Model (DEM)
          const h0 = getElevationAtWorld(px, py);
          const hX1 = getElevationAtWorld(px + 1, py);
          const hX0 = getElevationAtWorld(px - 1, py);
          const hY1 = getElevationAtWorld(px, py + 1);
          const hY0 = getElevationAtWorld(px, py - 1);

          // Metric slope gradient: 2 arena pixels = 1140m
          const slopeX = (hX1 - hX0) / 1140;
          const slopeY = (hY1 - hY0) / 1140;

          // Continuous elevation model: shades of 0 and 1
          const shadeValue = computeTerrainShade(h0, slopeX, slopeY);

          // 1. Nocturnal terrain coloring
          let [trR, trG, trB] = sampleTerrainRamp(shadeValue);

          // Refined Coastal Edge & Subtle Inward Ambient Glow
          if (dist < 3.0) {
            const innerGlowNorm = dist / 3.0;
            const innerBloom = Math.pow(1 - innerGlowNorm, 1.8) * 0.22;
            trR = Math.round(trR * (1 - innerBloom) + 16 * innerBloom);
            trG = Math.round(trG * (1 - innerBloom) + 85 * innerBloom);
            trB = Math.round(trB * (1 - innerBloom) + 140 * innerBloom);

            if (dist < 1.3) {
              const coreNorm = dist / 1.3;
              const coreHighlight = Math.pow(1 - coreNorm, 1.2) * 0.72;
              trR = Math.round(trR * (1 - coreHighlight) + 56 * coreHighlight);
              trG = Math.round(trG * (1 - coreHighlight) + 189 * coreHighlight);
              trB = Math.round(trB * (1 - coreHighlight) + 248 * coreHighlight);
            }
          }

          terrainPng.data[outIdx] = Math.min(255, trR);
          terrainPng.data[outIdx + 1] = Math.min(255, trG);
          terrainPng.data[outIdx + 2] = Math.min(255, trB);
          terrainPng.data[outIdx + 3] = 255;

          // 2. Mediterranean Daylight terrain coloring (revealed during thunderstorm lightning)
          const [dlR, dlG, dlB] = sampleDaylightTerrainRamp(shadeValue);
          let dayR = dlR;
          let dayG = dlG;
          let dayB = dlB;

          // Sunlit sandy limestone beach edge
          if (dist < 2.2) {
            const edgeT = dist / 2.2;
            const sandHighlight = Math.pow(1 - edgeT, 1.2) * 0.40;
            dayR = Math.round(dayR * (1 - sandHighlight) + 242 * sandHighlight);
            dayG = Math.round(dayG * (1 - sandHighlight) + 225 * sandHighlight);
            dayB = Math.round(dayB * (1 - sandHighlight) + 175 * sandHighlight);
          }

          terrainDaylightPng.data[outIdx] = Math.min(255, dayR);
          terrainDaylightPng.data[outIdx + 1] = Math.min(255, dayG);
          terrainDaylightPng.data[outIdx + 2] = Math.min(255, dayB);
          terrainDaylightPng.data[outIdx + 3] = 255;

          // 3. Normal Vector & Normalized Elevation Map
          const zFactor = 8.5; // Exaggerated relief slope for crisp dynamic mountain shadows
          let nx = -slopeX * zFactor;
          let ny = -slopeY * zFactor;
          let nz = 1.0;
          if (dist < 3.0) {
            const coastT = dist / 3.0;
            nz = Math.max(0.3, nz * coastT);
          }
          const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
          nx /= nLen;
          ny /= nLen;
          nz /= nLen;

          terrainNormalPng.data[outIdx] = Math.round((nx * 0.5 + 0.5) * 255);
          terrainNormalPng.data[outIdx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
          terrainNormalPng.data[outIdx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
          const elevNorm = Math.max(0, Math.min(255, Math.round((Math.max(0, h0) / 2500) * 255)));
          terrainNormalPng.data[outIdx + 3] = elevNorm;
        } else if (dist < 3.8) {
          // Nocturnal oceanic rim radiating into the sea
          if (dist < 3.2) {
            const normDist = dist / 3.2;
            const bloomAlpha = Math.pow(1 - normDist, 1.8) * 0.42;
            const colorT = Math.min(1, dist / 2.0);
            const glowR = Math.round(24 * (1 - colorT) + 6 * colorT);
            const glowG = Math.round(140 * (1 - colorT) + 45 * colorT);
            const glowB = Math.round(215 * (1 - colorT) + 115 * colorT);

            const existingA = terrainPng.data[outIdx + 3]! / 255;
            if (existingA < 0.99) {
              const combinedAlpha = Math.min(0.38, existingA + bloomAlpha * (1 - existingA * 0.5));
              const w1 = existingA / (combinedAlpha || 1);
              const w2 = (bloomAlpha * (1 - existingA * 0.5)) / (combinedAlpha || 1);
              terrainPng.data[outIdx] = Math.round(terrainPng.data[outIdx]! * w1 + glowR * w2);
              terrainPng.data[outIdx + 1] = Math.round(terrainPng.data[outIdx + 1]! * w1 + glowG * w2);
              terrainPng.data[outIdx + 2] = Math.round(terrainPng.data[outIdx + 2]! * w1 + glowB * w2);
              terrainPng.data[outIdx + 3] = Math.round(255 * combinedAlpha);
            }
          }

          // Daylight coastal shallows: crystal Mediterranean aquamarine / turquoise reef
          const normDistDay = dist / 3.8;
          const reefAlpha = Math.pow(1 - normDistDay, 1.5) * 0.70;
          const colorTDay = Math.min(1, dist / 2.2);
          const reefR = Math.round(18 * (1 - colorTDay) + 14 * colorTDay);
          const reefG = Math.round(185 * (1 - colorTDay) + 145 * colorTDay);
          const reefB = Math.round(195 * (1 - colorTDay) + 220 * colorTDay);

          const existingDayA = terrainDaylightPng.data[outIdx + 3]! / 255;
          if (existingDayA < 0.99) {
            const combinedAlphaDay = Math.min(0.60, existingDayA + reefAlpha * (1 - existingDayA * 0.5));
            const w1 = existingDayA / (combinedAlphaDay || 1);
            const w2 = (reefAlpha * (1 - existingDayA * 0.5)) / (combinedAlphaDay || 1);
            terrainDaylightPng.data[outIdx] = Math.round(terrainDaylightPng.data[outIdx]! * w1 + reefR * w2);
            terrainDaylightPng.data[outIdx + 1] = Math.round(terrainDaylightPng.data[outIdx + 1]! * w1 + reefG * w2);
            terrainDaylightPng.data[outIdx + 2] = Math.round(terrainDaylightPng.data[outIdx + 2]! * w1 + reefB * w2);
            terrainDaylightPng.data[outIdx + 3] = Math.round(255 * combinedAlphaDay);
          }
        }
      }
    }
  }

  // 3. Generate Crete Paddle Sprite using Real Satellite DEM of Crete
  console.log('3. Generating Crete paddle sprite with real DEM mountain relief...');
  const crete = aegean.crete;
  const creteSegs =
    crete.localCollisionSegments && crete.localCollisionSegments.length >= 3
      ? crete.localCollisionSegments
      : [];
  const creteRing =
    creteSegs.length >= 3
      ? creteSegs.map((s) => s.p1)
      : crete.localGeometry.outerRing;

  const creteW = Math.ceil(crete.halfWidth * 2);
  const creteH = Math.ceil(crete.halfHeight * 2);
  const padScale = 2; // 2x Retina resolution
  const spriteW = (creteW + 24) * padScale;
  const spriteH = (creteH + 24) * padScale;
  const cretePng = new PNG({ width: spriteW, height: spriteH });
  cretePng.data.fill(0);

  for (let sy = 0; sy < spriteH; sy++) {
    const ly = sy / padScale - 12 - crete.halfHeight;
    const py = ly;

    for (let sx = 0; sx < spriteW; sx++) {
      const lx = sx / padScale - 12 - crete.halfWidth;
      const px = lx;

      const inside = pointInPoly(px, py, creteRing);
      const d2 =
        creteSegs.length > 0 ? distToSegmentsSq(px, py, creteSegs) : distToPolySq(px, py, creteRing);
      const dist = Math.sqrt(d2);

      const outIdx = (spriteW * sy + sx) << 2;

      if (inside) {
        // Map local coordinate (px, py) to Crete's actual geographic world position
        const worldX = crete.centroid.x + px;
        const worldY = crete.centroid.y + py;

        const h0 = getElevationAtWorld(worldX, worldY);
        const hX1 = getElevationAtWorld(worldX + 1, worldY);
        const hX0 = getElevationAtWorld(worldX - 1, worldY);
        const hY1 = getElevationAtWorld(worldX, worldY + 1);
        const hY0 = getElevationAtWorld(worldX, worldY - 1);

        const slopeX = (hX1 - hX0) / 1140;
        const slopeY = (hY1 - hY0) / 1140;

        // Continuous elevation model: shades of 0 and 1
        const shadeValue = computeTerrainShade(h0, slopeX, slopeY);
        let [cR, cG, cB] = sampleTerrainRamp(shadeValue);

        // Refined Coastline Rim on Crete
        const isNorth = py < -8;
        if (isNorth) {
          // Northern defense rim: refined metallic golden edge
          if (dist < 3.2) {
            const innerGlowNorm = dist / 3.2;
            const innerBloom = Math.pow(1 - innerGlowNorm, 1.8) * 0.30;
            cR = Math.round(cR * (1 - innerBloom) + 180 * innerBloom);
            cG = Math.round(cG * (1 - innerBloom) + 125 * innerBloom);
            cB = Math.round(cB * (1 - innerBloom) + 30 * innerBloom);

            if (dist < 1.2) {
              const coreNorm = dist / 1.2;
              const coreHighlight = Math.pow(1 - coreNorm, 1.3) * 0.45;
              cR = Math.round(cR * (1 - coreHighlight) + 235 * coreHighlight);
              cG = Math.round(cG * (1 - coreHighlight) + 180 * coreHighlight);
              cB = Math.round(cB * (1 - coreHighlight) + 65 * coreHighlight);
            }
          }
        } else {
          // Southern / eastern / western shores: refined marine cyan edge
          if (dist < 3.0) {
            const innerGlowNorm = dist / 3.0;
            const innerBloom = Math.pow(1 - innerGlowNorm, 1.8) * 0.22;
            cR = Math.round(cR * (1 - innerBloom) + 16 * innerBloom);
            cG = Math.round(cG * (1 - innerBloom) + 85 * innerBloom);
            cB = Math.round(cB * (1 - innerBloom) + 140 * innerBloom);

            if (dist < 1.1) {
              const coreNorm = dist / 1.1;
              const coreHighlight = Math.pow(1 - coreNorm, 1.3) * 0.38;
              cR = Math.round(cR * (1 - coreHighlight) + 38 * coreHighlight);
              cG = Math.round(cG * (1 - coreHighlight) + 145 * coreHighlight);
              cB = Math.round(cB * (1 - coreHighlight) + 195 * coreHighlight);
            }
          }
        }

        cretePng.data[outIdx] = Math.min(255, cR);
        cretePng.data[outIdx + 1] = Math.min(255, cG);
        cretePng.data[outIdx + 2] = Math.min(255, cB);
        cretePng.data[outIdx + 3] = 255;
      } else if (dist < 3.2) {
        // Outer subtle rim on Crete into surrounding sea
        const isNorth = py < -8;
        const normDist = dist / 3.2;
        const bloomAlpha = Math.pow(1 - normDist, 2.2) * (isNorth ? 0.35 : 0.28);

        let glowR: number, glowG: number, glowB: number;
        if (isNorth) {
          const colorT = Math.min(1, dist / 2.0);
          glowR = Math.round(210 * (1 - colorT) + 120 * colorT);
          glowG = Math.round(155 * (1 - colorT) + 80 * colorT);
          glowB = Math.round(45 * (1 - colorT) + 15 * colorT);
        } else {
          const colorT = Math.min(1, dist / 2.0);
          glowR = Math.round(20 * (1 - colorT) + 6 * colorT);
          glowG = Math.round(110 * (1 - colorT) + 45 * colorT);
          glowB = Math.round(175 * (1 - colorT) + 115 * colorT);
        }

        const existingA = cretePng.data[outIdx + 3]! / 255;
        if (existingA < 0.99) {
          const maxA = isNorth ? 0.45 : 0.38;
          const combinedAlpha = Math.min(maxA, existingA + bloomAlpha * (1 - existingA * 0.5));
          const w1 = existingA / (combinedAlpha || 1);
          const w2 = (bloomAlpha * (1 - existingA * 0.5)) / (combinedAlpha || 1);
          cretePng.data[outIdx] = Math.round(cretePng.data[outIdx]! * w1 + glowR * w2);
          cretePng.data[outIdx + 1] = Math.round(cretePng.data[outIdx]! * w1 + glowG * w2);
          cretePng.data[outIdx + 2] = Math.round(cretePng.data[outIdx + 2]! * w1 + glowB * w2);
          cretePng.data[outIdx + 3] = Math.round(255 * combinedAlpha);
        }
      }
    }
  }

  // Write outputs to src/assets/visuals/ and public/assets/visuals/
  console.log('Writing visual asset outputs...');
  const outDirs = ['src/assets/visuals', 'public/assets/visuals'];
  for (const dir of outDirs) {
    fs.writeFileSync(path.join(dir, 'aegean_background.png'), PNG.sync.write(bgPng));
    fs.writeFileSync(path.join(dir, 'aegean_terrain.png'), PNG.sync.write(terrainPng));
    fs.writeFileSync(path.join(dir, 'aegean_terrain_daylight.png'), PNG.sync.write(terrainDaylightPng));
    fs.writeFileSync(path.join(dir, 'aegean_terrain_normal.png'), PNG.sync.write(terrainNormalPng));
    fs.writeFileSync(path.join(dir, 'crete_paddle.png'), PNG.sync.write(cretePng));
  }

  console.log('Visual assets generated successfully!');
}

run().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
