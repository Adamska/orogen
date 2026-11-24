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
  calibrate: () => void;
  shift: (direction: 1 | -1) => void;
}

export const useQualityStore = create<QualityStore>((set) => ({
  tier: 'high',
  calibrate: () => {
    const handheld = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
    set({ tier: handheld ? 'medium' : 'high' });
  },
  shift: (direction) =>
    set((state) => {
      const index = QUALITY_TIERS.indexOf(state.tier) + direction;
      return { tier: QUALITY_TIERS[Math.min(QUALITY_TIERS.length - 1, Math.max(0, index))] };
    }),
}));

export function useQualityProfile(): QualityProfile {
  return QUALITY_PROFILES[useQualityStore((state) => state.tier)];
}
