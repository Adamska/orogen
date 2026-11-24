'use client';

import { useWorldStore } from '@/store/useWorldStore';
import { CommandBar } from './CommandBar';
import { DirectorLog } from './DirectorLog';
import { EnvironmentControls } from './EnvironmentControls';
import { PhotoToolbar } from './PhotoToolbar';
import { TelemetryBadge } from './TelemetryBadge';
import { WorldHistory } from './WorldHistory';
import { WorldLinkSync } from './WorldLinkSync';
import { WorldTitle } from './WorldTitle';

export function HudOverlay() {
  const photoMode = useWorldStore((state) => state.photoMode);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 animate-[rise_900ms_ease-out_both]">
      <WorldLinkSync />
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
          <div className="absolute right-4 top-4 hidden md:block sm:right-6 sm:top-6">
            <TelemetryBadge />
          </div>
          <div className="absolute bottom-20 right-4 sm:bottom-auto sm:right-6 sm:top-1/2 sm:-translate-y-1/2">
            <EnvironmentControls />
          </div>
          <div className="absolute inset-x-0 bottom-5 flex flex-col items-center gap-3 px-4 sm:bottom-7">
            <DirectorLog />
            <CommandBar />
          </div>
        </>
      )}
    </div>
  );
}
