import { create } from 'zustand';
import {
  DEFAULT_SEED,
  DEFAULT_WORLD,
  type AtmosphereState,
  type WorldConfig,
} from '@/engine/worldConfig';

export interface WorldStore {
  world: WorldConfig;
  seed: number;
  autoOrbit: boolean;
  applyWorld: (world: WorldConfig, seed?: number) => void;
  setAtmosphere: (patch: Partial<AtmosphereState>) => void;
  setWaterLevel: (waterLevel: number) => void;
  setFoliageDensity: (foliageDensity: number) => void;
  regenerateSeed: () => void;
  toggleAutoOrbit: () => void;
}

const SEED_SPACE = 100000;

export const useWorldStore = create<WorldStore>((set) => ({
  world: DEFAULT_WORLD,
  seed: DEFAULT_SEED,
  autoOrbit: true,
  applyWorld: (world, seed) => set((state) => ({ world, seed: seed ?? state.seed })),
  setAtmosphere: (patch) =>
    set((state) => ({
      world: { ...state.world, atmosphere: { ...state.world.atmosphere, ...patch } },
    })),
  setWaterLevel: (waterLevel) => set((state) => ({ world: { ...state.world, waterLevel } })),
  setFoliageDensity: (foliageDensity) =>
    set((state) => ({ world: { ...state.world, foliageDensity } })),
  regenerateSeed: () => set({ seed: Math.floor(Math.random() * SEED_SPACE) }),
  toggleAutoOrbit: () => set((state) => ({ autoOrbit: !state.autoOrbit })),
}));
