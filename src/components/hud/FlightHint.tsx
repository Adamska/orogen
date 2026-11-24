'use client';

import { useWorldStore } from '@/store/useWorldStore';
import { GlassPanel } from './GlassPanel';

const BINDINGS = [
  ['WASD', 'fly'],
  ['Drag', 'look'],
  ['E / Q', 'climb'],
  ['Shift', 'boost'],
  ['Esc', 'land'],
] as const;

export function FlightHint() {
  const setFlightMode = useWorldStore((state) => state.setFlightMode);

  return (
    <GlassPanel className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-full px-4 py-2">
      {BINDINGS.map(([key, action]) => (
        <span key={key} className="flex items-center gap-1.5 text-[11px] text-white/60">
          <kbd className="rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/85">
            {key}
          </kbd>
          {action}
        </span>
      ))}
      <button
        type="button"
        onClick={() => setFlightMode(false)}
        className="rounded-full border border-white/20 px-2.5 py-0.5 text-[11px] text-white/80 transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white/70"
      >
        Land
      </button>
    </GlassPanel>
  );
}
