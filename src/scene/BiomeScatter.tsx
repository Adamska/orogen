'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { BufferGeometry, InstancedMesh, ShaderMaterial } from 'three';
import type { ElevationField } from '@/engine/elevationField';
import {
  BOULDER_CAPACITY,
  TREE_CAPACITY,
  scatterBiome,
  type ScatterLayout,
} from '@/engine/scatterPlacement';
import { scatterShader } from '@/shaders';
import { useWorldStore } from '@/store/useWorldStore';
import { createDepthMaterial, createLitMaterial } from './materials';
import { createBoulderGeometry, createConiferGeometry } from './scatterGeometry';

interface ScatterLayerProps {
  geometry: BufferGeometry;
  material: ShaderMaterial;
  depthMaterial: ShaderMaterial;
  layout: ScatterLayout;
  capacity: number;
  density: number;
}

function ScatterLayer({ geometry, material, depthMaterial, layout, capacity, density }: ScatterLayerProps) {
  const meshRef = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const placements = mesh.geometry.getAttribute('aPlacement');
    mesh.instanceMatrix.array.set(layout.matrices);
    placements.array.set(layout.placements);
    mesh.instanceMatrix.needsUpdate = true;
    placements.needsUpdate = true;
  }, [layout]);

  useLayoutEffect(() => {
    if (meshRef.current) meshRef.current.count = Math.round(layout.count * density);
  }, [layout, density]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, capacity]}
      customDepthMaterial={depthMaterial}
      frustumCulled={false}
      castShadow
      receiveShadow
    />
  );
}

export function BiomeScatter({ field }: { field: ElevationField }) {
  const amplitude = useWorldStore((state) => state.world.terrain.amplitude);
  const snowLine = useWorldStore((state) => state.world.snowLine);
  const foliageDensity = useWorldStore((state) => state.world.foliageDensity);

  const layout = useMemo(
    () => scatterBiome(field, { amplitude, snowLine }),
    [field, amplitude, snowLine],
  );
  const assets = useMemo(() => {
    const sway = { SCATTER_SWAY: '' };
    return {
      conifer: createConiferGeometry(TREE_CAPACITY),
      boulder: createBoulderGeometry(BOULDER_CAPACITY),
      treeMaterial: createLitMaterial(scatterShader, { defines: sway }),
      treeDepth: createDepthMaterial(scatterShader.vertex, sway),
      boulderMaterial: createLitMaterial(scatterShader),
      boulderDepth: createDepthMaterial(scatterShader.vertex),
    };
  }, []);

  useEffect(
    () => () => {
      for (const asset of Object.values(assets)) asset.dispose();
    },
    [assets],
  );

  return (
    <>
      <ScatterLayer
        geometry={assets.conifer}
        material={assets.treeMaterial}
        depthMaterial={assets.treeDepth}
        layout={layout.trees}
        capacity={TREE_CAPACITY}
        density={foliageDensity}
      />
      <ScatterLayer
        geometry={assets.boulder}
        material={assets.boulderMaterial}
        depthMaterial={assets.boulderDepth}
        layout={layout.boulders}
        capacity={BOULDER_CAPACITY}
        density={0.35 + foliageDensity * 0.65}
      />
    </>
  );
}
