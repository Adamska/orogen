import {
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Scene,
  type Material,
  type WebGLRenderer,
} from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { ElevationField } from '@/engine/elevationField';
import { scatterSnapshot } from '@/scene/scatterSnapshot';
import { worldUniforms } from '@/scene/worldUniforms';
import { bakeTerrainAlbedo } from './bakeTerrainAlbedo';
import { buildHeightfieldMesh } from './heightfieldMesh';
import { buildScatterInstances } from './scatterInstances';

export interface WorldIdentity {
  readonly name: string;
  readonly seed: number;
}

const MAX_ERROR_METERS = 0.6;
const ALBEDO_RESOLUTION = 2048;
const MIN_WATER_LEVEL = 0.004;
const WATER_OPACITY = 0.82;

export async function exportWorld(
  renderer: WebGLRenderer,
  field: ElevationField,
  identity: WorldIdentity,
): Promise<Blob> {
  const amplitude = worldUniforms.uAmplitude.value;
  const waterLevel = worldUniforms.uWaterLevel.value;
  const disposables: { dispose: () => void }[] = [];

  const terrainGeometry = buildHeightfieldMesh(field, amplitude, MAX_ERROR_METERS);
  const resolution = Math.min(ALBEDO_RESOLUTION, renderer.capabilities.maxTextureSize);
  const albedo = bakeTerrainAlbedo(renderer, terrainGeometry, field.size, resolution);
  const terrainMaterial = new MeshStandardMaterial({ map: albedo, roughness: 0.95, metalness: 0 });
  const terrain = new Mesh(terrainGeometry, terrainMaterial);
  terrain.name = 'Terrain';
  disposables.push(terrainGeometry, albedo, terrainMaterial);

  const world = new Group();
  world.name = identity.name;
  world.userData = { generator: 'Orogen', seed: identity.seed };
  world.add(terrain);

  if (waterLevel > MIN_WATER_LEVEL) {
    const waterGeometry = new PlaneGeometry(field.size, field.size);
    waterGeometry.rotateX(-Math.PI / 2);
    const tint = new Color().copy(worldUniforms.uWaterShallow.value).lerp(worldUniforms.uWaterDeep.value, 0.5);
    const waterMaterial = new MeshStandardMaterial({
      color: tint,
      roughness: 0.08,
      metalness: 0,
      transparent: true,
      opacity: WATER_OPACITY,
    });
    const water = new Mesh(waterGeometry, waterMaterial);
    water.name = 'Water';
    water.position.y = waterLevel * amplitude;
    world.add(water);
    disposables.push(waterGeometry, waterMaterial);
  }

  const scatter = buildScatterInstances(
    scatterSnapshot,
    { field, amplitude, waterLevel },
    { foliage: worldUniforms.uFoliageColor.value, rock: worldUniforms.uRockColor.value },
  );
  for (const layer of scatter) {
    disposables.push(layer.geometry, layer.material as Material, layer);
    if (layer.count > 0) world.add(layer);
  }

  const scene = new Scene();
  scene.add(world);
  try {
    const result = await new GLTFExporter().parseAsync(scene, { binary: true });
    if (!(result instanceof ArrayBuffer)) throw new Error('Expected a binary glTF export');
    return new Blob([result], { type: 'model/gltf-binary' });
  } finally {
    for (const item of disposables) item.dispose();
  }
}
