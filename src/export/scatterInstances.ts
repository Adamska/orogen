import {
  BufferAttribute,
  Color,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Vector3,
  type BufferGeometry,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { sampleField, type ElevationField, type FieldSample } from '@/engine/elevationField';
import { SCATTER_TILES, type ScatterLayout } from '@/engine/scatterPlacement';
import { createBoulderGeometry, createTreeGeometry } from '@/scene/scatterGeometry';
import type { scatterSnapshot } from '@/scene/scatterSnapshot';

export interface ScatterPalette {
  readonly foliage: Color;
  readonly rock: Color;
}

interface Ground {
  readonly field: ElevationField;
  readonly amplitude: number;
  readonly waterLevel: number;
}

const TRUNK_COLOR = new Color(0.13, 0.09, 0.065);
const SHORE_FADE = [1, 4.5] as const;
const probe: FieldSample = { elevation: 0, gradientX: 0, gradientZ: 0, openness: 0 };

function paintTree(source: BufferGeometry, foliage: Color): BufferGeometry {
  const canopy = source.getAttribute('aCanopy');
  const position = source.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const shade = new Color();
  const leaf = new Color();
  for (let index = 0; index < position.count; index += 1) {
    leaf.copy(foliage).multiplyScalar(0.8 * (0.5 + 0.65 * Math.min(1, position.getY(index))));
    shade.copy(TRUNK_COLOR).lerp(leaf, canopy.getX(index)).toArray(colors, index * 3);
  }
  source.deleteAttribute('aCanopy');
  source.setAttribute('color', new BufferAttribute(colors, 3));
  const merged = mergeVertices(source);
  source.dispose();
  return merged;
}

function instance(
  name: string,
  geometry: BufferGeometry,
  material: MeshStandardMaterial,
  layout: ScatterLayout,
  density: number,
  ground: Ground,
  shoreFade: boolean,
): InstancedMesh {
  const matrices: Matrix4[] = [];
  const matrix = new Matrix4();
  const shrink = new Matrix4();
  const anchor = new Vector3();
  for (let tile = 0; tile < SCATTER_TILES * SCATTER_TILES; tile += 1) {
    const start = layout.tileStarts[tile];
    const end = start + Math.round((layout.tileStarts[tile + 1] - start) * density);
    for (let index = start; index < end; index += 1) {
      matrix.fromArray(layout.matrices, index * 16);
      anchor.setFromMatrixPosition(matrix);
      const elevation = sampleField(ground.field, anchor.x, anchor.z, probe).elevation;
      const clearance = (elevation - ground.waterLevel) * ground.amplitude;
      const presence = shoreFade ? Math.min(1, Math.max(0, (clearance - SHORE_FADE[0]) / (SHORE_FADE[1] - SHORE_FADE[0]))) : 1;
      if (presence < 0.05) continue;
      matrix.multiply(shrink.makeScale(presence, presence, presence));
      matrix.elements[13] += elevation * ground.amplitude;
      matrices.push(matrix.clone());
    }
  }
  const mesh = new InstancedMesh(geometry, material, matrices.length);
  matrices.forEach((placed, index) => mesh.setMatrixAt(index, placed));
  mesh.name = name;
  return mesh;
}

export function buildScatterInstances(
  snapshot: typeof scatterSnapshot,
  ground: Ground,
  palette: ScatterPalette,
): InstancedMesh[] {
  const { layout } = snapshot;
  if (layout === null) return [];
  const trees = instance(
    'Vegetation',
    paintTree(createTreeGeometry(snapshot.vegetation), palette.foliage),
    new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }),
    layout.trees,
    snapshot.treeDensity,
    ground,
    true,
  );
  const boulders = instance(
    'Boulders',
    createBoulderGeometry(),
    new MeshStandardMaterial({ color: palette.rock, roughness: 0.95, metalness: 0 }),
    layout.boulders,
    snapshot.boulderDensity,
    ground,
    false,
  );
  boulders.geometry.deleteAttribute('aCanopy');
  return [trees, boulders];
}
