import { MathUtils, type Object3D, type Vector3 } from 'three';
import type { WandererRig } from './wandererRig';

export interface Gait {
  phase: number;
  stride: number;
  run: number;
  airborne: number;
  swim: number;
  time: number;
}

const JOINT_RESPONSE = 16;
const LEG_SWING = 0.62;
const RUN_SWING = 0.36;

function ease(object: Object3D, x: number, z: number, blend: number): void {
  object.rotation.x += (x - object.rotation.x) * blend;
  object.rotation.z += (z - object.rotation.z) * blend;
}

export function poseWanderer(rig: WandererRig, gait: Gait, delta: number): void {
  const blend = 1 - Math.exp(-delta * JOINT_RESPONSE);
  const { lerp } = MathUtils;
  const swing = gait.stride * (LEG_SWING + RUN_SWING * gait.run);
  const idle = 1 - gait.stride;
  const breath = Math.sin(gait.time * 1.7) * 0.02 * idle;
  const stroke = gait.time * 3.4;

  for (let index = 0; index < 2; index += 1) {
    const offset = index * Math.PI;
    const side = index === 0 ? 1 : -1;
    const step = Math.sin(gait.phase + offset);
    const lift = Math.max(0, Math.cos(gait.phase + offset));

    let thigh = -step * swing;
    let knee = lift * swing * 1.5 + 0.05;
    thigh = lerp(thigh, index === 0 ? -0.75 : -0.2, gait.airborne);
    knee = lerp(knee, index === 0 ? 1.1 : 0.45, gait.airborne);
    thigh = lerp(thigh, Math.sin(gait.time * 8 + offset) * 0.35, gait.swim);
    knee = lerp(knee, 0.25, gait.swim);
    ease(rig.legs[index].upper, thigh, 0, blend);
    ease(rig.legs[index].lower, knee, 0, blend);

    let shoulder = step * swing * 0.85 + breath;
    let spread = side * (0.08 + 0.04 * gait.run);
    let elbow = -(0.2 + swing * 0.7 + gait.run * 0.5);
    shoulder = lerp(shoulder, -0.5, gait.airborne);
    spread = lerp(spread, side * 0.55, gait.airborne);
    elbow = lerp(elbow, -0.6, gait.airborne);
    shoulder = lerp(shoulder, -2.5 + Math.sin(stroke) * 0.55, gait.swim);
    spread = lerp(spread, side * (0.25 + Math.cos(stroke) * 0.35), gait.swim);
    elbow = lerp(elbow, -0.35 - Math.max(0, Math.sin(stroke)) * 0.6, gait.swim);
    ease(rig.arms[index].upper, shoulder, spread, blend);
    ease(rig.arms[index].lower, elbow, 0, blend);
  }

  const bob = (Math.abs(Math.cos(gait.phase)) - 0.6) * 0.07 * swing;
  rig.body.position.y += (lerp(bob, 0, gait.swim) - rig.body.position.y) * blend;
  const lean = lerp(0.05 * gait.stride + 0.16 * gait.run - 0.08 * gait.airborne, 1.25, gait.swim);
  ease(rig.body, lean, 0, blend);
  rig.torso.rotation.y = Math.sin(gait.phase) * 0.14 * swing;
  ease(rig.torso, breath * 0.5, 0, blend);
}

export interface Stance {
  readonly position: Vector3;
  readonly facing: number;
  readonly floor: number;
  readonly slopeX: number;
  readonly slopeZ: number;
  readonly dry: boolean;
  readonly glow: number;
}

const SHADOW_OPACITY = 0.32;
const SHADOW_FADE_HEIGHT = 3;

export function placeWanderer(rig: WandererRig, stance: Stance): void {
  const { position } = stance;
  const lift = Math.max(0, position.y - stance.floor);
  rig.root.position.copy(position);
  rig.root.rotation.y = stance.facing;
  rig.lantern.emissiveIntensity = stance.glow;
  rig.shadow.position.set(position.x, stance.floor + 0.04, position.z);
  rig.shadow.rotation.set(-Math.atan(stance.slopeZ), 0, Math.atan(stance.slopeX));
  rig.shadow.scale.setScalar(1 + lift * 0.15);
  rig.shadow.visible = stance.dry;
  rig.shadowMaterial.opacity = SHADOW_OPACITY * MathUtils.clamp(1 - lift / SHADOW_FADE_HEIGHT, 0, 1);
}
