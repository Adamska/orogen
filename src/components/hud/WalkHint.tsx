'use client';

import { useWorldStore } from '@/store/useWorldStore';
import { ControlHint, LOOK_MESSAGE, SPAWN_BINDINGS } from './ControlHint';
import { MountPicker } from './MountPicker';
import { MOUNT_BINDINGS, WALK_BINDINGS } from './travelBindings';
import { useFlightStatus } from './useFlightStatus';
import { usePointerLocked } from './usePointerLocked';

export function WalkHint() {
  const walkStage = useWorldStore((state) => state.walkStage);
  const setWalkStage = useWorldStore((state) => state.setWalkStage);
  const locked = usePointerLocked();
  const flying = useFlightStatus();
  const leave = { label: 'Leave', onSelect: () => setWalkStage('off') };

  if (walkStage === 'choosing') {
    return <ControlHint message="Pick a spot on the terrain to set foot" bindings={SPAWN_BINDINGS} actions={[leave]} />;
  }
  return (
    <>
      <MountPicker flying={flying !== null} />
      <ControlHint
        pointerMessage={locked ? undefined : LOOK_MESSAGE}
        bindings={flying === null ? WALK_BINDINGS : MOUNT_BINDINGS[flying]}
        actions={[{ label: 'Relocate', onSelect: () => setWalkStage('choosing') }, leave]}
      />
    </>
  );
}
