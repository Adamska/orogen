'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ElevationField } from '@/engine/elevationField';
import type { BiomeLayout } from '@/engine/scatterPlacement';
import type { VegetationKind } from '@/engine/worldConfig';
import { requestScatter } from '@/engine/terrainWorkerClient';
import { scatterShader } from '@/shaders';
import { useQualityProfile } from '@/store/useQualityStore';
import { useWorldStore } from '@/store/useWorldStore';
import { createDepthMaterial, createLitMaterial } from './materials';
import { createBoulderGeometry, createTreeGeometry } from './scatterGeometry';
import { ScatterTiles } from './ScatterTiles';
import { scatterObstacles } from './walkObstacles';

const TRUNK_RADIUS: Record<VegetationKind, number> = { conifer: 0.045, broadleaf: 0.05, palm: 0.034, shrub: 0 };
const BOULDER_RADIUS = 0.8;

export function BiomeScatter({ field }: { field: ElevationField }) {
  const amplitude = useWorldStore((state) => state.world.terrain.amplitude);
  const snowLine = useWorldStore((state) => state.world.snowLine);
  const foliageDensity = useWorldStore((state) => state.world.foliageDensity);
  const vegetation = useWorldStore((state) => state.world.vegetation);
  const { foliageScale } = useQualityProfile();
  const [layout, setLayout] = useState<BiomeLayout | null>(null);
  const treeDensity = foliageDensity * foliageScale;
  const boulderDensity = (0.35 + foliageDensity * 0.65) * foliageScale;

  useEffect(() => {
    let cancelled = false;
    void requestScatter(field.params, { amplitude, snowLine, vegetation }).then((next) => {
      if (!cancelled) setLayout(next);
    });
    return () => {
      cancelled = true;
    };
  }, [field, amplitude, snowLine, vegetation]);

  useEffect(() => {
    const trunk = TRUNK_RADIUS[vegetation];
    scatterObstacles.trees =
      layout === null || trunk === 0 ? null : { layout: layout.trees, density: treeDensity, radiusRatio: trunk };
    scatterObstacles.boulders =
      layout === null ? null : { layout: layout.boulders, density: boulderDensity, radiusRatio: BOULDER_RADIUS };
    return () => {
      scatterObstacles.trees = null;
      scatterObstacles.boulders = null;
    };
  }, [layout, vegetation, treeDensity, boulderDensity]);

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
        density={treeDensity}
        amplitude={amplitude}
      />
      <ScatterTiles
        geometry={assets.boulder}
        material={assets.boulderMaterial}
        depthMaterial={assets.boulderDepth}
        layout={layout.boulders}
        density={boulderDensity}
        amplitude={amplitude}
      />
    </>
  );
}
