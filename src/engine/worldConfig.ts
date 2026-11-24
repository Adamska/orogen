export const TERRAIN_SIZE = 1200;
export const TERRAIN_SEGMENTS = 512;
export const HORIZON_RADIUS = 9000;
export const DEFAULT_SEED = 1837;

export const VEGETATION_KINDS = ['conifer', 'broadleaf', 'palm', 'shrub'] as const;
export type VegetationKind = (typeof VEGETATION_KINDS)[number];

export interface TerrainShape {
  amplitude: number;
  ridgeSharpness: number;
  warpIntensity: number;
  valleyDepth: number;
}

export interface BiomePalette {
  sand: string;
  grass: string;
  foliage: string;
  rock: string;
  snow: string;
  waterShallow: string;
  waterDeep: string;
}

export interface AtmosphereState {
  sunElevation: number;
  sunAzimuth: number;
  skyZenith: string;
  skyHorizon: string;
  fogDensity: number;
}

export interface WorldConfig {
  name: string;
  summary: string;
  terrain: TerrainShape;
  waterLevel: number;
  snowLine: number;
  foliageDensity: number;
  vegetation: VegetationKind;
  palette: BiomePalette;
  atmosphere: AtmosphereState;
}

export interface NumericRange {
  readonly min: number;
  readonly max: number;
}

export const WORLD_LIMITS = {
  amplitude: { min: 60, max: 260 },
  ridgeSharpness: { min: 0, max: 1 },
  warpIntensity: { min: 0, max: 1 },
  valleyDepth: { min: 0, max: 1 },
  waterLevel: { min: 0, max: 0.6 },
  snowLine: { min: 0.3, max: 1.2 },
  foliageDensity: { min: 0, max: 1 },
  sunElevation: { min: -4, max: 85 },
  sunAzimuth: { min: 0, max: 360 },
  fogDensity: { min: 0, max: 1 },
} as const satisfies Record<string, NumericRange>;

export const DEFAULT_WORLD: WorldConfig = {
  name: 'Nordic Fjord at Golden Hour',
  summary: 'Glacier-carved granite walls plunge into still teal water under a low amber sun.',
  terrain: { amplitude: 200, ridgeSharpness: 0.78, warpIntensity: 0.55, valleyDepth: 0.84 },
  waterLevel: 0.21,
  snowLine: 0.6,
  foliageDensity: 0.72,
  vegetation: 'conifer',
  palette: {
    sand: '#8f7d66',
    grass: '#50692f',
    foliage: '#3d5a2e',
    rock: '#625d5c',
    snow: '#f3f6fb',
    waterShallow: '#2e9596',
    waterDeep: '#0a3a57',
  },
  atmosphere: {
    sunElevation: 7,
    sunAzimuth: 292,
    skyZenith: '#3566a6',
    skyHorizon: '#f2a765',
    fogDensity: 0.26,
  },
};
