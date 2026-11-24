import { Color, MathUtils, Vector3 } from 'three';
import type { BiomePalette, WorldConfig } from '@/engine/worldConfig';
import { advanceDayCycle, dayCycle, type SunPosition } from './dayCycle';
import { worldUniforms } from './worldUniforms';

const TRANSITION_RATE = 2.6;
const MORPH_SECONDS = 1.9;
const FOLIAGE_RATE = 5.5;
const SUN_INTENSITY = 1.7;
const LOW_SUN = new Color(1.0, 0.54, 0.26);
const HIGH_SUN = new Color(1.0, 0.95, 0.86);
const MOONLIGHT = new Color(0.5, 0.62, 0.95).multiplyScalar(0.36);
const MOON_SWITCH_HEIGHT = -0.065;
const MOON_TILT = new Vector3(0.2, 0, 0.35);

const PALETTE_UNIFORMS = {
  sand: worldUniforms.uSandColor,
  grass: worldUniforms.uGrassColor,
  foliage: worldUniforms.uFoliageColor,
  rock: worldUniforms.uRockColor,
  snow: worldUniforms.uSnowColor,
  waterShallow: worldUniforms.uWaterShallow,
  waterDeep: worldUniforms.uWaterDeep,
} as const satisfies Record<keyof BiomePalette, { value: Color }>;

const PALETTE_KEYS = Object.keys(PALETTE_UNIFORMS) as (keyof BiomePalette)[];

const target = {
  amplitude: 1,
  waterLevel: 0,
  snowLine: 1,
  fogDensity: 0,
  sunElevation: 45,
  sunAzimuth: 0,
  skyZenith: new Color(),
  skyHorizon: new Color(),
  palette: Object.fromEntries(PALETTE_KEYS.map((key) => [key, new Color()])) as Record<
    keyof BiomePalette,
    Color
  >,
};

export const worldRuntime = {
  initialized: false,
  morphProgress: 1,
  rebuildPending: false,
  sunElevation: 45,
  sunAzimuth: 0,
  targetSunAzimuth: 0,
};

const horizonTint = new Color();
const cycleSun: SunPosition = { elevation: 0, azimuth: 0 };

export function syncWorldTargets(world: WorldConfig): void {
  target.amplitude = world.terrain.amplitude;
  target.waterLevel = world.waterLevel;
  target.snowLine = world.snowLine;
  target.fogDensity = world.atmosphere.fogDensity;
  target.sunElevation = world.atmosphere.sunElevation;
  target.sunAzimuth = world.atmosphere.sunAzimuth;
  worldRuntime.targetSunAzimuth = world.atmosphere.sunAzimuth;
  target.skyZenith.set(world.atmosphere.skyZenith);
  target.skyHorizon.set(world.atmosphere.skyHorizon);
  for (const key of PALETTE_KEYS) target.palette[key].set(world.palette[key]);
}

export function beginTerrainMorph(animated: boolean): void {
  worldRuntime.morphProgress = animated ? 0 : 1;
  worldRuntime.rebuildPending = false;
  worldUniforms.uMorph.value = animated ? 0 : 1;
}

function updateSun(): void {
  const elevation = MathUtils.degToRad(worldRuntime.sunElevation);
  const azimuth = MathUtils.degToRad(worldRuntime.sunAzimuth);
  const height = Math.sin(elevation);
  worldUniforms.uSunDirection.value.set(
    Math.cos(elevation) * Math.sin(azimuth),
    height,
    Math.cos(elevation) * Math.cos(azimuth),
  );

  const clarity = MathUtils.smoothstep(height, 0, 0.42);
  const horizon = worldUniforms.uSkyHorizon.value;
  const peak = Math.max(horizon.r, horizon.g, horizon.b, 1e-3);
  horizonTint.copy(horizon).multiplyScalar(1 / peak);
  const intensity =
    SUN_INTENSITY * MathUtils.smoothstep(height, -0.07, 0.1) * MathUtils.lerp(0.95, 0.86, clarity);
  worldUniforms.uSunColor.value
    .copy(LOW_SUN)
    .lerp(HIGH_SUN, clarity)
    .lerp(horizonTint, 0.25 * (1 - clarity))
    .multiplyScalar(intensity);

  const sun = worldUniforms.uSunDirection.value;
  const night = MathUtils.smoothstep(-height, 0.05, 0.22);
  worldUniforms.uNight.value = night;
  worldUniforms.uMoonDirection.value
    .set(-sun.x, Math.abs(sun.y) * 0.85 + 0.16, -sun.z)
    .add(MOON_TILT)
    .normalize();
  if (height > MOON_SWITCH_HEIGHT) {
    worldUniforms.uLightDirection.value.copy(sun);
    worldUniforms.uLightColor.value.copy(worldUniforms.uSunColor.value);
  } else {
    worldUniforms.uLightDirection.value.copy(worldUniforms.uMoonDirection.value);
    worldUniforms.uLightColor.value.copy(MOONLIGHT).multiplyScalar(night);
  }
}

export function stepWorld(delta: number): void {
  const step = Math.min(delta, 0.1);
  const blend = worldRuntime.initialized ? 1 - Math.exp(-step * TRANSITION_RATE) : 1;
  worldRuntime.initialized = true;
  worldUniforms.uTime.value += step;

  const lerp = MathUtils.lerp;
  worldUniforms.uAmplitude.value = lerp(worldUniforms.uAmplitude.value, target.amplitude, blend);
  worldUniforms.uWaterLevel.value = lerp(worldUniforms.uWaterLevel.value, target.waterLevel, blend);
  worldUniforms.uSnowLine.value = lerp(worldUniforms.uSnowLine.value, target.snowLine, blend);
  worldUniforms.uFogDensity.value = lerp(worldUniforms.uFogDensity.value, target.fogDensity, blend);
  worldUniforms.uSkyZenith.value.lerp(target.skyZenith, blend);
  worldUniforms.uSkyHorizon.value.lerp(target.skyHorizon, blend);
  for (const key of PALETTE_KEYS) PALETTE_UNIFORMS[key].value.lerp(target.palette[key], blend);

  const sunTarget = dayCycle.active
    ? advanceDayCycle(step, cycleSun)
    : { elevation: target.sunElevation, azimuth: target.sunAzimuth };
  const turn = ((sunTarget.azimuth - worldRuntime.sunAzimuth + 540) % 360) - 180;
  worldRuntime.sunAzimuth = (worldRuntime.sunAzimuth + turn * blend + 360) % 360;
  worldRuntime.sunElevation = lerp(worldRuntime.sunElevation, sunTarget.elevation, blend);
  updateSun();

  if (worldRuntime.morphProgress < 1) {
    worldRuntime.morphProgress = Math.min(1, worldRuntime.morphProgress + step / MORPH_SECONDS);
    worldUniforms.uMorph.value = MathUtils.smootherstep(worldRuntime.morphProgress, 0, 1);
  }
  const foliageTarget = worldRuntime.rebuildPending || worldRuntime.morphProgress < 0.8 ? 0 : 1;
  worldUniforms.uFoliageScale.value = lerp(
    worldUniforms.uFoliageScale.value,
    foliageTarget,
    1 - Math.exp(-step * FOLIAGE_RATE),
  );
}
