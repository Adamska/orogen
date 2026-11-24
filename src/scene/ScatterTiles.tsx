'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { Sphere, Vector3, type BufferGeometry, type InstancedMesh, type ShaderMaterial } from 'three';
import { SCATTER_TILES, type ScatterLayout } from '@/engine/scatterPlacement';
import { TERRAIN_SIZE } from '@/engine/worldConfig';

interface ScatterTilesProps {
  geometry: BufferGeometry;
  material: ShaderMaterial;
  depthMaterial: ShaderMaterial;
  layout: ScatterLayout;
  density: number;
  amplitude: number;
}

interface TileProps extends Omit<ScatterTilesProps, 'layout' | 'amplitude'> {
  matrices: Float32Array;
  bounds: Sphere;
}

const TILE_SPAN = TERRAIN_SIZE / SCATTER_TILES;
const CANOPY_ALLOWANCE = 40;

function tileBounds(tile: number, amplitude: number): Sphere {
  const column = tile % SCATTER_TILES;
  const row = Math.floor(tile / SCATTER_TILES);
  const center = new Vector3(
    (column + 0.5) * TILE_SPAN - TERRAIN_SIZE / 2,
    amplitude * 0.65,
    (row + 0.5) * TILE_SPAN - TERRAIN_SIZE / 2,
  );
  const radius = Math.hypot(TILE_SPAN * 0.71, amplitude * 0.75) + CANOPY_ALLOWANCE;
  return new Sphere(center, radius);
}

function ScatterTile({ geometry, material, depthMaterial, matrices, density, bounds }: TileProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const capacity = matrices.length / 16;

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.instanceMatrix.array.set(matrices);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.boundingSphere = bounds;
  }, [matrices, bounds]);

  useLayoutEffect(() => {
    if (meshRef.current) meshRef.current.count = Math.round(capacity * density);
  }, [capacity, density]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, capacity]}
      customDepthMaterial={depthMaterial}
      castShadow
      receiveShadow
    />
  );
}

export function ScatterTiles({ layout, amplitude, ...shared }: ScatterTilesProps) {
  const tiles = useMemo(() => {
    const starts = layout.tileStarts;
    return Array.from({ length: starts.length - 1 }, (_, tile) => ({
      tile,
      matrices: layout.matrices.subarray(starts[tile] * 16, starts[tile + 1] * 16),
    })).filter(({ matrices }) => matrices.length > 0);
  }, [layout]);
  const bounds = useMemo(
    () => Array.from({ length: SCATTER_TILES * SCATTER_TILES }, (_, tile) => tileBounds(tile, amplitude)),
    [amplitude],
  );

  return (
    <>
      {tiles.map(({ tile, matrices }) => (
        <ScatterTile
          key={`${shared.geometry.uuid}:${tile}:${matrices.length}`}
          {...shared}
          matrices={matrices}
          bounds={bounds[tile]}
        />
      ))}
    </>
  );
}
