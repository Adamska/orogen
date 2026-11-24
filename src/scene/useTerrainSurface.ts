import { useEffect, useState } from 'react';
import type { ElevationField, FieldParams } from '@/engine/elevationField';
import type { TerrainMesh } from '@/engine/terrainBuilder';
import { sameFieldParams } from '@/engine/terrainProtocol';
import { requestMesh, requestSurface } from '@/engine/terrainWorkerClient';
import { useBootStore } from '@/store/useBootStore';
import { useQualityProfile } from '@/store/useQualityStore';
import { useWorldStore } from '@/store/useWorldStore';
import { worldRuntime } from './worldRuntime';

export interface TerrainSurface {
  readonly field: ElevationField;
  readonly texels: Uint16Array;
  readonly mesh: TerrainMesh;
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
  const { meshResolution } = useQualityProfile();
  const [surface, setSurface] = useState<TerrainSurface | null>(null);

  useEffect(() => {
    const requested: FieldParams = { seed, ridgeSharpness, warpIntensity, valleyDepth };
    const sameField = surface !== null && sameFieldParams(surface.field.params, requested);
    if (sameField && surface.mesh.resolution === meshResolution) {
      worldRuntime.rebuildPending = false;
      return;
    }

    let cancelled = false;
    if (sameField) {
      void requestMesh(requested, meshResolution).then((mesh) => {
        if (!cancelled) setSurface((current) => (current ? { ...current, mesh } : current));
      });
      return () => {
        cancelled = true;
      };
    }

    const initial = surface === null;
    worldRuntime.rebuildPending = !initial;
    if (initial) useBootStore.getState().advance('terrain');
    const settle = async () => {
      if (!initial) await wait(REQUEST_DEBOUNCE_MS);
      if (cancelled) return;
      const [built] = await Promise.all([
        requestSurface(requested, meshResolution),
        wait(initial ? 0 : FOLIAGE_RETREAT_MS),
      ]);
      while (!cancelled && worldRuntime.morphProgress < 1) await wait(MORPH_POLL_MS);
      if (!cancelled) setSurface(built);
    };
    void settle();

    return () => {
      cancelled = true;
    };
  }, [seed, ridgeSharpness, warpIntensity, valleyDepth, meshResolution, surface]);

  return surface;
}
