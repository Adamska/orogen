import { create } from 'zustand';
import type { TerraformPreset } from '@/ai/presets';
import { describeTerraform } from '@/ai/directorNotes';
import { requestTerraform } from '@/ai/requestTerraform';
import type { WorldLink } from './worldLink';
import {
  DEFAULT_SEED,
  DEFAULT_WORLD,
  type AtmosphereState,
  type WeatherKind,
  type WorldConfig,
} from '@/engine/worldConfig';

export type WorldOrigin = 'preset' | 'model' | 'local' | 'shared';

export interface DirectorLog {
  readonly id: number;
  readonly lines: readonly string[];
}

export interface WorldStore {
  world: WorldConfig;
  seed: number;
  origin: WorldOrigin;
  autoOrbit: boolean;
  timeLapse: boolean;
  photoMode: boolean;
  captureToken: number;
  commandOpen: boolean;
  directing: boolean;
  flightToken: number;
  directorLog: DirectorLog | null;
  applyPreset: (preset: TerraformPreset) => void;
  loadShared: (link: WorldLink) => void;
  revisit: (link: WorldLink) => void;
  direct: (prompt: string) => Promise<void>;
  setAtmosphere: (patch: Partial<AtmosphereState>) => void;
  setWaterLevel: (waterLevel: number) => void;
  setFoliageDensity: (foliageDensity: number) => void;
  setWeather: (weather: WeatherKind) => void;
  regenerateSeed: () => void;
  toggleAutoOrbit: () => void;
  setAutoOrbit: (autoOrbit: boolean) => void;
  toggleTimeLapse: () => void;
  setPhotoMode: (photoMode: boolean) => void;
  requestCapture: () => void;
  setCommandOpen: (commandOpen: boolean) => void;
}

const SEED_SPACE = 100000;

export const useWorldStore = create<WorldStore>((set, get) => ({
  world: DEFAULT_WORLD,
  seed: DEFAULT_SEED,
  origin: 'preset',
  autoOrbit: true,
  timeLapse: false,
  photoMode: false,
  captureToken: 0,
  commandOpen: false,
  directing: false,
  flightToken: 0,
  directorLog: null,
  applyPreset: (preset) =>
    set((state) => ({
      world: preset.directive,
      seed: preset.seed,
      origin: 'preset',
      commandOpen: false,
      flightToken: state.flightToken + 1,
      directorLog: { id: state.flightToken + 1, lines: describeTerraform(state.world, preset.directive) },
    })),
  loadShared: ({ seed, world }) =>
    set((state) => ({
      world,
      seed,
      origin: 'shared',
      commandOpen: false,
      flightToken: state.flightToken + 1,
    })),
  revisit: ({ seed, world }) =>
    set((state) => ({
      world,
      seed,
      origin: 'preset',
      commandOpen: false,
      flightToken: state.flightToken + 1,
      directorLog: { id: state.flightToken + 1, lines: describeTerraform(state.world, world) },
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
      directorLog: { id: state.flightToken + 1, lines: describeTerraform(state.world, directive) },
    }));
  },
  setAtmosphere: (patch) =>
    set((state) => ({
      world: { ...state.world, atmosphere: { ...state.world.atmosphere, ...patch } },
    })),
  setWaterLevel: (waterLevel) => set((state) => ({ world: { ...state.world, waterLevel } })),
  setFoliageDensity: (foliageDensity) =>
    set((state) => ({ world: { ...state.world, foliageDensity } })),
  setWeather: (weather) => set((state) => ({ world: { ...state.world, weather } })),
  regenerateSeed: () => set({ seed: Math.floor(Math.random() * SEED_SPACE) }),
  toggleAutoOrbit: () => set((state) => ({ autoOrbit: !state.autoOrbit })),
  setAutoOrbit: (autoOrbit) => set({ autoOrbit }),
  toggleTimeLapse: () => set((state) => ({ timeLapse: !state.timeLapse })),
  setPhotoMode: (photoMode) => set({ photoMode, commandOpen: false }),
  requestCapture: () => set((state) => ({ captureToken: state.captureToken + 1 })),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
}));
