import { useEffect, useState } from 'react';
import type { ElevationField, FieldParams } from '@/engine/elevationField';
import type { SurfaceBuffers } from '@/engine/terrainBuilder';
import { sameFieldParams } from '@/engine/terrainProtocol';
import { requestSurface } from '@/engine/terrainWorkerClient';
import { useWorldStore } from '@/store/useWorldStore';
import { worldRuntime } from './worldRuntime';

export interface TerrainSurface {
  readonly field: ElevationField;
  readonly buffers: SurfaceBuffers;
  readonly previousElevations: Float32Array | null;
}

const REQUEST_DEBOUNCE_MS = 90;
const FOLIAGE_RETREAT_MS = 380;
const MORPH_POLL_MS = 120;

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export function useTerrainSurface(): TerrainSurface | null {
  const seed = useWorldStore((state) => state.seed);
  const ridgeSharpness = useWorldStore((state) => state.world.terrain.ridgeSharpness);
  const warpIntensity = useWorldStore((state) => state.world.terrain.warpIntensity);
  const valleyDepth = useWorldStore((state) => state.world.terrain.valleyDepth);
  const [surface, setSurface] = useState<TerrainSurface | null>(null);

  useEffect(() => {
    const requested: FieldParams = { seed, ridgeSharpness, warpIntensity, valleyDepth };
    if (surface !== null && sameFieldParams(surface.field.params, requested)) {
      worldRuntime.rebuildPending = false;
      return;
    }

    const initial = surface === null;
    let cancelled = false;
    worldRuntime.rebuildPending = !initial;

    const settle = async () => {
      if (!initial) await wait(REQUEST_DEBOUNCE_MS);
      if (cancelled) return;
      const [built] = await Promise.all([
        requestSurface(requested),
        wait(initial ? 0 : FOLIAGE_RETREAT_MS),
      ]);
      while (!cancelled && worldRuntime.morphProgress < 1) await wait(MORPH_POLL_MS);
      if (cancelled) return;
      setSurface((current) => ({ ...built, previousElevations: current?.field.elevations ?? null }));
    };
    void settle();

    return () => {
      cancelled = true;
    };
  }, [seed, ridgeSharpness, warpIntensity, valleyDepth, surface]);

  return surface;
}
