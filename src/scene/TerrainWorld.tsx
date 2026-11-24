'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { Mesh } from 'three';
import { buildOceanGeometry, createFieldTexture, createTerrainGeometry } from '@/engine/terrainBuilder';
import { TERRAIN_SIZE } from '@/engine/worldConfig';
import { terrainShader, waterShader } from '@/shaders';
import { createDepthMaterial, createLitMaterial } from './materials';
import type { TerrainSurface } from './useTerrainSurface';
import { terrainHandles } from './terrainHandles';
import { beginTerrainMorph } from './worldRuntime';
import { worldUniforms } from './worldUniforms';

const OCEAN_RESOLUTION = 225;
const OCEAN_DETAIL_SIZE = TERRAIN_SIZE * 1.2;
const MIN_VISIBLE_WATER_LEVEL = 0.004;

function releaseFieldTextures(): void {
  worldUniforms.uElevationFrom.value?.dispose();
  worldUniforms.uElevationTo.value?.dispose();
  worldUniforms.uElevationFrom.value = null;
  worldUniforms.uElevationTo.value = null;
}

export function TerrainWorld({ surface }: { surface: TerrainSurface }) {
  const waterRef = useRef<Mesh>(null);

  const terrainGeometry = useMemo(() => {
    const { field, buffers, previousElevations } = surface;
    const from = previousElevations?.length === field.elevations.length ? previousElevations : field.elevations;
    return createTerrainGeometry(buffers, from.slice());
  }, [surface]);
  const oceanGeometry = useMemo(() => buildOceanGeometry(OCEAN_RESOLUTION, OCEAN_DETAIL_SIZE), []);
  const materials = useMemo(
    () => ({
      terrain: createLitMaterial(terrainShader),
      terrainDepth: createDepthMaterial(terrainShader.vertex),
      water: createLitMaterial(waterShader, { transparent: true }),
    }),
    [],
  );

  useLayoutEffect(() => {
    const texture = createFieldTexture(surface.buffers.texels, surface.field.resolution);
    const outgoing = worldUniforms.uElevationTo.value;
    const stale = worldUniforms.uElevationFrom.value;
    worldUniforms.uElevationFrom.value = outgoing ?? texture;
    worldUniforms.uElevationTo.value = texture;
    if (stale !== null && stale !== outgoing) stale.dispose();
    beginTerrainMorph(outgoing !== null);
  }, [surface]);

  useEffect(() => {
    terrainHandles.geometry = terrainGeometry;
    return () => {
      if (terrainHandles.geometry === terrainGeometry) terrainHandles.geometry = null;
      terrainGeometry.dispose();
    };
  }, [terrainGeometry]);
  useEffect(
    () => () => {
      oceanGeometry.dispose();
      materials.terrain.dispose();
      materials.terrainDepth.dispose();
      materials.water.dispose();
      releaseFieldTextures();
    },
    [oceanGeometry, materials],
  );

  useFrame(() => {
    if (waterRef.current) {
      waterRef.current.visible = worldUniforms.uWaterLevel.value > MIN_VISIBLE_WATER_LEVEL;
    }
  });

  return (
    <>
      <mesh
        geometry={terrainGeometry}
        material={materials.terrain}
        customDepthMaterial={materials.terrainDepth}
        frustumCulled={false}
        castShadow
        receiveShadow
      />
      <mesh
        ref={waterRef}
        geometry={oceanGeometry}
        material={materials.water}
        frustumCulled={false}
        receiveShadow
      />
    </>
  );
}
