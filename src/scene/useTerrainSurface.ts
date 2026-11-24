import { useEffect, useRef, useState } from 'react';
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
const MORPH_WAIT_LIMIT_MS = 5000;
const MESH_SWAP_DELAY_MS = 1200;

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

async function waitForMorph(isCancelled: () => boolean): Promise<void> {
  const deadline = performance.now() + MORPH_WAIT_LIMIT_MS;
  while (!isCancelled() && worldRuntime.morphProgress < 1 && performance.now() < deadline) {
    await wait(MORPH_POLL_MS);
  }
}

export function useTerrainSurface(): TerrainSurface | null {
  const seed = useWorldStore((state) => state.seed);
  const ridgeSharpness = useWorldStore((state) => state.world.terrain.ridgeSharpness);
  const warpIntensity = useWorldStore((state) => state.world.terrain.warpIntensity);
  const valleyDepth = useWorldStore((state) => state.world.terrain.valleyDepth);
  const { meshResolution } = useQualityProfile();
  const latestResolution = useRef(meshResolution);
  const [surface, setSurface] = useState<TerrainSurface | null>(null);
  const fieldParams = surface?.field.params ?? null;

  useEffect(() => {
    latestResolution.current = meshResolution;
  }, [meshResolution]);

  useEffect(() => {
    const requested: FieldParams = { seed, ridgeSharpness, warpIntensity, valleyDepth };
    if (fieldParams !== null && sameFieldParams(fieldParams, requested)) {
      worldRuntime.rebuildPending = false;
      return;
    }

    const initial = fieldParams === null;
    let cancelled = false;
    worldRuntime.rebuildPending = !initial;
    if (initial) useBootStore.getState().advance('terrain');

    const settle = async () => {
      if (!initial) await wait(REQUEST_DEBOUNCE_MS);
      if (cancelled) return;
      const [built] = await Promise.all([
        requestSurface(requested, latestResolution.current),
        wait(initial ? 0 : FOLIAGE_RETREAT_MS),
      ]);
      await waitForMorph(() => cancelled);
      if (!cancelled) setSurface(built);
    };
    void settle();

    return () => {
      cancelled = true;
    };
  }, [seed, ridgeSharpness, warpIntensity, valleyDepth, fieldParams]);

  useEffect(() => {
    if (surface === null || surface.mesh.resolution === meshResolution) return;
    let cancelled = false;
    const params = surface.field.params;
    const timer = window.setTimeout(() => {
      if (worldRuntime.rebuildPending) return;
      void requestMesh(params, meshResolution).then((mesh) => {
        if (cancelled) return;
        setSurface((current) =>
          current !== null && sameFieldParams(current.field.params, params) ? { ...current, mesh } : current,
        );
      });
    }, MESH_SWAP_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [surface, meshResolution]);

  return surface;
}
