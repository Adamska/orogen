'use client';

import { useWorldStore } from '@/store/useWorldStore';
import { CommandBar } from './CommandBar';
import { DirectorLog } from './DirectorLog';
import { EnvironmentControls } from './EnvironmentControls';
import { ControlHint, FLIGHT_BINDINGS, WALK_BINDINGS } from './ControlHint';
import { PhotoToolbar } from './PhotoToolbar';
import { SculptPanel } from './SculptPanel';
import { SoundToggle } from './SoundToggle';
import { TelemetryBadge } from './TelemetryBadge';
import { TerraformSweep } from './TerraformSweep';
import { WalkJoystick } from './WalkJoystick';
import { WorldHistory } from './WorldHistory';
import { WorldLinkSync } from './WorldLinkSync';
import { WorldTitle } from './WorldTitle';

export function HudOverlay() {
  const photoMode = useWorldStore((state) => state.photoMode);
  const flightMode = useWorldStore((state) => state.flightMode);
  const walkMode = useWorldStore((state) => state.walkMode);
  const setFlightMode = useWorldStore((state) => state.setFlightMode);
  const setWalkMode = useWorldStore((state) => state.setWalkMode);
  const sculpting = useWorldStore((state) => state.sculptMode !== 'off');

  return (
    <div className="pointer-events-none absolute inset-0 z-10 animate-[rise_900ms_ease-out_both]">
      <WorldLinkSync />
      <TerraformSweep />
      {photoMode ? (
        <div className="absolute inset-x-0 bottom-5 flex justify-center px-4 sm:bottom-7">
          <PhotoToolbar />
        </div>
      ) : (
        <>
          <div className="absolute left-4 top-4 flex flex-col gap-3 sm:left-6 sm:top-6">
            <WorldTitle />
            <div className="hidden sm:block">
              <WorldHistory />
            </div>
          </div>
          <div className="absolute right-4 top-4 flex items-center gap-2 sm:right-6 sm:top-6">
            <div className="hidden md:block">
              <TelemetryBadge />
            </div>
            <SoundToggle />
          </div>
          {walkMode && <WalkJoystick />}
          <div className={`absolute inset-x-4 bottom-20 sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-1/2 sm:-translate-y-1/2 ${walkMode ? 'hidden sm:block' : ''}`}>
            <EnvironmentControls />
          </div>
          <div className="absolute inset-x-0 bottom-5 flex flex-col items-center gap-3 px-4 sm:bottom-7">
            <DirectorLog />
            {flightMode ? (
              <ControlHint bindings={FLIGHT_BINDINGS} exitLabel="Land" onExit={() => setFlightMode(false)} />
            ) : walkMode ? (
              <ControlHint bindings={WALK_BINDINGS} exitLabel="Leave" onExit={() => setWalkMode(false)} />
            ) : sculpting ? (
              <SculptPanel />
            ) : (
              <CommandBar />
            )}
          </div>
        </>
      )}
    </div>
  );
}
