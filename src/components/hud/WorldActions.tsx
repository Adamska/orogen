'use client';

import { useWorldStore } from '@/store/useWorldStore';
import { CameraIcon, CycleIcon, FlightIcon, OrbitIcon, ShuffleIcon } from './icons';
import { ShareButton } from './ShareButton';
import { ToggleButton } from './ToggleButton';

export function WorldActions() {
  const autoOrbit = useWorldStore((state) => state.autoOrbit);
  const timeLapse = useWorldStore((state) => state.timeLapse);
  const regenerateSeed = useWorldStore((state) => state.regenerateSeed);
  const toggleAutoOrbit = useWorldStore((state) => state.toggleAutoOrbit);
  const toggleTimeLapse = useWorldStore((state) => state.toggleTimeLapse);
  const setPhotoMode = useWorldStore((state) => state.setPhotoMode);
  const flightMode = useWorldStore((state) => state.flightMode);
  const setFlightMode = useWorldStore((state) => state.setFlightMode);

  return (
    <div className="space-y-2 pt-1">
      <button
        type="button"
        onClick={regenerateSeed}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white/70"
      >
        <ShuffleIcon />
        New seed
      </button>
      <div className="grid grid-cols-5 gap-1.5">
        <ToggleButton label="Automatic camera orbit" pressed={autoOrbit} onToggle={toggleAutoOrbit}>
          <OrbitIcon />
        </ToggleButton>
        <ToggleButton label="Day and night time lapse" pressed={timeLapse} onToggle={toggleTimeLapse} tone="warm">
          <CycleIcon />
        </ToggleButton>
        <ToggleButton label="Free flight" pressed={flightMode} onToggle={() => setFlightMode(!flightMode)}>
          <FlightIcon />
        </ToggleButton>
        <ToggleButton label="Photo mode" pressed={false} onToggle={() => setPhotoMode(true)}>
          <CameraIcon />
        </ToggleButton>
        <ShareButton />
      </div>
    </div>
  );
}
