'use client';

import { useState, useSyncExternalStore } from 'react';
import { WORLD_LIMITS } from '@/engine/worldConfig';
import { useWorldStore } from '@/store/useWorldStore';
import { GlassPanel } from './GlassPanel';
import { ChevronIcon } from './icons';
import { RangeField } from './RangeField';
import { WeatherPicker } from './WeatherPicker';
import { WorldActions } from './WorldActions';

const WIDE_VIEWPORT_QUERY = '(min-width: 640px)';

function subscribeToViewport(notify: () => void): () => void {
  const query = window.matchMedia(WIDE_VIEWPORT_QUERY);
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
}

const readIsWideViewport = () => window.matchMedia(WIDE_VIEWPORT_QUERY).matches;
const readServerViewport = () => true;
const degrees = (value: number) => `${Math.round(value)}°`;
const percent = (value: number) => `${Math.round(value * 100)}%`;

export function EnvironmentControls() {
  const isWideViewport = useSyncExternalStore(
    subscribeToViewport,
    readIsWideViewport,
    readServerViewport,
  );
  const [preference, setPreference] = useState<boolean | null>(null);
  const expanded = preference ?? isWideViewport;
  const atmosphere = useWorldStore((state) => state.world.atmosphere);
  const waterLevel = useWorldStore((state) => state.world.waterLevel);
  const foliageDensity = useWorldStore((state) => state.world.foliageDensity);
  const timeLapse = useWorldStore((state) => state.timeLapse);
  const setAtmosphere = useWorldStore((state) => state.setAtmosphere);
  const setWaterLevel = useWorldStore((state) => state.setWaterLevel);
  const setFoliageDensity = useWorldStore((state) => state.setFoliageDensity);

  return (
    <GlassPanel className="w-60 rounded-2xl">
      <button
        type="button"
        onClick={() => setPreference(!expanded)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between px-4 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white/75 transition-colors hover:text-white"
      >
        Environment
        <ChevronIcon className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-white/10 px-4 pb-4 pt-3.5">
          <RangeField
            label="Sun elevation"
            value={atmosphere.sunElevation}
            {...WORLD_LIMITS.sunElevation}
            step={0.5}
            format={degrees}
            disabled={timeLapse}
            onChange={(sunElevation) => setAtmosphere({ sunElevation })}
          />
          <RangeField
            label="Sun azimuth"
            value={atmosphere.sunAzimuth}
            {...WORLD_LIMITS.sunAzimuth}
            step={1}
            format={degrees}
            disabled={timeLapse}
            onChange={(sunAzimuth) => setAtmosphere({ sunAzimuth })}
          />
          <RangeField
            label="Water level"
            value={waterLevel}
            {...WORLD_LIMITS.waterLevel}
            step={0.005}
            format={percent}
            onChange={setWaterLevel}
          />
          <RangeField
            label="Haze"
            value={atmosphere.fogDensity}
            {...WORLD_LIMITS.fogDensity}
            step={0.01}
            format={percent}
            onChange={(fogDensity) => setAtmosphere({ fogDensity })}
          />
          <RangeField
            label="Foliage"
            value={foliageDensity}
            {...WORLD_LIMITS.foliageDensity}
            step={0.01}
            format={percent}
            onChange={setFoliageDensity}
          />

          <WeatherPicker />
          <WorldActions />
        </div>
      )}
    </GlassPanel>
  );
}
