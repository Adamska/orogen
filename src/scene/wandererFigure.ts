import type { Object3D } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createFlightGear, showFlightGear, type FlightGear } from './flightGear';
import type { WalkTerrain, Walker } from './walkerMotion';
import { animateWanderer, createAnimator, type WandererAnimator } from './wandererAnimator';
import { createWanderer, type WandererModel } from './wandererModel';
import { placeWanderer } from './wandererPlacement';

export interface WandererFigure {
  readonly model: WandererModel;
  readonly animator: WandererAnimator;
  readonly gear: FlightGear;
  readonly slope: { x: number; z: number };
}

const LANTERN_BASE = 0.4;
const LANTERN_NIGHT = 7;
const HOVER_RATE = 2.2;
const HOVER_AMPLITUDE = 0.35;
const HOVER_PULSE = 0.2;

export function createFigure(gltf: GLTF, scene: Object3D): WandererFigure {
  const model = createWanderer(gltf);
  model.root.updateMatrixWorld(true);
  const figure = { model, animator: createAnimator(model), gear: createFlightGear(model), slope: { x: 0, z: 0 } };
  scene.add(model.root, model.shadow);
  return figure;
}

export function disposeFigure(figure: WandererFigure, scene: Object3D): void {
  figure.animator.mixer.stopAllAction();
  figure.animator.mixer.uncacheRoot(figure.model.figure);
  scene.remove(figure.model.root, figure.model.shadow);
  figure.gear.dispose();
  figure.model.dispose();
}

export function updateFigure(
  figure: WandererFigure,
  walker: Walker,
  terrain: WalkTerrain,
  night: number,
  time: number,
  delta: number,
): void {
  const { position, flight } = walker;
  const { slope } = figure;
  const floor = terrain.groundAt(position.x, position.z);
  terrain.slopeAt(position.x, position.z, slope);
  animateWanderer(figure.animator, walker, delta);
  const hover = flight?.hover ?? 0;
  const pulse = Math.cos(time * HOVER_RATE) * HOVER_PULSE * hover;
  showFlightGear(figure.gear, flight?.mount ?? null, (flight?.thrust ?? 0) + pulse, time);
  placeWanderer(figure.model, {
    position,
    facing: walker.facing,
    floor,
    slopeX: slope.x,
    slopeZ: slope.z,
    dry: floor > terrain.waterHeight - 0.05,
    glow: LANTERN_BASE + night * LANTERN_NIGHT,
    tilt: (flight?.tilt ?? 0) + Math.sin(time * 1.6) * 0.05 * hover,
    bank: (flight?.bank ?? 0) + Math.sin(time * 1.25) * 0.07 * hover,
    lift: Math.sin(time * HOVER_RATE) * HOVER_AMPLITUDE * hover,
  });
}
