import { MathUtils } from 'three';
import { SCATTER_TILES, type ScatterLayout } from '@/engine/scatterPlacement';
import { TERRAIN_SIZE } from '@/engine/worldConfig';
import { worldUniforms } from './worldUniforms';

export interface CanopyShape {
  readonly radius: number;
  readonly bottom: number;
}

export interface ObstacleLayer {
  readonly layout: ScatterLayout;
  readonly density: number;
  readonly radiusRatio: number;
  readonly canopy: CanopyShape | null;
}

interface Canopy {
  x: number;
  z: number;
  radius: number;
  bottom: number;
  top: number;
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
const canopies: Canopy[] = [];
let canopyCount = 0;

function tileIndex(value: number): number {
  return MathUtils.clamp(Math.floor(value / TILE_SPAN + SCATTER_TILES / 2), 0, SCATTER_TILES - 1);
}

function forNearby(layer: ObstacleLayer, position: PlanarPoint, reach: number, visit: (offset: number) => void): void {
  const { tileStarts, matrices } = layer.layout;
  for (let row = tileIndex(position.z - reach); row <= tileIndex(position.z + reach); row += 1) {
    for (let column = tileIndex(position.x - reach); column <= tileIndex(position.x + reach); column += 1) {
      const tile = row * SCATTER_TILES + column;
      const start = tileStarts[tile];
      const end = start + Math.round((tileStarts[tile + 1] - start) * layer.density);
      for (let instance = start; instance < end; instance += 1) {
        const offset = instance * 16;
        if (Math.abs(position.x - matrices[offset + 12]) > reach || Math.abs(position.z - matrices[offset + 14]) > reach) {
          continue;
        }
        visit(offset);
      }
    }
  }
}

function pushOut(layer: ObstacleLayer, position: PlanarPoint, radius: number): void {
  const { matrices } = layer.layout;
  forNearby(layer, position, MAX_REACH, (offset) => {
    const dx = position.x - matrices[offset + 12];
    const dz = position.z - matrices[offset + 14];
    const scale = Math.hypot(matrices[offset], matrices[offset + 1], matrices[offset + 2]);
    const reach = scale * layer.radiusRatio + radius;
    const distanceSquared = dx * dx + dz * dz;
    if (distanceSquared >= reach * reach || distanceSquared < 1e-8) return;
    const distance = Math.sqrt(distanceSquared);
    position.x += (dx / distance) * (reach - distance);
    position.z += (dz / distance) * (reach - distance);
  });
}

export function gatherCanopies(center: PlanarPoint, reach: number): void {
  canopyCount = 0;
  const layer = scatterObstacles.trees;
  if (layer === null || layer.canopy === null || worldUniforms.uFoliageScale.value < SOLID_FOLIAGE) return;
  const { matrices } = layer.layout;
  const shape = layer.canopy;
  forNearby(layer, center, reach, (offset) => {
    const girth = Math.hypot(matrices[offset], matrices[offset + 1], matrices[offset + 2]);
    const height = Math.hypot(matrices[offset + 4], matrices[offset + 5], matrices[offset + 6]);
    const base = matrices[offset + 13];
    const radius = girth * shape.radius;
    const dx = center.x - matrices[offset + 12];
    const dz = center.z - matrices[offset + 14];
    if (dx * dx + dz * dz < radius * radius) return;
    const entry = canopies[canopyCount] ?? { x: 0, z: 0, radius: 0, bottom: 0, top: 0 };
    entry.x = matrices[offset + 12];
    entry.z = matrices[offset + 14];
    entry.radius = radius;
    entry.bottom = base + height * shape.bottom;
    entry.top = base + height;
    canopies[canopyCount] = entry;
    canopyCount += 1;
  });
}

export function insideCanopy(x: number, y: number, z: number): boolean {
  for (let index = 0; index < canopyCount; index += 1) {
    const canopy = canopies[index];
    if (y < canopy.bottom || y > canopy.top) continue;
    const dx = x - canopy.x;
    const dz = z - canopy.z;
    if (dx * dx + dz * dz < canopy.radius * canopy.radius) return true;
  }
  return false;
}

export function resolveObstacles(position: PlanarPoint, radius: number): void {
  if (worldUniforms.uFoliageScale.value < SOLID_FOLIAGE) return;
  if (scatterObstacles.trees !== null) pushOut(scatterObstacles.trees, position, radius);
  if (scatterObstacles.boulders !== null) pushOut(scatterObstacles.boulders, position, radius);
}
