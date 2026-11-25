import { AnimationMixer, LoopOnce, MathUtils, type AnimationAction, type Vector3 } from 'three';
import type { Walker } from './walkerMotion';
import type { WandererModel } from './wandererModel';

interface Stride {
  readonly action: AnimationAction;
  readonly speed: number;
}

export interface WandererAnimator {
  readonly mixer: AnimationMixer;
  readonly idle: AnimationAction;
  readonly strides: readonly Stride[];
  readonly swimIdle: AnimationAction;
  readonly swimForward: AnimationAction;
  readonly rise: AnimationAction;
  readonly hang: AnimationAction;
  readonly land: AnimationAction;
  readonly weights: Map<AnimationAction, number>;
  readonly targets: Map<AnimationAction, number>;
  phase: number;
  landTimer: number;
}

const STRIDE_CLIPS = [
  ['Walk_Loop', 1.5],
  ['Jog_Fwd_Loop', 3.8],
  ['Sprint_Loop', 7],
] as const;
const SWIM_STROKE_SPEED = 2.6;
const BLEND_RESPONSE = 11;
const RISE_OFFSET = 0.5;
const RISE_RATE = 1.4;
const LAND_RATE = 1.5;
const HARD_LANDING = 7;
const SOFT_LANDING = 3;
const RATE_RANGE = [0.75, 1.8] as const;

export function createAnimator(model: WandererModel): WandererAnimator {
  const mixer = new AnimationMixer(model.figure);
  const action = (name: string) => {
    const clip = model.clips.find((candidate) => candidate.name === name);
    if (clip === undefined) throw new Error(`Missing animation clip ${name}`);
    const created = mixer.clipAction(clip);
    created.setEffectiveWeight(0).play();
    return created;
  };
  const once = (name: string) => {
    const created = action(name);
    created.setLoop(LoopOnce, 1);
    created.clampWhenFinished = true;
    return created;
  };
  const idle = action('Idle_Loop');
  const strides = STRIDE_CLIPS.map(([name, speed]) => ({ action: action(name), speed }));
  for (const { action: stride } of strides) stride.timeScale = 0;
  const animator: WandererAnimator = {
    mixer,
    idle,
    strides,
    swimIdle: action('Swim_Idle_Loop'),
    swimForward: action('Swim_Fwd_Loop'),
    rise: once('Jump_Start'),
    hang: action('Jump_Loop'),
    land: once('Jump_Land'),
    weights: new Map(),
    targets: new Map(),
    phase: 0,
    landTimer: 0,
  };
  animator.weights.set(idle, 1);
  idle.setEffectiveWeight(1);
  return animator;
}

function strideTargets(animator: WandererAnimator, speed: number, share: number): void {
  const { strides, targets } = animator;
  if (speed <= strides[0].speed) {
    const blend = speed / strides[0].speed;
    targets.set(animator.idle, share * (1 - blend));
    targets.set(strides[0].action, share * blend);
    return;
  }
  for (let index = 1; index < strides.length; index += 1) {
    const low = strides[index - 1];
    const high = strides[index];
    if (speed <= high.speed || index === strides.length - 1) {
      const blend = MathUtils.clamp((speed - low.speed) / (high.speed - low.speed), 0, 1);
      targets.set(low.action, share * (1 - blend));
      targets.set(high.action, share * blend);
      return;
    }
  }
}

export function animateWanderer(animator: WandererAnimator, walker: Walker, delta: number): void {
  const { targets, weights, rise, land, strides } = animator;
  if (walker.jumped) {
    rise.reset();
    rise.time = RISE_OFFSET;
    rise.timeScale = RISE_RATE;
  }
  if (walker.landing > SOFT_LANDING && walker.speed < SOFT_LANDING) {
    land.reset();
    land.timeScale = LAND_RATE;
    animator.landTimer = walker.landing > HARD_LANDING ? 0.5 : 0.28;
  }
  animator.landTimer = Math.max(0, animator.landTimer - delta);

  targets.clear();
  const swim = walker.swim;
  const air = walker.grounded || walker.floating ? 0 : 1 - swim;
  const ground = (1 - swim) * (1 - air);
  const landing = animator.landTimer > 0 ? ground : 0;
  const rising = rise.time < rise.getClip().duration - 0.05 && walker.vertical > 0;
  targets.set(rising ? rise : animator.hang, air);
  targets.set(land, landing);
  const stroke = MathUtils.clamp(walker.speed / SWIM_STROKE_SPEED, 0, 1);
  targets.set(animator.swimForward, swim * stroke);
  targets.set(animator.swimIdle, swim * (1 - stroke));
  strideTargets(animator, walker.speed, ground - landing);

  let moving = 0;
  let cycles = 0;
  for (const { action, speed } of strides) {
    const weight = targets.get(action) ?? 0;
    const rate = MathUtils.clamp(walker.speed / speed, RATE_RANGE[0], RATE_RANGE[1]);
    moving += weight;
    cycles += (weight * rate) / action.getClip().duration;
  }
  if (moving > 1e-3) animator.phase = (animator.phase + (cycles / moving) * delta) % 1;
  for (const { action } of strides) action.time = animator.phase * action.getClip().duration;
  animator.swimForward.timeScale = MathUtils.clamp(walker.speed / SWIM_STROKE_SPEED, 0.6, 1.6);

  const blend = 1 - Math.exp(-delta * BLEND_RESPONSE);
  for (const action of new Set([...weights.keys(), ...targets.keys()])) {
    const next = (weights.get(action) ?? 0) + ((targets.get(action) ?? 0) - (weights.get(action) ?? 0)) * blend;
    weights.set(action, next);
    action.setEffectiveWeight(next);
  }
  animator.mixer.update(delta);
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

const SHADOW_OPACITY = 0.3;
const SHADOW_FADE_HEIGHT = 4;

export function placeWanderer(model: WandererModel, stance: Stance): void {
  const { position } = stance;
  const lift = Math.max(0, position.y - stance.floor);
  model.root.position.copy(position);
  model.root.rotation.y = stance.facing;
  model.lantern.emissiveIntensity = stance.glow;
  model.shadow.position.set(position.x, stance.floor + 0.04, position.z);
  model.shadow.rotation.set(-Math.atan(stance.slopeZ), 0, Math.atan(stance.slopeX));
  model.shadow.scale.setScalar(1 + lift * 0.12);
  model.shadow.visible = stance.dry;
  model.shadowMaterial.opacity = SHADOW_OPACITY * MathUtils.clamp(1 - lift / SHADOW_FADE_HEIGHT, 0, 1);
}
