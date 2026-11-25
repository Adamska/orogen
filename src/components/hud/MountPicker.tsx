'use client';

import { MOUNTS, type Mount } from '@/scene/characterFlight';
import { walkIntent } from '@/scene/walkIntent';
import { useWorldStore } from '@/store/useWorldStore';
import { GlassPanel } from './GlassPanel';

const LABELS: Record<Mount, string> = {
  paraglider: 'Paraglider',
  jetpack: 'Jetpack',
  wingsuit: 'Wingsuit',
  broom: 'Broom',
};

const CHIP =
  'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white/70';

export function MountPicker() {
  const walkMount = useWorldStore((state) => state.walkMount);
  const setWalkMount = useWorldStore((state) => state.setWalkMount);

  return (
    <GlassPanel className="flex flex-wrap items-center justify-center gap-1 rounded-full p-1">
      {MOUNTS.map((mount, index) => (
        <button
          key={mount}
          type="button"
          aria-pressed={mount === walkMount}
          title={`${LABELS[mount]} (${index + 1})`}
          onClick={() => setWalkMount(mount)}
          className={`${CHIP} ${mount === walkMount ? 'bg-white/85 text-slate-900' : 'text-white/75 hover:bg-white/15'}`}
        >
          {LABELS[mount]}
        </button>
      ))}
      <button
        type="button"
        title="Take off or land (F)"
        onClick={() => {
          walkIntent.toggleFlight = true;
        }}
        className={`${CHIP} border border-white/25 text-white hover:bg-white/15`}
      >
        Fly
      </button>
    </GlassPanel>
  );
}
