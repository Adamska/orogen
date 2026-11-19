import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { sampleField, type ElevationField, type FieldSample } from './elevationField';
import { createNoise2D, fbm, smoothstep } from './noise';
import { deriveSeed, mulberry32, type RandomSource } from './random';

export const TREE_CAPACITY = 6500;
export const BOULDER_CAPACITY = 1100;

export interface ScatterLayout {
  readonly count: number;
  readonly matrices: Float32Array;
  readonly placements: Float32Array;
}

export interface BiomeLayout {
  readonly trees: ScatterLayout;
  readonly boulders: ScatterLayout;
}

export interface ScatterRules {
  amplitude: number;
  snowLine: number;
}

interface Candidate {
  x: number;
  z: number;
  elevation: number;
  upness: number;
  exposure: number;
}

type Placer = (candidate: Candidate, random: RandomSource) => { scale: Vector3; tilt: number; sink: number } | null;

const ATTEMPTS_PER_INSTANCE = 14;
const COVERAGE = 0.47;
const MAX_TREE_EXPOSURE = 0.8;

function populate(
  field: ElevationField,
  rules: ScatterRules,
  capacity: number,
  salt: number,
  place: Placer,
): ScatterLayout {
  const random = mulberry32(deriveSeed(field.params.seed, salt));
  const matrices = new Float32Array(capacity * 16);
  const placements = new Float32Array(capacity * 3);
  const sample: FieldSample = { elevation: 0, gradientX: 0, gradientZ: 0, openness: 0 };
  const matrix = new Matrix4();
  const position = new Vector3();
  const rotation = new Quaternion();
  const euler = new Euler();
  let count = 0;

  for (let attempt = 0; attempt < capacity * ATTEMPTS_PER_INSTANCE && count < capacity; attempt += 1) {
    const x = (random() * 2 - 1) * field.size * COVERAGE;
    const z = (random() * 2 - 1) * field.size * COVERAGE;
    sampleField(field, x, z, sample);
    const rise = Math.hypot(sample.gradientX, sample.gradientZ) * rules.amplitude;
    const candidate = {
      x,
      z,
      elevation: sample.elevation,
      upness: 1 / Math.sqrt(1 + rise * rise),
      exposure: -sample.openness * rules.amplitude,
    };
    const placed = place(candidate, random);
    if (placed === null) continue;

    euler.set((random() - 0.5) * placed.tilt, random() * Math.PI * 2, (random() - 0.5) * placed.tilt);
    rotation.setFromEuler(euler);
    position.set(x, 0, z);
    matrix.compose(position, rotation, placed.scale);
    matrix.toArray(matrices, count * 16);
    placements[count * 3] = sample.elevation - placed.sink / rules.amplitude;
    placements[count * 3 + 1] = random();
    placements[count * 3 + 2] = random();
    count += 1;
  }
  return { count, matrices, placements };
}

export function scatterBiome(field: ElevationField, rules: ScatterRules): BiomeLayout {
  const groves = createNoise2D(deriveSeed(field.params.seed, 101));
  const treeLine = rules.snowLine - 0.1;
  const scale = new Vector3();

  const trees = populate(field, rules, TREE_CAPACITY, 131, (candidate, random) => {
    if (candidate.elevation < 0.02 || candidate.elevation > treeLine) return null;
    if (candidate.upness < 0.84 || candidate.exposure > MAX_TREE_EXPOSURE) return null;
    const grove = fbm(groves, candidate.x * 0.006, candidate.z * 0.006, 3);
    if (grove < random() * 0.4 - 0.15) return null;
    const thinning = 1 - smoothstep(treeLine - 0.22, treeLine, candidate.elevation);
    if (random() > 0.2 + thinning * 0.8) return null;
    const height = (9 + random() * 8) * (0.7 + thinning * 0.3);
    const girth = height * (0.82 + random() * 0.3);
    return { scale: scale.set(girth, height, girth), tilt: 0.08, sink: 0.4 };
  });

  const boulders = populate(field, rules, BOULDER_CAPACITY, 151, (candidate, random) => {
    if (candidate.elevation < 0.01 || candidate.upness < 0.5 || candidate.upness > 0.93) return null;
    const size = 1.2 + Math.pow(random(), 3) * 6;
    return {
      scale: scale.set(size * (0.8 + random() * 0.5), size * (0.6 + random() * 0.4), size),
      tilt: 1.2,
      sink: size * 0.3,
    };
  });

  return { trees, boulders };
}
