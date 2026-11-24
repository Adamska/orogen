import { create } from 'zustand';

export type BootStage = 'engine' | 'terrain' | 'shaders' | 'ready';

export const BOOT_STAGES: readonly BootStage[] = ['engine', 'terrain', 'shaders', 'ready'];

export const BOOT_LABELS: Record<BootStage, string> = {
  engine: 'Loading render engine',
  terrain: 'Raising terrain',
  shaders: 'Compiling shaders',
  ready: 'Ready',
};

interface BootStore {
  stage: BootStage;
  advance: (stage: BootStage) => void;
}

export const useBootStore = create<BootStore>((set, get) => ({
  stage: 'engine',
  advance: (stage) => {
    if (BOOT_STAGES.indexOf(stage) > BOOT_STAGES.indexOf(get().stage)) set({ stage });
  },
}));
