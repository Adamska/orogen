import type { ElevationField, FieldParams } from './elevationField';
import type { BiomeLayout, ScatterRules } from './scatterPlacement';
import type { TerrainMesh } from './terrainBuilder';

export interface SurfaceRequest {
  readonly kind: 'surface';
  readonly id: number;
  readonly params: FieldParams;
  readonly meshResolution: number;
}

export interface MeshRequest {
  readonly kind: 'mesh';
  readonly id: number;
  readonly params: FieldParams;
  readonly meshResolution: number;
}

export interface ScatterRequest {
  readonly kind: 'scatter';
  readonly id: number;
  readonly params: FieldParams;
  readonly rules: ScatterRules;
}

export type WorkerRequest = SurfaceRequest | MeshRequest | ScatterRequest;

export interface SurfaceResult {
  readonly field: ElevationField;
  readonly texels: Uint16Array;
  readonly mesh: TerrainMesh;
}

export type WorkerResponse =
  | { readonly kind: 'surface'; readonly id: number; readonly result: SurfaceResult }
  | { readonly kind: 'mesh'; readonly id: number; readonly result: TerrainMesh }
  | { readonly kind: 'scatter'; readonly id: number; readonly result: BiomeLayout }
  | { readonly kind: 'failure'; readonly id: number; readonly message: string };

export function sameFieldParams(a: FieldParams, b: FieldParams): boolean {
  return (
    a.seed === b.seed &&
    a.ridgeSharpness === b.ridgeSharpness &&
    a.warpIntensity === b.warpIntensity &&
    a.valleyDepth === b.valleyDepth
  );
}

export function meshTransferables(mesh: TerrainMesh): Transferable[] {
  return [mesh.positions.buffer, mesh.indices.buffer];
}

export function surfaceTransferables({ field, texels, mesh }: SurfaceResult): Transferable[] {
  return [field.elevations.buffer, field.gradients.buffer, field.openness.buffer, texels.buffer, ...meshTransferables(mesh)];
}

export function layoutTransferables(layout: BiomeLayout): Transferable[] {
  return Object.values(layout).flatMap((layer) => [layer.matrices.buffer, layer.placements.buffer]);
}
