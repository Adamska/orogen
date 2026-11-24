'use client';

import { useEffect, useRef, useState } from 'react';
import { Ambience, type AmbienceLevels } from '@/audio/ambience';
import { worldUniforms } from '@/scene/worldUniforms';
import { useWorldStore } from '@/store/useWorldStore';
import { GlassPanel } from './GlassPanel';
import { SoundIcon } from './icons';

const MIX_INTERVAL_MS = 400;

function readLevels(): AmbienceLevels {
  const { world } = useWorldStore.getState();
  const daylight = 1 - worldUniforms.uNight.value;
  const rain = worldUniforms.uRain.value;
  return {
    wind: 0.35 + world.terrain.amplitude / 400 + (1.2 - world.snowLine) * 0.3 + worldUniforms.uOvercast.value * 0.3,
    surf: Math.min(1, world.waterLevel * 2.4),
    rain,
    rumble: worldUniforms.uVolcanism.value,
    birds: world.foliageDensity * daylight * (1 - rain) * (world.weather === 'snow' ? 0.2 : 1),
  };
}

export function SoundToggle() {
  const [enabled, setEnabled] = useState(false);
  const ambience = useRef<Ambience | null>(null);

  useEffect(() => {
    if (!enabled) return;
    ambience.current ??= new Ambience();
    const engine = ambience.current;
    engine.update(readLevels());
    void engine.start();
    const timer = window.setInterval(() => engine.update(readLevels()), MIX_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
      void engine.stop();
    };
  }, [enabled]);

  useEffect(() => () => ambience.current?.dispose(), []);

  return (
    <GlassPanel className="rounded-full">
      <button
        type="button"
        onClick={() => setEnabled(!enabled)}
        aria-pressed={enabled}
        aria-label={enabled ? 'Mute ambient sound' : 'Play ambient sound'}
        title={enabled ? 'Mute ambient sound' : 'Play ambient sound'}
        className={`flex size-9 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-white/70 ${
          enabled ? 'text-white' : 'text-white/55 hover:text-white'
        }`}
      >
        <SoundIcon muted={!enabled} />
      </button>
    </GlassPanel>
  );
}
