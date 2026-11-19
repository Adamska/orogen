import { Color, Vector3, type IUniform, type Texture } from 'three';
import { TERRAIN_SEGMENTS, TERRAIN_SIZE } from '@/engine/worldConfig';

function uniform<T>(value: T): IUniform<T> {
  return { value };
}

export const worldUniforms = {
  uTime: uniform(0),
  uSunDirection: uniform(new Vector3(0, 1, 0)),
  uSunColor: uniform(new Color(1, 1, 1)),
  uSkyZenith: uniform(new Color()),
  uSkyHorizon: uniform(new Color()),
  uFogDensity: uniform(0),
  uAmplitude: uniform(1),
  uWaterLevel: uniform(0),
  uSnowLine: uniform(1),
  uTerrainSize: uniform(TERRAIN_SIZE),
  uFieldResolution: uniform(TERRAIN_SEGMENTS + 1),
  uElevationFrom: uniform<Texture | null>(null),
  uElevationTo: uniform<Texture | null>(null),
  uMorph: uniform(1),
  uFoliageScale: uniform(1),
  uSandColor: uniform(new Color()),
  uGrassColor: uniform(new Color()),
  uRockColor: uniform(new Color()),
  uSnowColor: uniform(new Color()),
  uWaterShallow: uniform(new Color()),
  uWaterDeep: uniform(new Color()),
};

export type WorldUniforms = typeof worldUniforms;
