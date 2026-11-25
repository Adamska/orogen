import {
  BoxGeometry,
  BufferAttribute,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SkinnedMesh,
  TorusGeometry,
  type AnimationClip,
  type BufferGeometry,
  type Material,
  type Object3D,
} from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

export interface WandererModel {
  readonly root: Group;
  readonly figure: Object3D;
  readonly clips: readonly AnimationClip[];
  readonly lantern: MeshStandardMaterial;
  readonly shadow: Mesh;
  readonly shadowMaterial: MeshBasicMaterial;
  readonly dispose: () => void;
}

const MODEL_URL = '/models/wanderer.glb';
const LANTERN_COLOR = new Color(1, 0.62, 0.28);
const OUTFIT = {
  boots: new Color('#3d2c22'),
  trousers: new Color('#5b5a4a'),
  belt: new Color('#2d2219'),
  jacket: new Color('#2f6e6a'),
  skin: new Color('#c98f6c'),
  hair: new Color('#3b2a20'),
  gloves: new Color('#4d3527'),
};

let pending: Promise<GLTF> | null = null;

export function loadWanderer(): Promise<GLTF> {
  pending ??= new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .loadAsync(MODEL_URL)
    .catch((error: unknown) => {
      pending = null;
      throw error;
    });
  return pending;
}

function outfitAt(x: number, y: number): Color {
  const reach = Math.abs(x);
  if (reach > 0.64) return OUTFIT.gloves;
  if (y >= 1.47 && reach < 0.13) return y > 1.72 ? OUTFIT.hair : OUTFIT.skin;
  if (y >= 1.02) return OUTFIT.jacket;
  if (y >= 0.97) return OUTFIT.belt;
  return y >= 0.14 ? OUTFIT.trousers : OUTFIT.boots;
}

function paintOutfit(geometry: BufferGeometry): void {
  if (geometry.hasAttribute('color')) return;
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  for (let index = 0; index < position.count; index += 1) {
    outfitAt(position.getX(index), position.getY(index)).toArray(colors, index * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
}

export function createWanderer(gltf: GLTF): WandererModel {
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const surface = (color: string, roughness: number, extra: Partial<MeshStandardMaterial> = {}) => {
    const material = new MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });
    materials.push(material);
    return material;
  };
  const fabric = surface('#ffffff', 0.86, { vertexColors: true });
  const seams = surface('#8c8c8c', 0.8, { vertexColors: true });
  const lantern = surface('#ffd7a0', 0.4, { emissive: LANTERN_COLOR, emissiveIntensity: 0.4 });

  const figure = clone(gltf.scene);
  figure.traverse((object) => {
    if (!(object instanceof SkinnedMesh)) return;
    paintOutfit(object.geometry);
    const original = Array.isArray(object.material) ? object.material[0] : object.material;
    object.material = original.name === 'M_Joints' ? seams : fabric;
    object.castShadow = true;
    object.frustumCulled = false;
  });
  figure.updateMatrixWorld(true);

  const bone = (name: string) => figure.getObjectByName(name) ?? figure;
  const prop = (anchor: string, geometry: BufferGeometry, material: Material, x: number, y: number, z: number) => {
    geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    figure.add(mesh);
    mesh.updateMatrixWorld(true);
    bone(anchor).attach(mesh);
    return mesh;
  };
  const hat = surface('#8a6a45', 0.9);
  const pack = surface('#9b7b52', 0.85);
  const roll = surface('#6f7f5a', 0.9);
  const scarf = surface('#b8442e', 0.9);
  prop('DEF-head', new CylinderGeometry(0.21, 0.22, 0.018, 24), hat, 0, 1.755, 0.015);
  prop('DEF-head', new CylinderGeometry(0.1, 0.118, 0.12, 20), hat, 0, 1.815, 0.01);
  prop('DEF-neck', new TorusGeometry(0.085, 0.034, 8, 18), scarf, 0, 1.475, 0).rotation.x = Math.PI / 2;
  prop('DEF-spine.003', new BoxGeometry(0.32, 0.4, 0.15, 2, 2, 2), pack, 0, 1.21, -0.2);
  prop('DEF-spine.003', new CylinderGeometry(0.07, 0.07, 0.4, 12), roll, 0, 1.45, -0.19).rotation.z = Math.PI / 2;
  prop('DEF-spine.003', new BoxGeometry(0.06, 0.08, 0.06), pack, 0.19, 1.04, -0.24);
  prop('DEF-spine.003', new IcosahedronGeometry(0.035, 1), lantern, 0.19, 1.04, -0.24).castShadow = false;

  const root = new Group();
  root.add(figure);

  const shadowMaterial = new MeshBasicMaterial({
    color: '#000000',
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
  });
  materials.push(shadowMaterial);
  const shadowGeometry = new CircleGeometry(0.45, 20);
  shadowGeometry.rotateX(-Math.PI / 2);
  geometries.push(shadowGeometry);
  const shadow = new Mesh(shadowGeometry, shadowMaterial);
  shadow.renderOrder = 1;

  return {
    root,
    figure,
    clips: gltf.animations,
    lantern,
    shadow,
    shadowMaterial,
    dispose: () => {
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
    },
  };
}
