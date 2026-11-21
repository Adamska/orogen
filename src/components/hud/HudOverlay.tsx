import { CommandBar } from './CommandBar';
import { EnvironmentControls } from './EnvironmentControls';
import { TelemetryBadge } from './TelemetryBadge';
import { WorldTitle } from './WorldTitle';

export function HudOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 animate-[rise_900ms_ease-out_both]">
      <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
        <WorldTitle />
      </div>
      <div className="absolute right-4 top-4 hidden md:block sm:right-6 sm:top-6">
        <TelemetryBadge />
      </div>
      <div className="absolute bottom-20 right-4 sm:bottom-auto sm:right-6 sm:top-1/2 sm:-translate-y-1/2">
        <EnvironmentControls />
      </div>
      <div className="absolute inset-x-0 bottom-5 flex justify-center px-4 sm:bottom-7">
        <CommandBar />
      </div>
    </div>
  );
}
