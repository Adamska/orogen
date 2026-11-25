import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  TorusGeometry,
  type Material,
} from 'three';
import type { Mount } from './characterFlight';
import { findBone, type WandererModel } from './wandererModel';

export interface FlightGear {
  readonly rigs: Record<Mount, Group>;
  readonly flames: readonly Mesh[];
  readonly dispose: () => void;
}

const WING_SPAN = 8.6;
const WING_CHORD = 2.3;
const WING_CELLS = 24;
const WING_RADIUS = 5.6;
const WING_HEIGHT = 7.4;
const RISERS = [0.22, -0.22] as const;

function wingGeometry(): BufferGeometry {
  const geometry = new PlaneGeometry(WING_SPAN, WING_CHORD, WING_CELLS, 1).toNonIndexed();
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const angle = x / WING_RADIUS;
    position.setXYZ(index, Math.sin(angle) * WING_RADIUS, Math.cos(angle) * WING_RADIUS - WING_RADIUS, position.getZ(index));
    const cell = Math.floor(((Math.floor(index / 6) % WING_CELLS) + 0.5) / 3) % 2;
    colors.set(cell === 0 ? [0.86, 0.3, 0.12] : [0.93, 0.9, 0.82], index * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function lineGeometry(): BufferGeometry {
  const points: number[] = [];
  for (let anchor = 0; anchor <= 8; anchor += 1) {
    const angle = ((anchor / 8 - 0.5) * WING_SPAN * 0.92) / WING_RADIUS;
    const x = Math.sin(angle) * WING_RADIUS;
    const y = WING_HEIGHT + Math.cos(angle) * WING_RADIUS - WING_RADIUS;
    const riser = x >= 0 ? RISERS[0] : RISERS[1];
    for (const z of [WING_CHORD * 0.3, -WING_CHORD * 0.2]) points.push(x, y, z, riser, 1.05, 0);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(points), 3));
  return geometry;
}

function membraneGeometry(): BufferGeometry {
  const side = (sign: number) => [
    [0.2 * sign, 1.45, -0.03], [0.7 * sign, 1.45, -0.03], [0.46 * sign, 1.16, -0.03],
    [0.2 * sign, 1.45, -0.03], [0.46 * sign, 1.16, -0.03], [0.15 * sign, 0.94, -0.03],
  ];
  const legs = [[0, 0.86, -0.03], [0.13, 0.12, -0.03], [-0.13, 0.12, -0.03]];
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array([...side(1), ...side(-1), ...legs].flat()), 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function createFlightGear(model: WandererModel): FlightGear {
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends BufferGeometry | Material>(item: T) => {
    disposables.push(item);
    return item;
  };
  const mesh = (geometry: BufferGeometry, material: Material, x = 0, y = 0, z = 0) => {
    const created = new Mesh(keep(geometry), material);
    created.position.set(x, y, z);
    created.castShadow = true;
    return created;
  };
  const rigs = { paraglider: new Group(), jetpack: new Group(), wingsuit: new Group(), broom: new Group() };

  const canopy = keep(new MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: DoubleSide }));
  const strings = keep(new LineBasicMaterial({ color: '#2a2622', transparent: true, opacity: 0.55 }));
  rigs.paraglider.add(mesh(wingGeometry(), canopy, 0, WING_HEIGHT, 0), new LineSegments(keep(lineGeometry()), strings));

  const metal = keep(new MeshStandardMaterial({ color: '#9aa3ad', roughness: 0.35, metalness: 0.7 }));
  const flame = keep(new MeshBasicMaterial({ color: '#ffb36b', transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false }));
  const flames: Mesh[] = [];
  for (const x of [0.1, -0.1]) {
    const tank = mesh(new CylinderGeometry(0.07, 0.07, 0.42, 14), metal, x, 1.22, -0.3);
    const nozzle = mesh(new ConeGeometry(0.06, 0.1, 12, 1, true), metal, x, 0.97, -0.3);
    const plume = mesh(new ConeGeometry(0.055, 0.55, 12, 1, true), flame, x, 0.66, -0.3);
    plume.rotation.x = Math.PI;
    plume.castShadow = false;
    flames.push(plume);
    rigs.jetpack.add(tank, nozzle, plume);
  }

  const suit = keep(new MeshStandardMaterial({ color: '#24585a', roughness: 0.8, side: DoubleSide }));
  rigs.wingsuit.add(mesh(membraneGeometry(), suit));

  const wood = keep(new MeshStandardMaterial({ color: '#7a5a3a', roughness: 0.8 }));
  const straw = keep(new MeshStandardMaterial({ color: '#c8a35a', roughness: 0.95 }));
  const shaft = mesh(new CylinderGeometry(0.03, 0.035, 2.1, 10), wood, 0, 0.42, 0.05);
  shaft.rotation.x = Math.PI / 2 - 0.06;
  const bristles = mesh(new ConeGeometry(0.2, 0.7, 14), straw, 0, 0.36, -1.3);
  bristles.rotation.x = Math.PI / 2;
  const band = mesh(new TorusGeometry(0.06, 0.018, 6, 14), wood, 0, 0.38, -0.98);
  rigs.broom.add(shaft, bristles, band);

  for (const rig of Object.values(rigs)) {
    rig.visible = false;
    model.figure.add(rig);
  }
  model.figure.updateMatrixWorld(true);
  findBone(model.figure, 'DEF-spine.003').attach(rigs.jetpack);
  return {
    rigs,
    flames,
    dispose: () => {
      for (const rig of Object.values(rigs)) rig.removeFromParent();
      for (const item of disposables) item.dispose();
    },
  };
}

export function showFlightGear(gear: FlightGear, mount: Mount | null, thrust: number, time: number): void {
  for (const [name, rig] of Object.entries(gear.rigs)) rig.visible = name === mount;
  if (mount !== 'jetpack') return;
  gear.flames.forEach((plume, index) => {
    const flicker = 0.85 + Math.sin(time * 41 + index * 2.3) * 0.08 + Math.sin(time * 67 + index) * 0.07;
    plume.scale.set(1, Math.max(0.05, thrust * flicker * 1.6), 1);
    plume.position.y = 0.92 - 0.27 * plume.scale.y;
  });
}
