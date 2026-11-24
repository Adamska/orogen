import type { WorldConfig } from '@/engine/worldConfig';

const MAX_NOTES = 6;
const percent = (value: number) => `${Math.round(value * 100)}%`;
const degrees = (value: number) => `${Math.round(value)}°`;

const VEGETATION_NOTES = {
  conifer: 'Planting conifer forests',
  broadleaf: 'Growing broadleaf woodland',
  palm: 'Seeding palm groves along the coast',
  shrub: 'Scattering hardy scrub',
} as const;

const WEATHER_NOTES = {
  clear: 'Clearing the skies',
  rain: 'Rolling in a rainstorm',
  snow: 'Bringing in snowfall',
} as const;

function shifted(previous: number, next: number, threshold: number): boolean {
  return Math.abs(previous - next) >= threshold;
}

export function describeTerraform(previous: WorldConfig, next: WorldConfig): string[] {
  const notes: string[] = [];
  const terrain = next.terrain;

  if (shifted(previous.terrain.amplitude, terrain.amplitude, 10)) {
    const verb = terrain.amplitude > previous.terrain.amplitude ? 'Uplifting' : 'Eroding';
    notes.push(`${verb} relief to ${Math.round(terrain.amplitude)} m`);
  }
  if (shifted(previous.terrain.ridgeSharpness, terrain.ridgeSharpness, 0.12)) {
    const verb = terrain.ridgeSharpness > previous.terrain.ridgeSharpness ? 'Sharpening' : 'Softening';
    notes.push(`${verb} ridgelines to ${percent(terrain.ridgeSharpness)}`);
  }
  if (shifted(previous.terrain.valleyDepth, terrain.valleyDepth, 0.12)) {
    notes.push(`Carving valleys ${percent(terrain.valleyDepth)} deep`);
  }
  if (shifted(previous.waterLevel, next.waterLevel, 0.04)) {
    const verb = next.waterLevel > previous.waterLevel ? 'Flooding lowlands' : 'Draining the basins';
    notes.push(`${verb}: sea level ${percent(previous.waterLevel)} to ${percent(next.waterLevel)}`);
  }
  if (next.volcanism > 0.3 && previous.volcanism <= 0.3) notes.push('Igniting lava flows');
  if (next.volcanism <= 0.3 && previous.volcanism > 0.3) notes.push('Cooling the lava fields');
  if (next.vegetation !== previous.vegetation && next.foliageDensity > 0.05) {
    notes.push(VEGETATION_NOTES[next.vegetation]);
  } else if (shifted(previous.foliageDensity, next.foliageDensity, 0.2)) {
    notes.push(`Adjusting tree cover to ${percent(next.foliageDensity)}`);
  }
  if (shifted(previous.snowLine, next.snowLine, 0.12)) {
    notes.push(next.snowLine >= 1.15 ? 'Melting every snowfield' : `Settling snow above ${percent(next.snowLine)} altitude`);
  }
  if (
    shifted(previous.atmosphere.sunElevation, next.atmosphere.sunElevation, 4) ||
    shifted(previous.atmosphere.sunAzimuth, next.atmosphere.sunAzimuth, 20)
  ) {
    notes.push(`Moving the sun to ${degrees(next.atmosphere.sunElevation)} at ${degrees(next.atmosphere.sunAzimuth)} bearing`);
  }
  if (next.weather !== previous.weather) notes.push(WEATHER_NOTES[next.weather]);
  if (next.atmosphere.skyHorizon !== previous.atmosphere.skyHorizon) notes.push('Repainting the horizon');

  return notes.length > 0 ? notes.slice(0, MAX_NOTES) : ['Refining palette and light'];
}
