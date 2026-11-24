import type { ElevationField, FieldParams } from './elevationField';
import type { BiomeLayout, ScatterRules } from './scatterPlacement';
import type { SurfaceBuffers } from './terrainBuilder';

export interface SurfaceRequest {
  readonly kind: 'surface';
  readonly id: number;
  readonly params: FieldParams;
}

export interface ScatterRequest {
  readonly kind: 'scatter';
  readonly id: number;
  readonly params: FieldParams;
  readonly rules: ScatterRules;
}

export type WorkerRequest = SurfaceRequest | ScatterRequest;

export interface SurfaceResult {
  readonly field: ElevationField;
  readonly buffers: SurfaceBuffers;
}

export type WorkerResponse =
  | { readonly kind: 'surface'; readonly id: number; readonly result: SurfaceResult }
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

export function surfaceTransferables({ field, buffers }: SurfaceResult): Transferable[] {
  return [
    field.elevations.buffer,
    field.gradients.buffer,
    field.openness.buffer,
    buffers.positions.buffer,
    buffers.indices.buffer,
    buffers.texels.buffer,
  ];
}

export function layoutTransferables(layout: BiomeLayout): Transferable[] {
  return Object.values(layout).flatMap((layer) => [layer.matrices.buffer, layer.placements.buffer]);
}
