import { TerraformDirectiveSchema } from '@/ai/terraformSchema';
import { DEFAULT_WORLD, type WorldConfig } from '@/engine/worldConfig';
import { LINK_KEY, SEED_LIMIT, fromBase64Url, type WorldLink } from './worldLink';

export function decodeWorldLink(hash: string): WorldLink | null {
  const encoded = new URLSearchParams(hash.replace(/^#/, '')).get(LINK_KEY);
  if (!encoded) return null;
  try {
    const payload: unknown = JSON.parse(fromBase64Url(encoded));
    if (typeof payload !== 'object' || payload === null) return null;
    const { seed, world } = payload as { seed?: unknown; world?: unknown };
    if (typeof seed !== 'number' || !Number.isInteger(seed) || seed < 0 || seed >= SEED_LIMIT) return null;
    const draft = (typeof world === 'object' && world !== null ? world : {}) as Partial<WorldConfig>;
    const merged = {
      ...DEFAULT_WORLD,
      ...draft,
      terrain: { ...DEFAULT_WORLD.terrain, ...draft.terrain },
      palette: { ...DEFAULT_WORLD.palette, ...draft.palette },
      atmosphere: { ...DEFAULT_WORLD.atmosphere, ...draft.atmosphere },
    };
    const parsed = TerraformDirectiveSchema.safeParse(merged);
    return parsed.success ? { seed, world: parsed.data } : null;
  } catch {
    return null;
  }
}
