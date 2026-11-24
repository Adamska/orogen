import { buildElevationField, type FieldParams } from './elevationField';
import { scatterBiome, type BiomeLayout, type ScatterRules } from './scatterPlacement';
import { buildFieldTexels, buildTerrainMesh, type TerrainMesh } from './terrainBuilder';
import type { SurfaceResult, WorkerRequest, WorkerResponse } from './terrainProtocol';

type Settle = (response: WorkerResponse) => void;

let worker: Worker | null = null;
let unavailable = false;
let nextId = 1;
const pending = new Map<number, Settle>();

function failAll(message: string): void {
  for (const [id, settle] of pending) settle({ kind: 'failure', id, message });
  pending.clear();
}

function connect(): Worker | null {
  if (worker !== null || unavailable) return worker;
  try {
    worker = new Worker(new URL('./terrain.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
      pending.get(data.id)?.(data);
      pending.delete(data.id);
    };
    worker.onerror = (event) => {
      unavailable = true;
      worker?.terminate();
      worker = null;
      failAll(event.message);
    };
  } catch {
    unavailable = true;
  }
  return worker;
}

function dispatch(request: WorkerRequest): Promise<WorkerResponse> {
  const target = connect();
  if (target === null) return Promise.reject(new Error('Terrain worker unavailable'));
  return new Promise((resolve) => {
    pending.set(request.id, resolve);
    target.postMessage(request);
  });
}

function buildSurfaceInline(params: FieldParams, meshResolution: number): SurfaceResult {
  const field = buildElevationField(params);
  return { field, texels: buildFieldTexels(field), mesh: buildTerrainMesh(field, meshResolution) };
}

export async function requestSurface(params: FieldParams, meshResolution: number): Promise<SurfaceResult> {
  const response = await dispatch({ kind: 'surface', id: nextId++, params, meshResolution }).catch(() => null);
  if (response?.kind === 'surface') return response.result;
  return buildSurfaceInline(params, meshResolution);
}

export async function requestMesh(params: FieldParams, meshResolution: number): Promise<TerrainMesh> {
  const response = await dispatch({ kind: 'mesh', id: nextId++, params, meshResolution }).catch(() => null);
  if (response?.kind === 'mesh') return response.result;
  return buildTerrainMesh(buildElevationField(params), meshResolution);
}

export async function requestScatter(params: FieldParams, rules: ScatterRules): Promise<BiomeLayout> {
  const response = await dispatch({ kind: 'scatter', id: nextId++, params, rules }).catch(() => null);
  if (response?.kind === 'scatter') return response.result;
  return scatterBiome(buildElevationField(params), rules);
}
