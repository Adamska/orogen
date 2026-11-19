import { useEffect, useState } from 'react';
import { buildElevationField, type ElevationField, type FieldParams } from '@/engine/elevationField';
import { useWorldStore } from '@/store/useWorldStore';
import { worldRuntime } from './worldRuntime';

export interface TerrainSurface {
  readonly field: ElevationField;
  readonly previousElevations: Float32Array | null;
}

const FOLIAGE_RETREAT_MS = 380;
const MORPH_POLL_MS = 120;

function matches(a: FieldParams, b: FieldParams): boolean {
  return (
    a.seed === b.seed &&
    a.ridgeSharpness === b.ridgeSharpness &&
    a.warpIntensity === b.warpIntensity &&
    a.valleyDepth === b.valleyDepth
  );
}

function readParams(): FieldParams {
  const { seed, world } = useWorldStore.getState();
  return {
    seed,
    ridgeSharpness: world.terrain.ridgeSharpness,
    warpIntensity: world.terrain.warpIntensity,
    valleyDepth: world.terrain.valleyDepth,
  };
}

export function useTerrainSurface(): TerrainSurface {
  const seed = useWorldStore((state) => state.seed);
  const ridgeSharpness = useWorldStore((state) => state.world.terrain.ridgeSharpness);
  const warpIntensity = useWorldStore((state) => state.world.terrain.warpIntensity);
  const valleyDepth = useWorldStore((state) => state.world.terrain.valleyDepth);
  const [surface, setSurface] = useState<TerrainSurface>(() => ({
    field: buildElevationField(readParams()),
    previousElevations: null,
  }));

  useEffect(() => {
    const requested: FieldParams = { seed, ridgeSharpness, warpIntensity, valleyDepth };
    if (matches(surface.field.params, requested)) {
      worldRuntime.rebuildPending = false;
      return;
    }

    worldRuntime.rebuildPending = true;
    let timer = window.setTimeout(function rebuild() {
      if (worldRuntime.morphProgress < 1) {
        timer = window.setTimeout(rebuild, MORPH_POLL_MS);
        return;
      }
      setSurface((current) => ({
        field: buildElevationField(requested),
        previousElevations: current.field.elevations,
      }));
    }, FOLIAGE_RETREAT_MS);
    return () => window.clearTimeout(timer);
  }, [seed, ridgeSharpness, warpIntensity, valleyDepth, surface]);

  return surface;
}
