'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ElevationField } from '@/engine/elevationField';
import type { BiomeLayout } from '@/engine/scatterPlacement';
import { requestScatter } from '@/engine/terrainWorkerClient';
import { scatterShader } from '@/shaders';
import { useQualityProfile } from '@/store/useQualityStore';
import { useWorldStore } from '@/store/useWorldStore';
import { createDepthMaterial, createLitMaterial } from './materials';
import { createBoulderGeometry, createTreeGeometry } from './scatterGeometry';
import { ScatterTiles } from './ScatterTiles';

export function BiomeScatter({ field }: { field: ElevationField }) {
  const amplitude = useWorldStore((state) => state.world.terrain.amplitude);
  const snowLine = useWorldStore((state) => state.world.snowLine);
  const foliageDensity = useWorldStore((state) => state.world.foliageDensity);
  const vegetation = useWorldStore((state) => state.world.vegetation);
  const { foliageScale } = useQualityProfile();
  const [layout, setLayout] = useState<BiomeLayout | null>(null);

  useEffect(() => {
    let cancelled = false;
    void requestScatter(field.params, { amplitude, snowLine, vegetation }).then((next) => {
      if (!cancelled) setLayout(next);
    });
    return () => {
      cancelled = true;
    };
  }, [field, amplitude, snowLine, vegetation]);

  const assets = useMemo(() => {
    const sway = { SCATTER_SWAY: '' };
    return {
      boulder: createBoulderGeometry(),
      treeMaterial: createLitMaterial(scatterShader, { defines: sway }),
      treeDepth: createDepthMaterial(scatterShader.vertex, sway),
      boulderMaterial: createLitMaterial(scatterShader),
      boulderDepth: createDepthMaterial(scatterShader.vertex),
    };
  }, []);
  const treeGeometry = useMemo(() => createTreeGeometry(vegetation), [vegetation]);

  useEffect(
    () => () => {
      for (const asset of Object.values(assets)) asset.dispose();
    },
    [assets],
  );
  useEffect(() => () => treeGeometry.dispose(), [treeGeometry]);

  if (layout === null) return null;

  return (
    <>
      <ScatterTiles
        geometry={treeGeometry}
        material={assets.treeMaterial}
        depthMaterial={assets.treeDepth}
        layout={layout.trees}
        density={foliageDensity * foliageScale}
        amplitude={amplitude}
      />
      <ScatterTiles
        geometry={assets.boulder}
        material={assets.boulderMaterial}
        depthMaterial={assets.boulderDepth}
        layout={layout.boulders}
        density={(0.35 + foliageDensity * 0.65) * foliageScale}
        amplitude={amplitude}
      />
    </>
  );
}
