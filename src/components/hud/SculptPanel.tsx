'use client';

import { useEffect } from 'react';
import { useWorldStore, type SculptMode } from '@/store/useWorldStore';
import { GlassPanel } from './GlassPanel';
import { RangeField } from './RangeField';

const TOOLS: readonly { mode: Exclude<SculptMode, 'off'>; label: string }[] = [
  { mode: 'raise', label: 'Raise' },
  { mode: 'lower', label: 'Lower' },
];
const meters = (value: number) => `${Math.round(value)} m`;

export function SculptPanel() {
  const sculptMode = useWorldStore((state) => state.sculptMode);
  const brushRadius = useWorldStore((state) => state.brushRadius);
  const setSculptMode = useWorldStore((state) => state.setSculptMode);
  const setBrushRadius = useWorldStore((state) => state.setBrushRadius);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSculptMode('off');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setSculptMode]);

  return (
    <GlassPanel className="flex w-[min(30rem,calc(100vw-2rem))] flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
      <div role="radiogroup" aria-label="Sculpt tool" className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-0.5">
        {TOOLS.map(({ mode, label }) => (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={sculptMode === mode}
            onClick={() => setSculptMode(mode)}
            className={`rounded-[10px] px-3 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-white/70 ${
              sculptMode === mode ? 'bg-white/20 text-white' : 'text-white/55 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="min-w-32 flex-1">
        <RangeField label="Brush" value={brushRadius} min={25} max={160} step={1} format={meters} onChange={setBrushRadius} />
      </div>
      <button
        type="button"
        onClick={() => setSculptMode('off')}
        className="rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-slate-900 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-white/70"
      >
        Done
      </button>
      <p className="w-full text-[11px] text-white/45">Left drag to sculpt. Right drag to orbit.</p>
    </GlassPanel>
  );
}
