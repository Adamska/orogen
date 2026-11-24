import { TerraformDirectiveSchema } from '@/ai/terraformSchema';
import { DEFAULT_WORLD, type WorldConfig } from '@/engine/worldConfig';

const LINK_KEY = 'w';
const LINK_VERSION = 1;
const SEED_LIMIT = 100000;

export interface WorldLink {
  readonly seed: number;
  readonly world: WorldConfig;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

export function encodeWorldLink({ seed, world }: WorldLink): string {
  return `${LINK_KEY}=${toBase64Url(JSON.stringify({ v: LINK_VERSION, seed, world }))}`;
}

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
