import { create } from 'zustand';
import type { TerraformPreset } from '@/ai/presets';
import { requestTerraform } from '@/ai/requestTerraform';
import {
  DEFAULT_SEED,
  DEFAULT_WORLD,
  type AtmosphereState,
  type WorldConfig,
} from '@/engine/worldConfig';

export type WorldOrigin = 'preset' | 'model' | 'local';

export interface WorldStore {
  world: WorldConfig;
  seed: number;
  origin: WorldOrigin;
  autoOrbit: boolean;
  commandOpen: boolean;
  directing: boolean;
  applyPreset: (preset: TerraformPreset) => void;
  direct: (prompt: string) => Promise<void>;
  setAtmosphere: (patch: Partial<AtmosphereState>) => void;
  setWaterLevel: (waterLevel: number) => void;
  setFoliageDensity: (foliageDensity: number) => void;
  regenerateSeed: () => void;
  toggleAutoOrbit: () => void;
  setCommandOpen: (commandOpen: boolean) => void;
}

const SEED_SPACE = 100000;

export const useWorldStore = create<WorldStore>((set, get) => ({
  world: DEFAULT_WORLD,
  seed: DEFAULT_SEED,
  origin: 'preset',
  autoOrbit: true,
  commandOpen: false,
  directing: false,
  applyPreset: (preset) =>
    set({ world: preset.directive, seed: preset.seed, origin: 'preset', commandOpen: false }),
  direct: async (prompt) => {
    if (get().directing) return;
    set({ directing: true });
    const { directive, seed, source } = await requestTerraform(prompt);
    set({ world: directive, seed, origin: source, directing: false, commandOpen: false });
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
  setCommandOpen: (commandOpen) => set({ commandOpen }),
}));
