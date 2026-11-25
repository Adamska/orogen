import { create } from 'zustand';
import type { TerraformPreset } from '@/ai/presets';
import { describeTerraform } from '@/ai/directorNotes';
import type { WorldLink } from './worldLink';
import {
  DEFAULT_SEED,
  DEFAULT_WORLD,
  type AtmosphereState,
  type TerrainShape,
  type WeatherKind,
  type WorldConfig,
} from '@/engine/worldConfig';

export type SculptMode = 'off' | 'raise' | 'lower';

export type WalkStage = 'off' | 'choosing' | 'walking';

export interface SpawnPoint {
  readonly x: number;
  readonly z: number;
}

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
  flightMode: boolean;
  walkStage: WalkStage;
  walkSpawn: SpawnPoint | null;
  sculptMode: SculptMode;
  brushRadius: number;
  captureToken: number;
  exportToken: number;
  exporting: boolean;
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
  tweakWorld: (patch: Partial<Pick<WorldConfig, 'snowLine' | 'volcanism'>>) => void;
  setTerrain: (patch: Partial<TerrainShape>) => void;
  regenerateSeed: () => void;
  toggleAutoOrbit: () => void;
  setAutoOrbit: (autoOrbit: boolean) => void;
  toggleTimeLapse: () => void;
  setPhotoMode: (photoMode: boolean) => void;
  setFlightMode: (flightMode: boolean) => void;
  setWalkStage: (walkStage: 'off' | 'choosing') => void;
  beginWalk: (spawn: SpawnPoint) => void;
  setSculptMode: (sculptMode: SculptMode) => void;
  setBrushRadius: (brushRadius: number) => void;
  requestCapture: () => void;
  requestExport: () => void;
  setExporting: (exporting: boolean) => void;
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
  flightMode: false,
  walkStage: 'off',
  walkSpawn: null,
  sculptMode: 'off',
  brushRadius: 70,
  captureToken: 0,
  exportToken: 0,
  exporting: false,
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
    const response = await import('@/ai/requestTerraform')
      .then(({ requestTerraform }) => requestTerraform(prompt))
      .catch(() => null);
    if (response === null) {
      set({ directing: false });
      return;
    }
    const { directive, seed, source } = response;
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
  tweakWorld: (patch) => set((state) => ({ world: { ...state.world, ...patch } })),
  setTerrain: (patch) =>
    set((state) => ({ world: { ...state.world, terrain: { ...state.world.terrain, ...patch } } })),
  regenerateSeed: () => set({ seed: Math.floor(Math.random() * SEED_SPACE) }),
  toggleAutoOrbit: () => set((state) => ({ autoOrbit: !state.autoOrbit })),
  setAutoOrbit: (autoOrbit) => set({ autoOrbit }),
  toggleTimeLapse: () => set((state) => ({ timeLapse: !state.timeLapse })),
  setPhotoMode: (photoMode) => set({ photoMode, commandOpen: false }),
  setSculptMode: (sculptMode) =>
    set((state) => ({
      sculptMode,
      flightMode: false,
      walkStage: 'off',
      commandOpen: false,
      flightToken: state.flightMode || state.walkStage === 'walking' ? state.flightToken + 1 : state.flightToken,
    })),
  setBrushRadius: (brushRadius) => set({ brushRadius }),
  setFlightMode: (flightMode) =>
    set((state) => ({
      flightMode,
      walkStage: 'off',
      commandOpen: false,
      flightToken: flightMode ? state.flightToken : state.flightToken + 1,
    })),
  setWalkStage: (walkStage) =>
    set((state) => ({
      walkStage,
      flightMode: false,
      sculptMode: 'off',
      commandOpen: false,
      flightToken: state.flightMode || state.walkStage === 'walking' ? state.flightToken + 1 : state.flightToken,
    })),
  beginWalk: (walkSpawn) => set({ walkStage: 'walking', walkSpawn, flightMode: false, sculptMode: 'off', commandOpen: false }),
  requestCapture: () => set((state) => ({ captureToken: state.captureToken + 1 })),
  requestExport: () => set((state) => (state.exporting ? state : { exportToken: state.exportToken + 1, exporting: true })),
  setExporting: (exporting) => set({ exporting }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
}));
