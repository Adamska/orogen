import {
  BufferAttribute,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  type BufferGeometry,
} from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { VegetationKind } from '@/engine/worldConfig';

const CONIFER_TIERS = [
  { radius: 0.27, base: 0.16, top: 0.6 },
  { radius: 0.2, base: 0.42, top: 0.82 },
  { radius: 0.125, base: 0.68, top: 1.0 },
] as const;
const BROADLEAF_CROWN = [
  [0, 0.7, 0, 0.3],
  [0.16, 0.56, 0.08, 0.22],
  [-0.14, 0.58, -0.1, 0.23],
  [0.02, 0.52, -0.17, 0.19],
] as const;
const SHRUB_CLUMPS = [
  [0, 0.32, 0, 0.42],
  [0.3, 0.24, 0.12, 0.3],
  [-0.26, 0.26, -0.14, 0.32],
] as const;
const PALM_FRONDS = 8;
const PALM_TRUNK_SEGMENTS = 5;
const RADIAL_SEGMENTS = 7;

function part(geometry: BufferGeometry, canopy: number): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (flat !== geometry) geometry.dispose();
  flat.deleteAttribute('uv');
  flat.setAttribute('aCanopy', new BufferAttribute(new Float32Array(flat.attributes.position.count).fill(canopy), 1));
  return flat;
}

function assemble(parts: BufferGeometry[], capacity: number): BufferGeometry {
  const merged = mergeGeometries(parts);
  for (const piece of parts) piece.dispose();
  merged.setAttribute('aPlacement', new InstancedBufferAttribute(new Float32Array(capacity * 3), 3));
  return merged;
}

function trunk(height: number, top: number, bottom: number): BufferGeometry {
  const geometry = new CylinderGeometry(top, bottom, height, 5, 1, true);
  geometry.translate(0, height / 2, 0);
  return part(geometry, 0);
}

function crown(clumps: readonly (readonly [number, number, number, number])[], squash: number): BufferGeometry[] {
  return clumps.map(([x, y, z, radius]) => {
    const blob = new IcosahedronGeometry(radius, 0);
    blob.scale(1, squash, 1);
    blob.translate(x, y, z);
    return part(blob, 1);
  });
}

function conifer(): BufferGeometry[] {
  const tiers = CONIFER_TIERS.map((tier) => {
    const height = tier.top - tier.base;
    const cone = new ConeGeometry(tier.radius, height, RADIAL_SEGMENTS, 1, true);
    cone.translate(0, tier.base + height / 2, 0);
    return part(cone, 1);
  });
  return [trunk(0.3, 0.028, 0.045), ...tiers];
}

function palm(): BufferGeometry[] {
  const parts: BufferGeometry[] = [];
  const segmentHeight = 0.84 / PALM_TRUNK_SEGMENTS;
  for (let index = 0; index < PALM_TRUNK_SEGMENTS; index += 1) {
    const segment = new CylinderGeometry(0.026, 0.034, segmentHeight, 5, 1, true);
    segment.translate(Math.pow(index / PALM_TRUNK_SEGMENTS, 2) * 0.14, segmentHeight * (index + 0.5), 0);
    parts.push(part(segment, 0));
  }
  for (let index = 0; index < PALM_FRONDS; index += 1) {
    const frond = new ConeGeometry(0.07, 0.5, 4, 1);
    frond.scale(1, 1, 0.24);
    frond.translate(0, 0.25, 0);
    frond.rotateZ(-1.45 - (index % 3) * 0.22);
    frond.rotateY((index / PALM_FRONDS) * Math.PI * 2);
    frond.translate(0.14, 0.84, 0);
    parts.push(part(frond, 1));
  }
  return parts;
}

const TREE_PARTS: Record<VegetationKind, () => BufferGeometry[]> = {
  conifer,
  broadleaf: () => [trunk(0.46, 0.032, 0.05), ...crown(BROADLEAF_CROWN, 0.85)],
  palm,
  shrub: () => crown(SHRUB_CLUMPS, 0.7),
};

export function createTreeGeometry(kind: VegetationKind, capacity: number): BufferGeometry {
  return assemble(TREE_PARTS[kind](), capacity);
}

export function createBoulderGeometry(capacity: number): BufferGeometry {
  const source = new IcosahedronGeometry(1, 1);
  source.deleteAttribute('uv');
  source.deleteAttribute('normal');
  const geometry = mergeVertices(source);
  source.dispose();

  const positions = geometry.attributes.position;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const hash = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    const bulge = 0.78 + (hash - Math.floor(hash)) * 0.44;
    positions.setXYZ(index, x * bulge, y * bulge * 0.78, z * bulge);
  }
  geometry.computeVertexNormals();
  geometry.setAttribute('aCanopy', new BufferAttribute(new Float32Array(positions.count), 1));
  geometry.setAttribute('aPlacement', new InstancedBufferAttribute(new Float32Array(capacity * 3), 3));
  return geometry;
}
