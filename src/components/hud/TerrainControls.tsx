'use client';

import { useState } from 'react';
import { WORLD_LIMITS } from '@/engine/worldConfig';
import { useWorldStore } from '@/store/useWorldStore';
import { ChevronIcon } from './icons';
import { RangeField } from './RangeField';

const percent = (value: number) => `${Math.round(value * 100)}%`;
const meters = (value: number) => `${Math.round(value)} m`;

export function TerrainControls() {
  const [open, setOpen] = useState(false);
  const terrain = useWorldStore((state) => state.world.terrain);
  const snowLine = useWorldStore((state) => state.world.snowLine);
  const volcanism = useWorldStore((state) => state.world.volcanism);
  const setTerrain = useWorldStore((state) => state.setTerrain);
  const tweakWorld = useWorldStore((state) => state.tweakWorld);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2 text-[11px] tracking-wide text-white/65 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-white/70"
      >
        Terrain shaping
        <ChevronIcon className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-white/10 px-3 pb-3 pt-3">
          <RangeField label="Relief" value={terrain.amplitude} {...WORLD_LIMITS.amplitude} step={1} format={meters} onChange={(amplitude) => setTerrain({ amplitude })} />
          <RangeField label="Ridges" value={terrain.ridgeSharpness} {...WORLD_LIMITS.ridgeSharpness} step={0.01} format={percent} onChange={(ridgeSharpness) => setTerrain({ ridgeSharpness })} />
          <RangeField label="Warp" value={terrain.warpIntensity} {...WORLD_LIMITS.warpIntensity} step={0.01} format={percent} onChange={(warpIntensity) => setTerrain({ warpIntensity })} />
          <RangeField label="Valleys" value={terrain.valleyDepth} {...WORLD_LIMITS.valleyDepth} step={0.01} format={percent} onChange={(valleyDepth) => setTerrain({ valleyDepth })} />
          <RangeField label="Snow line" value={snowLine} {...WORLD_LIMITS.snowLine} step={0.01} format={percent} onChange={(value) => tweakWorld({ snowLine: value })} />
          <RangeField label="Volcanism" value={volcanism} {...WORLD_LIMITS.volcanism} step={0.01} format={percent} onChange={(value) => tweakWorld({ volcanism: value })} />
        </div>
      )}
    </div>
  );
}
