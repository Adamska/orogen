import type { WorldConfig } from '@/engine/worldConfig';

export const LINK_KEY = 'w';
const LINK_VERSION = 1;
export const SEED_LIMIT = 100000;

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

export function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

export function encodeWorldLink({ seed, world }: WorldLink): string {
  return `${LINK_KEY}=${toBase64Url(JSON.stringify({ v: LINK_VERSION, seed, world }))}`;
}

export function hasWorldLink(hash: string): boolean {
  return new URLSearchParams(hash.replace(/^#/, '')).has(LINK_KEY);
}
