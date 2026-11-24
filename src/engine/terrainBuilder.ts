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
import type { ElevationField } from './elevationField';
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

export interface SurfaceBuffers {
  readonly positions: Float32Array;
  readonly indices: Uint32Array;
  readonly texels: Uint16Array;
}

export function buildSurfaceBuffers(field: ElevationField): SurfaceBuffers {
  const { resolution, size, elevations, gradients, openness } = field;
  const last = resolution - 1;
  const positions = new Float32Array(resolution * resolution * 3);
  for (let row = 0; row < resolution; row += 1) {
    const z = axisPosition(row, last, size);
    for (let column = 0; column < resolution; column += 1) {
      const vertex = row * resolution + column;
      positions[vertex * 3] = axisPosition(column, last, size);
      positions[vertex * 3 + 1] = elevations[vertex];
      positions[vertex * 3 + 2] = z;
    }
  }

  const texels = new Uint16Array(resolution * resolution * 4);
  for (let index = 0; index < elevations.length; index += 1) {
    const texel = index * 4;
    texels[texel] = DataUtils.toHalfFloat(elevations[index]);
    texels[texel + 1] = DataUtils.toHalfFloat(gradients[index * 2]);
    texels[texel + 2] = DataUtils.toHalfFloat(gradients[index * 2 + 1]);
    texels[texel + 3] = DataUtils.toHalfFloat(openness[index]);
  }

  return { positions, indices: buildGridIndices(resolution, elevations), texels };
}

export function createTerrainGeometry(
  buffers: SurfaceBuffers,
  fromElevations: Float32Array,
): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(buffers.positions, 3));
  geometry.setAttribute('aFromElevation', new BufferAttribute(fromElevations, 1));
  geometry.setIndex(new BufferAttribute(buffers.indices, 1));
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
