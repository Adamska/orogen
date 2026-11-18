import { createNoise2D, fbm, ridgedMultifractal, smoothstep } from './noise';
import { deriveSeed } from './random';
import { TERRAIN_SEGMENTS, TERRAIN_SIZE } from './worldConfig';

export interface FieldParams {
  seed: number;
  ridgeSharpness: number;
  warpIntensity: number;
  valleyDepth: number;
}

export interface ElevationField {
  readonly params: FieldParams;
  readonly resolution: number;
  readonly size: number;
  readonly elevations: Float32Array;
  readonly gradients: Float32Array;
  readonly openness: Float32Array;
}

export interface FieldSample {
  elevation: number;
  gradientX: number;
  gradientZ: number;
  openness: number;
}

type ElevationSampler = (x: number, z: number) => number;

const BASE_FREQUENCY = 1 / 560;
const OPENNESS_RADIUS = 6;
const RELIEF_CURVE = 0.88;

function createElevationSampler(params: FieldParams, size: number): ElevationSampler {
  const [warpA, warpB, continent, hills, ridges, valleys, rim, grain] = [
    11, 23, 37, 41, 59, 67, 79, 83,
  ].map((salt) => createNoise2D(deriveSeed(params.seed, salt)));
  const warpReach = 0.04 + params.warpIntensity * 0.42;
  const crestExponent = 1 + params.ridgeSharpness * 1.5;
  const ridgeWeight = 0.3 + params.ridgeSharpness * 0.7;
  const halfSize = size / 2;

  return (x, z) => {
    const u = x * BASE_FREQUENCY;
    const v = z * BASE_FREQUENCY;
    const warpedU = u + fbm(warpA, u * 1.3, v * 1.3, 3) * warpReach;
    const warpedV = v + fbm(warpB, u * 1.3 + 5.2, v * 1.3 + 1.3, 3) * warpReach;

    const landmass = fbm(continent, warpedU * 0.6, warpedV * 0.6, 4) * 0.5 + 0.5;
    const rolling = fbm(hills, warpedU * 1.9, warpedV * 1.9, 4) * 0.5 + 0.5;
    const crest = ridgedMultifractal(ridges, warpedU * 1.25, warpedV * 1.25, 6, crestExponent);
    const uplift = smoothstep(0.24, 0.62, landmass);
    let height =
      0.12 +
      landmass * 0.24 +
      rolling * 0.16 * (1 - ridgeWeight * 0.5) +
      crest * uplift * (0.3 + ridgeWeight * 0.55);
    height += fbm(grain, u * 7.3, v * 7.3, 4) * 0.045 * (0.25 + height);

    const channel = Math.abs(fbm(valleys, warpedU * 0.5 + 9.1, warpedV * 0.5 - 3.7, 3));
    height *= 1 - params.valleyDepth * (1 - smoothstep(0.012, 0.24, channel));

    const edgeX = Math.abs(x) / halfSize;
    const edgeZ = Math.abs(z) / halfSize;
    const square = Math.max(edgeX, edgeZ);
    const radial = Math.sqrt(edgeX * edgeX + edgeZ * edgeZ) * 0.78;
    const shoreline = radial * 0.55 + square * 0.45 + fbm(rim, u * 1.6, v * 1.6, 3) * 0.2;
    const falloff = (1 - smoothstep(0.66, 0.97, shoreline)) * (1 - smoothstep(0.9, 0.985, square));
    return height * falloff;
  };
}

function computeGradients(elevations: Float32Array, resolution: number, cell: number): Float32Array {
  const gradients = new Float32Array(resolution * resolution * 2);
  const last = resolution - 1;
  for (let row = 0; row < resolution; row += 1) {
    const north = Math.max(row - 1, 0);
    const south = Math.min(row + 1, last);
    for (let column = 0; column < resolution; column += 1) {
      const west = Math.max(column - 1, 0);
      const east = Math.min(column + 1, last);
      const index = (row * resolution + column) * 2;
      gradients[index] =
        (elevations[row * resolution + east] - elevations[row * resolution + west]) /
        ((east - west) * cell);
      gradients[index + 1] =
        (elevations[south * resolution + column] - elevations[north * resolution + column]) /
        ((south - north) * cell);
    }
  }
  return gradients;
}

function computeOpenness(elevations: Float32Array, resolution: number): Float32Array {
  const openness = new Float32Array(resolution * resolution);
  const last = resolution - 1;
  const diagonal = Math.round(OPENNESS_RADIUS * 0.7);
  const offsets = [
    [OPENNESS_RADIUS, 0], [-OPENNESS_RADIUS, 0], [0, OPENNESS_RADIUS], [0, -OPENNESS_RADIUS],
    [diagonal, diagonal], [-diagonal, diagonal], [diagonal, -diagonal], [-diagonal, -diagonal],
  ];
  for (let row = 0; row < resolution; row += 1) {
    for (let column = 0; column < resolution; column += 1) {
      let surrounding = 0;
      for (const [offsetColumn, offsetRow] of offsets) {
        const sampleRow = Math.min(last, Math.max(0, row + offsetRow));
        const sampleColumn = Math.min(last, Math.max(0, column + offsetColumn));
        surrounding += elevations[sampleRow * resolution + sampleColumn];
      }
      const index = row * resolution + column;
      openness[index] = surrounding / offsets.length - elevations[index];
    }
  }
  return openness;
}

export function buildElevationField(
  params: FieldParams,
  resolution = TERRAIN_SEGMENTS + 1,
  size = TERRAIN_SIZE,
): ElevationField {
  const sampler = createElevationSampler(params, size);
  const elevations = new Float32Array(resolution * resolution);
  const cell = size / (resolution - 1);
  let peak = 1e-6;
  for (let row = 0; row < resolution; row += 1) {
    const z = row * cell - size / 2;
    for (let column = 0; column < resolution; column += 1) {
      const height = sampler(column * cell - size / 2, z);
      elevations[row * resolution + column] = height;
      if (height > peak) peak = height;
    }
  }
  for (let index = 0; index < elevations.length; index += 1) {
    elevations[index] = Math.pow(elevations[index] / peak, RELIEF_CURVE);
  }

  return {
    params: { ...params },
    resolution,
    size,
    elevations,
    gradients: computeGradients(elevations, resolution, cell),
    openness: computeOpenness(elevations, resolution),
  };
}

export function sampleField(field: ElevationField, x: number, z: number, target: FieldSample): FieldSample {
  const { resolution, size, elevations, gradients, openness } = field;
  const last = resolution - 1;
  const gridX = Math.min(last - 1e-4, Math.max(0, (x / size + 0.5) * last));
  const gridZ = Math.min(last - 1e-4, Math.max(0, (z / size + 0.5) * last));
  const column = Math.floor(gridX);
  const row = Math.floor(gridZ);
  const blendX = gridX - column;
  const blendZ = gridZ - row;
  const a = row * resolution + column;
  const b = a + 1;
  const c = a + resolution;
  const d = c + 1;
  const weightA = (1 - blendX) * (1 - blendZ);
  const weightB = blendX * (1 - blendZ);
  const weightC = (1 - blendX) * blendZ;
  const weightD = blendX * blendZ;
  target.elevation =
    elevations[a] * weightA + elevations[b] * weightB + elevations[c] * weightC + elevations[d] * weightD;
  target.gradientX =
    gradients[a * 2] * weightA + gradients[b * 2] * weightB + gradients[c * 2] * weightC + gradients[d * 2] * weightD;
  target.gradientZ =
    gradients[a * 2 + 1] * weightA + gradients[b * 2 + 1] * weightB +
    gradients[c * 2 + 1] * weightC + gradients[d * 2 + 1] * weightD;
  target.openness = openness[blendZ < 0.5 ? (blendX < 0.5 ? a : b) : blendX < 0.5 ? c : d];
  return target;
}
