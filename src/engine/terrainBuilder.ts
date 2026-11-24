import {
  BufferAttribute,
  BufferGeometry,
  ClampToEdgeWrapping,
  DataTexture,
  DataUtils,
  HalfFloatType,
  LinearFilter,
  NoColorSpace,
  RGBAFormat,
  Sphere,
  Vector3,
} from 'three';
import { sampleField, type ElevationField, type FieldSample } from './elevationField';
import { HORIZON_RADIUS } from './worldConfig';

function axisPosition(index: number, last: number, size: number): number {
  if (index === 0) return -HORIZON_RADIUS;
  if (index === last) return HORIZON_RADIUS;
  return (index / last - 0.5) * size;
}

function buildGridIndices(resolution: number, elevations?: Float32Array): Uint32Array {
  const last = resolution - 1;
  const indices = new Uint32Array(last * last * 6);
  let writeIndex = 0;
  for (let row = 0; row < last; row += 1) {
    for (let column = 0; column < last; column += 1) {
      const a = row * resolution + column;
      const b = a + 1;
      const c = a + resolution;
      const d = c + 1;
      const splitAlongAD =
        elevations !== undefined &&
        Math.abs(elevations[a] - elevations[d]) < Math.abs(elevations[b] - elevations[c]);
      indices.set(splitAlongAD ? [a, c, d, a, d, b] : [a, c, b, b, c, d], writeIndex);
      writeIndex += 6;
    }
  }
  return indices;
}

export interface TerrainMesh {
  readonly resolution: number;
  readonly positions: Float32Array;
  readonly indices: Uint32Array;
}

export function buildFieldTexels(field: ElevationField): Uint16Array {
  const { resolution, elevations, gradients, openness } = field;
  const texels = new Uint16Array(resolution * resolution * 4);
  for (let index = 0; index < elevations.length; index += 1) {
    const texel = index * 4;
    texels[texel] = DataUtils.toHalfFloat(elevations[index]);
    texels[texel + 1] = DataUtils.toHalfFloat(gradients[index * 2]);
    texels[texel + 2] = DataUtils.toHalfFloat(gradients[index * 2 + 1]);
    texels[texel + 3] = DataUtils.toHalfFloat(openness[index]);
  }
  return texels;
}

export function buildTerrainMesh(field: ElevationField, resolution: number): TerrainMesh {
  const last = resolution - 1;
  const positions = new Float32Array(resolution * resolution * 3);
  const heights = new Float32Array(resolution * resolution);
  const sample: FieldSample = { elevation: 0, gradientX: 0, gradientZ: 0, openness: 0 };
  for (let row = 0; row < resolution; row += 1) {
    const z = axisPosition(row, last, field.size);
    const sampleZ = (row / last - 0.5) * field.size;
    for (let column = 0; column < resolution; column += 1) {
      const vertex = row * resolution + column;
      positions[vertex * 3] = axisPosition(column, last, field.size);
      positions[vertex * 3 + 2] = z;
      heights[vertex] = sampleField(field, (column / last - 0.5) * field.size, sampleZ, sample).elevation;
    }
  }
  return { resolution, positions, indices: buildGridIndices(resolution, heights) };
}

export function createTerrainGeometry(mesh: TerrainMesh): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(mesh.positions, 3));
  geometry.setIndex(new BufferAttribute(mesh.indices, 1));
  geometry.boundingSphere = new Sphere(new Vector3(0, 0, 0), HORIZON_RADIUS * Math.SQRT2);
  return geometry;
}

export function buildOceanGeometry(resolution: number, size: number): BufferGeometry {
  const last = resolution - 1;
  const positions = new Float32Array(resolution * resolution * 3);
  for (let row = 0; row < resolution; row += 1) {
    const z = axisPosition(row, last, size);
    for (let column = 0; column < resolution; column += 1) {
      const vertex = (row * resolution + column) * 3;
      positions[vertex] = axisPosition(column, last, size);
      positions[vertex + 2] = z;
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(buildGridIndices(resolution), 1));
  geometry.boundingSphere = new Sphere(new Vector3(0, 0, 0), HORIZON_RADIUS * Math.SQRT2);
  return geometry;
}

export function createFieldTexture(texels: Uint16Array, resolution: number): DataTexture {
  const texture = new DataTexture(texels, resolution, resolution, RGBAFormat, HalfFloatType);
  texture.colorSpace = NoColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}
