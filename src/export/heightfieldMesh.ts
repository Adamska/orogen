import { BufferAttribute, BufferGeometry } from 'three';
import type { ElevationField } from '@/engine/elevationField';

function isPowerOfTwoGrid(resolution: number): boolean {
  const span = resolution - 1;
  return span > 1 && (span & (span - 1)) === 0;
}

function triangleErrors(heights: Float32Array, grid: number): Float32Array {
  const span = grid - 1;
  const errors = new Float32Array(grid * grid);
  const triangles = span * span * 2 - 2;
  const parents = triangles - span * span;
  for (let triangle = triangles - 1; triangle >= 0; triangle -= 1) {
    let id = triangle + 2;
    let ax = 0;
    let ay = 0;
    let bx = 0;
    let by = 0;
    let cx = 0;
    let cy = 0;
    if (id & 1) {
      bx = by = cx = span;
    } else {
      ax = ay = cy = span;
    }
    while ((id >>= 1) > 1) {
      const mx = (ax + bx) >> 1;
      const my = (ay + by) >> 1;
      if (id & 1) {
        bx = ax;
        by = ay;
        ax = cx;
        ay = cy;
      } else {
        ax = bx;
        ay = by;
        bx = cx;
        by = cy;
      }
      cx = mx;
      cy = my;
    }
    const middle = ((ay + by) >> 1) * grid + ((ax + bx) >> 1);
    const interpolated = (heights[ay * grid + ax] + heights[by * grid + bx]) / 2;
    let error = Math.max(errors[middle], Math.abs(interpolated - heights[middle]));
    if (triangle < parents) {
      error = Math.max(
        error,
        errors[((ay + cy) >> 1) * grid + ((ax + cx) >> 1)],
        errors[((by + cy) >> 1) * grid + ((bx + cx) >> 1)],
      );
    }
    errors[middle] = error;
  }
  return errors;
}

export function buildHeightfieldMesh(field: ElevationField, amplitude: number, maxError: number): BufferGeometry {
  const grid = field.resolution;
  if (!isPowerOfTwoGrid(grid)) throw new Error(`Heightfield resolution ${grid} is not a power of two plus one`);
  const span = grid - 1;
  const cell = field.size / span;
  const heights = field.elevations.map((elevation) => elevation * amplitude);
  const errors = triangleErrors(heights, grid);

  const slots = new Uint32Array(grid * grid);
  const corners: number[] = [];
  const indices: number[] = [];
  const vertex = (x: number, y: number) => {
    const key = y * grid + x;
    if (slots[key] === 0) {
      corners.push(x, y);
      slots[key] = corners.length / 2;
    }
    return slots[key] - 1;
  };
  const refine = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number): void => {
    const mx = (ax + bx) >> 1;
    const my = (ay + by) >> 1;
    if (Math.abs(ax - cx) + Math.abs(ay - cy) > 1 && errors[my * grid + mx] > maxError) {
      refine(cx, cy, ax, ay, mx, my);
      refine(bx, by, cx, cy, mx, my);
    } else {
      indices.push(vertex(ax, ay), vertex(bx, by), vertex(cx, cy));
    }
  };
  refine(0, 0, span, span, span, 0);
  refine(span, span, 0, 0, 0, span);

  const count = corners.length / 2;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  for (let index = 0; index < count; index += 1) {
    const x = corners[index * 2];
    const y = corners[index * 2 + 1];
    const key = y * grid + x;
    positions.set([x * cell - field.size / 2, heights[key], y * cell - field.size / 2], index * 3);
    const slopeX = field.gradients[key * 2] * amplitude;
    const slopeZ = field.gradients[key * 2 + 1] * amplitude;
    const length = Math.hypot(slopeX, 1, slopeZ);
    normals.set([-slopeX / length, 1 / length, -slopeZ / length], index * 3);
    uvs.set([x / span, 1 - y / span], index * 2);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}
