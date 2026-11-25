import { MathUtils } from 'three';
import { SCATTER_TILES, type ScatterLayout } from '@/engine/scatterPlacement';
import { TERRAIN_SIZE } from '@/engine/worldConfig';
import { worldUniforms } from './worldUniforms';

export interface ObstacleLayer {
  readonly layout: ScatterLayout;
  readonly density: number;
  readonly radiusRatio: number;
}

interface PlanarPoint {
  x: number;
  z: number;
}

export const scatterObstacles: { trees: ObstacleLayer | null; boulders: ObstacleLayer | null } = {
  trees: null,
  boulders: null,
};

const TILE_SPAN = TERRAIN_SIZE / SCATTER_TILES;
const MAX_REACH = 10;
const SOLID_FOLIAGE = 0.6;

function tileIndex(value: number): number {
  return MathUtils.clamp(Math.floor(value / TILE_SPAN + SCATTER_TILES / 2), 0, SCATTER_TILES - 1);
}

function pushOut(layer: ObstacleLayer, position: PlanarPoint, radius: number): void {
  const { matrices, tileStarts } = layer.layout;
  for (let row = tileIndex(position.z - MAX_REACH); row <= tileIndex(position.z + MAX_REACH); row += 1) {
    for (let column = tileIndex(position.x - MAX_REACH); column <= tileIndex(position.x + MAX_REACH); column += 1) {
      const tile = row * SCATTER_TILES + column;
      const start = tileStarts[tile];
      const end = start + Math.round((tileStarts[tile + 1] - start) * layer.density);
      for (let instance = start; instance < end; instance += 1) {
        const offset = instance * 16;
        const dx = position.x - matrices[offset + 12];
        const dz = position.z - matrices[offset + 14];
        if (Math.abs(dx) > MAX_REACH || Math.abs(dz) > MAX_REACH) continue;
        const scale = Math.hypot(matrices[offset], matrices[offset + 1], matrices[offset + 2]);
        const reach = scale * layer.radiusRatio + radius;
        const distanceSquared = dx * dx + dz * dz;
        if (distanceSquared >= reach * reach || distanceSquared < 1e-8) continue;
        const distance = Math.sqrt(distanceSquared);
        position.x += (dx / distance) * (reach - distance);
        position.z += (dz / distance) * (reach - distance);
      }
    }
  }
}

export function resolveObstacles(position: PlanarPoint, radius: number): void {
  if (worldUniforms.uFoliageScale.value < SOLID_FOLIAGE) return;
  if (scatterObstacles.trees !== null) pushOut(scatterObstacles.trees, position, radius);
  if (scatterObstacles.boulders !== null) pushOut(scatterObstacles.boulders, position, radius);
}
