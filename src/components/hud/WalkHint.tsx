'use client';

import { useWorldStore } from '@/store/useWorldStore';
import { ControlHint, LOOK_MESSAGE, SPAWN_BINDINGS, WALK_BINDINGS } from './ControlHint';
import { MountPicker } from './MountPicker';
import { usePointerLocked } from './usePointerLocked';

export function WalkHint() {
  const walkStage = useWorldStore((state) => state.walkStage);
  const setWalkStage = useWorldStore((state) => state.setWalkStage);
  const locked = usePointerLocked();
  const leave = { label: 'Leave', onSelect: () => setWalkStage('off') };

  if (walkStage === 'choosing') {
    return <ControlHint message="Pick a spot on the terrain to set foot" bindings={SPAWN_BINDINGS} actions={[leave]} />;
  }
  return (
    <>
      <MountPicker />
      <ControlHint
        pointerMessage={locked ? undefined : LOOK_MESSAGE}
        bindings={WALK_BINDINGS}
        actions={[{ label: 'Relocate', onSelect: () => setWalkStage('choosing') }, leave]}
      />
    </>
  );
}
