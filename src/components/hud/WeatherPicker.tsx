'use client';

import { WEATHER_KINDS, type WeatherKind } from '@/engine/worldConfig';
import { useWorldStore } from '@/store/useWorldStore';

const WEATHER_LABELS: Record<WeatherKind, string> = {
  clear: 'Clear',
  rain: 'Rain',
  snow: 'Snow',
};

export function WeatherPicker() {
  const weather = useWorldStore((state) => state.world.weather);
  const setWeather = useWorldStore((state) => state.setWeather);

  return (
    <div role="radiogroup" aria-label="Weather" className="block">
      <span className="mb-1.5 block text-[11px] tracking-wide text-white/60">Weather</span>
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/5 p-0.5">
        {WEATHER_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={weather === kind}
            onClick={() => setWeather(kind)}
            className={`rounded-[10px] py-1 text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-white/70 ${
              weather === kind ? 'bg-white/20 text-white' : 'text-white/55 hover:text-white'
            }`}
          >
            {WEATHER_LABELS[kind]}
          </button>
        ))}
      </div>
    </div>
  );
}
