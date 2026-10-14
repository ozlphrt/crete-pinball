import { BoundingBox, Point2D } from '../../types';
import { CollisionSegment } from '../../geography/contracts';

export interface IndexedSegment {
  readonly segment: CollisionSegment;
  readonly featureId: string;
  readonly isDynamicCrete: boolean;
  readonly aabb: BoundingBox;
}

export class SpatialHashGrid {
  private readonly cellSize: number;
  private readonly staticGrid: Map<string, IndexedSegment[]> = new Map();
  private readonly dynamicGrid: Map<string, IndexedSegment[]> = new Map();

  constructor(cellSize = 80) {
    this.cellSize = cellSize;
  }

  private hashKey(cellX: number, cellY: number): string {
    return `${cellX},${cellY}`;
  }

  public clearDynamic(): void {
    this.dynamicGrid.clear();
  }

  public removeDynamic(_featureId: string): void {
    this.dynamicGrid.clear();
  }

  public insert(segment: CollisionSegment, featureId: string, isDynamic = false): void {
    const minX = Math.min(segment.p1.x, segment.p2.x);
    const maxX = Math.max(segment.p1.x, segment.p2.x);
    const minY = Math.min(segment.p1.y, segment.p2.y);
    const maxY = Math.max(segment.p1.y, segment.p2.y);

    const aabb: BoundingBox = { minX, minY, maxX, maxY };
    const indexed: IndexedSegment = { segment, featureId, isDynamicCrete: isDynamic, aabb };

    const targetGrid = isDynamic ? this.dynamicGrid : this.staticGrid;

    const minCellX = Math.floor(minX / this.cellSize);
    const maxCellX = Math.floor(maxX / this.cellSize);
    const minCellY = Math.floor(minY / this.cellSize);
    const maxCellY = Math.floor(maxY / this.cellSize);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const key = this.hashKey(cx, cy);
        let list = targetGrid.get(key);
        if (!list) {
          list = [];
          targetGrid.set(key, list);
        }
        list.push(indexed);
      }
    }
  }

  /**
   * Queries all candidate segments overlapping the given bounding box.
   * Returns a deduplicated array of candidate segments.
   */
  public query(box: BoundingBox): IndexedSegment[] {
    const minCellX = Math.floor(box.minX / this.cellSize);
    const maxCellX = Math.floor(box.maxX / this.cellSize);
    const minCellY = Math.floor(box.minY / this.cellSize);
    const maxCellY = Math.floor(box.maxY / this.cellSize);

    const results: IndexedSegment[] = [];
    const seen = new Set<string>();

    const checkList = (list: IndexedSegment[] | undefined): void => {
      if (!list) return;
      for (const item of list) {
        if (!seen.has(item.segment.id)) {
          seen.add(item.segment.id);
          // AABB intersection test
          if (
            item.aabb.minX <= box.maxX &&
            item.aabb.maxX >= box.minX &&
            item.aabb.minY <= box.maxY &&
            item.aabb.maxY >= box.minY
          ) {
            results.push(item);
          }
        }
      }
    };

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const key = this.hashKey(cx, cy);
        checkList(this.staticGrid.get(key));
        checkList(this.dynamicGrid.get(key));
      }
    }

    return results;
  }

  /**
   * Queries candidate segments within a circular neighborhood.
   */
  public queryRadius(center: Point2D, radius: number): IndexedSegment[] {
    return this.query({
      minX: center.x - radius,
      minY: center.y - radius,
      maxX: center.x + radius,
      maxY: center.y + radius,
    });
  }

  public clear(): void {
    this.staticGrid.clear();
    this.dynamicGrid.clear();
  }
}
