import { DEFAULT_SEED, DEFAULT_WORLD } from '@/engine/worldConfig';
import type { TerraformDirective } from './terraformSchema';

export interface TerraformPreset {
  readonly id: string;
  readonly label: string;
  readonly prompt: string;
  readonly keywords: readonly string[];
  readonly seed: number;
  readonly directive: TerraformDirective;
}

export const TERRAFORM_PRESETS: readonly TerraformPreset[] = [
  {
    id: 'nordic-fjord',
    label: 'Nordic Fjord',
    prompt: 'Nordic fjord at golden hour',
    keywords: ['nordic', 'fjord', 'norway', 'scandinavia', 'granite', 'golden', 'viking', 'coast'],
    seed: DEFAULT_SEED,
    directive: DEFAULT_WORLD,
  },
  {
    id: 'volcanic-archipelago',
    label: 'Obsidian Archipelago',
    prompt: 'Volcanic obsidian archipelago at twilight with crimson horizon',
    keywords: ['volcan', 'obsidian', 'lava', 'basalt', 'archipelago', 'ash', 'magma', 'crimson', 'island'],
    seed: 40213,
    directive: {
      name: 'Obsidian Archipelago at Twilight',
      summary: 'Black glass sea stacks smoulder beneath a bruised sky and a crimson afterglow.',
      terrain: { amplitude: 175, ridgeSharpness: 0.64, warpIntensity: 0.72, valleyDepth: 0.6 },
      waterLevel: 0.36,
      snowLine: 1.2,
      foliageDensity: 0.1,
      vegetation: 'palm',
      weather: 'clear',
      palette: {
        sand: '#2c2627', grass: '#4a3d2b', foliage: '#4b6a32', rock: '#221e24',
        snow: '#d9d2cf', waterShallow: '#2f6377', waterDeep: '#080f1c',
      },
      atmosphere: { sunElevation: 2.5, sunAzimuth: 250, skyZenith: '#1c1838', skyHorizon: '#cf3540', fogDensity: 0.4 },
    },
  },
  {
    id: 'alpine-valley',
    label: 'Emerald Alpine Valley',
    prompt: 'Misty emerald alpine valley at dawn',
    keywords: ['alpine', 'alps', 'valley', 'emerald', 'meadow', 'misty', 'mountain', 'swiss', 'pine', 'forest'],
    seed: 7719,
    directive: {
      name: 'Emerald Alpine Valley at Dawn',
      summary: 'Mist pools between wooded slopes while the first light warms the snowfields.',
      terrain: { amplitude: 235, ridgeSharpness: 0.88, warpIntensity: 0.4, valleyDepth: 0.62 },
      waterLevel: 0.12,
      snowLine: 0.55,
      foliageDensity: 0.95,
      vegetation: 'broadleaf',
      weather: 'clear',
      palette: {
        sand: '#9a917c', grass: '#2c7d3f', foliage: '#2f6b33', rock: '#5d6167',
        snow: '#f7fafc', waterShallow: '#4fb7a8', waterDeep: '#0f4a55',
      },
      atmosphere: { sunElevation: 13, sunAzimuth: 28, skyZenith: '#5f8fd0', skyHorizon: '#f3c7a8', fogDensity: 0.46 },
    },
  },
  {
    id: 'martian-canyon',
    label: 'Martian Canyon',
    prompt: 'Arid Martian canyon under a dusty amber sky',
    keywords: ['mars', 'martian', 'canyon', 'arid', 'desert', 'dusty', 'amber', 'mesa', 'red', 'dune', 'badlands'],
    seed: 2084,
    directive: {
      name: 'Martian Canyon under Amber Dust',
      summary: 'Rust mesas and dry riverbeds fade into a sky thick with suspended iron dust.',
      terrain: { amplitude: 180, ridgeSharpness: 0.34, warpIntensity: 0.85, valleyDepth: 1 },
      waterLevel: 0,
      snowLine: 1.2,
      foliageDensity: 0,
      vegetation: 'shrub',
      weather: 'clear',
      palette: {
        sand: '#b5673a', grass: '#9a4f2c', foliage: '#6e5230', rock: '#7a3a22',
        snow: '#e8c9a8', waterShallow: '#8a5a3c', waterDeep: '#3a2015',
      },
      atmosphere: { sunElevation: 24, sunAzimuth: 140, skyZenith: '#b9793f', skyHorizon: '#e2a05a', fogDensity: 0.55 },
    },
  },
  {
    id: 'arctic-shelf',
    label: 'Arctic Ice Shelf',
    prompt: 'Arctic glacier shelf under a pale polar sun',
    keywords: ['arctic', 'glacier', 'ice', 'polar', 'frozen', 'tundra', 'snow', 'winter', 'antarctic', 'frost'],
    seed: 61007,
    directive: {
      name: 'Arctic Shelf under a Polar Sun',
      summary: 'Wind-scoured ice domes break into a cold cyan sea beneath a low white sun.',
      terrain: { amplitude: 125, ridgeSharpness: 0.5, warpIntensity: 0.3, valleyDepth: 0.7 },
      waterLevel: 0.3,
      snowLine: 0.36,
      foliageDensity: 0,
      vegetation: 'conifer',
      weather: 'snow',
      palette: {
        sand: '#aab4bd', grass: '#8fa3ad', foliage: '#2b3f37', rock: '#56626d',
        snow: '#fbfdff', waterShallow: '#6fd0e0', waterDeep: '#0b3550',
      },
      atmosphere: { sunElevation: 16, sunAzimuth: 200, skyZenith: '#5b93d6', skyHorizon: '#dfeaf2', fogDensity: 0.3 },
    },
  },
  {
    id: 'tropical-atoll',
    label: 'Tropical Atoll',
    prompt: 'Tropical atoll lagoon at high noon',
    keywords: ['tropic', 'atoll', 'lagoon', 'reef', 'beach', 'paradise', 'caribbean', 'turquoise', 'jungle', 'noon'],
    seed: 33190,
    directive: {
      name: 'Tropical Atoll at High Noon',
      summary: 'Low jungle islets ring a glowing turquoise lagoon under a blazing overhead sun.',
      terrain: { amplitude: 95, ridgeSharpness: 0.2, warpIntensity: 0.6, valleyDepth: 0.5 },
      waterLevel: 0.42,
      snowLine: 1.2,
      foliageDensity: 0.85,
      vegetation: 'palm',
      weather: 'clear',
      palette: {
        sand: '#d9c391', grass: '#3f9a45', foliage: '#3f8c36', rock: '#7d7461',
        snow: '#ffffff', waterShallow: '#35e0cf', waterDeep: '#0a4f8a',
      },
      atmosphere: { sunElevation: 64, sunAzimuth: 160, skyZenith: '#1f6fd0', skyHorizon: '#bfe3f5', fogDensity: 0.12 },
    },
  },
];
