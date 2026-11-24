import { create } from 'zustand';
import type { TerraformPreset } from '@/ai/presets';
import { requestTerraform } from '@/ai/requestTerraform';
import type { WorldLink } from './worldLink';
import {
  DEFAULT_SEED,
  DEFAULT_WORLD,
  type AtmosphereState,
  type WorldConfig,
} from '@/engine/worldConfig';

export type WorldOrigin = 'preset' | 'model' | 'local' | 'shared';

export interface WorldStore {
  world: WorldConfig;
  seed: number;
  origin: WorldOrigin;
  autoOrbit: boolean;
  timeLapse: boolean;
  commandOpen: boolean;
  directing: boolean;
  flightToken: number;
  applyPreset: (preset: TerraformPreset) => void;
  loadShared: (link: WorldLink) => void;
  direct: (prompt: string) => Promise<void>;
  setAtmosphere: (patch: Partial<AtmosphereState>) => void;
  setWaterLevel: (waterLevel: number) => void;
  setFoliageDensity: (foliageDensity: number) => void;
  regenerateSeed: () => void;
  toggleAutoOrbit: () => void;
  setAutoOrbit: (autoOrbit: boolean) => void;
  toggleTimeLapse: () => void;
  setCommandOpen: (commandOpen: boolean) => void;
}

const SEED_SPACE = 100000;

export const useWorldStore = create<WorldStore>((set, get) => ({
  world: DEFAULT_WORLD,
  seed: DEFAULT_SEED,
  origin: 'preset',
  autoOrbit: true,
  timeLapse: false,
  commandOpen: false,
  directing: false,
  flightToken: 0,
  applyPreset: (preset) =>
    set((state) => ({
      world: preset.directive,
      seed: preset.seed,
      origin: 'preset',
      commandOpen: false,
      flightToken: state.flightToken + 1,
    })),
  loadShared: ({ seed, world }) =>
    set((state) => ({
      world,
      seed,
      origin: 'shared',
      commandOpen: false,
      flightToken: state.flightToken + 1,
    })),
  direct: async (prompt) => {
    if (get().directing) return;
    set({ directing: true });
    const { directive, seed, source } = await requestTerraform(prompt);
    set((state) => ({
      world: directive,
      seed,
      origin: source,
      directing: false,
      commandOpen: false,
      flightToken: state.flightToken + 1,
    }));
  },
  setAtmosphere: (patch) =>
    set((state) => ({
      world: { ...state.world, atmosphere: { ...state.world.atmosphere, ...patch } },
    })),
  setWaterLevel: (waterLevel) => set((state) => ({ world: { ...state.world, waterLevel } })),
  setFoliageDensity: (foliageDensity) =>
    set((state) => ({ world: { ...state.world, foliageDensity } })),
  regenerateSeed: () => set({ seed: Math.floor(Math.random() * SEED_SPACE) }),
  toggleAutoOrbit: () => set((state) => ({ autoOrbit: !state.autoOrbit })),
  setAutoOrbit: (autoOrbit) => set({ autoOrbit }),
  toggleTimeLapse: () => set((state) => ({ timeLapse: !state.timeLapse })),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
}));
