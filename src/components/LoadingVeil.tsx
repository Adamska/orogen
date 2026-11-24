'use client';

import { BOOT_LABELS, BOOT_STAGES, useBootStore } from '@/store/useBootStore';
import { useWorldStore } from '@/store/useWorldStore';

export function LoadingVeil() {
  const stage = useBootStore((state) => state.stage);
  const worldName = useWorldStore((state) => state.world.name);
  const ready = stage === 'ready';
  const progress = (BOOT_STAGES.indexOf(stage) + 1) / BOOT_STAGES.length;

  return (
    <div
      aria-hidden={ready}
      className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-5 bg-abyss transition-opacity duration-1000 ${
        ready ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <span className="text-xs font-medium uppercase tracking-[0.6em] text-white/75">Orogen</span>
      <span
        role="progressbar"
        aria-label="Loading"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="h-px w-48 overflow-hidden bg-white/10"
      >
        <span
          className="block h-full bg-white/75 transition-[width] duration-700 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </span>
      <span className="text-[11px] tracking-wide text-white/45" aria-live="polite">
        {BOOT_LABELS[stage]}
      </span>
      <span
        className={`text-sm text-white/80 transition-all duration-700 ${
          stage === 'shaders' || ready ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
        }`}
      >
        {worldName}
      </span>
    </div>
  );
}
