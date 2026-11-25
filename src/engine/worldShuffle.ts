import type { WeatherKind, WorldConfig } from './worldConfig';

type Random = () => number;

const NIGHT_CHANCE = 0.1;
const VOLCANIC_CHANCE = 0.22;

function weatherFrom(roll: number): WeatherKind {
  if (roll < 0.6) return 'clear';
  return roll < 0.8 ? 'rain' : 'snow';
}

export function shuffleWorld(world: WorldConfig, random: Random = Math.random): WorldConfig {
  const between = (min: number, max: number) => min + (max - min) * random();
  return {
    ...world,
    terrain: {
      amplitude: between(90, 240),
      ridgeSharpness: random(),
      warpIntensity: random(),
      valleyDepth: random(),
    },
    waterLevel: between(0.04, 0.42),
    snowLine: between(0.45, 1.1),
    foliageDensity: between(0.3, 1),
    volcanism: random() < VOLCANIC_CHANCE ? between(0.25, 0.9) : 0,
    weather: weatherFrom(random()),
    atmosphere: {
      ...world.atmosphere,
      sunElevation: random() < NIGHT_CHANCE ? between(-3, 3) : between(4, 62),
      sunAzimuth: between(0, 360),
      fogDensity: between(0.05, 0.5),
    },
  };
}
