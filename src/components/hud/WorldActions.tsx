'use client';

import { useWorldStore } from '@/store/useWorldStore';
import {
  BrushIcon,
  CameraIcon,
  CycleIcon,
  ExportIcon,
  FlightIcon,
  OrbitIcon,
  ShuffleIcon,
  WalkIcon,
} from './icons';
import { ShareButton } from './ShareButton';
import { ToggleButton } from './ToggleButton';

const WIDE_BUTTON =
  'flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-white/15 bg-white/10 px-2 py-2 text-xs font-medium text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white/70';

export function WorldActions() {
  const autoOrbit = useWorldStore((state) => state.autoOrbit);
  const timeLapse = useWorldStore((state) => state.timeLapse);
  const regenerateSeed = useWorldStore((state) => state.regenerateSeed);
  const toggleAutoOrbit = useWorldStore((state) => state.toggleAutoOrbit);
  const toggleTimeLapse = useWorldStore((state) => state.toggleTimeLapse);
  const setPhotoMode = useWorldStore((state) => state.setPhotoMode);
  const flightMode = useWorldStore((state) => state.flightMode);
  const setFlightMode = useWorldStore((state) => state.setFlightMode);
  const walkStage = useWorldStore((state) => state.walkStage);
  const setWalkStage = useWorldStore((state) => state.setWalkStage);
  const sculptMode = useWorldStore((state) => state.sculptMode);
  const exporting = useWorldStore((state) => state.exporting);
  const requestExport = useWorldStore((state) => state.requestExport);
  const setSculptMode = useWorldStore((state) => state.setSculptMode);

  return (
    <div className="space-y-2 pt-1">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={regenerateSeed} className={WIDE_BUTTON}>
          <ShuffleIcon />
          New seed
        </button>
        <button
          type="button"
          onClick={requestExport}
          disabled={exporting}
          aria-busy={exporting}
          title="Download the world as an optimized glTF model"
          className={`${WIDE_BUTTON} disabled:cursor-wait disabled:opacity-60`}
        >
          <ExportIcon />
          {exporting ? 'Exporting' : 'Export'}
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        <ToggleButton label="Automatic camera orbit" pressed={autoOrbit} onToggle={toggleAutoOrbit}>
          <OrbitIcon />
        </ToggleButton>
        <ToggleButton label="Day and night time lapse" pressed={timeLapse} onToggle={toggleTimeLapse} tone="warm">
          <CycleIcon />
        </ToggleButton>
        <ToggleButton label="Free flight" pressed={flightMode} onToggle={() => setFlightMode(!flightMode)}>
          <FlightIcon />
        </ToggleButton>
        <ToggleButton
          label="Walk the terrain"
          pressed={walkStage !== 'off'}
          onToggle={() => setWalkStage(walkStage === 'off' ? 'choosing' : 'off')}
        >
          <WalkIcon />
        </ToggleButton>
        <ToggleButton
          label="Sculpt terrain"
          pressed={sculptMode !== 'off'}
          onToggle={() => setSculptMode(sculptMode === 'off' ? 'raise' : 'off')}
        >
          <BrushIcon />
        </ToggleButton>
        <ToggleButton label="Photo mode" pressed={false} onToggle={() => setPhotoMode(true)}>
          <CameraIcon />
        </ToggleButton>
        <ShareButton />
      </div>
    </div>
  );
}
