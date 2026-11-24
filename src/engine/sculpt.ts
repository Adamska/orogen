import { DataUtils } from 'three';
import { sampleField, type ElevationField, type FieldSample } from './elevationField';
import type { SurfaceBuffers } from './terrainBuilder';

export interface BrushStroke {
  readonly x: number;
  readonly z: number;
  readonly radius: number;
  readonly strength: number;
}

export interface DirtyRows {
  readonly first: number;
  readonly last: number;
}

const OPENNESS_RADIUS = 6;
const MAX_ELEVATION = 1.35;
const MARCH_STEPS = 220;
const REFINE_STEPS = 8;

function refreshRegion(field: ElevationField, buffers: SurfaceBuffers, rows: DirtyRows, columns: DirtyRows): void {
  const { resolution, size, elevations, gradients, openness } = field;
  const last = resolution - 1;
  const cell = size / last;
  const diagonal = Math.round(OPENNESS_RADIUS * 0.7);
  const offsets = [
    [OPENNESS_RADIUS, 0], [-OPENNESS_RADIUS, 0], [0, OPENNESS_RADIUS], [0, -OPENNESS_RADIUS],
    [diagonal, diagonal], [-diagonal, diagonal], [diagonal, -diagonal], [-diagonal, -diagonal],
  ];
  const at = (row: number, column: number) =>
    elevations[Math.min(last, Math.max(0, row)) * resolution + Math.min(last, Math.max(0, column))];

  for (let row = rows.first; row <= rows.last; row += 1) {
    for (let column = columns.first; column <= columns.last; column += 1) {
      const index = row * resolution + column;
      const west = Math.max(column - 1, 0);
      const east = Math.min(column + 1, last);
      const north = Math.max(row - 1, 0);
      const south = Math.min(row + 1, last);
      gradients[index * 2] = (at(row, east) - at(row, west)) / ((east - west) * cell);
      gradients[index * 2 + 1] = (at(south, column) - at(north, column)) / ((south - north) * cell);
      let surrounding = 0;
      for (const [offsetColumn, offsetRow] of offsets) surrounding += at(row + offsetRow, column + offsetColumn);
      openness[index] = surrounding / offsets.length - elevations[index];

      const texel = index * 4;
      buffers.texels[texel] = DataUtils.toHalfFloat(elevations[index]);
      buffers.texels[texel + 1] = DataUtils.toHalfFloat(gradients[index * 2]);
      buffers.texels[texel + 2] = DataUtils.toHalfFloat(gradients[index * 2 + 1]);
      buffers.texels[texel + 3] = DataUtils.toHalfFloat(openness[index]);
      buffers.positions[index * 3 + 1] = elevations[index];
    }
  }
}

export function applyBrush(field: ElevationField, buffers: SurfaceBuffers, stroke: BrushStroke): DirtyRows {
  const { resolution, size, elevations } = field;
  const last = resolution - 1;
  const toGrid = (value: number) => ((value / size) + 0.5) * last;
  const span = (stroke.radius / size) * last;
  const centerColumn = toGrid(stroke.x);
  const centerRow = toGrid(stroke.z);
  const rows = {
    first: Math.max(1, Math.floor(centerRow - span)),
    last: Math.min(last - 1, Math.ceil(centerRow + span)),
  };
  const columns = {
    first: Math.max(1, Math.floor(centerColumn - span)),
    last: Math.min(last - 1, Math.ceil(centerColumn + span)),
  };

  for (let row = rows.first; row <= rows.last; row += 1) {
    for (let column = columns.first; column <= columns.last; column += 1) {
      const distance = Math.hypot(column - centerColumn, row - centerRow) / span;
      if (distance >= 1) continue;
      const falloff = Math.pow(1 - distance * distance, 2);
      const index = row * resolution + column;
      elevations[index] = Math.min(MAX_ELEVATION, Math.max(0, elevations[index] + stroke.strength * falloff));
    }
  }

  const margin = OPENNESS_RADIUS + 1;
  const dirty = {
    first: Math.max(0, rows.first - margin),
    last: Math.min(last, rows.last + margin),
  };
  refreshRegion(field, buffers, dirty, {
    first: Math.max(0, columns.first - margin),
    last: Math.min(last, columns.last + margin),
  });
  return dirty;
}

export function intersectHeightfield(
  field: ElevationField,
  amplitude: number,
  origin: { x: number; y: number; z: number },
  direction: { x: number; y: number; z: number },
  maxDistance: number,
): { x: number; y: number; z: number } | null {
  const sample: FieldSample = { elevation: 0, gradientX: 0, gradientZ: 0, openness: 0 };
  const heightAbove = (distance: number) => {
    const x = origin.x + direction.x * distance;
    const z = origin.z + direction.z * distance;
    return origin.y + direction.y * distance - sampleField(field, x, z, sample).elevation * amplitude;
  };
  const step = maxDistance / MARCH_STEPS;
  let near = 0;
  for (let index = 1; index <= MARCH_STEPS; index += 1) {
    const far = index * step;
    if (heightAbove(far) > 0) {
      near = far;
      continue;
    }
    let low = near;
    let high = far;
    for (let refine = 0; refine < REFINE_STEPS; refine += 1) {
      const middle = (low + high) / 2;
      if (heightAbove(middle) > 0) low = middle;
      else high = middle;
    }
    const x = origin.x + direction.x * high;
    const z = origin.z + direction.z * high;
    if (Math.abs(x) > field.size / 2 || Math.abs(z) > field.size / 2) return null;
    return { x, y: origin.y + direction.y * high, z };
  }
  return null;
}
