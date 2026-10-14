import { Point2D, Vector2D } from '../../types';
import { CollisionSegment } from '../../geography/contracts';

export interface SweptHit {
  readonly t: number; // Time of impact in [0, 1]
  readonly point: Point2D; // Point of contact on the obstacle
  readonly normal: Vector2D; // Outward-facing unit normal
  readonly segment: CollisionSegment;
  readonly featureId: string;
  readonly isDynamicCrete: boolean;
  readonly isVertexHit: boolean;
}

export class ContinuousCollision {
  /**
   * Performs continuous swept-circle intersection against a collection of candidate segments.
   * Returns the earliest collision along the path P0 -> P1, or null if no collision occurs.
   */
  public static sweepCircle(
    p0: Point2D,
    p1: Point2D,
    radius: number,
    candidates: readonly {
      segment: CollisionSegment;
      featureId: string;
      isDynamicCrete: boolean;
    }[],
  ): SweptHit | null {
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const distSq = dx * dx + dy * dy;

    let earliestHit: SweptHit | null = null;
    let minT = 1.0;

    for (const item of candidates) {
      const seg = item.segment;
      const hit = this.sweepCircleVsSegment(
        p0,
        dx,
        dy,
        distSq,
        radius,
        seg,
        item.featureId,
        item.isDynamicCrete,
      );
      if (hit && hit.t < minT) {
        minT = hit.t;
        earliestHit = hit;
      }
    }

    return earliestHit;
  }

  /**
   * Sweeps circle P(t) = P0 + t * D, t in [0, 1] against a single line segment.
   */
  public static sweepCircleVsSegment(
    p0: Point2D,
    dx: number,
    dy: number,
    distSq: number,
    radius: number,
    seg: CollisionSegment,
    featureId: string,
    isDynamicCrete: boolean,
  ): SweptHit | null {
    const sx = seg.p2.x - seg.p1.x;
    const sy = seg.p2.y - seg.p1.y;
    const segLen = seg.length;
    if (segLen < 1e-4) return null;

    const tx = sx / segLen;
    const ty = sy / segLen;
    const nx = seg.normal.x;
    const ny = seg.normal.y;

    // Relative approach speed along normal
    const vDotN = dx * nx + dy * ny;

    let bestHit: SweptHit | null = null;

    // 1. Test segment face (moving toward the water-facing normal)
    if (vDotN < -1e-5) {
      // Distance of P0 from segment line along normal
      const distFromLine = (p0.x - seg.p1.x) * nx + (p0.y - seg.p1.y) * ny;

      // Solve distFromLine + t * vDotN = radius
      const t = (radius - distFromLine) / vDotN;

      if (t >= -0.05 && t <= 1.0) {
        const clampedT = Math.max(0, t);
        // Contact center
        const cx = p0.x + clampedT * dx;
        const cy = p0.y + clampedT * dy;

        // Projection along tangent
        const u = (cx - seg.p1.x) * tx + (cy - seg.p1.y) * ty;

        if (u >= -0.1 && u <= segLen + 0.1) {
          const clampedU = Math.max(0, Math.min(segLen, u));
          bestHit = {
            t: clampedT,
            point: {
              x: seg.p1.x + clampedU * tx,
              y: seg.p1.y + clampedU * ty,
            },
            normal: { x: nx, y: ny },
            segment: seg,
            featureId,
            isDynamicCrete,
            isVertexHit: false,
          };
        }
      }
    }

    // 2. Test vertex endpoints (caps at seg.p1 and seg.p2) for acute corners and grazing tips
    const v1Hit = this.sweepCircleVsVertex(
      p0,
      dx,
      dy,
      distSq,
      radius,
      seg.p1,
      seg,
      featureId,
      isDynamicCrete,
    );
    if (v1Hit && (!bestHit || v1Hit.t < bestHit.t)) {
      bestHit = v1Hit;
    }

    const v2Hit = this.sweepCircleVsVertex(
      p0,
      dx,
      dy,
      distSq,
      radius,
      seg.p2,
      seg,
      featureId,
      isDynamicCrete,
    );
    if (v2Hit && (!bestHit || v2Hit.t < bestHit.t)) {
      bestHit = v2Hit;
    }

    return bestHit;
  }

  /**
   * Sweeps circle against a single point vertex (cap).
   */
  private static sweepCircleVsVertex(
    p0: Point2D,
    dx: number,
    dy: number,
    distSq: number,
    radius: number,
    vertex: Point2D,
    seg: CollisionSegment,
    featureId: string,
    isDynamicCrete: boolean,
  ): SweptHit | null {
    if (distSq < 1e-6) return null;

    const vx = p0.x - vertex.x;
    const vy = p0.y - vertex.y;

    const b = 2 * (vx * dx + vy * dy);
    // If moving away from vertex, no future impact with this vertex
    if (b > 0) return null;

    const c = vx * vx + vy * vy - radius * radius;
    const discriminant = b * b - 4 * distSq * c;
    if (discriminant < 0) return null;

    const sqrtDisc = Math.sqrt(discriminant);
    const t = (-b - sqrtDisc) / (2 * distSq);

    if (t >= -0.05 && t <= 1.0) {
      const clampedT = Math.max(0, t);
      const cx = p0.x + clampedT * dx;
      const cy = p0.y + clampedT * dy;

      const normX = cx - vertex.x;
      const normY = cy - vertex.y;
      const normLen = Math.hypot(normX, normY);

      if (normLen < 1e-4) return null;

      const normal = { x: normX / normLen, y: normY / normLen };

      // Ensure vertex normal points generally into open water (matches segment normal hemisphere)
      const dotWithSegNormal = normal.x * seg.normal.x + normal.y * seg.normal.y;
      if (dotWithSegNormal < -0.3) {
        return null; // backside of segment vertex
      }

      return {
        t: clampedT,
        point: { x: vertex.x, y: vertex.y },
        normal,
        segment: seg,
        featureId,
        isDynamicCrete,
        isVertexHit: true,
      };
    }

    return null;
  }

  /**
   * Calculates minimum Euclidean distance from point P to line segment AB.
   */
  public static distPointToSegment(p: Point2D, a: Point2D, b: Point2D): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    if (l2 < 1e-6) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }
}
