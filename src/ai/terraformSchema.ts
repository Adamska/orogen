import { z } from 'zod';
import { VEGETATION_KINDS, WORLD_LIMITS, type NumericRange, type WorldConfig } from '@/engine/worldConfig';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const NAME_LIMIT = 48;
const SUMMARY_LIMIT = 140;
export const PROMPT_LIMIT = 240;

function ranged(range: NumericRange, description: string) {
  return z.number().min(range.min).max(range.max).describe(description);
}

function color(description: string) {
  return z.string().regex(HEX_COLOR).describe(`${description} Six digit hex color such as #4f6b34.`);
}

export const TerraformDirectiveSchema = z.object({
  name: z.string().describe('Evocative title case name for the world, at most six words.'),
  summary: z.string().describe('One cinematic sentence describing the landscape and light.'),
  terrain: z.object({
    amplitude: ranged(WORLD_LIMITS.amplitude, 'Vertical relief. 80 is low rolling land, 250 is a towering massif.'),
    ridgeSharpness: ranged(WORLD_LIMITS.ridgeSharpness, '0 gives soft eroded hills, 1 gives knife-edge alpine crests.'),
    warpIntensity: ranged(WORLD_LIMITS.warpIntensity, 'Domain warping. 0 is orderly, 1 is twisted, folded and alien.'),
    valleyDepth: ranged(WORLD_LIMITS.valleyDepth, 'Depth of carved channels. 1 cuts fjords and canyons to the floor.'),
  }),
  waterLevel: ranged(WORLD_LIMITS.waterLevel, 'Sea level as a fraction of relief. 0 is a dry world, 0.4 is an archipelago.'),
  snowLine: ranged(WORLD_LIMITS.snowLine, 'Relative altitude where snow begins. Use 1.2 for no snow at all.'),
  foliageDensity: ranged(WORLD_LIMITS.foliageDensity, 'Tree coverage. 0 is barren, 1 is dense woodland.'),
  vegetation: z
    .enum(VEGETATION_KINDS)
    .describe('Dominant plant form: conifer for boreal and alpine, broadleaf for temperate, palm for tropical coasts, shrub for arid scrub.'),
  palette: z.object({
    sand: color('Shoreline and beach sediment.'),
    grass: color('Lowland ground cover such as moss, grass, lichen or regolith.'),
    foliage: color('Tree canopy leaves or needles.'),
    rock: color('Cliff and scree bedrock.'),
    snow: color('High altitude snow or frost.'),
    waterShallow: color('Shallow water over the shelf.'),
    waterDeep: color('Deep open water.'),
  }),
  atmosphere: z.object({
    sunElevation: ranged(WORLD_LIMITS.sunElevation, 'Sun height in degrees. 2 is twilight, 8 is golden hour, 60 is noon.'),
    sunAzimuth: ranged(WORLD_LIMITS.sunAzimuth, 'Compass bearing of the sun in degrees.'),
    skyZenith: color('Sky color straight overhead.'),
    skyHorizon: color('Sky and haze color at the horizon.'),
    fogDensity: ranged(WORLD_LIMITS.fogDensity, 'Low lying haze. 0.1 is crisp air, 0.7 is thick valley mist.'),
  }),
}) satisfies z.ZodType<WorldConfig>;

export type TerraformDirective = z.infer<typeof TerraformDirectiveSchema>;

export const TerraformRequestSchema = z.object({
  prompt: z.string().trim().min(2).max(PROMPT_LIMIT),
});

export const TerraformResponseSchema = z.object({
  directive: TerraformDirectiveSchema,
  seed: z.number().int().nonnegative(),
  source: z.enum(['model', 'local']),
});

export type TerraformResponse = z.infer<typeof TerraformResponseSchema>;

function clamp(value: number, range: NumericRange): number {
  return Math.min(range.max, Math.max(range.min, value));
}

function clip(text: string, limit: number): string {
  const trimmed = text.trim();
  return trimmed.length > limit ? `${trimmed.slice(0, limit - 3).trimEnd()}...` : trimmed;
}

export function sanitizeDirective(draft: TerraformDirective): TerraformDirective {
  return TerraformDirectiveSchema.parse({
    name: clip(draft.name, NAME_LIMIT),
    summary: clip(draft.summary, SUMMARY_LIMIT),
    terrain: {
      amplitude: clamp(draft.terrain.amplitude, WORLD_LIMITS.amplitude),
      ridgeSharpness: clamp(draft.terrain.ridgeSharpness, WORLD_LIMITS.ridgeSharpness),
      warpIntensity: clamp(draft.terrain.warpIntensity, WORLD_LIMITS.warpIntensity),
      valleyDepth: clamp(draft.terrain.valleyDepth, WORLD_LIMITS.valleyDepth),
    },
    waterLevel: clamp(draft.waterLevel, WORLD_LIMITS.waterLevel),
    snowLine: clamp(draft.snowLine, WORLD_LIMITS.snowLine),
    foliageDensity: clamp(draft.foliageDensity, WORLD_LIMITS.foliageDensity),
    vegetation: draft.vegetation,
    palette: { ...draft.palette },
    atmosphere: {
      ...draft.atmosphere,
      sunElevation: clamp(draft.atmosphere.sunElevation, WORLD_LIMITS.sunElevation),
      sunAzimuth: ((draft.atmosphere.sunAzimuth % 360) + 360) % 360,
      fogDensity: clamp(draft.atmosphere.fogDensity, WORLD_LIMITS.fogDensity),
    },
  });
}
