import { create } from 'zustand';

export type QualityTier = 'low' | 'medium' | 'high';

export interface QualityProfile {
  readonly maxPixelRatio: number;
  readonly shadowMapSize: number;
  readonly foliageScale: number;
  readonly multisampling: number;
  readonly cloudSteps: number;
  readonly meshResolution: number;
}

export const QUALITY_TIERS: readonly QualityTier[] = ['low', 'medium', 'high'];

export const QUALITY_PROFILES: Record<QualityTier, QualityProfile> = {
  low: { maxPixelRatio: 1, shadowMapSize: 1024, foliageScale: 0.45, multisampling: 0, cloudSteps: 6, meshResolution: 257 },
  medium: { maxPixelRatio: 1.25, shadowMapSize: 2048, foliageScale: 0.72, multisampling: 2, cloudSteps: 10, meshResolution: 385 },
  high: { maxPixelRatio: 1.75, shadowMapSize: 4096, foliageScale: 1, multisampling: 4, cloudSteps: 14, meshResolution: 513 },
};

interface QualityStore {
  tier: QualityTier;
  baseline: QualityTier;
  declines: number;
  quietUntil: number;
  calibrate: () => void;
  shift: (direction: 1 | -1) => void;
  holdSteady: (milliseconds: number) => void;
}

const BOOT_SETTLE_MS = 5000;
const SHIFT_COOLDOWN_MS = 8000;
const MAX_DECLINES_BEFORE_LOCK = 2;

export const useQualityStore = create<QualityStore>((set) => ({
  tier: 'high',
  baseline: 'high',
  declines: 0,
  quietUntil: 0,
  calibrate: () => {
    const handheld = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
    const tier = handheld ? 'medium' : 'high';
    set({ tier, baseline: tier, quietUntil: performance.now() + BOOT_SETTLE_MS });
  },
  shift: (direction) =>
    set((state) => {
      const now = performance.now();
      if (now < state.quietUntil) return state;
      if (direction > 0 && state.declines >= MAX_DECLINES_BEFORE_LOCK) return state;
      const index = Math.min(QUALITY_TIERS.length - 1, Math.max(0, QUALITY_TIERS.indexOf(state.tier) + direction));
      if (QUALITY_TIERS[index] === state.tier) return state;
      return {
        tier: QUALITY_TIERS[index],
        declines: state.declines + (direction < 0 ? 1 : 0),
        quietUntil: now + SHIFT_COOLDOWN_MS,
      };
    }),
  holdSteady: (milliseconds) =>
    set((state) => ({ quietUntil: Math.max(state.quietUntil, performance.now() + milliseconds) })),
}));

export function useQualityProfile(): QualityProfile {
  return QUALITY_PROFILES[useQualityStore((state) => state.tier)];
}
