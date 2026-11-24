'use client';

import { useWorldStore, type WorldOrigin } from '@/store/useWorldStore';
import { GlassPanel } from './GlassPanel';
import { RidgeIcon } from './icons';

const ORIGIN_LABELS: Record<WorldOrigin, string> = {
  preset: 'Curated preset',
  model: 'AI director',
  local: 'Local resolver',
  shared: 'Shared world',
};

export function WorldTitle() {
  const name = useWorldStore((state) => state.world.name);
  const summary = useWorldStore((state) => state.world.summary);
  const origin = useWorldStore((state) => state.origin);

  return (
    <GlassPanel className="w-[min(19rem,calc(100vw-2rem))] rounded-2xl px-4 py-3.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-white">
          <RidgeIcon />
          <span className="text-[11px] font-semibold uppercase tracking-[0.42em]">Orogen</span>
        </span>
        <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] tracking-wide text-white/60">
          {ORIGIN_LABELS[origin]}
        </span>
      </div>
      <h1 className="mt-3 text-[15px] font-medium leading-snug text-white">{name}</h1>
      <p className="mt-1 text-xs leading-relaxed text-white/60">{summary}</p>
    </GlassPanel>
  );
}
