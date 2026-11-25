'use client';

import { useState, useSyncExternalStore } from 'react';
import { WORLD_LIMITS } from '@/engine/worldConfig';
import { useWorldStore } from '@/store/useWorldStore';
import { GlassPanel } from './GlassPanel';
import { ChevronIcon, DiceIcon } from './icons';
import { RangeField } from './RangeField';
import { TerrainControls } from './TerrainControls';
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
  const shuffleEnvironment = useWorldStore((state) => state.shuffleEnvironment);

  return (
    <GlassPanel className="w-full rounded-2xl sm:w-60">
      <div className="flex items-center pr-2">
        <button
          type="button"
          onClick={() => setPreference(!expanded)}
          aria-expanded={expanded}
          className="flex flex-1 items-center justify-between py-3 pl-4 pr-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/75 transition-colors hover:text-white"
        >
          Environment
          <ChevronIcon className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
        </button>
        <button
          type="button"
          onClick={shuffleEnvironment}
          aria-label="Shuffle environment, weather and terrain shaping"
          title="Shuffle environment, weather and terrain shaping"
          className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-white/70"
        >
          <DiceIcon />
        </button>
      </div>

      {expanded && (
        <div className="max-h-[46dvh] space-y-3 overflow-y-auto overscroll-contain border-t border-white/10 px-4 pb-4 pt-3.5 sm:max-h-[calc(100dvh-10rem)]">
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
          <TerrainControls />
          <WorldActions />
        </div>
      )}
    </GlassPanel>
  );
}
