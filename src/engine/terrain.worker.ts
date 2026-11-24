import { buildElevationField, type ElevationField, type FieldParams } from './elevationField';
import { scatterBiome } from './scatterPlacement';
import { buildSurfaceBuffers } from './terrainBuilder';
import {
  layoutTransferables,
  sameFieldParams,
  surfaceTransferables,
  type WorkerRequest,
  type WorkerResponse,
} from './terrainProtocol';

interface WorkerScope {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerResponse, transfer: Transferable[]): void;
}

const scope = self as unknown as WorkerScope;
let cached: ElevationField | null = null;

function fieldFor(params: FieldParams): ElevationField {
  if (cached === null || !sameFieldParams(cached.params, params)) cached = buildElevationField(params);
  return cached;
}

function detach(field: ElevationField): ElevationField {
  return {
    ...field,
    params: { ...field.params },
    elevations: field.elevations.slice(),
    gradients: field.gradients.slice(),
    openness: field.openness.slice(),
  };
}

function handle(request: WorkerRequest): void {
  if (request.kind === 'surface') {
    const field = fieldFor(request.params);
    const result = { field: detach(field), buffers: buildSurfaceBuffers(field) };
    scope.postMessage({ kind: 'surface', id: request.id, result }, surfaceTransferables(result));
    return;
  }
  const layout = scatterBiome(fieldFor(request.params), request.rules);
  scope.postMessage({ kind: 'scatter', id: request.id, result: layout }, layoutTransferables(layout));
}

scope.onmessage = ({ data }) => {
  try {
    handle(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    scope.postMessage({ kind: 'failure', id: data.id, message }, []);
  }
};
