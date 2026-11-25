import { MathUtils } from 'three';
import { sampleField, type ElevationField, type FieldSample } from '@/engine/elevationField';

export interface GroundState {
  from: ElevationField;
  to: ElevationField;
  morph: number;
  meshResolution: number;
  amplitude: number;
}

export interface Footing {
  readonly x: number;
  readonly z: number;
}

const FOOTING_RING_SPACING = 8;
const FOOTING_RINGS = 70;
const FOOTING_HEADROOM = 2;
const FOOTING_MAX_SLOPE = 0.4;
const probe: FieldSample = { elevation: 0, gradientX: 0, gradientZ: 0, openness: 0 };

function vertexElevation(ground: GroundState, x: number, z: number): number {
  const target = sampleField(ground.to, x, z, probe).elevation;
  if (ground.morph >= 1 || ground.from === ground.to) return target;
  const origin = sampleField(ground.from, x, z, probe).elevation;
  return origin + (target - origin) * ground.morph;
}

export function walkableLimit(field: ElevationField, meshResolution: number): number {
  return field.size / 2 - (field.size / (meshResolution - 1)) * 1.5;
}

export function groundHeight(ground: GroundState, x: number, z: number): number {
  const { size } = ground.to;
  const last = ground.meshResolution - 1;
  const cell = size / last;
  const gridX = MathUtils.clamp((x / size + 0.5) * last, 0, last - 1e-4);
  const gridZ = MathUtils.clamp((z / size + 0.5) * last, 0, last - 1e-4);
  const column = Math.floor(gridX);
  const row = Math.floor(gridZ);
  const fx = gridX - column;
  const fz = gridZ - row;
  const left = (column / last - 0.5) * size;
  const top = (row / last - 0.5) * size;
  const a = vertexElevation(ground, left, top);
  const b = vertexElevation(ground, left + cell, top);
  const c = vertexElevation(ground, left, top + cell);
  const d = vertexElevation(ground, left + cell, top + cell);

  let elevation: number;
  if (Math.abs(a - d) < Math.abs(b - c)) {
    elevation = fz > fx ? a + (d - c) * fx + (c - a) * fz : a + (b - a) * fx + (d - b) * fz;
  } else {
    elevation = fx + fz < 1 ? a + (b - a) * fx + (c - a) * fz : d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
  }
  return elevation * ground.amplitude;
}

export function groundSlope(ground: GroundState, x: number, z: number, target: { x: number; z: number }): void {
  sampleField(ground.to, x, z, probe);
  target.x = probe.gradientX * ground.amplitude;
  target.z = probe.gradientZ * ground.amplitude;
}

export function findFooting(
  field: ElevationField,
  amplitude: number,
  waterHeight: number,
  limit: number,
  origin: Footing,
  rings = FOOTING_RINGS,
): Footing {
  for (let ring = 0; ring <= rings; ring += 1) {
    const radius = ring * FOOTING_RING_SPACING;
    const steps = ring === 0 ? 1 : ring * 6;
    for (let step = 0; step < steps; step += 1) {
      const angle = (step / steps) * Math.PI * 2;
      const x = MathUtils.clamp(origin.x + Math.cos(angle) * radius, -limit, limit);
      const z = MathUtils.clamp(origin.z + Math.sin(angle) * radius, -limit, limit);
      sampleField(field, x, z, probe);
      const slope = Math.hypot(probe.gradientX, probe.gradientZ) * amplitude;
      if (probe.elevation * amplitude > waterHeight + FOOTING_HEADROOM && slope < FOOTING_MAX_SLOPE) {
        return { x, z };
      }
    }
  }
  return origin;
}
