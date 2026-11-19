import {
  BufferAttribute,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  type BufferGeometry,
} from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const CANOPY_TIERS = [
  { radius: 0.27, base: 0.16, top: 0.6 },
  { radius: 0.2, base: 0.42, top: 0.82 },
  { radius: 0.125, base: 0.68, top: 1.0 },
] as const;
const TRUNK_HEIGHT = 0.3;
const RADIAL_SEGMENTS = 7;

function tagCanopy(geometry: BufferGeometry, canopy: number): BufferGeometry {
  const tags = new Float32Array(geometry.attributes.position.count).fill(canopy);
  geometry.setAttribute('aCanopy', new BufferAttribute(tags, 1));
  geometry.deleteAttribute('uv');
  return geometry;
}

function attachPlacements(geometry: BufferGeometry, capacity: number): BufferGeometry {
  geometry.setAttribute(
    'aPlacement',
    new InstancedBufferAttribute(new Float32Array(capacity * 3), 3),
  );
  return geometry;
}

export function createConiferGeometry(capacity: number): BufferGeometry {
  const trunk = new CylinderGeometry(0.028, 0.045, TRUNK_HEIGHT, 5, 1, true);
  trunk.translate(0, TRUNK_HEIGHT / 2, 0);
  const parts = [tagCanopy(trunk, 0)];
  for (const tier of CANOPY_TIERS) {
    const height = tier.top - tier.base;
    const cone = new ConeGeometry(tier.radius, height, RADIAL_SEGMENTS, 1, true);
    cone.translate(0, tier.base + height / 2, 0);
    parts.push(tagCanopy(cone, 1));
  }
  const merged = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  return attachPlacements(merged, capacity);
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
  const tags = new Float32Array(positions.count);
  geometry.setAttribute('aCanopy', new BufferAttribute(tags, 1));
  return attachPlacements(geometry, capacity);
}
