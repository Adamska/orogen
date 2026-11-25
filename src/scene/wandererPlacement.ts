import { MathUtils, type Vector3 } from 'three';
import type { WandererModel } from './wandererModel';

export interface Stance {
  readonly position: Vector3;
  readonly facing: number;
  readonly floor: number;
  readonly slopeX: number;
  readonly slopeZ: number;
  readonly dry: boolean;
  readonly glow: number;
  readonly tilt: number;
  readonly bank: number;
  readonly lift: number;
}

const SHADOW_OPACITY = 0.3;
const SHADOW_FADE_HEIGHT = 4;

export function placeWanderer(model: WandererModel, stance: Stance): void {
  const { position } = stance;
  const lift = Math.max(0, position.y - stance.floor);
  model.root.position.copy(position);
  model.root.position.y += stance.lift;
  model.root.rotation.y = stance.facing;
  model.pivot.rotation.set(stance.tilt, 0, stance.bank);
  model.lantern.emissiveIntensity = stance.glow;
  model.shadow.position.set(position.x, stance.floor + 0.04, position.z);
  model.shadow.rotation.set(-Math.atan(stance.slopeZ), 0, Math.atan(stance.slopeX));
  model.shadow.scale.setScalar(1 + lift * 0.12);
  model.shadow.visible = stance.dry;
  model.shadowMaterial.opacity = SHADOW_OPACITY * MathUtils.clamp(1 - lift / SHADOW_FADE_HEIGHT, 0, 1);
}
