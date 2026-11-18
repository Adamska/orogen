import { mulberry32 } from './random';

export type Noise2D = (x: number, y: number) => number;

const SKEW = 0.5 * (Math.sqrt(3) - 1);
const UNSKEW = (3 - Math.sqrt(3)) / 6;
const GRADIENTS = new Float32Array([
  1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 1, 0, -1, 0, 0, 1, 0, -1, 0, 1, 0, -1,
]);
const OCTAVE_ROTATION_COS = 0.8;
const OCTAVE_ROTATION_SIN = 0.6;
const CREST_ROUNDING = 0.045;
const CREST_ROUNDING_GROWTH = 1.7;

function buildPermutation(seed: number): Uint8Array {
  const random = mulberry32(seed);
  const source = new Uint8Array(256);
  for (let index = 0; index < 256; index += 1) source[index] = index;
  for (let index = 255; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const held = source[index];
    source[index] = source[swap];
    source[swap] = held;
  }
  const permutation = new Uint8Array(512);
  for (let index = 0; index < 512; index += 1) permutation[index] = source[index & 255];
  return permutation;
}

export function createNoise2D(seed: number): Noise2D {
  const permutation = buildPermutation(seed);
  const corner = (gradientIndex: number, x: number, y: number): number => {
    const falloff = 0.5 - x * x - y * y;
    if (falloff <= 0) return 0;
    const slot = (gradientIndex % 12) * 2;
    const squared = falloff * falloff;
    return squared * squared * (GRADIENTS[slot] * x + GRADIENTS[slot + 1] * y);
  };

  return (x, y) => {
    const skewed = (x + y) * SKEW;
    const cellX = Math.floor(x + skewed);
    const cellY = Math.floor(y + skewed);
    const unskewed = (cellX + cellY) * UNSKEW;
    const x0 = x - (cellX - unskewed);
    const y0 = y - (cellY - unskewed);
    const stepX = x0 > y0 ? 1 : 0;
    const stepY = 1 - stepX;
    const x1 = x0 - stepX + UNSKEW;
    const y1 = y0 - stepY + UNSKEW;
    const x2 = x0 - 1 + 2 * UNSKEW;
    const y2 = y0 - 1 + 2 * UNSKEW;
    const wrappedX = cellX & 255;
    const wrappedY = cellY & 255;
    const sum =
      corner(permutation[wrappedX + permutation[wrappedY]], x0, y0) +
      corner(permutation[wrappedX + stepX + permutation[wrappedY + stepY]], x1, y1) +
      corner(permutation[wrappedX + 1 + permutation[wrappedY + 1]], x2, y2);
    return 70 * sum;
  };
}

export function fbm(
  noise: Noise2D,
  x: number,
  y: number,
  octaves: number,
  lacunarity = 2,
  gain = 0.5,
): number {
  let sampleX = x;
  let sampleY = y;
  let amplitude = 1;
  let total = 0;
  let range = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    total += noise(sampleX, sampleY) * amplitude;
    range += amplitude;
    amplitude *= gain;
    const rotatedX = (sampleX * OCTAVE_ROTATION_COS - sampleY * OCTAVE_ROTATION_SIN) * lacunarity;
    sampleY = (sampleX * OCTAVE_ROTATION_SIN + sampleY * OCTAVE_ROTATION_COS) * lacunarity;
    sampleX = rotatedX;
  }
  return total / range;
}

export function ridgedMultifractal(
  noise: Noise2D,
  x: number,
  y: number,
  octaves: number,
  crestExponent: number,
  lacunarity = 2.1,
  feedback = 2,
): number {
  let sampleX = x;
  let sampleY = y;
  let amplitude = 1;
  let weight = 1;
  let total = 0;
  let range = 0;
  let rounding = CREST_ROUNDING;
  for (let octave = 0; octave < octaves; octave += 1) {
    const sampled = noise(sampleX, sampleY);
    const fold = Math.sqrt(sampled * sampled + rounding * rounding) - rounding;
    const crest = Math.pow(Math.max(0, 1 - fold), crestExponent) * weight;
    rounding *= CREST_ROUNDING_GROWTH;
    weight = Math.min(1, Math.max(0, crest * feedback));
    total += crest * amplitude;
    range += amplitude;
    amplitude *= 0.5;
    const rotatedX = (sampleX * OCTAVE_ROTATION_COS - sampleY * OCTAVE_ROTATION_SIN) * lacunarity;
    sampleY = (sampleX * OCTAVE_ROTATION_SIN + sampleY * OCTAVE_ROTATION_COS) * lacunarity;
    sampleX = rotatedX;
  }
  return total / range;
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
