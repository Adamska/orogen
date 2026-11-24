import { hashString } from '@/engine/random';
import type { VegetationKind, WeatherKind } from '@/engine/worldConfig';
import { TERRAFORM_PRESETS, type TerraformPreset } from './presets';
import { sanitizeDirective, type TerraformDirective, type TerraformResponse } from './terraformSchema';

type Modifier = (draft: TerraformDirective) => void;

interface LexiconEntry {
  readonly terms: readonly string[];
  readonly apply: Modifier;
}

const SEED_SPACE = 100000;

function blendHex(from: string, to: string, amount: number): string {
  const channel = (offset: number) => {
    const a = parseInt(from.slice(offset, offset + 2), 16);
    const b = parseInt(to.slice(offset, offset + 2), 16);
    return Math.round(a + (b - a) * amount).toString(16).padStart(2, '0');
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

function sky(elevation: number, azimuth: number, zenith: string, horizon: string, amount = 0.7): Modifier {
  return (draft) => {
    draft.atmosphere.sunElevation = elevation;
    draft.atmosphere.sunAzimuth = azimuth;
    draft.atmosphere.skyZenith = blendHex(draft.atmosphere.skyZenith, zenith, amount);
    draft.atmosphere.skyHorizon = blendHex(draft.atmosphere.skyHorizon, horizon, amount);
  };
}

function horizonTint(tint: string): Modifier {
  return (draft) => {
    draft.atmosphere.skyHorizon = blendHex(draft.atmosphere.skyHorizon, tint, 0.75);
  };
}

function plants(kind: VegetationKind): Modifier {
  return (draft) => {
    draft.vegetation = kind;
  };
}

function precipitation(kind: WeatherKind): Modifier {
  return (draft) => {
    draft.weather = kind;
  };
}

const LEXICON: readonly LexiconEntry[] = [
  { terms: ['rain', 'rainy', 'storm', 'stormy', 'drizzle', 'monsoon', 'downpour', 'thunderstorm'], apply: precipitation('rain') },
  { terms: ['snowfall', 'snowing', 'blizzard', 'snowstorm', 'flurries'], apply: precipitation('snow') },
  { terms: ['pine', 'taiga', 'boreal', 'spruce', 'fir', 'conifer'], apply: plants('conifer') },
  { terms: ['oak', 'autumn', 'deciduous', 'temperate', 'woodland', 'maple', 'birch'], apply: plants('broadleaf') },
  { terms: ['palm', 'tropical', 'jungle', 'coconut', 'paradise'], apply: plants('palm') },
  { terms: ['scrub', 'savanna', 'steppe', 'cactus', 'chaparral', 'outback'], apply: plants('shrub') },
  { terms: ['autumn', 'fall'], apply: (draft) => { draft.palette.foliage = blendHex(draft.palette.foliage, '#b8642a', 0.55); } },
  { terms: ['dawn', 'sunrise', 'morning', 'daybreak'], apply: sky(7, 98, '#6a94d2', '#f4bfa6') },
  { terms: ['golden', 'sunset', 'dusk', 'evening'], apply: sky(7, 288, '#3566a6', '#f2a765') },
  { terms: ['twilight', 'night', 'midnight', 'moonlit', 'nocturnal'], apply: sky(1.5, 262, '#141a3c', '#5a4a78', 0.6) },
  { terms: ['noon', 'midday', 'sunny', 'bright', 'daylight'], apply: sky(62, 165, '#2a6fc8', '#bcd9f0') },
  { terms: ['crimson', 'red', 'scarlet', 'blood'], apply: horizonTint('#cc3038') },
  { terms: ['amber', 'orange', 'copper', 'ochre'], apply: horizonTint('#e39a42') },
  { terms: ['violet', 'purple', 'magenta', 'lavender'], apply: horizonTint('#8a55c8') },
  { terms: ['pink', 'rose', 'blush', 'pastel'], apply: horizonTint('#f0a3b8') },
  { terms: ['emerald', 'verdant', 'green'], apply: (draft) => { draft.palette.grass = blendHex(draft.palette.grass, '#2f8f4e', 0.7); draft.palette.foliage = blendHex(draft.palette.foliage, '#2b7a3c', 0.6); } },
  { terms: ['turquoise', 'teal', 'azure', 'cyan'], apply: (draft) => { draft.palette.waterShallow = blendHex(draft.palette.waterShallow, '#2fd0c8', 0.7); } },
  { terms: ['mist', 'misty', 'fog', 'foggy', 'haze', 'hazy', 'dusty', 'smoky', 'storm'], apply: (draft) => { draft.atmosphere.fogDensity += 0.3; } },
  { terms: ['clear', 'crisp', 'pristine'], apply: (draft) => { draft.atmosphere.fogDensity = 0.08; } },
  { terms: ['jagged', 'sharp', 'towering', 'peaks', 'spires', 'dramatic'], apply: (draft) => { draft.terrain.ridgeSharpness += 0.22; draft.terrain.amplitude += 35; } },
  { terms: ['rolling', 'gentle', 'soft', 'hills', 'smooth', 'calm'], apply: (draft) => { draft.terrain.ridgeSharpness -= 0.35; draft.terrain.amplitude -= 55; } },
  { terms: ['canyon', 'gorge', 'ravine', 'fjord', 'chasm'], apply: (draft) => { draft.terrain.valleyDepth += 0.3; } },
  { terms: ['alien', 'twisted', 'warped', 'surreal', 'swirling'], apply: (draft) => { draft.terrain.warpIntensity += 0.35; } },
  { terms: ['archipelago', 'islands', 'flooded', 'lagoon', 'drowned'], apply: (draft) => { draft.waterLevel += 0.12; } },
  { terms: ['arid', 'dry', 'desert', 'drought', 'parched'], apply: (draft) => { draft.waterLevel = Math.min(draft.waterLevel, 0.02); draft.foliageDensity -= 0.5; draft.snowLine = 1.2; } },
  { terms: ['lush', 'forest', 'jungle', 'wooded', 'overgrown'], apply: (draft) => { draft.foliageDensity += 0.35; } },
  { terms: ['barren', 'lifeless', 'bare', 'desolate', 'dead'], apply: (draft) => { draft.foliageDensity = 0; } },
  { terms: ['snowy', 'frozen', 'icy', 'winter', 'blizzard', 'glacial'], apply: (draft) => { draft.snowLine -= 0.25; } },
];

function tokenize(prompt: string): string[] {
  return prompt.toLowerCase().split(/[^a-z]+/).filter((token) => token.length > 2);
}

function scorePreset(preset: TerraformPreset, tokens: readonly string[]): number {
  return preset.keywords.reduce(
    (score, keyword) => score + (tokens.some((token) => token.startsWith(keyword)) ? 1 : 0),
    0,
  );
}

function titleCase(prompt: string): string {
  return prompt
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export function resolveLocally(prompt: string): TerraformResponse {
  const normalized = prompt.trim().toLowerCase();
  const exact = TERRAFORM_PRESETS.find((preset) => preset.prompt.toLowerCase() === normalized);
  if (exact) return { directive: exact.directive, seed: exact.seed, source: 'local' };

  const tokens = tokenize(prompt);
  const hash = hashString(normalized);
  const ranked = TERRAFORM_PRESETS.map((preset) => ({ preset, score: scorePreset(preset, tokens) })).sort(
    (a, b) => b.score - a.score,
  );
  const base =
    ranked[0].score > 0 ? ranked[0].preset : TERRAFORM_PRESETS[hash % TERRAFORM_PRESETS.length];

  const draft = structuredClone(base.directive) as TerraformDirective;
  for (const entry of LEXICON) {
    if (entry.terms.some((term) => tokens.includes(term))) entry.apply(draft);
  }
  draft.name = titleCase(prompt);

  return { directive: sanitizeDirective(draft), seed: hash % SEED_SPACE, source: 'local' };
}
